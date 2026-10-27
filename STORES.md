# Store research

Researched 2026-10-27. All probes used the User-Agent
`PHDeckTracker/0.1 (store research for a personal deck price tracker)`, at most
one request every 1–1.5 s per store, and only a handful of requests per store.
Test search: "sol ring".

The app has since been renamed MTGDT (MTG Deck Tracker); it now identifies itself to stores as
`MTGDeckTracker/0.1`, so any robots.txt rule or allowlist should name `MTGDeckTracker`.

## Summary

| # | Store | Platform | How to search | robots.txt | Proposed status |
|---|-------|----------|---------------|------------|-----------------|
| 1 | High Market Online | Custom WordPress theme (same developer as Cardpro) | Unknown: every page is behind a "Please verify that you are not a robot" gate | Allows all but `/wp-admin/` | **Unsupported** (bot gate) |
| 2 | Jace Collection | Custom PHP storefront on WordPress (same software as Vault) | `GET /mtg/?cardname={name}` (HTML) | Allows all but `/wp-admin/` | **Partial**: prices are mostly computed in the browser (see decision 1) |
| 3 | Green Gate Hobbies | Shopify | `GET /search/suggest.json` + `GET /products/{handle}.js` (JSON) | `/search` and `/products` allowed | **Supported** |
| 4 | DM Collectibles | Custom Laravel | `GET /input/search?searchTerm={name}` (HTML) | `Disallow:` (everything allowed) | **Supported** |
| 5 | Block 101 Hobbies | WooCommerce | Search (`?s=`) is **disallowed**; product sitemaps and product pages are allowed | `Disallow: /*?s=`, `/*&s=` | **Possible via sitemap index** (see decision 2) |
| 6 | Infinity Hobbies | Custom Laravel + Inertia/Vue, behind Cloudflare bot management | `/products/singles?search=` is **disallowed**; no sitemap | `Disallow: /*?search=`, `/*?stock=`, … | **Unsupported** |
| 7 | Cardpro | Custom WordPress theme (same as High Market) | Unknown: same bot gate | Allows all but `/wp-admin/` | **Unsupported** (bot gate) |
| 8 | Vault Card Shop | Same storefront software as Jace | `GET /mtg/?cardname={name}` (HTML) | Allows all but `/wp-admin/` | **Partial**: same pricing issue as Jace |
| 9 | Staxx Cards & Hobbies | WooCommerce | WooCommerce Store API `GET /wp-json/wc/store/v1/products?search={name}` (JSON) | Allows search; only cart/admin paths blocked | **Supported** |
| 10 | TriCS Circle of Hobbies | ShopMate Zero (hosted) | n/a | `Disallow: /` | **Unsupported** (robots forbids all) |

