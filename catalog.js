/* ═══════════════════════════════════════════════════════════════════
   LOUVION — SHARED CATALOGUE
   Single source of truth for boxes + chocolates.
   Loaded by the browser (<script src="catalog.js">) and by server.js
   (require('./catalog.js')) so prices can never drift between the two.
   The server ALWAYS re-prices orders from this file; the browser only
   ever renders it. Never trust a price sent by a client.
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.LOUVION_CATALOG = data;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ═══ CURRENCY ═══
     Change these two lines to switch currency across the whole site. */
  var CURRENCY = { code: 'USD', symbol: '$' };

  /* ═══ BOXES ═══
     `pieces` is enforced server-side: an order is rejected unless the
     chosen chocolates add up to exactly this count. */
  var BOXES = [
    {
      id: 'box-3',
      name: 'La Petite',
      pieces: 3,
      price: 1200,
      tag: 'The little gesture',
      desc: 'Three bonbons in a slim ribboned sleeve. Made for a thank-you, a hello, or a quiet afternoon.'
    },
    {
      id: 'box-9',
      name: 'La Classique',
      pieces: 9,
      price: 3200,
      tag: 'Most loved',
      desc: 'Our everyday box. Nine pieces, three by three, in the signature cocoa-brown case.'
    },
    {
      id: 'box-16',
      name: 'La Signature',
      pieces: 16,
      price: 5400,
      tag: 'For gifting',
      desc: 'Sixteen bonbons laid in a gold-lined tray, finished with a hand-tied ribbon.'
    },
    {
      id: 'box-64',
      name: 'La Grande',
      pieces: 64,
      price: 19500,
      tag: 'Celebrations',
      desc: 'Four trays, sixty-four pieces. Weddings, offices, and the households that mean it.'
    }
  ];

  /* ═══ CHOCOLATES ═══
     `shape` + `base` + `accent` + `finish` drive the hand-drawn SVG in
     app.js — there are no photo files to manage and nothing loads from
     a third-party server. */
  var CHOCOLATES = [
    {
      id: 'noir-70',
      name: 'Noir 70%',
      family: 'dark',
      desc: 'Single-origin Madagascan ganache, bittersweet and clean.',
      shape: 'dome', base: '#3a2318', accent: '#d9a441', finish: 'gold'
    },
    {
      id: 'caramel-sel',
      name: 'Salted Caramel',
      family: 'milk',
      desc: 'Slow-cooked caramel, Guérande salt, milk chocolate shell.',
      shape: 'square', base: '#6b4326', accent: '#e8c07d', finish: 'drizzle'
    },
    {
      id: 'pistache',
      name: 'Pistachio Praliné',
      family: 'milk',
      desc: 'Sicilian pistachios ground to a praliné, barely sweet.',
      shape: 'round', base: '#5c3a22', accent: '#8fae52', finish: 'nut'
    },
    {
      id: 'gianduja',
      name: 'Hazelnut Gianduja',
      family: 'milk',
      desc: 'Piedmont hazelnuts folded into milk chocolate until silk.',
      shape: 'oval', base: '#6f4527', accent: '#c89b62', finish: 'plain'
    },
    {
      id: 'framboise',
      name: 'Raspberry Noir',
      family: 'dark',
      desc: 'Fresh raspberry pulp against a 64% dark ganache.',
      shape: 'square', base: '#3f2419', accent: '#b2385a', finish: 'drizzle'
    },
    {
      id: 'espresso',
      name: 'Espresso Truffle',
      family: 'dark',
      desc: 'Double-shot ganache rolled in bitter cocoa powder.',
      shape: 'round', base: '#42291b', accent: '#7a5c47', finish: 'dust'
    },
    {
      id: 'feuilletine',
      name: 'Praliné Feuilletine',
      family: 'milk',
      desc: 'Almond praliné with crushed feuilletine for the snap.',
      shape: 'bar', base: '#6a4225', accent: '#d8b276', finish: 'shard'
    },
    {
      id: 'passion',
      name: 'Passionfruit Caramel',
      family: 'milk',
      desc: 'Sharp passionfruit cutting through a soft butter caramel.',
      shape: 'round', base: '#6d4728', accent: '#e2a72e', finish: 'drizzle'
    },
    {
      id: 'coco',
      name: 'Coconut & Milk',
      family: 'white',
      desc: 'Toasted coconut in a white chocolate and vanilla ganache.',
      shape: 'dome', base: '#d8c3a1', accent: '#f3e7d2', finish: 'shard'
    },
    {
      id: 'amande',
      name: 'Almond Rocher',
      family: 'dark',
      desc: 'Caramelised almond slivers set in dark chocolate.',
      shape: 'round', base: '#3d2519', accent: '#c9a06a', finish: 'nut'
    },
    {
      id: 'orange',
      name: 'Orange Blossom',
      family: 'dark',
      desc: 'Candied Valencia peel and orange blossom water, 70%.',
      shape: 'square', base: '#3a2317', accent: '#df8b3c', finish: 'drizzle'
    },
    {
      id: 'tonka',
      name: 'Tonka Vanilla',
      family: 'white',
      desc: 'Tonka bean and Tahitian vanilla in white chocolate.',
      shape: 'oval', base: '#e0cdab', accent: '#a8834f', finish: 'dust'
    }
  ];

  /* ═══ DELIVERY ═══
     Shared so the basket total the customer sees and the total the
     server charges can never disagree. */
  var SHIPPING = { flat: 600, freeOver: 8000 };

  var ORDER_STATUSES = ['pending', 'confirmed', 'making', 'shipped', 'completed', 'cancelled'];

  /* Lookup helpers used by both sides. */
  function boxById(id) {
    for (var i = 0; i < BOXES.length; i++) if (BOXES[i].id === id) return BOXES[i];
    return null;
  }
  function chocolateById(id) {
    for (var i = 0; i < CHOCOLATES.length; i++) if (CHOCOLATES[i].id === id) return CHOCOLATES[i];
    return null;
  }

  /* Prices are integer cents everywhere. Only formatted for display. */
  function formatPrice(cents) {
    return CURRENCY.symbol + (cents / 100).toFixed(2);
  }

  return {
    CURRENCY: CURRENCY,
    BOXES: BOXES,
    CHOCOLATES: CHOCOLATES,
    SHIPPING: SHIPPING,
    ORDER_STATUSES: ORDER_STATUSES,
    boxById: boxById,
    chocolateById: chocolateById,
    formatPrice: formatPrice
  };
});
