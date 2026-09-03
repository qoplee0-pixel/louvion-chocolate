/* ═══════════════════════════════════════════════════════════════════
   LOUVION — STORAGE
   One interface, three backends, chosen at startup from the env:

     file    JSON under data/, sessions and rate counters in memory.
             The default. What `node server.js` uses out of the box.

     redis   A real Redis server over its native protocol (RESP), when
             REDIS_URL is set (redis:// or rediss://). Redis Cloud,
             Railway, Render, Upstash's redis:// endpoint, or a local
             redis-server all work.

     kv      Redis over its HTTP API (Vercel KV / Upstash REST), when
             KV_REST_API_URL + KV_REST_API_TOKEN are set. Handy on
             serverless, where an outbound TCP socket is awkward but an
             HTTPS fetch is not.

   The redis and kv backends share ONE set of operations — they differ
   only in how a command is sent. Redis exists because serverless breaks
   both of the file backend's assumptions: the filesystem is read-only
   outside /tmp, and requests land on different instances, so an in-memory
   session map signs people out at random and an in-memory rate counter
   barely limits anything.

   Still no npm dependencies: the RESP client is built on `net`/`tls`,
   the HTTP client on `fetch`.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

const net = require('net');
const tls = require('tls');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

/* ═══════════════════════ SHARED HELPERS ═══════════════════════ */

function sessionAlive(session, idleMs, absoluteMs) {
  if (!session) return false;
  const now = Date.now();
  return now - session.lastSeen <= idleMs && now - session.createdAt <= absoluteMs;
}

/* ═══════════════════════ FILE BACKEND ═══════════════════════ */

function fileBackend() {
  const queues = new Map();

  function queue(file, task) {
    const prev = queues.get(file) || Promise.resolve();
    const next = prev.then(task, task);
    queues.set(file, next.catch(() => {}));
    return next;
  }

  async function readJson(file, fallback) {
    try {
      const raw = await fsp.readFile(path.join(DATA_DIR, file), 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed;
    } catch (err) {
      if (err.code === 'ENOENT') return fallback;
      console.error(`[store] ${file} unreadable, falling back:`, err.message);
      return fallback;
    }
  }

  /* Read-modify-write as one queued unit, written to a temp file and
     renamed, so a crash can't leave half a users.json behind. */
  function mutate(file, fallback, mutator) {
    return queue(file, async () => {
      const current = await readJson(file, fallback);
      const result = await mutator(current);
      const target = path.join(DATA_DIR, file);
      const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await fsp.writeFile(tmp, JSON.stringify(current, null, 2), { mode: 0o600 });
      await fsp.rename(tmp, target);
      return result;
    });
  }

  const sessions = new Map();
  const buckets = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [token, s] of sessions) if (now > s.expiresAt) sessions.delete(token);
    for (const [key, b] of buckets) if (now > b.resetAt) buckets.delete(key);
  }, 1000 * 60 * 5).unref();

  return {
    kind: 'file',

    async init() {
      await fsp.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
    },

    users: {
      async byEmail(email) {
        const users = await readJson('users.json', []);
        return users.find((u) => u.email === email) || null;
      },
      async byId(id) {
        const users = await readJson('users.json', []);
        return users.find((u) => u.id === id) || null;
      },
      async hasAdmin() {
        const users = await readJson('users.json', []);
        return users.some((u) => u.role === 'admin');
      },
      /* false means the email was already taken. */
      create(user) {
        return mutate('users.json', [], (users) => {
          if (users.some((u) => u.email === user.email)) return false;
          users.push(user);
          return true;
        });
      }
    },

    orders: {
      add(order) {
        return mutate('orders.json', [], (orders) => { orders.unshift(order); });
      },
      async forUser(userId) {
        const orders = await readJson('orders.json', []);
        return orders.filter((o) => o.userId === userId);
      },
      all() {
        return readJson('orders.json', []);
      },
      update(id, mutator) {
        return mutate('orders.json', [], (orders) => {
          const order = orders.find((o) => o.id === id);
          if (!order) return null;
          mutator(order);
          return order;
        });
      }
    },

    sessions: {
      async get(token) {
        const s = sessions.get(token);
        if (!s) return null;
        if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
        return s.value;
      },
      async set(token, value, ttlSeconds) {
        sessions.set(token, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      },
      async del(token) { sessions.delete(token); }
    },

    rate: {
      async hit(key, limit, windowSeconds) {
        const now = Date.now();
        const b = buckets.get(key);
        if (!b || now > b.resetAt) {
          buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
          return { ok: true, retryAfter: 0 };
        }
        b.count += 1;
        if (b.count > limit) {
          return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
        }
        return { ok: true, retryAfter: 0 };
      },
      async clear(key) { buckets.delete(key); }
    }
  };
}

