/* ═══════════════════════════════════════════
   GAMERX — Main Application
   ═══════════════════════════════════════════ */

// ── Product Catalogue ──
const PRODUCTS = [
  {
    id: 1, name: "PlayStation 5 Disc Edition", category: "consoles",
    price: 499.99, originalPrice: 549.99, rating: 4.9, reviews: 12841,
    ribbon: "hot", inStock: true,
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&q=85",
    desc: "Experience lightning-fast loading with an ultra-high speed SSD, deeper immersion with the DualSense controller, and a whole new generation of incredible PlayStation games.",
    specs: [["Storage","825GB SSD"],["CPU","AMD Zen 2 3.5GHz"],["GPU","AMD RDNA 2 10.28TF"],["RAM","16GB GDDR6"],["Resolution","Up to 8K"]]
  },
  {
    id: 2, name: "Xbox Series X", category: "consoles",
    price: 449.99, originalPrice: null, rating: 4.8, reviews: 9234,
    ribbon: "new", inStock: true,
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=600&q=85",
    desc: "Xbox Series X is the fastest, most powerful Xbox ever. Play thousands of titles across four generations with Smart Delivery and up to 120 FPS gaming.",
    specs: [["Storage","1TB NVMe SSD"],["CPU","AMD Zen 2 3.8GHz"],["GPU","AMD RDNA 2 12TF"],["RAM","16GB GDDR6"],["Resolution","Up to 8K"]]
  },
  {
    id: 3, name: "Nintendo Switch OLED", category: "consoles",
    price: 279.99, originalPrice: 349.99, rating: 4.7, reviews: 18302,
    ribbon: "sale", inStock: true,
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&q=85",
    desc: "Featuring a vibrant 7-inch OLED screen, a wide adjustable stand, a dock with a wired LAN port, 64 GB internal storage, and enhanced audio.",
    specs: [["Screen","7\" OLED"],["Storage","64GB"],["Battery","4.5–9 hrs"],["Weight","420g"],["Modes","TV, Tabletop, Handheld"]]
  },
  {
    id: 4, name: "PS5 DualSense Edge Controller", category: "peripherals",
    price: 199.99, originalPrice: 229.99, rating: 4.7, reviews: 4521,
    ribbon: "sale", inStock: true,
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=85",
    desc: "The DualSense Edge wireless controller is PlayStation's ultra-customizable controller that lets you tailor your setup for your personal playstyle.",
    specs: [["Connection","USB-C / Wireless"],["Battery","~6 hrs"],["Compatibility","PS5, PC"],["Features","Haptic Feedback, Adaptive Triggers"],["Weight","325g"]]
  },
  {
    id: 5, name: "SteelSeries Arctis Nova Pro", category: "peripherals",
    price: 249.99, originalPrice: 299.99, rating: 4.8, reviews: 7102,
    ribbon: "hot", inStock: true,
    image: "https://images.unsplash.com/photo-1583394293253-4e8ccb4aefd9?w=600&q=85",
    desc: "Premium gaming headset featuring hot-swappable battery system, premium hi-fi drivers, multiplatform compatibility, and active noise cancellation.",
    specs: [["Drivers","40mm Neodymium"],["Frequency","10–40,000Hz"],["Connection","USB / 2.4GHz / BT"],["Mic","ClearCast Gen 2"],["Weight","338g"]]
  },
  {
    id: 6, name: "Razer BlackWidow V4 Pro", category: "peripherals",
    price: 229.99, originalPrice: 279.99, rating: 4.8, reviews: 3876,
    ribbon: "sale", inStock: true,
    image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&q=85",
    desc: "A wireless mechanical gaming keyboard with Razer's iconic Green switches, a multi-function roller, and per-key RGB Chroma lighting in an all-metal build.",
    specs: [["Switches","Razer Green Mechanical"],["Lighting","Per-Key RGB"],["Battery","200 hours"],["Connection","2.4GHz / Bluetooth / USB"],["Keys","110 Keys"]]
  },
  {
    id: 7, name: "Logitech G Pro X Superlight 2", category: "peripherals",
    price: 159.99, originalPrice: null, rating: 4.9, reviews: 11204,
    ribbon: "hot", inStock: true,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&q=85",
    desc: "The lightest pro gaming mouse ever. Used by the world's top esports athletes. Ultra-lightweight at under 60g with HERO 25K sensor.",
    specs: [["Sensor","HERO 25K"],["DPI","100–25,600"],["Weight","< 60g"],["Buttons","5 Programmable"],["Connection","2.4GHz Lightspeed"]]
  },
  {
    id: 8, name: "Elden Ring Shadow of the Erdtree", category: "games",
    price: 59.99, originalPrice: 79.99, rating: 4.9, reviews: 24532,
    ribbon: "hot", inStock: true,
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=85",
    desc: "Journey through a shattered world of awe-inspiring landscapes and dungeons in FromSoftware's critically acclaimed action RPG.",
    specs: [["Platform","PS5, Xbox, PC"],["Genre","Action RPG"],["Players","1 + Co-op"],["Rating","M for Mature"],["Size","~60GB"]]
  },
  {
    id: 9, name: "Cyberpunk 2077 Ultimate Edition", category: "games",
    price: 49.99, originalPrice: 69.99, rating: 4.7, reviews: 18210,
    ribbon: "sale", inStock: true,
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=85",
    desc: "The complete Cyberpunk 2077 experience — the base game plus the Phantom Liberty expansion. A dark future open-world RPG set in Night City.",
    specs: [["Platform","PS5, Xbox, PC"],["Genre","Action RPG"],["Players","Single Player"],["Rating","M for Mature"],["Size","~70GB"]]
  },
  {
    id: 10, name: "Marvel's Spider-Man 2", category: "games",
    price: 69.99, originalPrice: null, rating: 4.8, reviews: 15801,
    ribbon: "new", inStock: true,
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=85",
    desc: "Be both Peter Parker and Miles Morales as they face the ultimate villain, Venom, in this critically acclaimed action-adventure sequel.",
    specs: [["Platform","PS5 Exclusive"],["Genre","Action Adventure"],["Players","Single Player"],["Rating","T for Teen"],["Size","~98GB"]]
  },
  {
    id: 11, name: "ASUS ROG Swift OLED 27\"", category: "monitors",
    price: 799.99, originalPrice: 999.99, rating: 4.8, reviews: 2341,
    ribbon: "sale", inStock: true,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=85",
    desc: "27\" QHD OLED gaming monitor with 240Hz refresh rate, 0.03ms response time, and true blacks. The ultimate competitive gaming display.",
    specs: [["Panel","QHD OLED"],["Size","27 inch"],["Refresh","240Hz"],["Response","0.03ms"],["HDR","DisplayHDR True Black 400"]]
  },
  {
    id: 12, name: "LG UltraGear 4K 144Hz", category: "monitors",
    price: 599.99, originalPrice: null, rating: 4.6, reviews: 4102,
    ribbon: "new", inStock: true,
    image: "https://images.unsplash.com/photo-1593640408182-31c228132ee7?w=600&q=85",
    desc: "32\" 4K UHD Nano IPS gaming monitor with VESA DisplayHDR 600, G-Sync Compatible and FreeSync Premium Pro for butter-smooth visuals.",
    specs: [["Panel","4K Nano IPS"],["Size","32 inch"],["Refresh","144Hz"],["Response","1ms"],["HDR","DisplayHDR 600"]]
  },
  {
    id: 13, name: "SecretLab TITAN Evo 2024", category: "chairs",
    price: 529.00, originalPrice: 599.00, rating: 4.9, reviews: 8678,
    ribbon: "hot", inStock: true,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=85",
    desc: "The ultimate ergonomic gaming chair with 4-way L-ADAPT lumbar support, magnetic memory foam head pillow, and premium NEO Hybrid Leatherette.",
    specs: [["Material","NEO Hybrid Leatherette"],["Recline","85–165°"],["Armrests","4D"],["Weight Capacity","130kg"],["Size","Regular / XL"]]
  },
  {
    id: 14, name: "Herman Miller x Logitech Embody", category: "chairs",
    price: 1495.00, originalPrice: null, rating: 4.8, reviews: 1542,
    ribbon: "lim", inStock: true,
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=85",
    desc: "Engineered specifically for gaming, combining Herman Miller's world-leading ergonomic design with Logitech G's gaming expertise.",
    specs: [["Lumbar","Pixelated Support"],["Recline","94–104°"],["Seat Depth","Adjustable"],["Weight Capacity","136kg"],["Warranty","12 Years"]]
  },
  {
    id: 15, name: "Corsair K100 RGB Wireless", category: "peripherals",
    price: 249.99, originalPrice: 279.99, rating: 4.7, reviews: 2983,
    ribbon: "sale", inStock: true,
    image: "https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=600&q=85",
    desc: "The pinnacle of keyboard innovation — optical-mechanical CORSAIR OPX switches, 24-zone per-key RGB, and up to 200 hours battery life.",
    specs: [["Switches","OPX Optical-Mechanical"],["Battery","200 hours"],["Lighting","24-Zone RGB"],["Connection","2.4GHz / Bluetooth / USB"],["Keys","110 + iCUE Dial"]]
  },
  {
    id: 16, name: "Xbox Series S + 3 Month Game Pass", category: "consoles",
    price: 329.99, originalPrice: 369.99, rating: 4.6, reviews: 7201,
    ribbon: "sale", inStock: true,
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&q=85",
    desc: "Xbox Series S — the smallest, sleekest Xbox ever. Includes 3 months of Xbox Game Pass Ultimate for access to hundreds of games.",
    specs: [["Storage","512GB NVMe SSD"],["Resolution","Up to 1440p"],["FPS","Up to 120"],["Game Pass","3 Months Included"],["Drive","All-Digital"]]
  }
];

