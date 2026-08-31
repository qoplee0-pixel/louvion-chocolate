/* ═══════════════════════════════════════════════════════════════════
   LOUVION — APPLICATION SERVER
   Zero npm dependencies: Node built-ins only (http, crypto, fs, path).
   Serves the static site AND the JSON API behind real sessions.

   Runs two ways from the same code:
     · `node server.js`        static files + API, storage on disk
     · Vercel (api/index.js)   API only, storage in Redis over HTTP
   Which storage is used is decided in store.js by what's in the env.

   Security model, in short:
     · Passwords    scrypt (N=16384) + 16-byte per-user salt, timing-safe compare
     · Sessions     32 random bytes, kept server-side, HttpOnly SameSite=Strict
                    cookie, rotated on login, idle + absolute expiry
     · CSRF         per-session token required in X-CSRF-Token on every
                    state-changing request, plus an Origin check
     · Rate limits  per-IP and per-account, with lockout on failed logins
     · Headers      strict CSP (no inline script or style), nosniff,
                    frame-ancestors none, referrer + permissions policy
     · Pricing      never trusted from the client; always recomputed here
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const CATALOG = require('./catalog.js');
const { createStore } = require('./store.js');

/* ═══════════════════════ CONFIG ═══════════════════════ */

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const store = createStore();

const SESSION_COOKIE = 'lv_session';
const SESSION_IDLE_MS = 1000 * 60 * 60 * 2;        // 2h since last use
const SESSION_ABSOLUTE_MS = 1000 * 60 * 60 * 12;   // 12h since login
const SESSION_TOUCH_MS = 1000 * 60;                // don't rewrite more often than this
const BODY_LIMIT_BYTES = 64 * 1024;

const SCRYPT_N = 16384, SCRYPT_r = 8, SCRYPT_p = 1, SCRYPT_KEYLEN = 64;
const SCRYPT_MEM = 64 * 1024 * 1024;               // must exceed 128*N*r

const SHIPPING_CENTS = CATALOG.SHIPPING.flat;
const FREE_SHIPPING_OVER_CENTS = CATALOG.SHIPPING.freeOver;

const MAX_LINES_PER_ORDER = 20;
const MAX_QTY_PER_LINE = 20;

/* A short list only — the real defence is the length minimum + rate limiting. */
const WEAK_PASSWORDS = new Set([
  'password12', 'password123', '1234567890', 'qwertyuiop', 'letmein123',
  'iloveyou12', 'chocolate1', 'chocolate123', 'admin12345', 'welcome123'
]);

/* ═══════════════════════ CRYPTO ═══════════════════════ */

function scryptHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password, salt, SCRYPT_KEYLEN,
      { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: SCRYPT_MEM },
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scryptHash(password, salt);
  return { salt: salt.toString('hex'), hash: key.toString('hex') };
}

async function verifyPassword(password, saltHex, hashHex) {
  const expected = Buffer.from(String(hashHex), 'hex');
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const actual = await scryptHash(password, Buffer.from(String(saltHex), 'hex'));
  return crypto.timingSafeEqual(actual, expected);
}

/* Burn the same CPU when an account doesn't exist, so response time can't
   be used to discover which email addresses are registered. */
const DECOY_SALT = crypto.randomBytes(16);
function decoyHash(password) {
  return scryptHash(password, DECOY_SALT).catch(() => null);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function orderId() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (const b of crypto.randomBytes(6)) out += alphabet[b % alphabet.length];
  return `LV-${out}`;
}

/* ═══════════════════════ SESSIONS ═══════════════════════ */

async function createSession(userId) {
  const token = randomToken(32);
  const now = Date.now();
  const session = { userId, csrf: randomToken(24), createdAt: now, lastSeen: now };
  await store.sessions.set(token, session, Math.ceil(SESSION_IDLE_MS / 1000));
  return { token, session };
}

async function getSession(token) {
  if (!token) return null;
  const session = await store.sessions.get(token);
  if (!session) return null;

  const now = Date.now();
  if (now - session.lastSeen > SESSION_IDLE_MS || now - session.createdAt > SESSION_ABSOLUTE_MS) {
    await store.sessions.del(token);
    return null;
  }

  /* Sliding idle window, but don't pay for a write on every single
     request — a minute of granularity is plenty. */
  if (now - session.lastSeen > SESSION_TOUCH_MS) {
    session.lastSeen = now;
    await store.sessions.set(token, session, Math.ceil(SESSION_IDLE_MS / 1000));
  }
  return session;
}

