# SEO Plan — lookoptica.gr

Grounded in the actual current state of this codebase (audited 2026-09-10), not
generic advice. This replaces `seoAgent.md`, which proposed an unauthenticated,
API-cost-bearing background service disconnected from the real backend — do not
implement that file; delete it once this plan is in place.

A WordPress SEO plugin (Yoast/RankMath) did three things for you automatically:
generated meta tags, generated a sitemap, and nagged you about missing alt text /
thin content. This is a hand-built React SPA + FastAPI backend, so none of that
exists yet — we build the equivalent by hand, once, directly in the code.

---

## What's already working

- Clean, slug-based URLs for products and categories (`/products/{slug}`) — good
  for SEO, no query-string product URLs to worry about.
- `frontend/src/hooks/usePageSEO.js` — a working hook that sets `document.title`,
  meta description, canonical link, and basic OpenGraph tags. Wired up on
  `PDP.jsx` and `ContactLensPDP.jsx` only.
- `ProductCard.jsx` already uses the product title as image `alt` text.
- Argon2 password hashing, HttpOnly session cookies, CSRF protection — not SEO,
  but Google does factor in basic site trust signals (HTTPS, no mixed content),
  and this site already clears that bar.

## What's missing (found by direct inspection)

1. **`frontend/index.html:2`** — `<html lang="en">` on a 100% Greek-language
   site. This actively mistells Google (and screen readers) what language the
   content is in. One-line fix, real impact.
2. **No `robots.txt`, no `sitemap.xml`.** Neither file exists anywhere in
   `frontend/public/`. Without a sitemap, Google discovers pages only by
   crawling links — new products can sit unindexed for a long time.
3. **`usePageSEO` is wired on 2 pages out of ~15+ routes.** `PLP.jsx` (category
   listings), `HomePage.jsx`, `Contact.jsx`, `AboutUs.jsx`, `LowVision.jsx`,
   `CartPage.jsx`, checkout pages — none of them set a unique title/description.
   Every one of those currently shows the same static `<title>Look Οπτικά</title>`
   from `index.html`. That's a lot of pages Google sees as near-duplicates of
   each other.
4. **No structured data (JSON-LD) anywhere.** No `Product`, `BreadcrumbList`,
   `Organization`, or `LocalBusiness` schema. This is the single highest-leverage
   gap for an e-commerce site — it's what makes price/stock/rating show up
   directly in Google search results instead of a plain blue link.
5. **Pure client-side rendering, no prerendering.** This is a Vite React SPA
   with no SSR/SSG (`package.json` has no react-helmet, no prerender tooling).
   Googlebot executes JavaScript and will eventually index CSR content, but:
   - it's slower and less reliable than server-rendered content,
   - **Bing largely does not execute JS**, so this site is close to invisible
     there,
   - **social share previews (Facebook/Twitter/WhatsApp link unfurling) do not
     execute JS at all** — right now, sharing a product link shows no image,
     title, or price, because those OG tags only get set after the JS bundle
     runs client-side. For a shop where people share product links, this is a
     real, visible gap.
6. **Unoptimized images hurting page speed (Core Web Vitals → ranking factor):**
   - `frontend/public/hero-detail.jpg` — **14.8 MB**, and not referenced
     anywhere in `src/`. Dead weight, delete it.
   - `frontend/public/metrics.png` — **2.1 MB**, imported into `PDP.jsx` and
     shipped on *every single product page view*.
   - `frontend/public/cat-other.png` — **2.7 MB**, used on `HomePage.jsx`.
   - `frontend/public/cat-contacts.png` — 1.7 MB, `hero1.jpg` — 600 KB, also on
     the homepage.
   - The production JS bundle is already flagged by Vite itself as oversized
     (594 KB / 168 KB gzipped, single chunk, no code-splitting).
7. **`www` vs apex domain not canonicalized.** We hit this earlier tonight as a
   cookie bug, but it's also an SEO problem: if both `lookoptica.gr` and
   `www.lookoptica.gr` serve identical content without a 301 redirect to one
   canonical host, Google can treat them as duplicate content and split ranking
   signals between them.
8. **No Google Search Console / Analytics verification found in the codebase**
   (no `google-site-verification` meta tag, no GA4/gtag script). Without this
   you're flying blind on what's actually indexed and what people search to
   find you.