/* ═══════════════════════ MEMORY BACKEND ═══════════════════════ */
/* Everything in process memory, nothing on disk or over a socket. Used
   as the last-resort fallback on serverless when no Redis is configured,
   so the site still RUNS (loads, register, checkout) instead of refusing
   to boot. The catch: state lives only in one function instance and is
   wiped between cold starts, so orders don't persist reliably. It's a
   demo mode — connect Redis (KV_REST_API_URL / REDIS_URL) for real use,
   and the store upgrades itself automatically. */

function memoryBackend() {
  const users = [];
  const orders = [];
  const sessions = new Map();
  const buckets = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [t, s] of sessions) if (now > s.expiresAt) sessions.delete(t);
    for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
  }, 1000 * 60 * 5).unref();

  return {
    kind: 'memory',
    async init() {},

    users: {
      async byEmail(email) { return users.find((u) => u.email === email) || null; },
      async byId(id) { return users.find((u) => u.id === id) || null; },
      async hasAdmin() { return users.some((u) => u.role === 'admin'); },
      async create(user) {
        if (users.some((u) => u.email === user.email)) return false;
        users.push(user);
        return true;
      }
    },

    orders: {
      async add(order) { orders.unshift(order); },
      async forUser(userId) { return orders.filter((o) => o.userId === userId); },
      async all() { return orders.slice(); },
      async update(id, mutator) {
        const order = orders.find((o) => o.id === id);
        if (!order) return null;
        mutator(order);
        return order;
      }
    },

    sessions: {
      async get(token) {
        const s = sessions.get(token);
        if (!s) return null;
        if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
        return s.value;
      },
      async set(token, value, ttlSeconds) {
        sessions.set(token, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      },
      async del(token) { sessions.delete(token); }
    },

    rate: {
      async hit(key, limit, windowSeconds) {
        const now = Date.now();
        const b = buckets.get(key);
        if (!b || now > b.resetAt) {
          buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
          return { ok: true, retryAfter: 0 };
        }
        b.count += 1;
        if (b.count > limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
        return { ok: true, retryAfter: 0 };
      },
      async clear(key) { buckets.delete(key); }
    }
  };
}

/* ═══════════════════════ NATIVE REDIS (RESP) ═══════════════════════ */
/* A tiny RESP client over one persistent socket. Commands are awaited
   one at a time and Redis replies in order, so a FIFO queue of resolvers
   is all the bookkeeping needed. Built on `net`/`tls` — no dependencies. */

function respTransport(urlString) {
  const u = new URL(urlString);
  const useTls = u.protocol === 'rediss:';
  const host = u.hostname;
  const port = Number(u.port) || 6379;
  const username = u.username ? decodeURIComponent(u.username) : '';
  const password = u.password ? decodeURIComponent(u.password) : '';
  const db = u.pathname && u.pathname.length > 1 ? u.pathname.slice(1) : null;

  let socket = null;
  let connecting = null;
  let buffer = Buffer.alloc(0);
  const waiters = [];

  /* Parse one reply starting at `offset`. Returns [value, nextOffset] or
     null when the buffer doesn't yet hold a complete reply. */
  function parseReply(buf, offset) {
    if (offset >= buf.length) return null;
    const type = buf[offset];
    const nl = buf.indexOf('\r\n', offset);
    if (nl === -1) return null;
    const line = buf.toString('utf8', offset + 1, nl);
    const after = nl + 2;

    if (type === 0x2b) return [line, after];                 // +  simple string
    if (type === 0x2d) return [new Error(line), after];      // -  error
    if (type === 0x3a) return [Number(line), after];         // :  integer
    if (type === 0x24) {                                     // $  bulk string
      const len = Number(line);
      if (len === -1) return [null, after];
      const end = after + len;
      if (end + 2 > buf.length) return null;
      return [buf.toString('utf8', after, end), end + 2];
    }
    if (type === 0x2a) {                                     // *  array
      const count = Number(line);
      if (count === -1) return [null, after];
      const arr = [];
      let pos = after;
      for (let i = 0; i < count; i++) {
        const r = parseReply(buf, pos);
        if (r === null) return null;
        arr.push(r[0]);
        pos = r[1];
      }
      return [arr, pos];
    }
    return null;
  }

  function onData(chunk) {
    buffer = buffer.length ? Buffer.concat([buffer, chunk]) : chunk;
    let offset = 0;
    for (;;) {
      const r = parseReply(buffer, offset);
      if (r === null) break;
      offset = r[1];
      const waiter = waiters.shift();
      if (waiter) {
        if (r[0] instanceof Error) waiter.reject(r[0]);
        else waiter.resolve(r[0]);
      }
    }
    buffer = offset ? buffer.subarray(offset) : buffer;
  }

  function fail(err) {
    if (socket) { socket.destroy(); socket = null; }
    buffer = Buffer.alloc(0);
    while (waiters.length) waiters.shift().reject(err);
  }

  function encode(args) {
    let out = `*${args.length}\r\n`;
    for (const a of args) {
      const s = String(a);
      out += `$${Buffer.byteLength(s)}\r\n${s}\r\n`;
    }
    return out;
  }

  /* Send a command straight onto the socket, bypassing connect() — used
     for the AUTH/SELECT handshake before the socket is marked ready. */
  function raw(sock, args) {
    return new Promise((resolve, reject) => {
      waiters.push({ resolve, reject });
      sock.write(encode(args));
    });
  }

  function connect() {
    if (socket) return Promise.resolve();
    if (connecting) return connecting;

    connecting = new Promise((resolve, reject) => {
      const sock = useTls
        ? tls.connect({ host, port, servername: host })
        : net.createConnection({ host, port });

      sock.setNoDelay(true);
      const onErr = (err) => { connecting = null; fail(err); reject(err); };
      sock.once('error', onErr);
      sock.setTimeout(10000, () => onErr(new Error('Redis connection timed out.')));

      sock.on(useTls ? 'secureConnect' : 'connect', async () => {
        sock.setTimeout(0);
        sock.on('data', onData);
        sock.on('error', (err) => fail(err));
        sock.on('close', () => { if (socket === sock) socket = null; });
        try {
          if (password) {
            await raw(sock, username ? ['AUTH', username, password] : ['AUTH', password]);
          }
          if (db) await raw(sock, ['SELECT', db]);
          socket = sock;
          connecting = null;
          resolve();
        } catch (err) {
          connecting = null;
          fail(err);
          reject(err);
        }
      });
    });
    return connecting;
  }

  async function cmd(args) {
    await connect();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Redis command timed out.')), 10000);
      waiters.push({
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); }
      });
      socket.write(encode(args));
    });
  }

  return cmd;
}

