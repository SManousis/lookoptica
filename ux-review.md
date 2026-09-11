# UX / Conversion Review — lookoptica.gr

Reviewed 2026-09-11: full code-level audit of the storefront (home → PLP → PDP →
cart → checkout → account), plus feature comparison against the three
competitor sites already investigated for the price-monitoring work
(jamieoptics.gr, optikamati.gr, youandeyeoptics.gr). No visual/rendering tool
available in this environment, so this is a content/flow/feature-level
review, not a pixel-level design critique — in practice that's usually where
the real conversion losses are anyway (friction, missing trust signals,
inconsistency), not spacing.

---

## Open decision: English version of the site (postponed)

Raised during this review, deliberately not decided yet. A full bilingual
catalog is a real undertaking (translation framework, ongoing double
maintenance for ~1000 products, SEO complexity), and the checkout itself is
inherently Greece-local (ΕΛΤΑ/BoxNow shipping, Greek bank IBANs, IRIS) — so
an English speaker abroad likely couldn't complete a purchase anyway unless
already physically in Greece. A lighter alternative floated: a single
English landing/about page (store info, hours, "we speak English",
directions) for the realistic use case — a tourist/expat finding you via
Google and deciding whether to visit in person — instead of a fully
translated parallel catalog. Revisit when ready; depends on whether there's
a specific reason (international shipping plans, a real tourist customer
base) that would justify the full version instead.

---

## Fixed already, while reviewing

- **`ProductCard.jsx` was showing "€null" struck-through on every product
  with no discount price set.** It unconditionally rendered `€{p?.discountPrice}`
  with no null/comparison check — unlike `PDP.jsx`, which does this
  correctly. This component is used on every category page, the homepage
  "Προτεινόμενα" section, and related-products — so this was visible
  site-wide, on the single most-seen price display in the store. Fixed to
  match `PDP.jsx`'s logic (only show a struck-through price when a real,
  higher `discountPrice` exists).

---

## 1. ~~Critical: English text at the three highest-stakes moments in the funnel~~ — FIXED

Turned out to be more than three spots once actually swept for it. Every one
of these is now in Greek, matching the rest of the site:

