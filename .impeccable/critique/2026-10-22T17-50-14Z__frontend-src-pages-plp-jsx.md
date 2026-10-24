---
target: shop/category listing page (frontend/src/pages/PLP.jsx)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
target_identity: "file:C:\\Users\\fover\\Downloads\\Website\\frontend\\src\\pages\\PLP.jsx"
target_fingerprint: "sha256:3f454dc668a5c02f0ce2ee1f26aafcecc5d09afdf661f88d90ffbf4ba2fe0901"
target_path: "C:\\Users\\fover\\Downloads\\Website\\frontend\\src\\pages\\PLP.jsx"
timestamp: 2026-10-22T17-50-14Z
slug: frontend-src-pages-plp-jsx
---
**Method: dual-agent (A: a3d6aa7e0c3a98696 · B: a7176065ec056947b)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Changing sort/search blanks the whole populated grid back to a bare loading message instead of an in-place update |
| 2 | Match System / Real World | 3 | Natural Greek copy, but "Δεν βρέθηκαν ακόμα προϊόντα" ("not found yet") implies a pending state even for a definitive zero-result |
| 3 | User Control and Freedom | 2 | Brand + stock-view are URL-synced (shareable), but there's no unified "clear all filters," and a fetch error has zero recovery action |
| 4 | Consistency and Standards | 2 | Filter controls lack the focus-visible treatment used everywhere else in the app; the view toggle behaves like a tab but isn't marked up like one |
| 5 | Error Prevention | 2 | No result-count previews on brand/sort options, so a filter+view combo can silently dead-end with no warning |
| 6 | Recognition Rather Than Recall | 3 | Active brand/sort/view stay visible in their own controls, but there's no consolidated "active filters" summary once scrolled into the grid |
| 7 | Flexibility and Efficiency | 2 | Brand/view are URL-shareable; sort and search are not, so a shared link silently loses the chosen sort/search |
| 8 | Aesthetic and Minimalist Design | 2 | The product grid itself is calm, but a long marketing paragraph + 4 filter fields stack before any product is visible, especially on mobile |
| 9 | Error Recovery | 1 | A true fetch error has no retry button at all; the zero-result state has no action when there's no more data to load |
| 10 | Help and Documentation | 2 | Some guidance exists, but it's buried in dense subtitle prose rather than surfaced at the point of need |
| **Total** | | **21/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment (Assessment A)**: Clearly authored for this real catalog, not a generic template - hardcoded real carried brands, category-specific Greek SEO copy (UV400 for sunglasses, "50 chronia empeirias" for frames), a dedicated Stock/clearance view, and real audience-code sub-filtering. The alias-matching system (categoryHelpers.js) handles genuine catalog messiness - Greek/English spelling variants, diacritics, legacy slugs - bespoke engineering, not boilerplate.

**Deterministic scan (Assessment B)**: File-scoped scan of PLP.jsx alone found nothing (same acknowledged undercount as the Homepage run). The URL-scoped rendered scan against the live /shop/sunglasses page found 13 findings: 12 are the same sitewide ProductCard.jsx:60 undersized-text issue already found and decided on during the Homepage critique (confirmed recurring here, not a new decision needed) - plus one new finding specific to this page: the category-brand search input's placeholder text renders at 3.9:1 contrast against its background, below the 4.5:1 AA threshold, traced to PLP.jsx:660-666 (no explicit placeholder color set, falling back to browser default gray). Both judged genuine, not false positives.

**Visual overlays**: Unavailable this session, consistent with both prior runs - no browser automation tool exposed; WebFetch returned only the page title.

## Overall Impression

The underlying engineering is genuinely good - the alias-matching system and the "Ligotera" collapse button are the kind of detail most sites skip. But the moments that matter most for a filtering page - what happens when a search returns nothing, or when the network fails - are exactly where this page has no answer at all. That's a sharper problem than visual polish: a customer who filters into a dead end has no way back except guessing.

## What's Working

- The alias-matching system (categoryHelpers.js + CATEGORY_CONFIG.aliases) handles real-world catalog messiness - Greek/English variants, diacritics, legacy slug spellings - robustly and specifically.
- The "Ligotera" (show less) button lets someone who's loaded several pages collapse back down without a reload - a thoughtful, uncommon antidote to endless-scroll fatigue.
- URL-synced brand + view state makes two of the four filters shareable and back-button-safe.

## Priority Issues