/* ═══════════════════════ HTTP REDIS (Upstash REST) ═══════════════════════ */

function httpTransport(url, token) {
  const base = url.replace(/\/+$/, '');
  /* Bound every request so a stuck connection fails cleanly instead of
     hanging until the serverless function's own execution limit, which
     would surface as an opaque crash rather than a readable error. */
  const HTTP_TIMEOUT_MS = 7000;
  return async function cmd(args) {
    let res;
    try {
      res = await fetch(base, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
      });
    } catch (err) {
      throw new Error('Storage unreachable.');
    }
    if (!res.ok) throw new Error(`Storage error ${res.status}.`);
    const data = await res.json();
    if (data && data.error) throw new Error('Storage error.');
    return data ? data.result : null;
  };
}

/* ═══════════════════════ REDIS OPERATIONS ═══════════════════════ */
/* Shared by both Redis transports. Only `cmd` differs between them. */

function redisBackend(kind, cmd) {
  const K = {
    userByEmail: (email) => `lv:u:email:${email}`,
    userIdIndex: (id) => `lv:u:id:${id}`,
    adminFlag: 'lv:hasadmin',
    order: (id) => `lv:o:${id}`,
    orderIndex: 'lv:orders',
    userOrders: (userId) => `lv:orders:u:${userId}`,
    session: (t) => `lv:s:${t}`,
    rate: (k) => `lv:rl:${k}`
  };

  function parse(raw) {
    if (raw === null || raw === undefined) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  }

  async function ordersByIds(ids) {
    if (!ids || !ids.length) return [];
    const raw = await cmd(['MGET', ...ids.map(K.order)]);
    return (raw || []).map(parse).filter(Boolean);
  }

  return {
    kind,

    async init() {
      /* Fail fast with a clear message if the store can't be reached,
         rather than surfacing it on the first customer's request. */
      const pong = await cmd(['PING']);
      if (pong !== 'PONG' && pong !== 'pong') {
        throw new Error('Redis did not answer PING.');
      }
    },

    users: {
      async byEmail(email) { return parse(await cmd(['GET', K.userByEmail(email)])); },
      async byId(id) {
        const email = await cmd(['GET', K.userIdIndex(id)]);
        if (!email) return null;
        return parse(await cmd(['GET', K.userByEmail(email)]));
      },
      async hasAdmin() { return (await cmd(['GET', K.adminFlag])) === '1'; },
      /* NX makes this the atomic uniqueness check — two simultaneous
         sign-ups for the same address can't both win. */
      async create(user) {
        const ok = await cmd(['SET', K.userByEmail(user.email), JSON.stringify(user), 'NX']);
        if (ok !== 'OK') return false;
        await cmd(['SET', K.userIdIndex(user.id), user.email]);
        if (user.role === 'admin') await cmd(['SET', K.adminFlag, '1']);
        return true;
      }
    },

    orders: {
      async add(order) {
        await cmd(['SET', K.order(order.id), JSON.stringify(order)]);
        await cmd(['LPUSH', K.orderIndex, order.id]);
        await cmd(['LPUSH', K.userOrders(order.userId), order.id]);
      },
      async forUser(userId) {
        return ordersByIds(await cmd(['LRANGE', K.userOrders(userId), 0, -1]));
      },
      async all() {
        return ordersByIds(await cmd(['LRANGE', K.orderIndex, 0, -1]));
      },
      async update(id, mutator) {
        const order = parse(await cmd(['GET', K.order(id)]));
        if (!order) return null;
        mutator(order);
        await cmd(['SET', K.order(id), JSON.stringify(order)]);
        return order;
      }
    },

    sessions: {
      async get(token) { return parse(await cmd(['GET', K.session(token)])); },
      /* Redis' own TTL does the idle expiry: every touch re-sets it. */
      async set(token, value, ttlSeconds) {
        await cmd(['SET', K.session(token), JSON.stringify(value), 'EX', String(ttlSeconds)]);
      },
      async del(token) { await cmd(['DEL', K.session(token)]); }
    },

    rate: {
      /* INCR + EXPIRE counts across every instance, which is the whole
         point — a per-instance counter barely limits anything when
         requests fan out over serverless. */
      async hit(key, limit, windowSeconds) {
        const count = await cmd(['INCR', K.rate(key)]);
        if (count === 1) await cmd(['EXPIRE', K.rate(key), String(windowSeconds)]);
        if (count > limit) {
          const ttl = await cmd(['TTL', K.rate(key)]);
          return { ok: false, retryAfter: ttl > 0 ? ttl : windowSeconds };
        }
        return { ok: true, retryAfter: 0 };
      },
      async clear(key) { await cmd(['DEL', K.rate(key)]); }
    }
  };
}

