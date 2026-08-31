/* ═══════════════════════════════════════════════════════════════════
   LOUVION — CLIENT
   Plain functions and module-level state. No framework, no build step.

   Two rules this file keeps, because the site runs under a strict CSP
   (script-src 'self'; style-src 'self' — no 'unsafe-inline'):
     1. No inline onclick="" in the HTML. Everything is wired through the
        one delegated listener in initActions(), keyed on data-action.
     2. No style="" attributes written into innerHTML. Dynamic values go
        through el.style.setProperty(), which CSP allows.

   Everything the server sends back is escaped with esc() before it is
   interpolated into markup.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Runs immediately, not on DOMContentLoaded: it must beat the first paint
     so the reveal styles apply without content flashing in and back out. */
  document.documentElement.classList.add('js');

  var CAT = window.LOUVION_CATALOG;
  var money = CAT.formatPrice;

  /* ═══ STATE ═══ */

  var CART_KEY = 'lv-cart';

  var session = { user: null, csrfToken: null };
  var cart = [];                       /* [{ boxId, qty, chocolates:[{id,qty}] }] */
  var builder = { boxId: null, picks: {} };  /* picks: { chocolateId: qty } */
  var adminData = { orders: [], stats: null, filter: 'all', query: '' };
  var drawerMode = 'cart';             /* 'cart' | 'checkout' | 'done' */
  var lastOrder = null;

  /* ═══ UTIL ═══ */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* Every piece of text that reaches innerHTML goes through this. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* Same as esc(), but keeps the line breaks in an address or gift note. */
  function escMultiline(value) {
    return esc(value).replace(/\n/g, '<br>');
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function pluralPieces(n) { return n + (n === 1 ? ' piece' : ' pieces'); }

  /* Mix a hex colour toward white (amt > 0) or black (amt < 0). */
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255;
    var p = Math.abs(amt);
    r = Math.round((t - r) * p + r);
    g = Math.round((t - g) * p + g);
    b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ═══ API ═══ */

  async function api(path, options) {
    var opts = options || {};
    var headers = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (session.csrfToken) headers['X-CSRF-Token'] = session.csrfToken;

    var res;
    try {
      res = await fetch(path, {
        method: opts.method || 'GET',
        credentials: 'same-origin',
        headers: headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
      });
    } catch (err) {
      throw new Error('Could not reach the server. Check your connection.');
    }

    var data = {};
    try { data = await res.json(); } catch (err) { data = {}; }

    if (!res.ok) {
      var e = new Error(data.error || 'Something went wrong.');
      e.status = res.status;
      throw e;
    }
    return data;
  }

  async function loadSession() {
    try {
      var data = await api('/api/auth/me');
      session.user = data.user;
      session.csrfToken = data.csrfToken;
    } catch (err) {
      session.user = null;
      session.csrfToken = null;
    }
  }

  /* ═══ SVG ART ═══
     The chocolates are drawn, not photographed: nothing loads from a
     third party and the pieces stay crisp at any size. Colours come from
     the catalogue entry, so a new flavour needs no new asset. */

  function chocolateSVG(c) {
    var light = shade(c.base, 0.24);
    var dark = shade(c.base, -0.28);
    var gid = 'cg-' + c.id;

    var defs =
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0.35" y2="1">' +
      '<stop offset="0" stop-color="' + light + '"/>' +
      '<stop offset="0.55" stop-color="' + c.base + '"/>' +
      '<stop offset="1" stop-color="' + dark + '"/>' +
      '</linearGradient></defs>';

    var fill = 'url(#' + gid + ')';
    var body = '';

    if (c.shape === 'dome') {
      body =
        '<ellipse cx="50" cy="73" rx="33" ry="8" fill="' + dark + '"/>' +
        '<path d="M17 73 C17 38 30 22 50 22 C70 22 83 38 83 73 Z" fill="' + fill + '"/>' +
        '<ellipse cx="38" cy="41" rx="9" ry="5" fill="#ffffff" opacity="0.22" transform="rotate(-30 38 41)"/>';
    } else if (c.shape === 'round') {
      body =
        '<ellipse cx="50" cy="80" rx="27" ry="5" fill="' + dark + '" opacity="0.45"/>' +
        '<circle cx="50" cy="51" r="30" fill="' + fill + '"/>' +
        '<ellipse cx="39" cy="39" rx="9" ry="5.5" fill="#ffffff" opacity="0.2" transform="rotate(-30 39 39)"/>';
    } else if (c.shape === 'square') {
      body =
        '<rect x="18" y="27" width="64" height="50" rx="6" fill="' + fill + '"/>' +
        '<rect x="26" y="34" width="48" height="18" rx="3" fill="' + light + '" opacity="0.28"/>' +
        '<rect x="18" y="70" width="64" height="7" rx="3" fill="' + dark + '" opacity="0.5"/>';
    } else if (c.shape === 'oval') {
      body =
        '<ellipse cx="50" cy="78" rx="30" ry="5" fill="' + dark + '" opacity="0.45"/>' +
        '<ellipse cx="50" cy="51" rx="34" ry="24" fill="' + fill + '"/>' +
        '<ellipse cx="38" cy="42" rx="10" ry="5" fill="#ffffff" opacity="0.2" transform="rotate(-20 38 42)"/>';
    } else {
      body =
        '<rect x="13" y="33" width="74" height="38" rx="5" fill="' + fill + '"/>' +
        '<rect x="13" y="33" width="74" height="10" rx="5" fill="' + light + '" opacity="0.32"/>' +
        '<g stroke="' + dark + '" stroke-width="1.6" opacity="0.5">' +
        '<line x1="37" y1="37" x2="37" y2="67"/>' +
        '<line x1="50" y1="37" x2="50" y2="67"/>' +
        '<line x1="63" y1="37" x2="63" y2="67"/></g>';
    }

    var finish = '';
    if (c.finish === 'drizzle') {
      finish =
        '<g fill="none" stroke="' + c.accent + '" stroke-width="2.8" stroke-linecap="round" opacity="0.92">' +
        '<path d="M27 43 q9 -7 18 0 t18 0"/>' +
        '<path d="M29 54 q9 -7 18 0 t18 0"/></g>';
    } else if (c.finish === 'dust') {
      finish =
        '<g fill="' + c.accent + '" opacity="0.55">' +
        '<circle cx="36" cy="38" r="1.8"/><circle cx="47" cy="33" r="1.4"/>' +
        '<circle cx="59" cy="40" r="1.9"/><circle cx="42" cy="50" r="1.5"/>' +
        '<circle cx="64" cy="53" r="1.5"/><circle cx="52" cy="59" r="1.7"/>' +
        '<circle cx="33" cy="57" r="1.3"/></g>';
    } else if (c.finish === 'nut') {
      finish =
        '<g transform="rotate(-18 50 40)">' +
        '<ellipse cx="50" cy="40" rx="12" ry="7.5" fill="' + c.accent + '"/>' +
        '<path d="M41 40 q9 -4.5 18 0" fill="none" stroke="' + shade(c.accent, -0.32) + '" stroke-width="1.3"/>' +
        '</g>';
    } else if (c.finish === 'shard') {
      finish =
        '<polygon points="38,38 51,29 49,45" fill="' + c.accent + '" opacity="0.95"/>' +
        '<polygon points="54,42 67,36 60,50" fill="' + shade(c.accent, 0.16) + '" opacity="0.85"/>';
    } else if (c.finish === 'gold') {
      finish =
        '<polygon points="44,33 58,28 63,38 49,44" fill="#d9b45c"/>' +
        '<polygon points="48,35 57,31 60,37" fill="#f2dc9d" opacity="0.85"/>';
    }

    return '<svg class="choc-art" viewBox="0 0 100 100" role="img" aria-label="' +
      esc(c.name) + '" focusable="false">' + defs + body + finish + '</svg>';
  }

  /* An open box seen from above, with the real piece count laid out in a
     real grid — so a 9 and a 64 look as different as they are. */
  var BOX_LAYOUT = { 3: 3, 9: 3, 16: 4, 64: 8 };
  var BOX_TONES = ['#4a2d1c', '#6b4226', '#8a5a34', '#3a2317', '#a07a5c'];

  function boxSVG(box) {
    var cols = BOX_LAYOUT[box.pieces] || Math.ceil(Math.sqrt(box.pieces));
    var rows = Math.ceil(box.pieces / cols);

    var W = 200, H = 140;
    var innerX = 16, innerY = 18, innerW = W - 32, innerH = H - 36;
    var cell = Math.min(innerW / cols, innerH / rows);
    var gridW = cell * cols, gridH = cell * rows;
    var offX = innerX + (innerW - gridW) / 2;
    var offY = innerY + (innerH - gridH) / 2;
    var r = cell * 0.33;

    var pieces = '';
    for (var i = 0; i < box.pieces; i++) {
      var cx = offX + (i % cols) * cell + cell / 2;
      var cy = offY + Math.floor(i / cols) * cell + cell / 2;
      var tone = BOX_TONES[i % BOX_TONES.length];
      pieces +=
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) +
        '" fill="' + tone + '"/>' +
        '<circle cx="' + (cx - r * 0.3).toFixed(1) + '" cy="' + (cy - r * 0.3).toFixed(1) +
        '" r="' + (r * 0.28).toFixed(1) + '" fill="#ffffff" opacity="0.16"/>';
    }

    return '<svg class="box-card__art" viewBox="0 0 200 140" role="img" aria-label="' +
      esc(box.name) + ', ' + box.pieces + ' pieces" focusable="false">' +
      '<rect x="4" y="6" width="192" height="128" rx="7" fill="#3a2317"/>' +
      '<rect x="10" y="12" width="180" height="116" rx="5" fill="#5a3722"/>' +
      '<rect x="' + innerX + '" y="' + innerY + '" width="' + innerW + '" height="' + innerH +
      '" rx="3" fill="#f3ece1"/>' +
      pieces +
      '</svg>';
  }

  /* ═══ TOAST ═══ */

  function toast(message, kind) {
    var host = $('#toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="toast__dot"></span><span>' + esc(message) + '</span>';
    host.appendChild(el);
    setTimeout(function () {
      el.style.setProperty('opacity', '0');
      setTimeout(function () { el.remove(); }, 220);
    }, 3200);
  }

  /* ═══ HEADER ═══ */

  function renderHeader() {
    var adminLink = $('#navAdmin');
    if (adminLink) adminLink.hidden = !(session.user && session.user.role === 'admin');

    var accountLink = $('#navAccount');
    if (accountLink) {
      accountLink.textContent = session.user ? 'Account' : 'Sign in';
    }
  }

  function initNavToggle() {
    var toggle = $('#navToggle');
    var nav = $('#nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ═══ CART ═══ */

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(raw)) { cart = []; return; }
      /* Re-validate against the catalogue: a stale basket must never make
         it as far as the server. */
      cart = raw.filter(function (line) {
        if (!line || typeof line !== 'object') return false;
        var box = CAT.boxById(line.boxId);
        if (!box) return false;
        if (!Array.isArray(line.chocolates) || !line.chocolates.length) return false;
        var total = 0;
        for (var i = 0; i < line.chocolates.length; i++) {
          var entry = line.chocolates[i];
          if (!entry || !CAT.chocolateById(entry.id)) return false;
          if (!Number.isInteger(entry.qty) || entry.qty < 1) return false;
          total += entry.qty;
        }
        if (total !== box.pieces) return false;
        return Number.isInteger(line.qty) && line.qty >= 1 && line.qty <= 20;
      });
    } catch (err) {
      cart = [];
    }
  }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) { /* private mode */ }
    updateCartCount();
  }

  function cartCount() {
    return cart.reduce(function (n, line) { return n + line.qty; }, 0);
  }

  function cartSubtotal() {
    return cart.reduce(function (sum, line) {
      var box = CAT.boxById(line.boxId);
      return sum + (box ? box.price * line.qty : 0);
    }, 0);
  }

  function cartShipping() {
    if (!cart.length) return 0;
    return cartSubtotal() >= CAT.SHIPPING.freeOver ? 0 : CAT.SHIPPING.flat;
  }

  function updateCartCount() {
    var el = $('#cartCount');
    if (!el) return;
    var n = cartCount();
    el.textContent = n;
    el.classList.toggle('is-empty', n === 0);
  }

  function describeLine(line) {
    return line.chocolates.map(function (entry) {
      var choc = CAT.chocolateById(entry.id);
      return (choc ? choc.name : entry.id) + ' ×' + entry.qty;
    }).join(', ');
  }

  function openDrawer(mode) {
    drawerMode = mode || 'cart';
    renderDrawer();
    $('#drawer').classList.add('is-open');
    $('#scrim').classList.add('is-open');
    $('#drawer').setAttribute('aria-hidden', 'false');
    document.body.style.setProperty('overflow', 'hidden');
  }

  function closeDrawer() {
    $('#drawer').classList.remove('is-open');
    $('#scrim').classList.remove('is-open');
    $('#drawer').setAttribute('aria-hidden', 'true');
    document.body.style.removeProperty('overflow');
    if (drawerMode === 'done') { drawerMode = 'cart'; lastOrder = null; }
  }

  function renderDrawer() {
    var body = $('#drawerBody');
    var foot = $('#drawerFoot');
    var title = $('#drawerTitle');
    if (!body) return;

    if (drawerMode === 'done' && lastOrder) {
      title.textContent = 'Order placed';
      body.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state__art">' + boxSVG({ name: 'Order', pieces: 9 }) + '</div>' +
        '<div class="empty-state__title">Thank you — order ' + esc(lastOrder.id) + '</div>' +
        '<p class="empty-state__text">We have your order and will confirm it by email at ' +
        esc(lastOrder.customerEmail) + '. Total ' + esc(money(lastOrder.total)) + '.</p>' +
        '</div>';
      foot.innerHTML =
        '<div class="panel-actions">' +
        '<a class="btn btn--full" href="account.html">View my orders</a>' +
        '<button class="btn btn--ghost btn--full" data-action="close-cart" type="button">Keep shopping</button>' +
        '</div>';
      return;
    }

    if (!cart.length) {
      title.textContent = 'Your box';
      body.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state__art">' + boxSVG({ name: 'Empty box', pieces: 9 }) + '</div>' +
        '<div class="empty-state__title">Nothing chosen yet</div>' +
        '<p class="empty-state__text">Pick a box, then fill it with the pieces you want.</p>' +
        '</div>';
      foot.innerHTML = '<a class="btn btn--full" href="shop.html">Choose a box</a>';
      return;
    }

    if (drawerMode === 'checkout') {
      title.textContent = 'Delivery details';
      body.innerHTML =
        '<div id="checkoutError" hidden></div>' +
        '<form id="checkoutForm" novalidate>' +
        '<div class="field"><label class="label" for="coRecipient">Recipient name</label>' +
        '<input class="input" id="coRecipient" name="recipient" maxlength="80" autocomplete="name" value="' +
        esc(session.user ? session.user.name : '') + '" required></div>' +
        '<div class="field"><label class="label" for="coPhone">Contact number</label>' +
        '<input class="input" id="coPhone" name="phone" maxlength="32" autocomplete="tel" required></div>' +
        '<div class="field"><label class="label" for="coAddress">Delivery address</label>' +
        '<textarea class="textarea" id="coAddress" name="address" maxlength="300" autocomplete="street-address" required></textarea></div>' +
        '<div class="field"><label class="label" for="coNote">Gift note <span class="field-hint">(optional)</span></label>' +
        '<textarea class="textarea" id="coNote" name="note" maxlength="400"></textarea></div>' +
        '</form>';

      foot.innerHTML =
        '<div class="panel-row"><span>Subtotal</span><span>' + esc(money(cartSubtotal())) + '</span></div>' +
        '<div class="panel-row"><span>Delivery</span><span>' +
        (cartShipping() === 0 ? 'Free' : esc(money(cartShipping()))) + '</span></div>' +
        '<div class="panel-row panel-row--total"><span>Total</span><strong>' +
        esc(money(cartSubtotal() + cartShipping())) + '</strong></div>' +
        '<div class="panel-actions">' +
        '<button class="btn btn--full" type="submit" form="checkoutForm" id="placeBtn">Place order</button>' +
        '<button class="btn btn--ghost btn--full" data-action="back-to-cart" type="button">Back</button>' +
        '</div>';

      var form = $('#checkoutForm');
      if (form) form.addEventListener('submit', onPlaceOrder);
      return;
    }

    title.textContent = 'Your box';
    body.innerHTML = cart.map(function (line, index) {
      var box = CAT.boxById(line.boxId);
      return '<div class="cart-line">' +
        '<div class="cart-line__art">' + boxSVG(box) + '</div>' +
        '<div>' +
        '<div class="cart-line__name">' + esc(box.name) + '</div>' +
        '<div class="cart-line__meta">' + pluralPieces(box.pieces) + ' · quantity ' + line.qty + '</div>' +
        '<div class="cart-line__contents">' + esc(describeLine(line)) + '</div>' +
        '</div>' +
        '<div class="cart-line__right">' +
        '<div class="cart-line__price">' + esc(money(box.price * line.qty)) + '</div>' +
        '<button class="text-btn" type="button" data-action="remove-line" data-index="' + index + '">Remove</button>' +
        '</div></div>';
    }).join('');

    var ship = cartShipping();
    foot.innerHTML =
      '<div class="panel-row"><span>Subtotal</span><span>' + esc(money(cartSubtotal())) + '</span></div>' +
      '<div class="panel-row"><span>Delivery</span><span>' +
      (ship === 0 ? 'Free' : esc(money(ship))) + '</span></div>' +
      '<div class="panel-row panel-row--total"><span>Total</span><strong>' +
      esc(money(cartSubtotal() + ship)) + '</strong></div>' +
      '<div class="panel-actions">' +
      '<button class="btn btn--full" type="button" data-action="checkout">' +
      (session.user ? 'Checkout' : 'Sign in to checkout') + '</button>' +
      '<a class="btn btn--ghost btn--full" href="shop.html">Add another box</a>' +
      '</div>';
  }

  async function onPlaceOrder(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var btn = $('#placeBtn');
    var errorBox = $('#checkoutError');

    function showError(message) {
      errorBox.hidden = false;
      errorBox.className = 'form-error';
      errorBox.textContent = message;
    }

    btn.disabled = true;
    btn.textContent = 'Placing order…';
    errorBox.hidden = true;

    try {
      var data = await api('/api/orders', {
        method: 'POST',
        body: {
          items: cart,
          recipient: form.recipient.value,
          phone: form.phone.value,
          address: form.address.value,
          note: form.note.value
        }
      });
      lastOrder = data.order;
      cart = [];
      saveCart();
      drawerMode = 'done';
      renderDrawer();
      toast('Order ' + data.order.id + ' placed', 'ok');
    } catch (err) {
      if (err.status === 401) {
        window.location.href = 'account.html?next=checkout';
        return;
      }
      showError(err.message);
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  }

  /* ═══ HOME ═══ */

  function initHome() {
    var art = $('#heroArt');
    if (art) {
      art.innerHTML = CAT.CHOCOLATES.slice(0, 9).map(function (c) {
        return '<div>' + chocolateSVG(c) + '</div>';
      }).join('');
    }

    var boxes = $('#homeBoxes');
    if (boxes) {
      boxes.innerHTML = CAT.BOXES.map(function (box) {
        return '<a class="box-card reveal" href="shop.html?box=' + encodeURIComponent(box.id) + '">' +
          '<span class="box-card__tag">' + esc(box.tag) + '</span>' +
          boxSVG(box) +
          '<div class="box-card__pieces">' + box.pieces + '<span>pieces</span></div>' +
          '<h3 class="box-card__name">' + esc(box.name) + '</h3>' +
          '<p class="box-card__desc">' + esc(box.desc) + '</p>' +
          '<div class="box-card__foot">' +
          '<span class="box-card__price">' + esc(money(box.price)) + '</span>' +
          '<span class="box-card__cta">Fill this box →</span>' +
          '</div></a>';
      }).join('');
    }

    var collection = $('#homeCollection');
    if (collection) {
      collection.innerHTML = CAT.CHOCOLATES.map(function (c) {
        return '<article class="choc-card reveal">' +
          '<div class="choc-card__art">' + chocolateSVG(c) + '</div>' +
          '<h3 class="choc-card__name">' + esc(c.name) + '</h3>' +
          '<div class="choc-card__family">' + esc(c.family) + ' chocolate</div>' +
          '<p class="choc-card__desc">' + esc(c.desc) + '</p>' +
          '</article>';
      }).join('');
    }
  }

  /* ═══ SHOP ═══ */

  function pickedTotal() {
    return Object.keys(builder.picks).reduce(function (n, id) { return n + builder.picks[id]; }, 0);
  }

  function selectBox(boxId) {
    var box = CAT.boxById(boxId);
    if (!box) return;
    if (builder.boxId !== boxId) builder.picks = {};
    builder.boxId = boxId;
    renderShop();
    var fill = $('#stepFill');
    if (fill) fill.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function adjustPick(chocId, delta) {
    var box = CAT.boxById(builder.boxId);
    if (!box || !CAT.chocolateById(chocId)) return;
    var current = builder.picks[chocId] || 0;
    var next = current + delta;
    if (next < 0) next = 0;
    if (delta > 0 && pickedTotal() >= box.pieces) {
      toast('That box is already full at ' + pluralPieces(box.pieces));
      return;
    }
    if (next === 0) delete builder.picks[chocId];
    else builder.picks[chocId] = next;
    renderShop();
  }

  /* Round out a part-filled box evenly across what's already chosen —
     or across the whole collection if nothing is. */
  function fillRemaining() {
    var box = CAT.boxById(builder.boxId);
    if (!box) return;
    var remaining = box.pieces - pickedTotal();
    if (remaining <= 0) return;

    var pool = Object.keys(builder.picks);
    if (!pool.length) pool = CAT.CHOCOLATES.map(function (c) { return c.id; });

    var i = 0;
    while (remaining > 0) {
      var id = pool[i % pool.length];
      builder.picks[id] = (builder.picks[id] || 0) + 1;
      remaining--;
      i++;
    }
    renderShop();
  }

  function addBuilderToCart() {
    var box = CAT.boxById(builder.boxId);
    if (!box) return;
    if (pickedTotal() !== box.pieces) {
      toast('Choose exactly ' + pluralPieces(box.pieces) + ' first', 'bad');
      return;
    }

    var chocolates = Object.keys(builder.picks).map(function (id) {
      return { id: id, qty: builder.picks[id] };
    });

    /* Same box, same contents → bump the quantity rather than repeat it. */
    var signature = JSON.stringify(chocolates.slice().sort(function (a, b) {
      return a.id < b.id ? -1 : 1;
    }));
    var existing = cart.find(function (line) {
      if (line.boxId !== box.id) return false;
      return JSON.stringify(line.chocolates.slice().sort(function (a, b) {
        return a.id < b.id ? -1 : 1;
      })) === signature;
    });

    if (existing) existing.qty += 1;
    else cart.push({ boxId: box.id, qty: 1, chocolates: chocolates });

    saveCart();
    builder.picks = {};
    renderShop();
    toast(box.name + ' added to your box', 'ok');
    openDrawer('cart');
  }

  function renderShop() {
    var grid = $('#boxGrid');
    if (grid) {
      grid.innerHTML = CAT.BOXES.map(function (box) {
        return '<button class="box-card' + (builder.boxId === box.id ? ' is-selected' : '') +
          '" type="button" data-action="select-box" data-box-id="' + esc(box.id) +
          '" aria-pressed="' + (builder.boxId === box.id) + '">' +
          '<span class="box-card__tag">' + esc(box.tag) + '</span>' +
          boxSVG(box) +
          '<span class="box-card__pieces">' + box.pieces + '<span>pieces</span></span>' +
          '<h3 class="box-card__name">' + esc(box.name) + '</h3>' +
          '<p class="box-card__desc">' + esc(box.desc) + '</p>' +
          '<span class="box-card__foot">' +
          '<span class="box-card__price">' + esc(money(box.price)) + '</span>' +
          '<span class="box-card__each">' + esc(money(Math.round(box.price / box.pieces))) + ' a piece</span>' +
          '</span></button>';
      }).join('');
    }

    var fillSection = $('#stepFill');
    if (!fillSection) return;

    var box = CAT.boxById(builder.boxId);
    fillSection.hidden = !box;
    if (!box) return;

    var total = pickedTotal();
    var remaining = box.pieces - total;

    var note = $('#fillNote');
    if (note) {
      note.textContent = remaining > 0
        ? remaining + ' more to choose'
        : 'Box full — ready to add';
    }

    var picker = $('#chocPicker');
    if (picker) {
      picker.innerHTML = CAT.CHOCOLATES.map(function (c) {
        var qty = builder.picks[c.id] || 0;
        return '<div class="picker-card' + (qty ? ' is-picked' : '') + '">' +
          '<div class="picker-card__art">' + chocolateSVG(c) + '</div>' +
          '<h3 class="picker-card__name">' + esc(c.name) + '</h3>' +
          '<p class="picker-card__desc">' + esc(c.desc) + '</p>' +
          '<div class="stepper">' +
          '<button class="stepper__btn" type="button" data-action="choc-dec" data-choc-id="' +
          esc(c.id) + '" aria-label="One fewer ' + esc(c.name) + '"' + (qty ? '' : ' disabled') + '>–</button>' +
          '<span class="stepper__value">' + qty + '</span>' +
          '<button class="stepper__btn" type="button" data-action="choc-inc" data-choc-id="' +
          esc(c.id) + '" aria-label="One more ' + esc(c.name) + '"' +
          (remaining <= 0 ? ' disabled' : '') + '>+</button>' +
          '</div></div>';
      }).join('');
    }

    var panelTitle = $('#panelTitle');
    if (panelTitle) panelTitle.textContent = box.name;

    var fillBar = $('#progressFill');
    if (fillBar) fillBar.style.setProperty('--fill', Math.round((total / box.pieces) * 100) + '%');

    var counter = $('#progressCount');
    if (counter) counter.innerHTML = '<strong>' + total + '</strong> of ' + box.pieces + ' chosen';

    var tray = $('#tray');
    if (tray) {
      var ids = Object.keys(builder.picks);
      tray.innerHTML = ids.length
        ? ids.map(function (id) {
            var c = CAT.chocolateById(id);
            var swatchId = 'sw-' + id;
            return '<div class="tray__row">' +
              '<span class="tray__swatch" id="' + esc(swatchId) + '"></span>' +
              '<span class="tray__name">' + esc(c.name) + '</span>' +
              '<span class="tray__qty">×' + builder.picks[id] + '</span>' +
              '</div>';
          }).join('')
        : '<p class="tray__empty">Nothing chosen yet — tap + on any piece.</p>';

      /* CSP forbids style="" in markup, so paint the swatches afterwards. */
      ids.forEach(function (id) {
        var swatch = document.getElementById('sw-' + id);
        var c = CAT.chocolateById(id);
        if (swatch && c) swatch.style.setProperty('background', c.base);
      });
    }

    var priceRow = $('#panelPrice');
    if (priceRow) priceRow.textContent = money(box.price);

    var shipRow = $('#panelShipping');
    if (shipRow) shipRow.textContent = 'Free over ' + money(CAT.SHIPPING.freeOver);

    var addBtn = $('#addToCartBtn');
    if (addBtn) {
      addBtn.disabled = remaining !== 0;
      addBtn.textContent = remaining === 0
        ? 'Add to your box · ' + money(box.price)
        : 'Choose ' + remaining + ' more';
    }

    var fillBtn = $('#fillRestBtn');
    if (fillBtn) {
      fillBtn.hidden = remaining <= 0;
      fillBtn.textContent = "Fill the rest — chef's choice";
    }

    var clearBtn = $('#clearBtn');
    if (clearBtn) clearBtn.hidden = total === 0;
  }

  function initShop() {
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get('box');
    if (wanted && CAT.boxById(wanted)) builder.boxId = wanted;
    renderShop();
    if (params.get('checkout') === '1' && cart.length && session.user) openDrawer('checkout');
  }

  /* ═══ ACCOUNT ═══ */

  function setAuthTab(tab) {
    $$('.tab').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
      btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
    });
    $('#loginPanel').hidden = tab !== 'login';
    $('#registerPanel').hidden = tab !== 'register';
    $('#authError').hidden = true;
  }

  function authError(message) {
    var box = $('#authError');
    box.hidden = false;
    box.className = 'form-error';
    box.textContent = message;
  }

  function nextDestination() {
    var next = new URLSearchParams(window.location.search).get('next');
    if (next === 'admin') return 'admin.html';
    if (next === 'checkout') return 'shop.html?checkout=1';
    return null;
  }

  async function afterAuth() {
    var target = nextDestination();
    if (target) { window.location.href = target; return; }
    if (session.user && session.user.role === 'admin') { window.location.href = 'admin.html'; return; }
    renderAccount();
  }

  async function onLogin(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var btn = $('#loginBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    $('#authError').hidden = true;

    try {
      var data = await api('/api/auth/login', {
        method: 'POST',
        body: { email: form.email.value, password: form.password.value }
      });
      session.user = data.user;
      session.csrfToken = data.csrfToken;
      renderHeader();
      await afterAuth();
    } catch (err) {
      authError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }

  async function onRegister(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var btn = $('#registerBtn');
    btn.disabled = true;
    btn.textContent = 'Creating account…';
    $('#authError').hidden = true;

    try {
      var data = await api('/api/auth/register', {
        method: 'POST',
        body: {
          name: form.name.value,
          email: form.email.value,
          password: form.password.value
        }
      });
      session.user = data.user;
      session.csrfToken = data.csrfToken;
      renderHeader();
      await afterAuth();
    } catch (err) {
      authError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  }

  async function onLogout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (err) { /* clearing anyway */ }
    session.user = null;
    session.csrfToken = null;
    window.location.href = 'index.html';
  }

  function orderCardHTML(order) {
    var lines = order.items.map(function (line) {
      var chocs = line.chocolates.map(function (entry) {
        return esc(entry.name) + ' ×' + entry.qty;
      }).join(', ');
      return '<div class="order-line">' +
        '<span class="order-line__name">' + esc(line.boxName) + ' · ' +
        pluralPieces(line.pieces) + (line.qty > 1 ? ' × ' + line.qty : '') + '</span>' +
        '<span class="order-line__price">' + esc(money(line.lineTotal)) + '</span>' +
        '<span class="order-line__chocs">' + chocs + '</span>' +
        '</div>';
    }).join('');

    return '<article class="order-card">' +
      '<div class="order-card__head">' +
      '<div><div class="order-card__id">' + esc(order.id) + '</div>' +
      '<div class="order-card__date">' + esc(formatDate(order.createdAt)) + '</div></div>' +
      '<span class="badge badge--' + esc(order.status) + '">' + esc(order.status) + '</span>' +
      '</div>' +
      '<div class="order-card__body">' + lines + '</div>' +
      '<div class="order-card__foot"><span>Delivery ' +
      (order.shipping === 0 ? 'free' : esc(money(order.shipping))) +
      '</span><span class="order-card__total">' + esc(money(order.total)) + '</span></div>' +
      '</article>';
  }

  async function renderAccount() {
    var authView = $('#authView');
    var accountView = $('#accountView');

    if (!session.user) {
      authView.hidden = false;
      accountView.hidden = true;
      return;
    }

    authView.hidden = true;
    accountView.hidden = false;
    $('#accountName').textContent = session.user.name;
    $('#accountEmail').textContent = session.user.email;

    var isAdmin = session.user.role === 'admin';
    var adminBadge = $('#accountAdminBadge');
    if (adminBadge) adminBadge.hidden = !isAdmin;
    var adminLink = $('#accountAdminLink');
    if (adminLink) adminLink.hidden = !isAdmin;

    var list = $('#orderList');
    list.innerHTML = '<p class="tray__empty">Loading your orders…</p>';

    try {
      var data = await api('/api/orders');
      list.innerHTML = data.orders.length
        ? data.orders.map(orderCardHTML).join('')
        : '<div class="empty-state"><div class="empty-state__title">No orders yet</div>' +
          '<p class="empty-state__text">When you order a box it will appear here.</p>' +
          '<p class="empty-state__text"><a class="link-quiet" href="shop.html">Browse the boxes</a></p></div>';
    } catch (err) {
      list.innerHTML = '<div class="form-error">' + esc(err.message) + '</div>';
    }
  }

  function initAccount() {
    var loginForm = $('#loginForm');
    var registerForm = $('#registerForm');
    if (loginForm) loginForm.addEventListener('submit', onLogin);
    if (registerForm) registerForm.addEventListener('submit', onRegister);

    if (new URLSearchParams(window.location.search).get('mode') === 'register') {
      setAuthTab('register');
    }
    renderAccount();
  }

  /* ═══ ADMIN ═══ */

  function matchesFilter(order) {
    if (adminData.filter !== 'all' && order.status !== adminData.filter) return false;
    if (!adminData.query) return true;
    var q = adminData.query.toLowerCase();
    return order.id.toLowerCase().indexOf(q) >= 0 ||
      order.customerName.toLowerCase().indexOf(q) >= 0 ||
      order.customerEmail.toLowerCase().indexOf(q) >= 0 ||
      order.recipient.toLowerCase().indexOf(q) >= 0;
  }

  function renderAdmin() {
    var stats = adminData.stats;
    if (stats) {
      $('#statOrders').textContent = stats.total;
      $('#statRevenue').textContent = money(stats.revenue);
      $('#statPending').textContent = stats.counts.pending + stats.counts.confirmed;
      $('#statPieces').textContent = stats.pieces;
    }

    var rows = adminData.orders.filter(matchesFilter);
    var body = $('#adminRows');

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6"><div class="table-empty">' +
        (adminData.orders.length ? 'No orders match this filter.' : 'No orders yet.') +
        '</div></td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (order) {
      var contents = order.items.map(function (line) {
        return '<b>' + esc(line.boxName) + ' (' + line.pieces + ')' +
          (line.qty > 1 ? ' × ' + line.qty : '') + '</b><br>' +
          esc(line.chocolates.map(function (e) { return e.name + ' ×' + e.qty; }).join(', '));
      }).join('<br><br>');

      var options = CAT.ORDER_STATUSES.map(function (s) {
        return '<option value="' + esc(s) + '"' + (s === order.status ? ' selected' : '') + '>' +
          esc(s.charAt(0).toUpperCase() + s.slice(1)) + '</option>';
      }).join('');

      return '<tr>' +
        '<td><div class="table__id">' + esc(order.id) + '</div>' +
        '<div class="table__sub">' + esc(formatDate(order.createdAt)) + '</div></td>' +
        '<td><div>' + esc(order.customerName) + '</div>' +
        '<div class="table__sub">' + esc(order.customerEmail) + '</div></td>' +
        '<td><div>' + esc(order.recipient) + '</div>' +
        '<div class="table__sub">' + esc(order.phone) + '<br>' + escMultiline(order.address) +
        (order.note ? '<br><em>Note: ' + escMultiline(order.note) + '</em>' : '') + '</div></td>' +
        '<td><div class="table__contents">' + contents + '</div></td>' +
        '<td><div class="table__total">' + esc(money(order.total)) + '</div>' +
        '<div class="table__sub">' + (order.shipping === 0 ? 'free delivery' : esc(money(order.shipping)) + ' delivery') + '</div></td>' +
        '<td><span class="badge badge--' + esc(order.status) + '">' + esc(order.status) + '</span>' +
        '<select class="select select--status" data-order-id="' + esc(order.id) +
        '" aria-label="Status for order ' + esc(order.id) + '">' + options + '</select></td>' +
        '</tr>';
    }).join('');
  }

  async function loadAdmin() {
    try {
      var data = await api('/api/admin/orders');
      adminData.orders = data.orders;
      adminData.stats = data.stats;
      renderAdmin();
    } catch (err) {
      if (err.status === 403 || err.status === 401) {
        window.location.href = 'account.html?next=admin';
        return;
      }
      $('#adminRows').innerHTML =
        '<tr><td colspan="6"><div class="table-empty">' + esc(err.message) + '</div></td></tr>';
    }
  }

  async function onStatusChange(event) {
    var select = event.target;
    if (!select.matches('.select--status')) return;
    var orderId = select.dataset.orderId;
    var status = select.value;
    select.disabled = true;

    try {
      var data = await api('/api/admin/orders/' + encodeURIComponent(orderId), {
        method: 'PATCH',
        body: { status: status }
      });
      var index = adminData.orders.findIndex(function (o) { return o.id === orderId; });
      if (index >= 0) adminData.orders[index] = data.order;
      await loadAdmin();
      toast(orderId + ' → ' + status, 'ok');
    } catch (err) {
      toast(err.message, 'bad');
      select.disabled = false;
      await loadAdmin();
    }
  }

  function initAdmin() {
    if (!session.user || session.user.role !== 'admin') {
      window.location.href = 'account.html?next=admin';
      return;
    }
    $('#adminWho').textContent = session.user.email;

    $('#adminRows').addEventListener('change', onStatusChange);

    $('#filterStatus').addEventListener('change', function (event) {
      adminData.filter = event.target.value;
      renderAdmin();
    });

    var search = $('#filterSearch');
    var timer = null;
    search.addEventListener('input', function (event) {
      clearTimeout(timer);
      var value = event.target.value;
      timer = setTimeout(function () {
        adminData.query = value.trim();
        renderAdmin();
      }, 160);
    });

    $('#refreshBtn').addEventListener('click', function () {
      loadAdmin();
      toast('Orders refreshed');
    });

    loadAdmin();
  }

  /* ═══ ACTIONS (one delegated listener — no inline handlers) ═══ */

  function initActions() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      var action = trigger.dataset.action;

      if (action === 'open-cart') { event.preventDefault(); openDrawer('cart'); }
      else if (action === 'close-cart') { event.preventDefault(); closeDrawer(); }
      else if (action === 'back-to-cart') { event.preventDefault(); openDrawer('cart'); }
      else if (action === 'select-box') selectBox(trigger.dataset.boxId);
      else if (action === 'choc-inc') adjustPick(trigger.dataset.chocId, 1);
      else if (action === 'choc-dec') adjustPick(trigger.dataset.chocId, -1);
      else if (action === 'fill-rest') fillRemaining();
      else if (action === 'clear-picks') { builder.picks = {}; renderShop(); }
      else if (action === 'add-to-cart') addBuilderToCart();
      else if (action === 'remove-line') {
        cart.splice(Number(trigger.dataset.index), 1);
        saveCart();
        renderDrawer();
      }
      else if (action === 'checkout') {
        if (!session.user) { window.location.href = 'account.html?next=checkout'; return; }
        openDrawer('checkout');
      }
      else if (action === 'logout') { event.preventDefault(); onLogout(); }
      else if (action === 'auth-tab') setAuthTab(trigger.dataset.tab);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        var drawer = $('#drawer');
        if (drawer && drawer.classList.contains('is-open')) closeDrawer();
      }
    });
  }

  /* ═══ REVEAL ═══ */

  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 120px 0px' });
    items.forEach(function (el) { observer.observe(el); });
  }

  /* ═══ INIT ═══ */

  document.addEventListener('DOMContentLoaded', async function () {
    var page = document.body.dataset.page;

    initActions();
    initNavToggle();
    loadCart();
    updateCartCount();

    await loadSession();
    renderHeader();

    if (page === 'home') initHome();
    else if (page === 'shop') initShop();
    else if (page === 'account') initAccount();
    else if (page === 'admin') initAdmin();

    initReveal();
  });
})();