function destroySession(token) {
  if (!token) return Promise.resolve();
  return store.sessions.del(token);
}

/* ═══════════════════════ RATE LIMITING ═══════════════════════ */

function rateLimit(key, limit, windowMs) {
  return store.rate.hit(key, limit, Math.ceil(windowMs / 1000));
}

function clearBucket(key) {
  return store.rate.clear(key);
}

/* ═══════════════════════ HTTP HELPERS ═══════════════════════ */

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isSecureRequest(req) {
  if (process.env.LOUVION_FORCE_SECURE_COOKIES === '1') return true;
  return req.headers['x-forwarded-proto'] === 'https';
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = Object.create(null);
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) {
      try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
    }
  }
  return out;
}

function setSessionCookie(req, res, token) {
  const bits = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(SESSION_ABSOLUTE_MS / 1000)}`
  ];
  if (isSecureRequest(req)) bits.push('Secure');
  res.setHeader('Set-Cookie', bits.join('; '));
}

function clearSessionCookie(req, res) {
  const bits = [`${SESSION_COOKIE}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/', 'Max-Age=0'];
  if (isSecureRequest(req)) bits.push('Secure');
  res.setHeader('Set-Cookie', bits.join('; '));
}

/* Nothing loads from a third party, so the policy can stay this tight.
   No 'unsafe-inline' anywhere: there are no inline scripts, no inline
   <style> blocks and no style="" attributes in the whole site. */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'"
].join('; ');

function securityHeaders(req, res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (isSecureRequest(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
}

function sendJson(res, status, payload, extraHeaders) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  }, extraHeaders || {}));
  res.end(body);
}

function sendText(res, status, text, extraHeaders) {
  const body = Buffer.from(text);
  res.writeHead(status, Object.assign({
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length
  }, extraHeaders || {}));
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > BODY_LIMIT_BYTES) {
      reject(Object.assign(new Error('Request too large.'), { status: 413 }));
      return;
    }
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT_BYTES) {
        reject(Object.assign(new Error('Request too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const bad = () => Object.assign(new Error('Malformed request.'), { status: 400 });

  /* Some hosts (Vercel among them) parse the body before handing the
     request over, which leaves the stream already consumed. */
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString('utf8')); } catch { throw bad(); }
    }
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { throw bad(); }
    }
    if (typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
    throw bad();
  }

  const raw = await readBody(req);
  if (!raw) return {};
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw bad(); }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw bad();
  return parsed;
}

/* Reject cross-site state changes before the CSRF token is even checked. */
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;              // same-origin fetches may omit it
  const host = req.headers.host;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/* ═══════════════════════ VALIDATION ═══════════════════════ */