9. **Local SEO untapped.** This is a physical optics store with in-store pickup
   (`pickup_store` is a real shipping option in `final_checkout.py`) — that's a
   Google Business Profile + `LocalBusiness` schema opportunity that a
   pure-online competitor doesn't have, and it isn't being used at all.

---

## Phase 1 — Technical foundations (do first, all low-effort/high-impact)

- [x] Fix `<html lang="en">` → `<html lang="el">` in `frontend/index.html`
- [x] Enforced `www.lookoptica.gr` as the one canonical host — apex domain and
      the raw server IP now 301-redirect to it (`/etc/nginx/sites-available/lookoptica`).
      Verified all three: apex → 301, IP → 301, www → 200.
- [x] Add `frontend/public/robots.txt` (allow all, disallow `/admin`, `/account`,
      `/cart`, `/checkout`, points to the sitemap)
- [x] Add a generated `sitemap.xml` — `frontend/scripts/generate-sitemap.mjs`
      runs automatically as part of `npm run build`, fetches the live product
      catalog from the production API, and writes `frontend/public/sitemap.xml`
      (static pages + one `<url>` per product, pointed at `/product/{slug}` or
      `/contact-lens/{slug}`). Regenerates fresh on every deploy, so it never
      goes stale the way a hand-maintained file would. Gitignored since it's a
      build artifact. Run `npm run sitemap` any time to regenerate it standalone.
- [x] Deleted `frontend/public/hero-detail.jpg` (unused, 14.8 MB). Recompressed
      and converted to JPEG (no transparency needed): `metrics.png` 2.1 MB → 36 KB,
      `cat-other.png` 2.7 MB → 261 KB, `cat-contacts.png` 1.7 MB → 119 KB.
      Resized `logo.png` from 1024×1024 down to 256×256 (579 KB → 53 KB — it
      only ever displays at 96px). Resized/recompressed `hero1.jpg`, `hero2.jpg`,
      `hero14.jpg` to a 1920px max width.
- [x] Extended `usePageSEO` to every public route (`PLP.jsx`, `HomePage.jsx`,
      the `/shop` listing in `App.jsx`, `Contact.jsx`, `AboutUs.jsx`,
      `LowVision.jsx`, `LookAtHome.jsx`, `UsageTerms.jsx`) with unique
      title/description per page. Added a `noindex` option to the hook itself
      and applied it to `CartPage.jsx` and all checkout/account pages, which
      now emit `<meta name="robots" content="noindex, nofollow">`.
- [x] Google Search Console: URL-prefix property, HTML-file verification
      (`frontend/public/google35bd1a394a07aa91.html`, deployed and live) —
      **remaining step: click "Verify" in Search Console, then submit
      `sitemap.xml`**
- [x] Google Analytics 4 wired in (`G-06ZTVZR7WP`), loaded only in production
      builds via `frontend/src/utils/analytics.js` so local dev traffic never
      pollutes real data. Deployed and live.

**Phase 1 is complete.** Everything above is shipped and verified on
production except the final "click Verify" step in Search Console, which is a
manual action outside the codebase.

## Phase 2 — Structured data (the highest-leverage single change)

- [x] `Product` JSON-LD on `PDP.jsx` and `ContactLensPDP.jsx`: name,
      description, image(s), sku, gtin (ean), brand, and an `Offer` with
      price/EUR/availability mapped from the product's status. Also fixed a
      bug in `PDP.jsx` where the canonical URL/OG image used the apex domain
      (`lookoptica.gr`) instead of the canonical `www` host.
- [x] `BreadcrumbList` JSON-LD on `PDP.jsx`, `ContactLensPDP.jsx` (Home →
      Product — a middle "Category" entry was tried first but dropped after
      the Rich Results Test flagged it invalid: Google requires every
      breadcrumb item except the last to carry a real `item` URL, and the
      category label couldn't be reliably mapped back to its exact
      `/shop/{slug}`. Two accurate levels beat three with a guessed one), and
      `PLP.jsx` (Home › Category › Audience, all with real URLs).