/* ═══════════════════════ SERVERLESS RESILIENCE ═══════════════════════ */

/* Resolve/reject with `promise`, but never wait past `ms`. The original
   promise keeps running; its late settlement is swallowed so a slow socket
   that eventually errors can't raise an unhandled rejection after we've
   already moved on. */
function withTimeout(promise, ms) {
  promise.catch(() => {});
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    timer.unref && timer.unref();
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

/* On serverless a misconfigured or unreachable Redis must never take the
   whole site down. A raw socket that can't connect blocks until its own
   timeout — long enough to blow past a function's execution limit, which
   surfaces as an opaque FUNCTION_INVOCATION_FAILED and, because bootstrap
   gates every route, takes the static pages down with it too.

   This wrapper bounds init() to a budget well under that limit and, if the
   store can't be reached in time, degrades to an in-process memory backend
   so the site still boots. Persistence is lost until the real store is
   reachable again — loud in the log, never fatal — which matches the
   bootstrap contract: connecting Redis upgrades it automatically. */
function serverlessResilient(primary, label) {
  const INIT_BUDGET_MS = 5000;
  let active = primary;

  const store = {
    get kind() { return active.kind; },
    async init() {
      try {
        await withTimeout(primary.init(), INIT_BUDGET_MS);
      } catch (err) {
        console.warn(
          `[store] ${label} store unreachable (${err.message}) — falling back to\n` +
          '        EPHEMERAL memory mode so the site still boots. Orders and\n' +
          '        accounts will NOT persist until storage is reachable. Check\n' +
          '        the Redis URL / credentials in the deployment environment.'
        );
        active = memoryBackend();
        await active.init();
        rebind();
      }
    }
  };

  /* Point the data namespaces (users, orders, sessions, rate) at whichever
     backend is live, without hardcoding their names. */
  function rebind() {
    for (const key of Object.keys(active)) {
      if (key === 'kind' || key === 'init') continue;
      store[key] = active[key];
    }
  }
  rebind();
  return store;
}

/* ═══════════════════════ SELECTION ═══════════════════════ */

function createStore() {
  const nativeUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL || process.env.KV_URL;
  const httpUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const httpToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasHttp = httpUrl && httpToken;

  /* Upstash's Vercel integration sets BOTH a native rediss:// URL and the
     HTTP REST pair, so the order below decides which one is used.

     On serverless, HTTP is the right transport: it's stateless, so it
     survives cold starts and per-instance fan-out without holding a socket
     open — which is exactly what a raw TCP connection can't do well on a
     function. On a long-lived server the native socket is better (one
     connection, no per-request HTTP overhead), so it wins there. */
  const onServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  /* On serverless, wrap the chosen Redis backend so an unreachable store
     degrades to memory instead of hanging the function to death. On a
     long-lived server a storage outage should still fail loudly at startup,
     so the wrapper is serverless-only. */
  if (onServerless && hasHttp) {
    return serverlessResilient(redisBackend('kv', httpTransport(httpUrl, httpToken)), 'kv');
  }
  if (nativeUrl) {
    const backend = redisBackend('redis', respTransport(nativeUrl));
    return onServerless ? serverlessResilient(backend, 'redis') : backend;
  }
  if (hasHttp) return redisBackend('kv', httpTransport(httpUrl, httpToken));

  /* On serverless the disk is read-only, so the file backend can't run
     there — fall back to ephemeral memory so the site still boots. On a
     normal machine, the file backend under data/ is the right default. */
  if (onServerless) return memoryBackend();
  return fileBackend();
}

module.exports = { createStore, sessionAlive };
