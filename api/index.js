/* Vercel serverless entry point.
   Vercel serves the static pages from its own CDN; this function only
   ever sees /api/*, and hands it to the same handler `node server.js`
   uses. Storage comes from store.js, which picks the Redis backend
   because KV_REST_API_URL / KV_REST_API_TOKEN are set in the
   environment — see README.md. */
'use strict';

const { handleRequest } = require('../server.js');

module.exports = (req, res) => handleRequest(req, res);