// ── State ──
let cart      = JSON.parse(localStorage.getItem('gx-cart')      || '[]');
let wishlist  = JSON.parse(localStorage.getItem('gx-wishlist')  || '[]');
let visibleCount = 8;
let activeFilter = 'all';
let modalQty = 1;
let modalProductId = null;
let countdownEnd = null;

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initCursor();
  initNavbar();
  initHamburger();
  initSearch();
  initCartDrawer();
  initWishlistBtn();
  initModalClose();
  initBackToTop();
  initReveal();
  initFilterTabs();
  renderProducts();
  updateCartUI();
  updateWishlistUI();
  animateMetrics();
  initCountdown();
  initCanvas();
});

/* ════════════════════════════════
   PRELOADER
════════════════════════════════ */
function initPreloader() {
  const el = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 18 + 5;
    fill.style.width = Math.min(pct, 95) + '%';
    if (pct >= 95) {
      clearInterval(iv);
      fill.style.width = '100%';
      setTimeout(() => {
        el.classList.add('hidden');
        document.body.style.overflow = '';
        triggerReveal();
      }, 300);
    }
  }, 120);
  document.body.style.overflow = 'hidden';
}

/* ════════════════════════════════
   CURSOR
════════════════════════════════ */
function initCursor() {
  const c  = document.getElementById('cursor');
  const cf = document.getElementById('cursorFollower');
  if (!c || window.matchMedia('(pointer: coarse)').matches) return;

  let mx = 0, my = 0, fx = 0, fy = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    c.style.left = mx + 'px'; c.style.top = my + 'px';
  });

  const animate = () => {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    cf.style.left = fx + 'px'; cf.style.top = fy + 'px';
    requestAnimationFrame(animate);
  };
  animate();

  document.querySelectorAll('a, button, [role="button"], .prod-card, .cat-hero, .cat-sm').forEach(el => {
    el.addEventListener('mouseenter', () => { c.classList.add('hovered'); cf.classList.add('hovered'); });
    el.addEventListener('mouseleave', () => { c.classList.remove('hovered'); cf.classList.remove('hovered'); });
  });
}