const EMAIL_RE = /^[^\s@,;:<>()[\]\\"]{1,64}@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g;
const CONTROL_KEEP_NEWLINE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;

function cleanString(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function cleanMultiline(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_KEEP_NEWLINE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLen);
}

function normalizeEmail(value) {
  return cleanString(value, 254).toLowerCase();
}

function validatePassword(password) {
  if (typeof password !== 'string') return 'Please choose a password.';
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (password.length > 200) return 'Password must be under 200 characters.';
  if (WEAK_PASSWORDS.has(password.toLowerCase())) return 'That password is too common. Please choose another.';
  return null;
}

/* Rebuild the order from the catalogue. Anything the client sent about
   money is discarded — only ids and quantities survive this function. */
function priceOrder(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw Object.assign(new Error('Your basket is empty.'), { status: 400 });
  }
  if (rawItems.length > MAX_LINES_PER_ORDER) {
    throw Object.assign(new Error('Too many items in one order.'), { status: 400 });
  }

  const lines = [];
  let subtotal = 0;

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') {
      throw Object.assign(new Error('Malformed basket.'), { status: 400 });
    }
    const box = CATALOG.boxById(String(raw.boxId || ''));
    if (!box) throw Object.assign(new Error('Unknown box in basket.'), { status: 400 });

    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      throw Object.assign(new Error('Invalid box quantity.'), { status: 400 });
    }

    if (!Array.isArray(raw.chocolates) || raw.chocolates.length === 0) {
      throw Object.assign(new Error('Every box needs to be filled.'), { status: 400 });
    }

    const picked = [];
    const seen = new Set();
    let pieces = 0;

    for (const entry of raw.chocolates) {
      if (!entry || typeof entry !== 'object') {
        throw Object.assign(new Error('Malformed box contents.'), { status: 400 });
      }
      const choc = CATALOG.chocolateById(String(entry.id || ''));
      if (!choc) throw Object.assign(new Error('Unknown chocolate in a box.'), { status: 400 });
      if (seen.has(choc.id)) {
        throw Object.assign(new Error('Duplicate chocolate in a box.'), { status: 400 });
      }
      seen.add(choc.id);

      const n = Number(entry.qty);
      if (!Number.isInteger(n) || n < 1 || n > box.pieces) {
        throw Object.assign(new Error('Invalid chocolate quantity.'), { status: 400 });
      }
      pieces += n;
      picked.push({ id: choc.id, name: choc.name, qty: n });
    }

    /* The rule that makes a box a box. */
    if (pieces !== box.pieces) {
      throw Object.assign(
        new Error(`${box.name} holds exactly ${box.pieces} pieces — you chose ${pieces}.`),
        { status: 400 }
      );
    }

    const lineTotal = box.price * qty;
    subtotal += lineTotal;
    lines.push({
      boxId: box.id,
      boxName: box.name,
      pieces: box.pieces,
      unitPrice: box.price,
      qty,
      lineTotal,
      chocolates: picked
    });
  }

  const shipping = subtotal >= FREE_SHIPPING_OVER_CENTS ? 0 : SHIPPING_CENTS;
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

/* ═══════════════════════ AUTH PLUMBING ═══════════════════════ */

async function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = await getSession(token);
  if (!session) return null;
  const user = await store.users.byId(session.userId);
  if (!user) {
    await destroySession(token);
    return null;
  }
  return { user, session, token };
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}

function requireCsrf(req, ctx) {
  if (!originAllowed(req)) {
    throw Object.assign(new Error('Request blocked.'), { status: 403 });
  }
  const sent = req.headers['x-csrf-token'];
  if (!ctx || !sent || !safeEqual(sent, ctx.session.csrf)) {
    throw Object.assign(new Error('Your session expired. Please sign in again.'), { status: 403 });
  }
}

/* ═══════════════════════ API ROUTES ═══════════════════════ */