**Unsupported** stores get a "Check on store" link in the UI (homepage, or the
store's own search URL where one exists), and we never fetch them.

---

## Supported stores

### Green Gate Hobbies: Shopify
- **Search:** `GET https://shop.greengatehobbies.com/search/suggest.json?q={name}&resources[type]=product&resources[limit]=10`
  returns up to 10 products: `title`, `price`, `available`, `url`, `type`.
- **Singles vs. other products:** `type` is `"MTG Singles"` for singles (sleeves come back as `"Sleeves"`).
- **Title format:** `Sol Ring (MSC) #213 [EN/N]`, giving the set code, collector number, language and
  finish (`/N` = nonfoil, `/F` = foil). Some titles end in `s/o`.
- **Condition, price and stock:** per variant, from `GET /products/{handle}.js`. Option 1 is
  `Condition` (e.g. "Near Mint"); option 2 is a consignment item ID, so each variant is roughly one
  physical copy. Each variant has `price` (centavos) and `available`. No inventory count is
  exposed, so **quantity = number of available variants at that condition and price**.
- **Gotcha:** the price in `suggest.json` is the lowest price *including sold-out variants*
  (₱180 shown, cheapest available copy ₱240), so we need the `.js` call for accurate in-stock prices.
- **Cost per card:** 1 search, plus 1 product request per matching in-stock product. Cap it,
  e.g. at the 5 cheapest matches.
- **robots.txt:** allows `/search` and `/products`. It also links a Shopify `agents.md` that
  promotes Shopify's own shopping-agent integration (UCP/MCP) for cart and checkout. We only read
  public product data and never touch cart or checkout, so the plain JSON endpoints are
  appropriate.

### Staxx Cards & Hobbies: WooCommerce
- **Search:** `GET https://staxxph.com/wp-json/wc/store/v1/products?search={name}&per_page=20` (public Store API).
- **Fields:** `name` (HTML, e.g. `Sol Ring<br /><span class="collector-number">Collector No. 21</span>`),
  `prices.price` + `currency_minor_unit` (PHP), `is_in_stock`, `permalink`, `categories` (the set
  *name*, e.g. "Reality Fracture Commander"), and `variations` (usually one, `Language: English`).
- **Quantity:** `GET /wp-json/wc/store/v1/products/{variationId}` gives
  `stock_availability.text = "3 in stock"` (and `add_to_cart.maximum = 3`).
- **Foil:** in the name, e.g. `Sol Ring Surge – Surge Foil`. No foil marker means nonfoil.
- **Condition:** not shown anywhere. Record as `UNKNOWN` (likely NM).
- **Set code:** not given; map the category's set name to a code using Scryfall's set list. The
  collector number plus set name pins the printing.
- **Cost per card:** 1 search, plus 1 variation request per in-stock match (capped).

### DM Collectibles (Dragon Master Collectibles): custom Laravel
- **Search:** `GET https://dmcollectibles.shop/input/search?searchTerm={name}` returns server-rendered HTML (~250 KB).
- **Per result:** product link `/singles/{set}-{number}-{slug}`; a header like
  `REALITY FRACTURE COMMANDER [FRC] (21)` (set code and collector number); card name in
  `p.card-name-text`; then one button per condition and finish:
  - id `nonfoilButton{id}` or `foilButton{id}`, plus an `N`/`F` badge
  - `<b>NM</b> (English)` for condition and language
  - `onclick="indicateThePrice('127420', '128.00'); setQuantityOption('11', …)"`, giving
    **price ₱128.00 and quantity 11**
- Products other than singles live under other paths (`/sealed-products/...`), so filter on `/singles/`.
- **Cost per card:** 1 request.

---

## Stores that need a decision

### Jace Collection and Vault Card Shop: same storefront software
- **Search:** `GET https://www.jacecollection.com/mtg/?cardname={name}` and
  `GET https://www.vaultcardshop.com/mtg/?cardname={name}` return HTML. Allowed by robots.txt.
- **In the HTML (reliable):** product URL (`/mtg/{slug}/`), title (`Sol Ring – Marvel Super Heroes
  Commander (SurgeFoil …)`), `Type: FOIL|NONFOIL`, `Condition: NM`, `Stock: 3`, and a card image
  from `cards.scryfall.io/.../{scryfallId}.jpg`, which gives the **exact Scryfall printing**.
- **The problem is price.** The price `<span>` is empty in the HTML and filled in by the browser:
  `getCardPrice(...)` lives in an **obfuscated** `main.js` and makes the visitor's browser call
  `api.scryfall.com/cards/tcgplayer/{id}` (so the price is presumably TCGplayer market × a markup).
  Only listings with a hidden `manualprice-…` input have a peso price in the HTML: **8 of 20** Sol Ring
  listings at Jace and **3 of 16** at Vault.
- The site hides the "Buy" button when no price is computed.

### Block 101 Hobbies: WooCommerce
- robots.txt has a custom "Search Crawl Guard" that blocks `?s=` search URLs ("keep crawlers off
  expensive search URLs"). I did **not** call search or the Store API search here; using the API to
  get around that rule would go against its intent.
- **Allowed alternative:** robots.txt lists `wp-sitemap.xml`, with **125 product sitemaps × 2,000
  URLs**. MTG single URLs encode everything we need:
  `/shop/magic-the-gathering/star-trek/starfleet-academy-foil-trk-mtg-trk-297-m-f/`
  (name, finish, set `trk`, collector number `297`, rarity `m`, finish `f`/`n`).
- Product pages show the title (`Starfleet Academy – Foil – [TRK]`), price, and
  `"3 in stock"` / `"out of stock"`. Condition isn't shown, so it would be recorded as `UNKNOWN`.
- **Cost:** a daily refresh of the sitemap index (125 requests, about 3–4 minutes at 1.5 s each), then
  1 product-page request per matching printing for each missing card (capped).

---

## Unsupported stores

- **High Market Online** and **Cardpro**: every page, including the homepage, returns a
  "Please verify that you are not a robot" interstitial (same theme on both). Getting past a bot
  check isn't acceptable, so these stay unsupported unless the stores offer a feed or API.
  "Check on store" links to the homepage.
- **Infinity Hobbies**: search lives at `/products/singles?search=…&stock=…`, which robots.txt
  disallows (with a comment explaining why), and the site runs Cloudflare bot management.
  There's no sitemap, so product pages (allowed) can't be discovered. An internal
  `search/suggestions` XHR route exists, but using it to dodge the search rule goes against the
  stated intent. "Check on store" can link to `https://infinity-hobbies.com/products/singles?search={name}`
  for the user to open themselves.
- **TriCS Circle of Hobbies**: `robots.txt` is `Disallow: /`. "Check on store" links to the homepage.

---

## Parsing notes for the adapters
- **Foil markers seen:** `[EN/F]`, `– Foil –`, `Surge Foil`, `Type: FOIL`, `foilButton…`, slug ending `-f`.
- **Condition markers seen:** `Near Mint`, `NM`. Expect `Lightly Played`/`LP`, `Moderately Played`/`MP`,
  `Heavily Played`/`HP` and `Damaged`/`DMG` at the same positions.
- **Non-singles:** Green Gate `type` ≠ `MTG Singles`; DM paths other than `/singles/`; Block 101
  categories outside `magic-the-gathering/` (or names with Booster/Bundle/Deck/Sleeves);
  Jace/Vault `/mtg/` is singles only.
- **Exact printing IDs:** Jace/Vault give a Scryfall ID; Green Gate, DM and Block 101 give set +
  collector number; Staxx gives set name + collector number.