/* ════════════════════════════════
   CANVAS PARTICLES
════════════════════════════════ */
function initCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = -Math.random() * 0.4 - 0.1;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5 ? '99,102,241' : '6,182,212';
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.opacity -= 0.001;
      if (this.opacity <= 0 || this.y < -10) this.reset();
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle = `rgb(${this.color})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(tick);
  };
  tick();
}

/* ════════════════════════════════
   NAVBAR
════════════════════════════════ */
function initNavbar() {
  const nav = document.getElementById('navbar');
  const links = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);

    // Active link on scroll
    const sections = ['home','categories','products','deals','brands','contact'];
    let current = '';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }, { passive: true });

  links.forEach(a => {
    a.addEventListener('click', () => {
      document.getElementById('mobileNav')?.classList.remove('open');
    });
  });
}

/* ════════════════════════════════
   HAMBURGER
════════════════════════════════ */
function initHamburger() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobileNav');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open');
    btn.classList.remove('open');
  }));
}

/* ════════════════════════════════
   SEARCH
════════════════════════════════ */
function initSearch() {
  const toggle  = document.getElementById('searchToggle');
  const bar     = document.getElementById('searchBar');
  const input   = document.getElementById('searchInput');
  const clear   = document.getElementById('searchClear');
  const results = document.getElementById('searchResults');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    bar.classList.toggle('open');
    if (bar.classList.contains('open')) { setTimeout(() => input.focus(), 100); }
    else { input.value = ''; results.innerHTML = ''; results.style.display = 'none'; }
  });

  clear.addEventListener('click', () => {
    input.value = '';
    results.innerHTML = '';
    results.style.display = 'none';
    input.focus();
  });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.style.display = 'none'; results.innerHTML = ''; return; }

    const hits = PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    if (!hits.length) {
      results.style.display = 'block';
      results.innerHTML = `<div class="search-no-results">No products found for "${input.value}"</div>`;
      return;
    }
    results.style.display = 'block';
    results.innerHTML = hits.slice(0,6).map(p => `
      <div class="search-result-item" onclick="openProduct(${p.id}); closeSearchBar()">
        <div class="sr-img"><img src="${p.image}" alt="${p.name}" /></div>
        <div class="sr-info">
          <p class="sr-name">${p.name}</p>
          <p class="sr-price">$${p.price.toFixed(2)}</p>
        </div>
      </div>
    `).join('');
  });

  document.addEventListener('click', e => {
    if (!bar.contains(e.target) && e.target !== toggle) {
      bar.classList.remove('open');
      results.style.display = 'none';
    }
  });
}

function closeSearchBar() {
  document.getElementById('searchBar')?.classList.remove('open');
  document.getElementById('searchResults').style.display = 'none';
}

/* ════════════════════════════════
   REVEAL ANIMATIONS
════════════════════════════════ */
function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => obs.observe(el));
}

function triggerReveal() {
  document.querySelectorAll('.hero-left, .hero-right').forEach(el => {
    setTimeout(() => el.classList.add('visible'), 100);
  });
}

/* ════════════════════════════════
   ANIMATED METRICS
════════════════════════════════ */
function animateMetrics() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.metric-num').forEach(el => {
          const target = +el.dataset.target;
          let cur = 0;
          const step = target / 60;
          const iv = setInterval(() => {
            cur = Math.min(cur + step, target);
            el.textContent = Math.floor(cur).toLocaleString();
            if (cur >= target) clearInterval(iv);
          }, 25);
        });
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  const heroMetrics = document.querySelector('.hero-metrics');
  if (heroMetrics) obs.observe(heroMetrics);
}

/* ════════════════════════════════
   FILTER TABS
════════════════════════════════ */
function initFilterTabs() {
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeFilter = btn.dataset.filter;
      visibleCount = 8;
      renderProducts();
    });
  });
}

function filterProducts(cat) {
  activeFilter = cat;
  visibleCount = 8;
  document.querySelectorAll('.filter-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === cat);
  });
  renderProducts();
  document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ════════════════════════════════
   RENDER PRODUCTS
════════════════════════════════ */
function renderProducts() {
  const grid = document.getElementById('productGrid');
  const loadBtn = document.getElementById('loadMoreBtn');
  const filtered = activeFilter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeFilter);
  const visible = filtered.slice(0, visibleCount);

  grid.innerHTML = visible.map(p => {
    const inCart = cart.some(i => i.id === p.id);
    const inWish = wishlist.includes(p.id);
    const savings = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
    return `
      <article class="prod-card" onclick="openProduct(${p.id})">
        <div class="prod-img-wrap">
          <img
            src="${p.image}"
            alt="${p.name}"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80'"
          />
          ${p.ribbon ? `<span class="prod-ribbon r-${p.ribbon}">${ribbonLabel(p.ribbon)}</span>` : ''}
          <div class="prod-actions">
            <button class="prod-action-btn ${inWish ? 'wishlisted' : ''}"
              onclick="event.stopPropagation(); toggleWishlist(${p.id})"
              aria-label="${inWish ? 'Remove from wishlist' : 'Add to wishlist'}"
              id="wish-${p.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${inWish ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button class="prod-action-btn" onclick="event.stopPropagation(); openProduct(${p.id})" aria-label="Quick view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
        <div class="prod-info">
          <div class="prod-meta">
            <span class="prod-cat">${p.category}</span>
            <span class="prod-rating-mini"><span class="star-fill">★</span> ${p.rating}</span>
          </div>
          <h3 class="prod-name">${p.name}</h3>
          <div class="prod-footer">
            <div class="prod-pricing">
              ${p.originalPrice ? `<span class="prod-original">$${p.originalPrice.toFixed(2)}</span>` : ''}
              <span class="prod-price">$${p.price.toFixed(2)}</span>
            </div>
            <button class="prod-atc ${inCart ? 'in-cart' : ''}" id="atc-${p.id}"
              onclick="event.stopPropagation(); addToCart(${p.id})"
              aria-label="Add to cart">
              ${inCart
                ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
                : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
              }
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  if (loadBtn) loadBtn.style.display = filtered.length > visibleCount ? 'inline-flex' : 'none';
}