async function handleApi(req, res, url) {
  const ip = clientIp(req);
  const route = `${req.method} ${url.pathname}`;

  /* Blanket per-IP ceiling so a single client can't hammer the API. */
  const general = await rateLimit(`api:${ip}`, 300, 60 * 1000);
  if (!general.ok) {
    return sendJson(res, 429, { error: 'Too many requests. Please slow down.' },
      { 'Retry-After': String(general.retryAfter) });
  }

  /* ── Public catalogue ── */
  if (route === 'GET /api/catalog') {
    return sendJson(res, 200, {
      currency: CATALOG.CURRENCY,
      boxes: CATALOG.BOXES,
      chocolates: CATALOG.CHOCOLATES,
      shipping: { flat: SHIPPING_CENTS, freeOver: FREE_SHIPPING_OVER_CENTS }
    });
  }

  /* ── Who am I ── */
  if (route === 'GET /api/auth/me') {
    const ctx = await currentUser(req);
    if (!ctx) return sendJson(res, 200, { user: null, csrfToken: null });
    return sendJson(res, 200, { user: publicUser(ctx.user), csrfToken: ctx.session.csrf });
  }

  /* ── Register ── */
  if (route === 'POST /api/auth/register') {
    if (!originAllowed(req)) return sendJson(res, 403, { error: 'Request blocked.' });

    const limited = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!limited.ok) {
      return sendJson(res, 429, { error: 'Too many sign-up attempts. Try again later.' },
        { 'Retry-After': String(limited.retryAfter) });
    }

    const body = await readJsonBody(req);
    const email = normalizeEmail(body.email);
    const name = cleanString(body.name, 80);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || name.length < 2) return sendJson(res, 400, { error: 'Please enter your name.' });
    if (!EMAIL_RE.test(email)) return sendJson(res, 400, { error: 'Please enter a valid email address.' });
    const pwError = validatePassword(password);
    if (pwError) return sendJson(res, 400, { error: pwError });

    const { salt, hash } = await hashPassword(password);
    const user = {
      id: crypto.randomUUID(),
      email,
      name,
      salt,
      hash,
      /* Role is assigned here and never read from a request body. */
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    const created = await store.users.create(user);
    if (!created) {
      return sendJson(res, 409, { error: 'That email cannot be used. Try signing in instead.' });
    }

    const { token, session } = await createSession(user.id);
    setSessionCookie(req, res, token);
    return sendJson(res, 201, { user: publicUser(user), csrfToken: session.csrf });
  }

  /* ── Login ── */
  if (route === 'POST /api/auth/login') {
    if (!originAllowed(req)) return sendJson(res, 403, { error: 'Request blocked.' });

    const body = await readJsonBody(req);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';

    const ipGate = await rateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000);
    const acctGate = await rateLimit(`login-acct:${email}`, 5, 15 * 60 * 1000);
    if (!ipGate.ok || !acctGate.ok) {
      return sendJson(res, 429, { error: 'Too many attempts. Please wait and try again.' },
        { 'Retry-After': String(Math.max(ipGate.retryAfter, acctGate.retryAfter)) });
    }

    if (!email || !password || password.length > 200) {
      await decoyHash('placeholder-password');
      return sendJson(res, 401, { error: 'Invalid email or password.' });
    }

    const user = await store.users.byEmail(email);

    if (!user) {
      await decoyHash(password);
      return sendJson(res, 401, { error: 'Invalid email or password.' });
    }

    let ok = false;
    try {
      ok = await verifyPassword(password, user.salt, user.hash);
    } catch {
      ok = false;
    }
    if (!ok) return sendJson(res, 401, { error: 'Invalid email or password.' });

    /* Success: drop the failure counters and issue a brand-new session id
       (a fresh token defeats session fixation). */
    await clearBucket(`login-acct:${email}`);
    await clearBucket(`login-ip:${ip}`);
    await destroySession(parseCookies(req)[SESSION_COOKIE]);

    const { token, session } = await createSession(user.id);
    setSessionCookie(req, res, token);
    return sendJson(res, 200, { user: publicUser(user), csrfToken: session.csrf });
  }

  /* ── Logout ── */
  if (route === 'POST /api/auth/logout') {
    const ctx = await currentUser(req);
    if (ctx) {
      requireCsrf(req, ctx);
      await destroySession(ctx.token);
    }
    clearSessionCookie(req, res);
    return sendJson(res, 200, { ok: true });
  }

  /* ── Place an order ── */
  if (route === 'POST /api/orders') {
    const ctx = await currentUser(req);
    if (!ctx) return sendJson(res, 401, { error: 'Please sign in to place an order.' });
    requireCsrf(req, ctx);

    const placeGate = await rateLimit(`order:${ctx.user.id}`, 10, 10 * 60 * 1000);
    if (!placeGate.ok) {
      return sendJson(res, 429, { error: 'Too many orders in a row. Please wait a moment.' },
        { 'Retry-After': String(placeGate.retryAfter) });
    }

    const body = await readJsonBody(req);
    const priced = priceOrder(body.items);

    const recipient = cleanString(body.recipient, 80) || ctx.user.name;
    const phone = cleanString(body.phone, 32);
    const address = cleanMultiline(body.address, 300);
    const note = cleanMultiline(body.note, 400);

    if (!address || address.length < 8) {
      return sendJson(res, 400, { error: 'Please enter a delivery address.' });
    }
    if (!phone || phone.length < 6) {
      return sendJson(res, 400, { error: 'Please enter a contact number.' });
    }

    const now = new Date().toISOString();
    const order = {
      id: orderId(),
      userId: ctx.user.id,
      customerName: ctx.user.name,
      customerEmail: ctx.user.email,
      recipient,
      phone,
      address,
      note,
      items: priced.lines,
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      total: priced.total,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'pending', at: now, by: 'customer' }]
    };

    await store.orders.add(order);
    return sendJson(res, 201, { order });
  }

  /* ── My orders ── */
  if (route === 'GET /api/orders') {
    const ctx = await currentUser(req);
    if (!ctx) return sendJson(res, 401, { error: 'Please sign in.' });
    return sendJson(res, 200, { orders: await store.orders.forUser(ctx.user.id) });
  }

  /* ── Admin: every order ── */
  if (route === 'GET /api/admin/orders') {
    const ctx = await currentUser(req);
    if (!ctx || ctx.user.role !== 'admin') return sendJson(res, 403, { error: 'Not permitted.' });
    const orders = await store.orders.all();

    const counts = Object.create(null);
    for (const s of CATALOG.ORDER_STATUSES) counts[s] = 0;
    let revenue = 0;
    let pieces = 0;
    for (const o of orders) {
      if (Object.prototype.hasOwnProperty.call(counts, o.status)) counts[o.status] += 1;
      if (o.status !== 'cancelled') revenue += o.total;
      for (const line of o.items) pieces += line.pieces * line.qty;
    }

    return sendJson(res, 200, {
      orders,
      stats: { total: orders.length, revenue, counts, pieces }
    });
  }

  /* ── Admin: change a status ── */
  const statusMatch = url.pathname.match(/^\/api\/admin\/orders\/([A-Za-z0-9-]{1,32})$/);
  if (req.method === 'PATCH' && statusMatch) {
    const ctx = await currentUser(req);
    if (!ctx || ctx.user.role !== 'admin') return sendJson(res, 403, { error: 'Not permitted.' });
    requireCsrf(req, ctx);

    const body = await readJsonBody(req);
    const status = cleanString(body.status, 20);
    if (!CATALOG.ORDER_STATUSES.includes(status)) {
      return sendJson(res, 400, { error: 'Unknown status.' });
    }

    const order = await store.orders.update(statusMatch[1], (o) => {
      o.status = status;
      o.updatedAt = new Date().toISOString();
      o.history.push({ status, at: o.updatedAt, by: ctx.user.email });
    });

    if (!order) return sendJson(res, 404, { error: 'Order not found.' });
    return sendJson(res, 200, { order });
  }

  return sendJson(res, 404, { error: 'Not found.' });
}