- `CartPage.jsx` — was entirely in English ("Shopping Cart", "items in your
  cart", "Clear cart", "Proceed to checkout", "Continue shopping", "No
  image", the "Home / Cart" breadcrumb). Fully translated.
- `PDP.jsx` — buy button/confirmation ("Add to cart" → "Added to cart! View
  cart"), "← Back to shop", and the "Home / Shop" breadcrumb.
- `ContactLensPDP.jsx` — breadcrumb's "Home" link (the rest of that page was
  already correctly in Greek).
- `PLP.jsx` — sort control ("Sort by" + all 6 option labels), "No products
  matched yet.", "Load more results" / "Load more" / "Show less" / "Loading...".
- `CheckoutDetailsPage.jsx` and `CheckoutPaymentPage.jsx` — both had "Home"
  (and "Cart" on the payment page) in their breadcrumbs.

Admin-panel strings (Logout, Search, Select, Quantity in a couple of admin
pages) were left as-is — lower priority, that's a tool for you, not
customers, and mixing there doesn't affect trust the way it does on the
purchase path.

## 2. ~~Mobile: shipping/policy text pushed above the buy button~~ — FIXED

`ShippingInfo` moved out of the image column (where it rendered *before*
price/stock/add-to-cart on stacked mobile layouts) into the info column,
directly after the add-to-cart button/confirmation and before the "back to
shop" link. Now appears after the purchase decision on both mobile and
desktop, instead of before it on mobile.

## 3. ~~No trust/urgency signal in the cart where cost surprises kill conversions~~ — FIXED

Added a `ShippingProgress` component to `CartPage.jsx`'s order summary,
driven by the live cart subtotal:
- Below €40: amber progress bar + "Πρόσθεσε ακόμα €X για δωρεάν μεταφορικά
  με Box Now!"
- €40–€80: green state confirming free Box Now shipping, plus a progress bar
  toward the €80 courier+COD threshold
- €80+: green confirmation that both free shipping and free COD apply

Thresholds are mirrored as constants from `final_checkout.py` (same pattern
already used elsewhere on the site, e.g. the business-rules text on
`CheckoutPaymentPage.jsx`) — informational only, the real charge is always
computed server-side at checkout regardless of this display.

## 4. ~~Dead ratings/review code — and no reviews anywhere~~ — FIXED (bigger than expected)

Turned out there wasn't just one dead `Star` component — `PDP.jsx` had an
**entire fake "submit review" UI already live on production**: a star
picker, a textarea, and a submit button whose `onClick` had the comment
`// later will POST to backend` and literally showed the customer an alert
saying *"Για την ώρα η αξιολόγηση δεν αποθηκεύεται – UI test 🙂"* ("this
isn't saved yet, UI test"). Any real customer who filled it out and hit
submit got told, after the fact, that nothing happened.

Replaced with a real, working review system:
- **Backend** (`backend/app/models/product_review.py`,
  `backend/app/routers/reviews.py`): `POST /api/products/{slug}/reviews`
  (public, Turnstile-protected, same CAPTCHA pattern as the contact form) →
  goes in as `pending`. `GET /api/products/{slug}/reviews` (public) returns
  only `approved` reviews plus the average rating. Admin endpoints to list
  all reviews and approve/delete.
- **Frontend**: new `ProductReviews` component (shared between `PDP.jsx` and
  `ContactLensPDP.jsx`) — shows the average rating + approved reviews, and a
  real submission form with Turnstile. New `/admin/reviews` admin page to
  moderate (approve/delete), linked from the admin nav.
- **SEO**: both PDP pages now include real `aggregateRating` in their
  `Product` JSON-LD once a product has approved reviews — this is what
  actually unlocks star ratings in Google search results, not just on-page
  trust.

Reviews require admin approval before going public (spam/reputation
protection), matching how you already moderate rather than auto-publishing.
Not tied to verified purchases yet, since order→customer linking doesn't
exist (that's Section 6, still open) — worth adding a "verified purchase"
badge later once that's built.

## 5. ~~No site-wide search — only per-category search~~ — FIXED

Added a search icon to the header (both desktop and mobile, `App.jsx`) that
expands into an input; submitting navigates to `/shop?q=<query>`.

While building this, found `ShopPLP` (the `/shop` "all products" page,
maintained as a separate near-duplicate of the old `PLP.jsx`) had the exact
same three bugs `PLP.jsx` had before today's fixes — mid-batch truncation,
reversed price-sort field, and sort-order reshuffling — plus its own search
box was client-side-only, filtering just whatever was already loaded rather
than actually searching the catalog server-side. Fixed all of it:
- `loadProducts` now sends `q` to `/shop-products` (debounced, same pattern
  as `PLP.jsx`) instead of not searching server-side at all
- Removed the mid-batch break that discarded already-fetched matches
- `getEffectivePrice` now prefers `price` over `discountPrice`
- Added the same `needsFullScan` logic so non-"newest" sorts fetch the whole
  matching set before displaying, keeping the order stable across "Load more"
- `searchTerm` now initializes from and stays synced to the `?q=` URL param,
  so the navbar search actually populates and drives this page correctly —
  including a second search from the navbar while already on `/shop` (same
  route, so the page doesn't remount; needed an explicit sync effect)

## ~~6. Account exists, but gives customers nothing to come back for~~ — FIXED

`AccountHomePage.jsx` — after logging in, a customer sees only their own
email/name/phone and two buttons ("continue to checkout", "logout"). **No
order history at all.** Given customer accounts already exist
(`CustomerAuthContext`, registration flow) and orders are recorded
server-side (`OrderNotification`), this is a real, buildable gap: customers
can't self-serve "where's my order," which means every such question becomes
a phone call or email to you instead. It also removes one of the main
reasons to create an account rather than checking out as a guest. Worth its
own follow-up task — linking `OrderNotification` records to the logged-in
customer (currently it only stores `contact_email`, not `customer_id`) and
building a simple order-history list.

**Fix:** added `customer_id` (nullable FK to `customers.id`) to
`OrderNotification`, with an idempotent `ALTER TABLE ... ADD COLUMN IF NOT
EXISTS` in `orders.py`'s `ensure_table()` since the table already has
production rows. `create_order_notification` now best-effort resolves the
logged-in customer from the `look_customer_sess` cookie (guests still work
fine, `customer_id` just stays `NULL`). Added `GET /customer/orders`
(auth-gated via `get_current_customer`) returning that customer's orders
newest-first. Also fixed `CheckoutPaymentPage.jsx`'s order-placement `fetch`,
which was missing `credentials: "include"` — without it the session cookie
never reached the backend, so `customer_id` would never have been linked
even for logged-in customers. `AccountHomePage.jsx` now has an "Οι
παραγγελίες μου" section listing each order's date, item count, and payment
method.

## 7. No promo codes, no wishlist, and the newsletter form is fake

Correcting myself from the first pass of this review: there **is** a
newsletter section on the homepage (`HomePage.jsx`) — I missed it initially.
But it's worse than missing: its `onSubmit` just does
`e.preventDefault(); alert("Ευχαριστούμε!...")` — no API call, nothing
stored anywhere. A visitor who types their email in believes they've
subscribed; you never actually receive it. This is worth fixing properly
(needs a backend endpoint + storage, plus deciding what you'd actually do
with collected emails) rather than leaving it as UI that quietly lies to
both you and the customer.

Still genuinely missing:
- **Promo codes** — useful for the exact kind of one-off campaigns (referral,
  abandoned-cart win-back, social media promo) that convert hesitant buyers.
- **Wishlist** — lower priority for this catalog size, but relevant for
  prescription frames specifically, where people often browse across
  multiple visits before committing.

---

## What competitors are doing that you aren't (from direct inspection)

- **jamieoptics.gr / youandeyeoptics.gr** both run explicit **merchandising
  sections** on the homepage — "NEW COLLECTION", "LUXURY", "WEB OFFERS" — a
  dedicated discount/promo shelf, not just a product grid. **FIXED:** added
  a "Προσφορές" (Offers) section to `HomePage.jsx`, built from products with
  a real active discount (`discountPrice > price`) — reuses the product data
  the homepage already fetches for "featured," so no extra network request.
  Only renders when there's actually a live discount to show.
- **youandeyeoptics.gr** organizes primary navigation by **brand** as a
  first-class browsing path (`/brands/sunglasses`, `/brands/frames`), in
  addition to category. You have a brand *filter* within category pages
  (`PLP.jsx`'s brand dropdown), but no direct "shop by brand" entry point —
  relevant since you already lean on recognizable brand names (Converse,
  Guess, DKNY, Ted Baker, Pepe Jeans, Hickmann) as a trust signal. **Not yet
  done** — still open.
- **youandeyeoptics.gr** prominently advertises **free optometry services**
  at their physical locations on the homepage itself — using an in-person
  service as an online trust/differentiation signal. You have genuinely
  differentiated services (low-vision specialization, "Οπτικά στο σπίτι"
  home visits) that currently only live on their own separate pages
  (`LowVision.jsx`, `LookAtHome.jsx`) with no homepage visibility at all.
  **FIXED:** added a "Οι Υπηρεσίες μας" section to the homepage with two
  cards linking to both pages.
- **jamieoptics.gr** has a dedicated **"Reading & BlueLight"** category
  (reading glasses / blue-light filtering) — a distinct, easy-to-shop
  sub-category you don't currently carry as a named category, even if you
  stock similar products under general frames.

---

## New finding (reported by user, confirmed + fixed): brand filter/sort undercounts and misorders results

Reported symptom: applying a brand filter on a category page shows fewer
products than actually exist; changing the sort order behaves strangely and
skips products too; sorting by price uses the wrong price field.

Two real, separate bugs found here, not one:

1. **Backend pagination instability** — `public_products.py` and
   `shop_products.py` both paginated with `ORDER BY created_at DESC` and no
   secondary tiebreaker. Many products share the exact same `created_at`
   (bulk WooCommerce import), so Postgres had no guaranteed stable order
   among those ties across separate `OFFSET`-based queries. **Fixed:** added
   `Product.id.desc()` as a secondary sort key in both files. Verified live
   after deploy: repeated calls at the same offset now return identical
   results, and splitting one page into two smaller ones now gives the exact
   same combined set — pagination is provably stable.
2. **The actual cause of "skips a lot of products" — a frontend bug, found
   after the backend fix alone didn't resolve it.** `PLP.jsx`'s brand-filter
   aggregation loop broke out of its per-batch matching loop the instant it
   hit `PAGE_SIZE` (12) results — even mid-batch. Traced with full
   diagnostics against the live API: a single raw batch of 60 products
   contained 19 "Guess" matches, but only the first 12 were kept; the other
   7 were silently discarded, and `batchOffset` had already advanced past
   that entire batch, so they were never revisited. `25 - 18 = 7`, exactly
   matching what got dropped. **Fixed:** the loop now fully processes every
   match in a fetched batch before deciding whether to fetch another one,
   instead of truncating mid-batch. Re-simulated against production after
   the fix: 25/25 "Guess" sunglasses now surface correctly.
3. **Price sort used the wrong field.** `getEffectivePrice` preferred
   `discountPrice` (the higher, original/starting price) over `price` (the
   actual/offer price, confirmed via real product data: it's always the
   lower number) whenever both were set — which is true for the near-total
   majority of products. Sorting "low to high" therefore ordered by the
   *original* price instead of what a customer would actually pay, and (per
   the user) made "starting price only" the number that seemed to be shown
   for some products' sort position — a mismatch between what determined the
   order and what's displayed on the card, not a missing-data problem
   (checked: 0 of 343 sunglasses are actually missing the `price` field).
   **Fixed:** now prefers `price` first, `discountPrice` only as a fallback
   for the rare product missing it entirely.
4. **Sorted results reshuffled as more loaded ("adding them inside the
   already displayed ones").** Root cause: the backend delivers products in
   creation-date order; `PLP.jsx` fetches incrementally (one small batch per
   "Load more") and re-sorts the *combined* set by price/brand each time.
   Only "newest" naturally lines up with that fetch order — for any other
   sort, a partial dataset can't be correctly globally ordered, so each new
   batch gets client-side-sorted into the middle of what's already on screen
   instead of appending at the end. **Fixed:** when a non-"newest" sort is
   active, `loadPage` now fetches the *entire* matching set in one go (same
   deep-scan mechanism already used for brand filtering) before display,
   using `sortBy` as an effect dependency so switching the dropdown
   triggers this immediately. Once the full set is loaded, the client-side
   sort is stable and "Load more" just reveals more of an already-final
   order — no further fetches, no reshuffling. Tradeoff: switching to a
   non-default sort on a large category now takes a brief moment
   up front (a handful of sequential requests) instead of loading instantly
   and reshuffling later — worth it for correctness.

## New finding: "Card (Viva Wallet)" is a live, selectable checkout option that does nothing

While building the homepage services section, checked `CheckoutPaymentPage.jsx`'s
`PAYMENT_OPTIONS` list: `{ value: "card", label: "Κάρτα (Viva Wallet)" }` is a
real, selectable radio option in the live checkout today. But `handlePlaceOrder`
just posts the order to `/api/orders` regardless of which payment method was
picked — nothing actually processes a card payment or redirects to Viva for
*any* selection, since Viva isn't wired into checkout yet (as established a
few nights ago). A customer who picks "card" right now gets an order
confirmation with no payment ever taken, no redirect, nothing — genuinely
confusing for them, and for you (an order shows up with `payment_method:
"card"` but no payment exists). Same claim also appears as already-working
in `UsageTerms.jsx`'s payment methods list and the homepage trust-badge text
("Ασφαλείς συναλλαγές μέσω VivaWallet...").

This is live on production right now, not hypothetical. Worth deciding
soon: either temporarily remove/hide the "card" option from checkout until
Viva is actually connected, or add a visible "coming soon" state so it can't
be selected. Didn't change this without checking with you first since it
touches the checkout flow directly — want me to hide it now?

## Suggested priority order

1. **Fix the English/Greek mixing** (Section 1) — smallest effort, sits
   directly on the conversion path, no design/backend work needed.
2. **Fix mobile PDP layout order** (Section 2) — CSS/JSX reorder only.
3. **Cart free-shipping progress indicator** (Section 3) — moderate effort,
   directly targets cart abandonment.
4. **Homepage merchandising section** for offers / differentiated services
   (low-vision, home visits) — moderate effort, addresses both the
   competitor gap and the "services buried in nav" issue in one section.
5. **Site-wide search** (Section 5) — moderate backend+frontend effort.
6. **Order history in account** (Section 6) — bigger: needs linking orders
   to `customer_id`, not just `contact_email`.
7. **Reviews, promo codes, newsletter, wishlist** — real features, worth
   doing, but lower urgency than the above; pick based on what you actually
   want to invest in running (reviews need ongoing moderation, promo codes
   need a campaign to use them for, etc.).

Want to start with #1 now? It's the fastest win in here.