function ribbonLabel(r) {
  return { hot:'🔥 Hot', new:'✦ New', sale:'Sale', lim:'Limited' }[r] || r;
}

function loadMore() {
  visibleCount += 8;
  renderProducts();
}

/* ════════════════════════════════
   PRODUCT MODAL
════════════════════════════════ */
function openProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  modalProductId = id;
  modalQty = 1;

  const savings = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const inWish = wishlist.includes(p.id);
  const inCart = cart.some(i => i.id === p.id);

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-img">
      <img src="${p.image}" alt="${p.name}" />
    </div>
    <div class="modal-info">
      <p class="modal-cat">${p.category}</p>
      <h2 class="modal-name">${p.name}</h2>
      <div class="modal-rating">
        <span class="modal-stars">${'★'.repeat(Math.floor(p.rating))}${ p.rating % 1 >= 0.5 ? '½' : ''}</span>
        <span class="modal-reviews">${p.rating} · ${p.reviews.toLocaleString()} reviews</span>
      </div>
      <div class="modal-pricing">
        ${p.originalPrice ? `<p class="modal-orig">Was $${p.originalPrice.toFixed(2)}</p>` : ''}
        <span class="modal-price">$${p.price.toFixed(2)}</span>
        ${savings ? `<span class="modal-save">Save ${savings}%</span>` : ''}
      </div>
      <div class="modal-divider"></div>
      <p class="modal-desc">${p.desc}</p>
      ${p.specs ? `
        <div class="modal-specs">
          <h4>Specifications</h4>
          ${p.specs.map(([k,v]) => `<div class="spec-row"><span>${k}</span><span>${v}</span></div>`).join('')}
        </div>
      ` : ''}
      <div class="modal-divider"></div>
      <div class="modal-qty-section">
        <span class="modal-qty-label">Quantity</span>
        <div class="modal-qty-controls">
          <button class="mq-btn" onclick="changeModalQty(-1)">−</button>
          <span class="mq-num" id="modalQtyDisplay">1</span>
          <button class="mq-btn" onclick="changeModalQty(1)">+</button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-glow" onclick="addToCartFromModal()">
          Add to Cart
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
        </button>
        <button class="btn btn-ghost ${inWish ? 'wishlisted-modal' : ''}" onclick="toggleWishlist(${p.id})" id="modalWishBtn" aria-label="Wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${inWish ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
    </div>
  `;

  document.getElementById('productModal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function changeModalQty(d) {
  modalQty = Math.max(1, Math.min(99, modalQty + d));
  const el = document.getElementById('modalQtyDisplay');
  if (el) el.textContent = modalQty;
}

function addToCartFromModal() {
  if (!modalProductId) return;
  addToCart(modalProductId, modalQty);
  closeModal();
}

function initModalClose() {
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCart(); closeWishlist(); } });
}

function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('visible');
  if (!document.getElementById('cartDrawer').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

/* ════════════════════════════════
   CART
════════════════════════════════ */
function initCartDrawer() {
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('drawerClose').addEventListener('click', closeCart);
  document.getElementById('drawerOverlay').addEventListener('click', () => { closeCart(); closeWishlist(); });
}

function openCart() {
  renderCartItems();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  if (!document.getElementById('wishlistDrawer').classList.contains('open')) {
    document.getElementById('drawerOverlay').classList.remove('visible');
    document.body.style.overflow = '';
  }
}

function addToCart(productId, qty = 1) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) existing.qty += qty;
  else cart.push({ id: p.id, qty });
  saveCart();
  updateCartUI();
  renderProducts();
  showToast('Added to Cart!', p.name, '🛒');
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
  renderProducts();
}

function changeQty(id, d) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(0, item.qty + d);
  if (item.qty === 0) { removeFromCart(id); return; }
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() { localStorage.setItem('gx-cart', JSON.stringify(cart)); }

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartBadge').textContent = total;
  document.getElementById('drawerCount').textContent = `(${total})`;
}

function renderCartItems() {
  const list = document.getElementById('cartItemsList');
  const empty = document.getElementById('cartEmptyState');
  const footer = document.getElementById('drawerFooter');

  if (!cart.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    footer.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  footer.style.display = 'block';

  list.innerHTML = cart.map(item => {
    const p = PRODUCTS.find(x => x.id === item.id);
    if (!p) return '';
    return `
      <div class="cart-item-row">
        <div class="ci-img"><img src="${p.image}" alt="${p.name}" /></div>
        <div class="ci-details">
          <p class="ci-cat">${p.category}</p>
          <p class="ci-name">${p.name}</p>
          <div class="ci-controls">
            <button class="ci-qty-btn" onclick="changeQty(${p.id},-1)">−</button>
            <span class="ci-qty">${item.qty}</span>
            <button class="ci-qty-btn" onclick="changeQty(${p.id},1)">+</button>
          </div>
        </div>
        <div class="ci-right">
          <span class="ci-price">$${(p.price * item.qty).toFixed(2)}</span>
          <button class="ci-remove" onclick="removeFromCart(${p.id})" aria-label="Remove">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  const sub = cart.reduce((s, i) => { const p = PRODUCTS.find(x => x.id === i.id); return s + (p ? p.price * i.qty : 0); }, 0);
  const ship = sub >= 50 ? 0 : 9.99;
  document.getElementById('summarySubtotal').textContent = '$' + sub.toFixed(2);
  document.getElementById('summaryShipping').textContent = ship === 0 ? 'FREE' : '$' + ship.toFixed(2);
  document.getElementById('summaryShipping').className = ship === 0 ? 'text-green' : '';
  document.getElementById('summaryTotal').textContent  = '$' + (sub + ship).toFixed(2);
}