/* ═══════════════════════ STATIC FILES ═══════════════════════ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

const PAGES = new Set(['index.html', 'shop.html', 'account.html', 'admin.html']);
const HIDDEN_FILES = new Set(['server.js', 'store.js']);

async function handleStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  }

  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    return sendText(res, 400, 'Bad request');
  }
  if (rel.endsWith('/')) rel += 'index.html';
  rel = rel.replace(/^\/+/, '');
  if (rel === '') rel = 'index.html';

  /* Resolve, then confirm the result is still inside ROOT. This is what
     stops ../../etc/passwd and friends. */
  const full = path.resolve(ROOT, rel);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  if (full !== ROOT && !full.startsWith(rootWithSep)) {
    return sendText(res, 403, 'Forbidden');
  }

  const ext = path.extname(full).toLowerCase();
  const base = path.basename(full);

  /* Never hand out the store, the server source, or anything dot-prefixed. */
  const inDataDir = full === DATA_DIR || full.startsWith(DATA_DIR + path.sep);
  if (!MIME[ext] || base.startsWith('.') || inDataDir || HIDDEN_FILES.has(base)) {
    return sendText(res, 404, 'Not found');
  }

  /* Defence in depth: the admin API already refuses non-admins, but don't
     even serve the page to someone who isn't signed in as one. */
  if (base === 'admin.html') {
    const ctx = await currentUser(req);
    if (!ctx || ctx.user.role !== 'admin') {
      res.writeHead(302, { Location: '/account.html?next=admin', 'Cache-Control': 'no-store' });
      return res.end();
    }
  }

  let stat;
  try {
    stat = await fsp.stat(full);
  } catch {
    return sendText(res, 404, 'Not found');
  }
  if (!stat.isFile()) return sendText(res, 404, 'Not found');

  const etag = `W/"${stat.size}-${stat.mtimeMs.toString(36)}"`;
  const cache = PAGES.has(base) ? 'no-cache' : 'public, max-age=300, must-revalidate';

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag, 'Cache-Control': cache });
    return res.end();
  }

  res.writeHead(200, {
    'Content-Type': MIME[ext],
    'Content-Length': stat.size,
    ETag: etag,
    'Cache-Control': cache
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(full).pipe(res);
}

/* ═══════════════════════ REQUEST HANDLER ═══════════════════════ */

async function handleRequest(req, res) {
  securityHeaders(req, res);

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    return sendText(res, 400, 'Bad request');
  }

  try {
    await ensureBootstrap();
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      await handleStatic(req, res, url);
    }
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    if (status >= 500) console.error('[error]', req.method, url.pathname, err);
    if (res.headersSent) { res.end(); return; }
    /* Only messages we wrote ourselves reach the client — never a stack trace. */
    sendJson(res, status, {
      error: status >= 500 ? 'Something went wrong.' : (err.message || 'Request failed.')
    });
  }
}

