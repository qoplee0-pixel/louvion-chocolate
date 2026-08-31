# Louvion Chocolate

A small, four-page storefront for Louvion Chocolate. Pick a box — 3, 9, 16 or
64 pieces — then choose every chocolate that goes inside it. Real accounts,
real sessions, and a studio page for managing the orders that come in.

```
index.html    Home — hero, the four boxes, the full collection, gallery, story
shop.html     Build a box — choose a size, then fill it piece by piece
account.html  Sign in / create an account, and your order history
admin.html    Studio — every order, with status control (admin only)

catalog.js    The catalogue: boxes, chocolates, prices, delivery
app.js        All browser behaviour
style.css     All styles
server.js     The server: static files + JSON API + authentication
assets/       Gallery images and the favicon
data/         Created at runtime. Users and orders. Never committed.
```

## Running it

Node 18 or newer. No dependencies, no build step, nothing to install.

```
node server.js
```

Then open <http://localhost:8080>.

On the very first run the server creates an admin account and prints the
password **once**. To choose your own instead:

```
LOUVION_ADMIN_EMAIL=you@louvion.com \
LOUVION_ADMIN_PASSWORD='a long passphrase' \
node server.js
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Port to listen on |
| `HOST` | `0.0.0.0` | Interface to bind |
| `LOUVION_ADMIN_EMAIL` | `admin@louvion.local` | Studio login |
| `LOUVION_ADMIN_PASSWORD` | random, printed once | Studio password |
| `LOUVION_FORCE_SECURE_COOKIES` | off | Force `Secure` cookies behind a proxy that doesn't set `X-Forwarded-Proto` |

## Deploying

### Vercel

```
npx vercel          # preview URL
npx vercel --prod   # production
```

`vercel.json` sets the same security headers the Node server sends, and
`.vercelignore` keeps `data/` off the upload — that directory holds password
hashes and customer addresses, and `vercel` uploads the working directory,
so a local test run would otherwise publish it.

**What you get is the storefront, not the shop.** Vercel serves these files
statically, so there is no `/api/*`:

| Works | Doesn't |
| --- | --- |
| Home, the collection, the gallery | Sign in and register |
| Choosing a box and filling it | Checkout |
| The basket (kept in `localStorage`) | Order history |
| | The studio page |

Anything needing the API shows a connection error. `admin.html` is still
reachable as a file, but it holds no data of its own and redirects without a
session — on the Node server that page isn't served to non-admins at all.

To make checkout work on Vercel, the API has to become serverless functions
**and** the storage has to move off disk. Vercel's filesystem is read-only
apart from `/tmp`, which is per-instance and wiped between invocations, so
`data/*.json` would silently lose orders and the in-memory session map would
sign people out at random as requests land on different instances. That
means a key-value store (Vercel KV, Upstash) for both sessions and orders.
Both speak HTTP, so it can stay dependency-free — but it is a real change to
`server.js`, not a config flag.

### Anywhere that runs Node

`server.js` needs a host that runs Node — Render, Railway, Fly.io, a VPS,
anything. Put a TLS terminator (or a platform that provides HTTPS) in front
of it: the session cookie only gets its `Secure` flag when the request
arrives over HTTPS, which the server detects from `X-Forwarded-Proto`.

**Static-only hosting is not enough.** Uploading these files to a plain
static host will render the pages, but `/api/*` won't exist — so sign-in,
checkout and the studio page won't work. The whole point of the login being
real is that a server checks it.

Nothing is fetched from a third party — no CDN, no web font, no analytics,
no external images — so the site works offline and the content security
policy can stay as tight as it is.

## Changing the shop

**Prices, boxes and chocolates** all live in `catalog.js`, which both the
browser and the server read. That's deliberate: the server re-prices every
order from this file and ignores whatever the browser claims a box costs, so
the two can never disagree.

- A new flavour is one entry in `CHOCOLATES`. `shape`, `base`, `accent` and
  `finish` drive the drawing in `app.js` — there is no photo to source.
- A new box size is one entry in `BOXES`, plus its grid shape in
  `BOX_LAYOUT` in `app.js` (e.g. `25: 5` for a 5×5 tray).
- Currency is the `CURRENCY` constant at the top. Prices are integer cents.

## The gallery images

`assets/gallery-1.svg` … `gallery-4.svg` are hand-drawn stand-ins for the
four photos in the "From the kitchen" section.

To use real photos from [@louvionchocolate](https://www.instagram.com/louvionchocolate/):
save four square images into `assets/`, then update the four `src`
attributes in the marked gallery block in `index.html`. Nothing else
changes — they're cropped to square with `object-fit: cover`.

Keep them local rather than hotlinking Instagram: those URLs are signed and
expire, and `img-src 'self' data:` in the CSP blocks off-site images.

## Security

- **Passwords** — scrypt (N=16384, r=8, p=1), 16-byte per-user salt,
  compared with `timingSafeEqual`. A failed lookup still runs a decoy hash,
  so response time can't reveal which emails are registered.
- **Sessions** — 32 random bytes, kept server-side only, in an `HttpOnly`
  `SameSite=Strict` cookie (`Secure` over HTTPS). Rotated on login to defeat
  session fixation, with a 2-hour idle and 12-hour absolute expiry.
- **CSRF** — a per-session token required in `X-CSRF-Token` on every
  state-changing request, plus an `Origin` check.
- **Rate limiting** — 5 failed logins per account and 20 per IP per 15
  minutes; sign-ups, orders and the API as a whole are capped too.
- **Authorisation** — `role` is assigned by the server and never read from a
  request body. Admin routes re-check the role on every call, and
  `admin.html` itself is only served to a signed-in admin.
- **Order integrity** — the server rebuilds every order from `catalog.js`:
  it verifies the chocolates add up to exactly the box's capacity and
  recomputes the total. Prices sent by the browser are discarded.
- **Headers** — CSP with no `unsafe-inline` for scripts or styles (hence no
  inline `onclick` and no `style=""` anywhere), `nosniff`,
  `frame-ancestors 'none'`, referrer and permissions policy, HSTS on HTTPS.
- **Input** — 64 KB body cap, control characters stripped, every field
  length-limited, and everything rendered through an HTML escape.
- **Storage** — `data/` is written with atomic `rename()` through a
  per-file queue, mode `0600`, and is never served over HTTP.

### Before taking real orders

This runs on a JSON file store and takes no payments. For a real shop you'd
still want: a database, a payment provider (never handle card details
yourself), transactional order emails, password reset, and a privacy policy
covering the addresses you're storing.
