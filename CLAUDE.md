# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**Louvion Chocolate** — a four-page storefront for a small chocolatier. The
customer picks a box (3, 9, 16 or 64 pieces), fills it chocolate by
chocolate, and checks out against a real account. A studio page shows the
orders that come in.

It is deliberately dependency-free: no npm packages, no bundler, no
framework, no build step. The server is Node built-ins only.

```
index.html    Home — hero, boxes, collection, gallery, story
shop.html     Build a box — choose a size, then fill it
account.html  Sign in / register, and order history
admin.html    Studio — all orders, status control (admin only)

catalog.js    Boxes, chocolates, prices, delivery — read by BOTH sides
app.js        All browser behaviour
style.css     All styles
server.js     Static files + JSON API + authentication
assets/       Gallery SVGs and favicon
data/         Runtime store (users, orders). Gitignored. Never serve it.
```

## Running it

```
node server.js          # http://localhost:8080
```

There is no lint/build/test command in the repo. Verify changes by loading
the page and exercising the feature. On first run the server prints a
generated admin password once; `LOUVION_ADMIN_PASSWORD` overrides it.

Opening `index.html` straight off the filesystem will render the pages but
every `/api/*` call fails — sign-in, checkout and the studio need the
server. Always test through `node server.js`.

## Architecture

### `catalog.js` — the single source of truth
A UMD-ish module: `module.exports` under Node, `window.LOUVION_CATALOG` in
the browser. Holds `BOXES`, `CHOCOLATES`, `SHIPPING`, `CURRENCY` and
`ORDER_STATUSES`.

**Both the browser and the server read this file**, and that is the point:
`priceOrder()` in `server.js` rebuilds every order from it and discards any
price the client sent. Never duplicate a price or a box size into `app.js`
or `server.js` — add it here and read it from both.

- Prices are **integer cents** everywhere; only `formatPrice()` renders them.
- A box's `pieces` is enforced server-side — an order is rejected unless the
  chosen chocolates sum to exactly that number.
- A chocolate's `shape` / `base` / `accent` / `finish` drive the hand-drawn
  SVG in `app.js`. There are no product photos to manage.
- A new box size also needs its grid shape in `BOX_LAYOUT` in `app.js`.

### `server.js`
One file, Node built-ins only (`http`, `crypto`, `fs`, `path`). Sections are
delimited by `/* ═══ NAME ═══ */` banners: CONFIG, STORAGE, CRYPTO, SESSIONS,
RATE LIMITING, HTTP HELPERS, VALIDATION, AUTH PLUMBING, API ROUTES, STATIC
FILES, SERVER, BOOTSTRAP.

Routes are matched as `` `${method} ${pathname}` `` strings in `handleApi()`.
Storage is JSON files under `data/`, written atomically through
`mutateJson()` — always use it for read-modify-write so concurrent requests
can't clobber each other.

**When touching this file, keep these invariants:**
- `role` is assigned by the server, never read from a request body.
- Every state-changing route calls `requireCsrf()`.
- Every admin route re-checks `ctx.user.role !== 'admin'`.
- Errors thrown with a `status` below 500 have their message shown to the
  user; anything else surfaces as a generic message. Never leak a stack.
- Auth failures return one identical message regardless of cause.

### `app.js`
Plain functions and module-level state inside one IIFE — no classes, no
modules, no framework. Same `/* ═══ NAME ═══ */` banner convention.

A single `DOMContentLoaded` handler runs the shared setup, awaits
`loadSession()`, then dispatches on `document.body.dataset.page`
(`home` / `shop` / `account` / `admin`). New feature? Write an `initFoo()`
that wires its own listeners and register it there.

Rendering is template-literal `innerHTML` assignment — each re-render
replaces the container's full contents. **Everything interpolated goes
through `esc()`** (or `escMultiline()` where line breaks matter).

### `style.css`
Single file, custom-property driven. All colours, spacing, radii, shadows
and transitions are CSS variables on `:root` — reuse them
(`--cocoa-900`, `--gold`, `--line`, `--radius-md`, `--transition`) rather
than hardcoding. Sections use the same banner convention and the same order
as the markup. Light theme only.

## Conventions to follow

- **No dependencies, no build step.** Don't introduce npm, a bundler or a
  framework unless explicitly asked.
- **Keep the file split.** Markup in the `.html` pages, all CSS in
  `style.css`, all browser JS in `app.js`, catalogue data in `catalog.js`,
  everything server-side in `server.js`.
- **The CSP has no `unsafe-inline`.** This is load-bearing, not decoration:
  - No inline `onclick=""`. Add a `data-action` and a branch in
    `initActions()` — one delegated listener handles the whole site.
  - No inline `<style>` and no `style=""` attributes, including inside
    template literals. Set dynamic values from JS with
    `el.style.setProperty()`, which CSP allows, or use a class.
  - SVG presentation attributes (`fill=`, `stroke=`) are fine — they aren't
    CSS inline styles.
- **Nothing loads from a third party.** No CDN, no web font, no remote
  images. `--serif` / `--sans` are system stacks; product art is generated
  SVG. Keep it that way — it's what lets the CSP stay this tight.
- **Never trust the client for money or identity.** Prices, roles and box
  capacity are decided server-side, always.
- **Never commit `data/`.** It holds password hashes and customer addresses.
