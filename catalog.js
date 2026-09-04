/* ═══════════════════════════════════════════════════════════════════
   LOUVION — SHARED CATALOGUE
   Single source of truth for boxes + chocolates.
   Loaded by the browser (<script src="catalog.js">) and by server.js
   (require('./catalog.js')) so prices can never drift between the two.
   The server ALWAYS re-prices orders from this file; the browser only
   ever renders it. Never trust a price sent by a client.

   Product names, Arabic names and shell colours are taken from the
   Louvion brand sheets. PRICES ARE STILL ESTIMATES — see BOXES.
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.LOUVION_CATALOG = data;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ═══ BRAND ═══ */
  var BRAND = {
    name: 'Louvion Chocolate',
    tagline: 'Art you can taste',
    country: 'Jordan',
    madeIn: 'Proudly made in Jordan',
    phones: ['0797978409', '0790916217'],
    instagram: 'louvionchocolate'
  };

  /* ═══ CURRENCY ═══
     Jordanian dinar. Change these two lines to switch currency. */
  var CURRENCY = { code: 'JOD', symbol: 'JD ', decimals: 2 };

  /* ═══ BOXES ═══
     `pieces` is enforced server-side: an order is rejected unless the
     chosen chocolates add up to exactly this count.

     ⚠ PRICES ARE PLACEHOLDERS. They are plausible for the Jordanian
     market but they are not Louvion's real prices. Replace the `price`
     values (integer fils — 1 JD = 1000, but stored here as hundredths
     to keep one currency format) before taking a real order. */
  var BOXES = [
    {
      id: 'box-4',
      name: 'The Quartet',
      nameAr: 'علبة ٤ حبات',
      pieces: 4,
      price: 400,
      tag: 'A small hello',
      desc: 'Four pieces in a ribboned sleeve. For a thank-you, or for keeping to yourself.'
    },
    {
      id: 'box-6',
      name: 'The Half Dozen',
      nameAr: 'علبة ٦ حبات',
      pieces: 6,
      price: 550,
      tag: 'An easy gift',
      desc: 'Six pieces, three by two, in a slim gift box.'
    },
    {
      id: 'box-9',
      name: 'The Classic',
      nameAr: 'علبة ٩ حبات',
      pieces: 9,
      price: 850,
      tag: 'Most loved',
      desc: 'Nine pieces, three by three, in the gold-lined tray with a window lid.'
    },
    {
      id: 'box-16',
      name: 'The Signature',
      nameAr: 'علبة ١٦ حبة',
      pieces: 16,
      price: 1500,
      tag: 'For gifting',
      desc: 'Sixteen pieces laid in a gold tray and finished with a hand-tied ribbon.'
    },
    {
      id: 'box-18',
      name: 'The Deluxe',
      nameAr: 'علبة ١٨ حبة',
      pieces: 18,
      price: 1650,
      tag: 'For sharing',
      desc: 'Eighteen pieces in a deep tray, ribbon-tied for giving.'
    },
    {
      id: 'box-60',
      name: 'The Grand',
      nameAr: 'علبة ٦٠ حبة',
      pieces: 60,
      price: 5200,
      tag: 'Celebrations',
      desc: 'Sixty pieces, tray upon tray. Weddings, offices, and occasions that matter.'
    }
  ];

  /* ═══ CHOCOLATES ═══
     The thirteen bonbons from the Louvion range. `base` / `accent` /
     `finish` are taken from how each piece actually looks — they drive
     the hand-drawn SVG in app.js, so there are no photo files to manage
     and nothing loads from a third-party server.

     finish: 'speckle' gold flecks · 'marble' swirled shell
             'drizzle' piped lines · 'plain' polished shell */
  var CHOCOLATES = [
    {
      id: 'nutella-hazelnut',
      name: 'Nutella & Hazelnut',
      nameAr: 'نوتيلا بالبندق',
      desc: 'Nutella and roasted hazelnut in a dark shell.',
      base: '#6d2b56', accent: '#d4af37', finish: 'speckle'
    },
    {
      id: 'pistachio-kunafa',
      name: 'Pistachio Kunafa',
      nameAr: 'بستاشيو كنافة',
      desc: 'Pistachio cream with crisp kunafa through it.',
      base: '#6f7a2e', accent: '#d4af37', finish: 'speckle'
    },
    {
      id: 'blueberry',
      name: 'Blueberry',
      nameAr: 'بلوبيري',
      desc: 'Sharp blueberry against milk chocolate.',
      base: '#2f6fb5', accent: '#8fc0ea', finish: 'marble'
    },
    {
      id: 'pecan',
      name: 'Pecan',
      nameAr: 'بيكان',
      desc: 'Caramelised pecan in a milk chocolate shell.',
      base: '#5c3a1e', accent: '#e0a53c', finish: 'drizzle'
    },
    {
      id: 'raspberry',
      name: 'Raspberry',
      nameAr: 'رازبيري',
      desc: 'Raspberry pulp, bright and clean.',
      base: '#b5537a', accent: '#efa8c2', finish: 'marble'
    },
    {
      id: 'strawberry',
      name: 'Strawberry',
      nameAr: 'فراولة',
      desc: 'Strawberry cream in a deep berry shell.',
      base: '#7a2148', accent: '#d94f6e', finish: 'marble'
    },
    {
      id: 'cheesecake',
      name: 'Cheesecake',
      nameAr: 'تشيزكيك',
      desc: 'Baked cheesecake and berry, in one piece.',
      base: '#d18aa4', accent: '#f6d7e1', finish: 'marble'
    },
    {
      id: 'raffaello',
      name: 'Raffaello',
      nameAr: 'رفايللو',
      desc: 'Coconut and almond in white chocolate.',
      base: '#3f6bb0', accent: '#ffffff', finish: 'marble'
    },
    {
      id: 'pistachio',
      name: 'Pistachio',
      nameAr: 'بستاشيو',
      desc: 'Pure pistachio praline, barely sweet.',
      base: '#5f7f3a', accent: '#a8c473', finish: 'marble'
    },
    {
      id: 'bueno',
      name: 'Bueno',
      nameAr: 'بوينو',
      desc: 'Hazelnut cream and wafer, in a dark shell.',
      base: '#1e2547', accent: '#c9a227', finish: 'speckle'
    },
    {
      id: 'pomegranate',
      name: 'Pomegranate',
      nameAr: 'رمان',
      desc: 'Pomegranate, tart against the chocolate.',
      base: '#8c1f2f', accent: '#d1495b', finish: 'marble'
    },
    {
      id: 'italian',
      name: 'Italian Filling',
      nameAr: 'حشوة ايطالية',
      desc: 'Hazelnut and chocolate, the Italian way.',
      base: '#c9663a', accent: '#f0a868', finish: 'marble'
    },
    {
      id: 'nuts',
      name: 'Mixed Nuts',
      nameAr: 'مكسرات',
      desc: 'Almond, cashew and walnut in milk chocolate.',
      base: '#4a2d1c', accent: '#e8d9b8', finish: 'plain'
    }
  ];

  /* ═══ BARS ═══
     Solid Belgian bars, sold by the unit — not filled like a box. Their
     photos live in assets/chocolates/<id>.jpg, same as the bonbons.

     ⚠ PRICES ARE PLACEHOLDERS (integer hundredths) — set Louvion's real
     bar prices before taking orders. */
  var BARS = [
    {
      id: 'bar-dark',
      name: 'Belgian Dark',
      nameAr: 'شوكولاتة بلجيكية داكنة',
      price: 250,
      desc: 'Belgian dark chocolate, deep and clean.'
    },
    {
      id: 'bar-milk',
      name: 'Belgian Milk',
      nameAr: 'شوكولاتة بلجيكية بالحليب',
      price: 250,
      desc: 'Smooth Belgian milk chocolate.'
    },
    {
      id: 'bar-plain',
      name: 'House Blend',
      nameAr: 'شوكولاتة بلجيكية',
      price: 200,
      desc: 'Our everyday Belgian bar.'
    }
  ];

  /* ═══ DELIVERY ═══
     Shared so the basket total the customer sees and the total the
     server charges can never disagree. Also a placeholder — set these
     to Louvion's real delivery terms. */
  var SHIPPING = { flat: 200, freeOver: 3000 };

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
  function barById(id) {
    for (var i = 0; i < BARS.length; i++) if (BARS[i].id === id) return BARS[i];
    return null;
  }

  /* Prices are integer hundredths everywhere. Only formatted for display. */
  function formatPrice(cents) {
    return CURRENCY.symbol + (cents / 100).toFixed(CURRENCY.decimals);
  }

  return {
    BRAND: BRAND,
    CURRENCY: CURRENCY,
    BOXES: BOXES,
    CHOCOLATES: CHOCOLATES,
    BARS: BARS,
    SHIPPING: SHIPPING,
    ORDER_STATUSES: ORDER_STATUSES,
    boxById: boxById,
    chocolateById: chocolateById,
    barById: barById,
    formatPrice: formatPrice
  };
});