function handleCheckout() {
  if (!cart.length) return;
  showToast('Order Placed!', 'Thank you for shopping with GamerX 🎮', '✅');
  setTimeout(() => {
    cart = [];
    saveCart();
    updateCartUI();
    renderCartItems();
    renderProducts();
    closeCart();
  }, 1200);
}

/* ════════════════════════════════
   WISHLIST
════════════════════════════════ */
function initWishlistBtn() {
  document.getElementById('wishlistBtn').addEventListener('click', openWishlist);
}

function toggleWishlist(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const idx = wishlist.indexOf(id);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast('Removed', `${p.name} removed from wishlist`, '🤍');
  } else {
    wishlist.push(id);
    showToast('Wishlisted!', `${p.name} saved to wishlist`, '❤️');
  }
  localStorage.setItem('gx-wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
  renderProducts();
  // Update modal wish button if open
  const mwb = document.getElementById('modalWishBtn');
  if (mwb) {
    const inWish = wishlist.includes(id);
    mwb.querySelector('svg').setAttribute('fill', inWish ? 'currentColor' : 'none');
  }
}

function updateWishlistUI() {
  const dot = document.getElementById('wishlistDot');
  const cnt = document.getElementById('wishlistCount');
  if (dot) dot.style.display = wishlist.length ? 'block' : 'none';
  if (cnt) cnt.textContent = `(${wishlist.length})`;
}