**[P0] A fetch error leaves the page permanently unbrowsable with no retry**
Why it matters: Any network/API failure shows a static error message and nothing else - the only recovery is a manual full-page refresh.
Fix: Add a visible retry button that re-fires the failed load.
Suggested command: /impeccable harden

**[P0] Zero-result state is a true dead end once there's no more data to load**
Why it matters: A brand+search+view combination that matches nothing renders text only - no "clear filters" action, no link back to the parent category. This blocks the entire task (finding a product) with no way out.
Fix: Always render a clear-filters action here that resets brand/search/view together.
Suggested command: /impeccable harden

**[P1] Mobile users scroll past a wall of content before seeing a single product**
Why it matters: Breadcrumb, H1, a full marketing paragraph, and 4 labeled filter fields all stack before the grid on mobile - directly against the product-first principle, for what's likely majority-mobile traffic.
Fix: Truncate the subtitle with an expander on small screens, and/or collapse the filter bar into a toggle so the first viewport shows real products.
Suggested command: /impeccable layout

**[P1] Filter controls fail basic accessibility pairing**
Why it matters: Search/brand/sort labels have no htmlFor/id association, so a screen reader can't reliably announce what each control is for. The view-toggle buttons convey active state only via background color, with no aria-pressed - exactly the audience this product explicitly serves.
Fix: Add id/htmlFor pairs for all three labeled fields; add aria-pressed to the toggle buttons.
Suggested command: /impeccable audit

**[P2] Search placeholder text fails contrast (3.9:1, needs 4.5:1)**
Why it matters: Caught by the detector's rendered scan - the search input's placeholder relies on browser-default gray against a light background, below the AA threshold.
Fix: Set an explicit placeholder color meeting 4.5:1.
Suggested command: /impeccable audit

**[P2] Changing sort or typing a search term blanks the whole grid instead of updating in place**
Why it matters: The populated grid disappears entirely and is replaced by a bare loading message - feels like the page reset rather than refined.
Fix: Keep the previous results rendered (dimmed) with an inline spinner during refetch instead of clearing to blank.
Suggested command: /impeccable polish

**[P2] Sort and search aren't part of the shareable URL state, unlike brand/view**
Why it matters: A shared or back-navigated link silently loses the chosen sort order and search text, while brand and stock-view survive - an inconsistency between filters that look equivalent to the user.
Fix: Mirror sortBy and the debounced search term into the URL the same way brand/view already are.
Suggested command: /impeccable polish

Also reconfirmed, not re-counted as new: the same sitewide ProductCard.jsx:60 10px category-pill text found during the Homepage critique recurs here too (12 of the 13 detector findings). Same root cause, same fix already agreed - no new decision needed, just execution.

## Persona Red Flags

**Sam (accessibility-dependent)**: Unassociated labels on search/brand/sort mean a screen reader may announce "edit text" or "combo box" with no indication of purpose. The view-toggle buttons give no aria-pressed, so Sam can't tell which view is active without sight. This is the one page where filtering is the whole task, yet it has weaker keyboard-focus visibility than the rest of the site.

**Jordan (confused first-timer)**: "Not found yet" reads as a pending state, not a definitive result, with no explanation of which filter caused it. A genuine fetch failure gives Jordan no next step at all.

**Riley (stress tester)**: The product-key fallback (title + variantLabel when slug/sku/barcode are all absent) would silently collide and drop one of two same-titled products with no variant label from the grid - worth checking if this actually occurs in the live catalog.

## Minor Observations

- console.log("CategoryPLP render", ...) fires on every render - debug leftover in production code.
- Dead commented-out code (useState line).
- Two different Greek labels for the same "load more" action.
- Prices render as raw string concatenation (e199.5 instead of Greek-convention e199,50).
- The brand dropdown (~38 options) has no result-count hints or typeahead aid.
- The near-duplicate ShopPLP in App.jsx (not reviewed here) likely shares the error-recovery and label-pairing gaps found on this page.

## Questions to Consider

1. What if the active brand/sort/view state stayed visible as a small pinned chip row while scrolling into the grid, instead of requiring a scroll back to the top to remember what's applied?
2. Is the current minimal filter set (brand, audience, stock-view, free search) actually sufficient for a ~1000-product catalog, or would a price-range filter meaningfully reduce the zero-result dead ends this page handles so poorly?
3. Could the zero-result state do something more generous - e.g. show the newest items from the same brand with the stock filter relaxed - turning a dead end into a redirect, both here and in the shared /shop page?
