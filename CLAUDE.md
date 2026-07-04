# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**GamerX** — a single-page marketing/e-commerce website for a fictional gaming
gear retailer. It's a static site: three files, no framework, no build step,
no package manager, no backend.

```
index.html   – all markup, one page, sections in DOM order matching the nav
style.css    – all styles (one file, ~1800 lines)
app.js       – all behavior (one file, ~900 lines)
.netlify/netlify.toml – Netlify deploy config (publishes the repo root as-is)
```

There is no `package.json`, no bundler, no test suite, and no CI. Everything
runs directly in the browser off these three files.

## Running it locally

No install step. Serve the directory with any static file server and open it,
or just open `index.html` directly in a browser. Example:

```
python3 -m http.server 8000
```

There is no lint/build/test command to run — verify changes by loading the
page in a browser and exercising the feature.

## Deployment

Netlify deploys straight from the repo root (`.netlify/netlify.toml`, `publish
= "/home/user/claude"` — i.e. no build command, no dist folder). Pushing to
the deployed branch is effectively pushing to production; there's no staging
step baked into the repo.

## Architecture

### `index.html`
One long page. Sections appear in this order and are wired to the nav via
anchor IDs: `#home` (hero) → categories → `#products` → `#deals` (flash sale)
→ `#brands` → why-us → testimonials → newsletter → `#contact` (footer). Cart
drawer, wishlist drawer, product modal, and toast container are appended at
the end of `<body>` as overlay elements controlled by `app.js`. Section
dividers are marked with `<!-- ░░░ NAME ░░░ -->` comments — keep that
convention when adding a new section.

### `app.js`
Everything is plain global functions and module-level state — no classes, no
modules, no framework. Structure:

- **`PRODUCTS`** (top of file): the entire product catalogue as a hardcoded
  array of objects (`id, name, category, price, originalPrice, rating,
  reviews, ribbon, inStock, image, desc, specs`). This is the only "data
  layer" in the app — adding a product means appending an object here with
  the next sequential `id`. `category` values must match the filter tabs in
  `index.html` (`consoles`, `peripherals`, `games`, `monitors`, `chairs`) and
  the `onclick="filterProducts('...')"` calls in the categories section.
  `ribbon` must be one of the keys handled in `ribbonLabel()` (`hot`, `new`,
  `sale`, `lim`).
- **State** (module-level `let`s below `PRODUCTS`): `cart` and `wishlist`
  persist to `localStorage` under the keys `gx-cart` / `gx-wishlist` as
  arrays of `{id, qty}`-shaped entries; call `saveCart()` /
  the wishlist equivalent after mutating them.
- **Init**: a single `DOMContentLoaded` listener at the top calls one
  `initX()` function per feature area (preloader, cursor, navbar, hamburger,
  search, cart drawer, wishlist, modal, back-to-top, reveal-on-scroll,
  filter tabs) then renders initial UI (`renderProducts`, `updateCartUI`,
  `updateWishlistUI`, `animateMetrics`, `initCountdown`, `initCanvas`). When
  adding a new interactive feature, follow this pattern: write an `initFoo()`
  that wires up its own DOM listeners, and register it in that
  `DOMContentLoaded` block.
- **Sections** are separated by `/* ═══ NAME ═══ */` banner comments (mirrors
  `style.css`) — grep for these to jump between features (PRELOADER, CURSOR,
  NAVBAR, SEARCH, PRODUCTS/FILTERING, CART, WISHLIST, MODAL, TOAST, COUNTDOWN,
  NEWSLETTER, etc).
- Rendering is done via template-literal `innerHTML` assignment (e.g.
  `renderProducts`, `renderCartItems`, `renderWishlistItems`, `openProduct`'s
  modal body) — there's no virtual DOM or diffing, each re-render replaces
  the container's full `innerHTML`.
- Product images are hotlinked Unsplash URLs with query params for sizing
  (`?w=600&q=85`) — keep that pattern for consistency if adding images.

### `style.css`
Single file, custom-property driven. All colors, spacing radii, shadows, and
transitions are defined as CSS variables on `:root` at the top — always reuse
these (`--purple`, `--cyan`, `--bg-card`, `--radius-md`, `--shadow-md`,
`--transition`, etc.) rather than hardcoding new colors/values. Sections are
delimited by the same `/* ═══ NAME ═══ */` banners as `app.js`, in the same
order as the sections in `index.html` — keep new component styles colocated
with their section rather than appended at the end. Dark theme only (no
light-mode variant, no `prefers-color-scheme` handling).

## Conventions to follow

- **No dependencies, no build step.** Don't introduce npm/bundlers/frameworks
  unless explicitly asked — the whole point of this repo is that it runs as
  three static files.
- **Keep the three-file split.** HTML structure in `index.html`, all CSS in
  `style.css`, all JS in `app.js`. Don't split into multiple JS/CSS files
  without being asked.
- **Global function style.** `app.js` uses plain functions and inline
  `onclick="..."` handlers wired straight into the HTML (e.g.
  `onclick="filterProducts('consoles')"`, `onclick="openProduct(4)"`). Match
  this style rather than converting to addEventListener-only or ES modules.
- **Data lives in `PRODUCTS`.** There's no API/backend — new products,
  categories, or catalogue changes go directly into the `PRODUCTS` array and
  (if adding a category) the filter tabs / category cards in `index.html`.
  Category slugs, ribbon keys, and IDs must stay consistent across
  `index.html` and `app.js`.
