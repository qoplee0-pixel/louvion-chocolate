/* ═══════════════════════════════════════════════════════════════════
   LOUVION — STORAGE
   One interface, two backends, chosen at startup by what's in the env:

     file   JSON under data/, sessions and rate counters in memory.
            The default. What `node server.js` uses.

     kv     Redis over HTTP (Vercel KV / Upstash), sessions and rate
            counters in Redis too. Used when KV_REST_API_URL and
            KV_REST_API_TOKEN (or the UPSTASH_* pair) are set.

   The kv backend exists because serverless breaks both of the file
   backend's assumptions: the filesystem is read-only outside /tmp and
   wiped between invocations, and each request may land on a different
   instance — so an in-memory session map signs people out at random and
   an in-memory rate counter barely limits anything.

   Still no npm dependencies: Redis' HTTP API is reached with fetch.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('crypto');
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

/* ═══════════════════════ KV BACKEND ═══════════════════════ */

function kvBackend(url, token) {
  const base = url.replace(/\/+$/, '');

  async function cmd(command) {
    let res;
    try {
      res = await fetch(base, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
      });
    } catch (err) {
      throw new Error('Storage unreachable.');
    }
    if (!res.ok) throw new Error(`Storage error ${res.status}.`);
    const data = await res.json();
    if (data && data.error) throw new Error('Storage error.');
    return data ? data.result : null;
  }

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
    kind: 'kv',

    async init() { /* nothing to create */ },

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

/* ═══════════════════════ SELECTION ═══════════════════════ */

function createStore() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return kvBackend(url, token);
  return fileBackend();
}

module.exports = { createStore, sessionAlive };
