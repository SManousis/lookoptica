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

## 1. Critical: English text at the three highest-stakes moments in the funnel

Every page on the site is in Greek — except three specific UI moments,
all of them decision-critical:

- **`CartPage.jsx`** is entirely in English: "Shopping Cart", "items in your
  cart", "Clear cart", "Proceed to checkout", "Continue shopping", the "Home
  / Cart" breadcrumb.
- **`PDP.jsx`**'s buy button and confirmation: `"Add to cart"`, and after
  clicking it, `"Added to cart! View cart"`. Also `"← Back to shop"`.
- **`PLP.jsx`**'s sort control: label reads `"Sort by"`.

This isn't a cosmetic nit — a customer who has read Greek copy on every page
up to this point, then hits English at "add to cart" and the cart itself,
gets a jarring "is this a real Greek shop?" moment at literally the point
where they're deciding whether to trust you with a payment. This is the
single highest-priority fix in this whole review: **cheap, unambiguous, and
sits directly on the conversion path.**

## 2. Mobile: shipping/policy text pushed above the buy button

On `PDP.jsx`, the layout is a 2-column grid (image column, info column) that
stacks on mobile. The `ShippingInfo` block (shipping cost rules, COD fee,
returns policy, phone number — a solid wall of policy text) lives at the
*bottom of the image column*, which on a stacked mobile layout renders
**before** the price, stock status, and "Add to cart" button (all in the
second column). A mobile visitor has to scroll past shipping/returns
boilerplate before they even see the price or the buy button. Move
`ShippingInfo` to render after the add-to-cart button, or collapse it into
an expandable "Αποστολή & Επιστροφές" accordion near the buy button instead.

## 3. No trust/urgency signal in the cart where cost surprises kill conversions

`CartPage.jsx`'s order summary currently just says *"Shipping and taxes
calculated at checkout"* — the customer has no idea whether they're close to
free shipping until the next page. You already have the exact thresholds
server-side (`final_checkout.py`: free via BoxNow above €40, free via courier
above €80). A classic, well-proven fix: show a small progress indicator in
the cart — *"Πρόσθεσε ακόμα €12,50 για δωρεάν μεταφορικά!"* — computed from
the live subtotal. Surprise shipping cost at checkout is one of the most
commonly cited reasons for cart abandonment in e-commerce generally; you
already have the data to prevent the surprise, it's just not surfaced early.

## 4. Dead ratings/review code — and no reviews anywhere

`PDP.jsx` defines a `Star` component (`function Star({ filled, onClick })`)
that is **never rendered anywhere in the file** — leftover scaffolding for a
review/rating feature that was never finished or wired up. There are no
product reviews, ratings, or any social proof anywhere on the site. This
matters commercially: Google's own `Product` rich-result schema we added in
the SEO work supports `aggregateRating`/`review` — right now those fields
are correctly omitted because there's no real data, but if you add even
basic reviews, you unlock star ratings directly in Google search results,
not just on-page trust.

Given there's no order-linked review system today, the lowest-effort real
version: a simple "leave a review" flow reachable from an order (once the
account order-history gap below is closed), or even a basic
admin-curated testimonial block to start.

## 5. No site-wide search — only per-category search

The search box built into `PLP.jsx` only searches *within* the category
you're already on. There's no search field in the site header at all — a
customer who knows exactly what they want ("Guess sunglasses") has to first
guess which category to land in before they can search. For a catalog of
1000+ products, this is real friction for exactly the highest-intent
visitors (the ones who already know what they want). Worth a header search
box that hits the existing `/api/products?q=...` endpoint across the whole
catalog, not just the current category.

## 6. Account exists, but gives customers nothing to come back for

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

## 7. No promo codes, no newsletter capture, no wishlist

Grepped the whole frontend — zero matches for coupon/discount-code,
newsletter signup, or wishlist functionality anywhere in the customer-facing
site. None of these are urgent, but each is a standard, low-effort lever:
- **Promo codes** — useful for the exact kind of one-off campaigns (referral,
  abandoned-cart win-back, social media promo) that convert hesitant buyers.
- **Newsletter capture** — right now, a visitor who isn't ready to buy today
  leaves and you have no way to reach them again. Even a simple email
  capture on the homepage/footer is worth more than nothing.
- **Wishlist** — lower priority for this catalog size, but relevant for
  prescription frames specifically, where people often browse across
  multiple visits before committing.

---

## What competitors are doing that you aren't (from direct inspection)

- **jamieoptics.gr / youandeyeoptics.gr** both run explicit **merchandising
  sections** on the homepage — "NEW COLLECTION", "LUXURY", "WEB OFFERS" — a
  dedicated discount/promo shelf, not just a product grid. Your homepage
  has a featured-products section but no explicit "offers" merchandising
  block.
- **youandeyeoptics.gr** organizes primary navigation by **brand** as a
  first-class browsing path (`/brands/sunglasses`, `/brands/frames`), in
  addition to category. You have a brand *filter* within category pages
  (`PLP.jsx`'s brand dropdown), but no direct "shop by brand" entry point —
  relevant since you already lean on recognizable brand names (Converse,
  Guess, DKNY, Ted Baker, Pepe Jeans, Hickmann) as a trust signal.
- **youandeyeoptics.gr** prominently advertises **free optometry services**
  at their physical locations on the homepage itself — using an in-person
  service as an online trust/differentiation signal. You have genuinely
  differentiated services (low-vision specialization, "Οπτικά στο σπίτι"
  home visits) that currently only live on their own separate pages
  (`LowVision.jsx`, `LookAtHome.jsx`) with no homepage visibility at all —
  worth surfacing these as a homepage section, not just buried in the nav.
- **jamieoptics.gr** has a dedicated **"Reading & BlueLight"** category
  (reading glasses / blue-light filtering) — a distinct, easy-to-shop
  sub-category you don't currently carry as a named category, even if you
  stock similar products under general frames.

---

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