- [x] `Optician` (a `LocalBusiness` subtype — more specific, better for
      search) JSON-LD added once, site-wide, as a static block in
      `frontend/index.html`: real address, phone, email, geo-coordinates
      (from the Google Maps embed on `Contact.jsx`), `priceRange`, `sameAs`
      (Facebook/Instagram), and accurate per-day `openingHoursSpecification`.
      Also fixed the source of truth for those hours: `Contact.jsx` previously
      displayed them as ambiguous/overlapping day-ranges ("Δευτέρα - Τετάρτη"
      read like Mon–Wed while a second line claimed Tue/Thu/Fri) — corrected
      to explicit, non-overlapping day lists matching what's now in the schema.
- [x] `hasMerchantReturnPolicy` added to each product's `Offer` (14-day
      window, unused/original packaging, customer pays return shipping —
      matches the existing published policy text).
- [ ] `shippingDetails` on the `Offer` — deliberately **not** added. Real
      shipping is tiered/conditional (free via BoxNow above €40, free via
      courier above €80, flat fee otherwise) and schema.org's
      `OfferShippingDetails` doesn't cleanly express that without multiple
      entries keyed on `eligibleTransactionVolume`. Worth doing properly later
      rather than publishing an oversimplified/wrong version to Google now.
- Verified live via Google's Rich Results Test after the breadcrumb fix: all
  5 types (`Product`, `Merchant listings`, `BreadcrumbList`, `Optician`,
  `Organization`) come back valid with zero errors. `BreadcrumbList`,
  `Optician`, and `Organization` report no issues at all; `Product` and
  `Merchant listings` retain non-critical notes, expected from the
  deliberately-omitted `shippingDetails`/review data above.

**Phase 2 is complete and verified live on production.**
- [x] `usePageSEO` extended with a `jsonLd` option (accepts one schema object
      or an array) that manages a single `<script type="application/ld+json">`
      tag per page, separate from the static site-wide block in `index.html`
      so the two mechanisms never collide.