const server = http.createServer(handleRequest);

/* ═══════════════════════ BOOTSTRAP ═══════════════════════ */

let bootstrapPromise = null;

/* Runs once per process. On a long-lived server that's at startup; on
   serverless it's the first request each cold instance handles, so it has
   to be idempotent — which it is, because create() refuses a duplicate. */
function ensureBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().catch((err) => {
      bootstrapPromise = null;   // let the next request retry
      throw err;
    });
  }
  return bootstrapPromise;
}

async function bootstrap() {
  /* Without this the failure is a read-only-filesystem error buried in a
     500, which tells you nothing. Vercel plus the file backend means the
     KV variables never got set. */
  if (process.env.VERCEL && store.kind === 'file') {
    console.error(
      '[bootstrap] Running on Vercel with no KV store configured.\n' +
      '            Set KV_REST_API_URL and KV_REST_API_TOKEN (Storage tab),\n' +
      '            otherwise orders are written to a read-only filesystem\n' +
      '            and sessions do not survive between instances.'
    );
    throw new Error('Storage is not configured.');
  }

  await store.init();

  if (await store.users.hasAdmin()) return;

  const email = normalizeEmail(process.env.LOUVION_ADMIN_EMAIL || 'admin@louvion.local');
  const supplied = process.env.LOUVION_ADMIN_PASSWORD;

  /* A generated password only works if someone is watching the log. On
     serverless nobody is, so there we insist on the env var rather than
     invent a secret that is immediately lost. */
  if (!supplied && store.kind !== 'file') {
    console.warn('[bootstrap] No admin account and no LOUVION_ADMIN_PASSWORD set — set it and redeploy.');
    return;
  }

  const password = supplied || randomToken(12);
  const { salt, hash } = await hashPassword(password);

  const created = await store.users.create({
    id: crypto.randomUUID(),
    email,
    name: 'Louvion Studio',
    salt,
    hash,
    role: 'admin',
    createdAt: new Date().toISOString()
  });

  if (!created) {
    console.warn(`[bootstrap] ${email} already exists as a non-admin account; no admin created.`);
    return;
  }

  console.log('\n  ┌─ Admin account created ────────────────────────────');
  console.log(`  │  email     ${email}`);
  if (supplied) {
    console.log('  │  password  (taken from LOUVION_ADMIN_PASSWORD)');
  } else {
    console.log(`  │  password  ${password}`);
    console.log('  │  shown once only. Set LOUVION_ADMIN_PASSWORD to pick your own.');
  }
  console.log('  └────────────────────────────────────────────────────\n');
}

async function start() {
  await ensureBootstrap();
  server.listen(PORT, HOST, () => {
    console.log(`  Louvion running at http://localhost:${PORT}  (storage: ${store.kind})`);
    if (process.env.NODE_ENV !== 'production') {
      console.log('  dev mode — put a TLS terminator in front of this in production\n');
    }
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}

module.exports = {
  server,
  handleRequest,
  ensureBootstrap,
  store,
  priceOrder,
  validatePassword,
  cleanString,
  cleanMultiline
};
