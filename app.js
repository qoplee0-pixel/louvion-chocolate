// ===== PRODUCT DATA =====
const PRODUCTS = [
  {
    id: 1,
    name: "PlayStation 5 Console",
    category: "consoles",
    price: 499.99,
    originalPrice: 549.99,
    rating: 4.9,
    reviews: 2841,
    badge: "hot",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80"
  },
  {
    id: 2,
    name: "Xbox Series X",
    category: "consoles",
    price: 449.99,
    originalPrice: null,
    rating: 4.8,
    reviews: 1923,
    badge: "new",
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&q=80"
  },
  {
    id: 3,
    name: "Nintendo Switch OLED",
    category: "consoles",
    price: 349.99,
    originalPrice: 399.99,
    rating: 4.7,
    reviews: 3102,
    badge: "sale",
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&q=80"
  },
  {
    id: 4,
    name: "Razer BlackWidow V4 Pro",
    category: "peripherals",
    price: 229.99,
    originalPrice: 279.99,
    rating: 4.8,
    reviews: 876,
    badge: "sale",
    image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&q=80"
  },
  {
    id: 5,
    name: "Logitech G Pro X Superlight",
    category: "peripherals",
    price: 159.99,
    originalPrice: null,
    rating: 4.9,
    reviews: 2204,
    badge: "hot",
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&q=80"
  },
  {
    id: 6,
    name: "SteelSeries Arctis Nova Pro",
    category: "peripherals",
    price: 249.99,
    originalPrice: 299.99,
    rating: 4.7,
    reviews: 1105,
    badge: "sale",
    image: "https://images.unsplash.com/photo-1583394293253-4e8ccb4aefd9?w=400&q=80"
  },
  {
    id: 7,
    name: "Elden Ring Deluxe Edition",
    category: "games",
    price: 59.99,
    originalPrice: 79.99,
    rating: 4.9,
    reviews: 5432,
    badge: "hot",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80"
  },
  {
    id: 8,
    name: "Cyberpunk 2077 Ultimate",
    category: "games",
    price: 49.99,
    originalPrice: 69.99,
    rating: 4.6,
    reviews: 4210,
    badge: "sale",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80"
  },
  {
    id: 9,
    name: "Spider-Man 2",
    category: "games",
    price: 69.99,
    originalPrice: null,
    rating: 4.8,
    reviews: 3801,
    badge: "new",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80"
  },
  {
    id: 10,
    name: "SecretLab TITAN Evo 2024",
    category: "chairs",
    price: 529.00,
    originalPrice: 599.00,
    rating: 4.9,
    reviews: 1678,
    badge: "hot",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80"
  },
  {
    id: 11,
    name: "Herman Miller x Logitech Embody",
    category: "chairs",
    price: 1495.00,
    originalPrice: null,
    rating: 4.8,
    reviews: 542,
    badge: "new",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80"
  },
  {
    id: 12,
    name: "PS5 DualSense Edge Controller",
    category: "peripherals",
    price: 199.99,
    originalPrice: 229.99,
    rating: 4.7,
    reviews: 987,
    badge: "sale",
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&q=80"
  }
];

// ===== CART STATE =====
let cart = JSON.parse(localStorage.getItem('gamerx-cart') || '[]');
let currentFilter = 'all';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderProducts('all');
  updateCartUI();
  initNavbar();
  initHamburger();
});

// ===== NAVBAR SCROLL =====
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ===== HAMBURGER =====
function initHamburger() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
  });
  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => menu.classList.remove('open'));
  });
}

// ===== RENDER PRODUCTS =====
function renderProducts(filter) {
  currentFilter = filter;
  const grid = document.getElementById('productGrid');
  const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80'" />
        ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge.toUpperCase()}</span>` : ''}
        <button class="product-wishlist" onclick="toggleWishlist(this)" aria-label="Wishlist">🤍</button>
      </div>
      <div class="product-info">
        <p class="product-category">${p.category}</p>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-rating">
          <span class="stars">${getStars(p.rating)}</span>
          <span class="rating-count">(${p.reviews.toLocaleString()})</span>
        </div>
        <div class="product-footer">
          <div class="product-price">
            ${p.originalPrice ? `<span class="price-original">$${p.originalPrice.toFixed(2)}</span>` : ''}
            <span class="price-current">$${p.price.toFixed(2)}</span>
          </div>
          <button class="add-to-cart" onclick="addToCart(${p.id})" aria-label="Add to cart">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? '½' : '';
  return '★'.repeat(full) + half;
}

function filterProducts(cat) {
  renderProducts(cat);
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

// ===== WISHLIST =====
function toggleWishlist(btn) {
  const isWished = btn.textContent === '❤️';
  btn.textContent = isWished ? '🤍' : '❤️';
  showToast(isWished ? 'Removed from wishlist' : 'Added to wishlist!');
}

// ===== CART =====
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  updateCartUI();
  showToast(`${product.name} added to cart!`);

  // Flash button
  const btn = document.querySelector(`.product-card[data-id="${productId}"] .add-to-cart`);
  if (btn) {
    btn.classList.add('added');
    btn.textContent = '✓';
    setTimeout(() => { btn.classList.remove('added'); btn.textContent = '+'; }, 1200);
  }
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('gamerx-cart', JSON.stringify(cart));
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCount').textContent = total;
  document.getElementById('cartItemCount').textContent = `(${total} item${total !== 1 ? 's' : ''})`;
}

function renderCartItems() {
  const itemsEl = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');

  if (cart.length === 0) {
    itemsEl.innerHTML = '';
    emptyEl.style.display = 'block';
    footerEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  footerEl.style.display = 'block';

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        <img src="${item.image}" alt="${item.name}" />
      </div>
      <div class="cart-item-details">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-cat">${item.category}</p>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateQty(${item.id}, -1)">−</button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
        </div>
      </div>
      <div class="cart-item-price">
        <span class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</span>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Remove">✕</button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 9.99;
  const total = subtotal + shipping;

  document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('cartShipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
  document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
}

function openCart() {
  renderCartItems();
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('cartBtn').addEventListener('click', openCart);

function checkout() {
  if (cart.length === 0) return;
  showToast('Redirecting to checkout...');
  setTimeout(() => {
    cart = [];
    saveCart();
    updateCartUI();
    renderCartItems();
    closeCart();
    showToast('Thank you for your order! 🎮');
  }, 1500);
}

// ===== TOAST =====
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ===== NEWSLETTER =====
function handleNewsletterSubmit(e) {
  e.preventDefault();
  const input = e.target.querySelector('input');
  showToast(`Welcome to the squad, ${input.value}!`);
  input.value = '';
}