**To verify after deploying:** paste a live product URL into Google's [Rich
Results Test](https://search.google.com/test/rich-results) and confirm it
detects the `Product` and `BreadcrumbList` types with no errors. Same for the
homepage to confirm the `Optician` block validates.

## Phase 3 — On-page content quality

- [x] Meta title formula: `{Product title} | {Brand} | Look Optica` when a
      brand is known, falling back to `{Product title} | Look Optica`
      otherwise (`PDP.jsx`, `ContactLensPDP.jsx`).
- [x] Meta description formula: prefers a real per-product `metaDescription`
      or editorial `description` (many products carry this over from the old
      WooCommerce import — genuinely unique per product, better for SEO than
      a templated one), truncated to a proper meta length (~157 chars). Only
      falls back to a generated `{title} – από {brand} – {price}€. Αυθεντικό
      προϊόν...` description when no real one exists at all.
- [x] H1 audit — found and fixed real issues:
      - `HomePage.jsx` had **no H1 at all** (the hero headline was an `h2`) —
        promoted to `h1`.
      - `AboutUs.jsx` and `Contact.jsx` each had **two `h1`s** on the same
        page (a second section heading duplicating the tag) — demoted the
        second one to `h2` in both.
      - `PDP.jsx` and `ContactLensPDP.jsx` were already clean, one H1 each.
- [x] Intro paragraphs added to all 5 `CATEGORY_CONFIG` entries in `PLP.jsx`
      (sunglasses, frames, stock, contact lenses, other products) — expanded
      from one-line taglines (~15 words) to real ~80-110 word paragraphs
      covering brands carried, what's in the category, and store/shipping
      info, replacing what was thin content under the H1.
- [x] Internal linking — audited, already in decent shape: PDP's "related
      products" (by brand/category/audience) were already computed *and*
      rendered, just needed the visible breadcrumbs fixed (see below).
      Breadcrumbs exist site-wide on PDP/ContactLensPDP/PLP; fixed a bug
      where both `PDP.jsx` and `ContactLensPDP.jsx` showed the raw URL
      **slug** (e.g. `moritz-mz-21458`) in the visible breadcrumb instead of
      the actual product title — now shows the human-readable title once
      loaded.

## Phase 4 — Crawlability of the SPA (bigger lift, plan separately)

**Status: postponed** — revisit once Search Console data shows it's actually
needed (or sooner if social-share previews become a real complaint).

Pick one, roughly in order of effort vs. payoff:

1. **Cheapest:** pre-render just the handful of pages that matter most for
   organic entry (home, top categories, top products) at build time with a
   tool like `vite-plugin-ssg` or `react-snap`, output static HTML for those
   routes, leave the rest as pure CSR.
2. **Middle ground:** a lightweight "dynamic rendering" reverse-proxy rule in
   nginx — detect known bot user-agents (Googlebot, bingbot, facebookexternalhit,
   Twitterbot) and serve them a server-rendered snapshot (via a headless
   Chrome render service) while real users still get the SPA.
3. **Biggest lift, not recommended right now:** migrate to a framework with
   built-in SSR (Next.js/Remix). Not worth it unless organic traffic becomes a
   primary channel and Phases 1–3 aren't enough on their own.

Start with option 1 for the homepage and top category pages only — that alone
fixes the social-share-preview problem for your most-linked pages.

## Phase 5 — Local SEO (store pickup is a real advantage here)

- [x] Claimed and verified the Google Business Profile (a listing already
      existed, matched via the Google Maps place already embedded in
      `Contact.jsx` — claimed that one rather than creating a duplicate).
      Category, hours (matching the corrected schedule), and photos confirmed
      in place; wrote and added a 674-character business description covering
      the 1975 founding, optometry focus, low-vision specialization, and the
      "Οπτικά στο σπίτι" home-visit service.
- [x] NAP (name/address/phone) confirmed identical across the site footer,
      Contact page, and Google Business Profile.
- [ ] Encourage post-purchase Google reviews — blocked on there being no
      customer-facing order confirmation email at all yet (only an internal
      admin notification exists today). Worth its own task later; not part of
      the SEO work itself.

## Competitor price monitoring (separate from the phases above — on hold)

Explored building a weekly script to compare prices against direct
competitors, matched by brand + model. Investigated 5 candidate sites
directly (not just robots.txt) before writing any code:

- **optikaliolios.gr** — excluded: the entire site (including robots.txt
  itself) returns `403 Forbidden` to automated requests. Actively blocking
  bots; not something to route around.
- **skroutz.gr / bestprice.gr** — excluded: both are marketplace platforms
  whose robots.txt explicitly blocks ~50 named scraping/SEO tools (AhrefsBot,
  SemrushBot, MJ12bot, Amazonbot, etc.) while only carving out narrow
  exceptions for recognized AI-assistant crawlers doing search/citation work.
  Aggregated pricing is their core commercial asset; scraping it for
  competitive intelligence is a clearly different, unwelcome use case.
- **optikamati.gr** — usable, but not via search: their search endpoint
  returns `403` (WAF), but `product-sitemap.xml` and individual product pages
  both work fine and are plain server-rendered HTML with price in the text.
  Fully automatable via sitemap + slug matching.
- **jamieoptics.gr** — partially usable: individual product pages are
  server-rendered with a clean `product:price:amount` meta tag (reliable
  *if* you already have the URL), but search and category listing pages are
  JavaScript-rendered (product grid loads via API call after page load,
  nothing in the raw HTML) and no working sitemap was found. Can't
  auto-discover which URL matches a given brand+model without a headless
  browser.
- **youandeyeoptics.gr** — same platform/limitation as jamieoptics.gr.

**Decision point, deferred:** either (a) a hybrid script — automatic
sitemap-based matching for optikamati.gr, manual one-time URL entry per
tracked product for jamieoptics.gr/youandeyeoptics.gr, with the script
handling all the actual price-fetching and comparison — or (b) add Playwright
(headless Chromium) so JS-rendered listings can be read on all three, at the
cost of a much heavier dependency for what's meant to be a lightweight weekly
check. Leaning toward (a); revisit when ready to build it.

---

## Suggested order of execution

1. Phase 1 (all of it) — a few hours of work, no architectural risk, fixes the
   most embarrassing gaps (wrong language tag, no sitemap, 14.8 MB dead image)
2. Phase 2 (structured data) — highest ROI per hour of anything on this list
3. Phase 3 (content) — ongoing, do a page or two at a time
4. Phase 5 (local SEO) — mostly outside the codebase, can run in parallel with
   anything above
5. Phase 4 (prerendering) — only after 1–3 are done and you have Search
   Console data showing it's actually needed

## What we will *not* do

- Not implementing `seoAgent.md` as written — see the note at the top. If an
  AI-assisted audit tool is wanted later, it should reuse the existing admin
  auth (`get_current_admin_user`) and live inside `backend/app/routers/`, not
  spin up a parallel unauthenticated FastAPI app.
