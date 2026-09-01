/* ═══════════════════════════════════════════════════════════════════
   VERCEL SERVERLESS ENTRY POINT
   Vercel serves the static pages from its own CDN; this function only
   ever sees /api/* and hands it to the same handler `node server.js`
   uses. Storage comes from store.js, which picks its backend from the
   environment (see README.md) — Redis over HTTP on Vercel.

   Everything here is wrapped so the function can NEVER crash silently:
   the require and the request both run inside try/catch, so a bundling
   miss or a storage-config error becomes a readable 500 with the real
   reason logged to the Vercel runtime log — not the opaque
   "This Serverless Function has crashed" page.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

module.exports = async (req, res) => {
  try {
    // Required inside the handler so a module-load failure is catchable
    // here rather than crashing the whole invocation. Node caches it, so
    // this is a one-time cost on the first request of a cold instance.
    const { handleRequest } = require('../server.js');
    await handleRequest(req, res);
  } catch (err) {
    // Goes to the Vercel runtime log — this is what to read if the API 500s.
    console.error('[api] fatal:', (err && err.stack) || err);
    try {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
      }
      res.end(JSON.stringify({ error: 'Server error. See the deployment logs.' }));
    } catch (_) {
      /* response already torn down — nothing more we can do */
    }
  }
};