function openWishlist() {
  renderWishlistItems();
  document.getElementById('wishlistDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeWishlist() {
  document.getElementById('wishlistDrawer').classList.remove('open');
  if (!document.getElementById('cartDrawer').classList.contains('open')) {
    document.getElementById('drawerOverlay').classList.remove('visible');
    document.body.style.overflow = '';
  }
}

function renderWishlistItems() {
  const body = document.getElementById('wishlistBody');
  if (!wishlist.length) {
    body.innerHTML = `
      <div class="cart-empty-state">
        <div class="empty-illustration">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <h3>Wishlist is empty</h3>
        <p>Save products you love by clicking the heart icon.</p>
        <button class="btn btn-glow" onclick="closeWishlist()">Browse Products</button>
      </div>
    `;
    return;
  }
  body.innerHTML = wishlist.map(id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return '';
    return `
      <div class="cart-item-row">
        <div class="ci-img"><img src="${p.image}" alt="${p.name}" /></div>
        <div class="ci-details">
          <p class="ci-cat">${p.category}</p>
          <p class="ci-name">${p.name}</p>
          <button class="btn btn-glow" style="padding:7px 14px;font-size:10px;margin-top:8px" onclick="addToCart(${p.id}); closeWishlist()">Add to Cart</button>
        </div>
        <div class="ci-right">
          <span class="ci-price">$${p.price.toFixed(2)}</span>
          <button class="ci-remove" onclick="toggleWishlist(${p.id})" aria-label="Remove">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ════════════════════════════════
   TOAST NOTIFICATIONS
════════════════════════════════ */
function showToast(title, msg, icon = '✦') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-text">
      <p class="toast-title">${title}</p>
      ${msg ? `<p class="toast-msg">${msg}</p>` : ''}
    </div>
    <button class="toast-close" onclick="removeToast(this.closest('.toast'))">✕</button>
    <div class="toast-progress" id="tp-${Date.now()}"></div>
  `;
  container.appendChild(t);

  const prog = t.querySelector('.toast-progress');
  prog.style.transition = 'width 3s linear';
  prog.style.width = '100%';
  requestAnimationFrame(() => { prog.style.width = '0%'; });

  const timeout = setTimeout(() => removeToast(t), 3200);
  t._timeout = timeout;
}

function removeToast(el) {
  if (!el) return;
  clearTimeout(el._timeout);
  el.classList.add('removing');
  setTimeout(() => el.remove(), 300);
}

/* ════════════════════════════════
   COUNTDOWN TIMER
════════════════════════════════ */
function initCountdown() {
  const stored = localStorage.getItem('gx-deal-end');
  if (stored && +stored > Date.now()) {
    countdownEnd = +stored;
  } else {
    countdownEnd = Date.now() + (8 * 3600 + 45 * 60) * 1000;
    localStorage.setItem('gx-deal-end', countdownEnd);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);
}

function tickCountdown() {
  const diff = Math.max(0, countdownEnd - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = n => String(n).padStart(2, '0');
  const cdH = document.getElementById('cdH');
  const cdM = document.getElementById('cdM');
  const cdS = document.getElementById('cdS');
  if (cdH) cdH.textContent = pad(h);
  if (cdM) cdM.textContent = pad(m);
  if (cdS) cdS.textContent = pad(s);
}

/* ════════════════════════════════
   NEWSLETTER
════════════════════════════════ */
function handleNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const email = input.value;
  showToast('You\'re In!', `Welcome to the GamerX squad, ${email}`, '🎮');
  input.value = '';
}

/* ════════════════════════════════
   BACK TO TOP
════════════════════════════════ */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
