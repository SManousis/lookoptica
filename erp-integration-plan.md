# OptiAEye → lookoptica.gr Product Sync — Integration Plan

Goal: when you enter a new frame (or a new color of an existing frame) in
OptiAEye, get it onto the site without retyping SKU/price/stock/brand/etc. by
hand — description and images stay manual (added afterwards in the admin
panel), everything else is generated from OptiAEye's own data.

This was written after inspecting both systems directly (not guessing):
OptiAEye's local Postgres database (`frames` table, read-only, with your
permission) and the website's actual `Product` schema/model. The field
mapping below is verified against real rows, not assumed.

---

## 1. What OptiAEye actually stores (the `frames` table)

Confirmed live: **801 rows total**, one row per *(code, colour)* combination
— exactly as you described. Example (`RB 7613` has 5 colors → 5 rows):

| code | colour | brand | category | stock | retail_price | barcode | ean |
|---|---|---|---|---|---|---|---|
| RB 7613 | RN03 | Rebbeca Blu | Sunglasses | 1 | 100.00 | 2000128 | 5200001134031 |
| RB 7613 | RN05 | Rebbeca Blu | Sunglasses | 1 | 100.00 | 2000127 | 5200001134246 |
| RB 7613 | RN06 | Rebbeca Blu | Sunglasses | 1 | 100.00 | 2000802 | (none) |
| RB 7613 | RN07 | Rebbeca Blu | Sunglasses | 1 | 100.00 | 2000129 | (none) |
| RB 7613 | RN08 | Rebbeca Blu | Sunglasses | 0 | 100.00 | 2000126 | (none) |

Relevant columns: `category`, `brand`, `code`, `name`, `colour`, `material`,
`style`, `shape`, `stype` (gender/audience — see below), `lenscolor`,
`boxsize`/`bridge`/`side` (frame size numbers), `stock`, `retail_price`,
`barcode` (internal 7-digit stock code), `ean` (real GTIN, often blank —
347 of 801 rows have none), `description` (internal, 255 chars — **not**
used for the site per your instruction), `updated_at`.

Data-quality facts that shape this plan:
- **`name` is empty on 697 of 801 rows (87%).** Titles can't rely on it —
  they need a `{brand} {code}` fallback, with `name` used only when present.
- **`stype`** (despite the name) holds **gender/audience**: Female (340),
  Male (313), Unisex (106), Girl (18), Boy (16), Kids Unisex (6), blank (2).
  This maps directly to the site's `audience` field.
- **`category`** has exactly two clean values: `Sunglasses` (416),
  `Ophthalmic Frame` (385) — trivial to map.
- I cross-referenced your live site's already-imported multi-color products
  (e.g. `rebecca-blu-rb-7613`) against these exact OptiAEye rows and the
  variant counts/fields line up 1:1 — confirming the original catalog import
  came from this same data, so this mapping isn't a new guess, it's how the
  existing data already works.

---

## 2. What the website's `Product` model expects

One row per **base product** (`slug`, `sku`, `brand`, `category`, `title`,
`price`, `images`, `description`, `attributes`), with a `variants: []` array
— one entry per color, each carrying its own `sku`, `ean`, `color`, `price`,
`stock`, `images`. This already matches the ERP's one-row-per-color shape
almost exactly — the whole integration is really just "group ERP rows by
`(brand, code)` and post them as one product with N variants" instead of N
separate products.

Confirmed field-for-field against a real live product's variants:

| Site variant field | Comes from ERP |
|---|---|
| `sku` | `barcode` |
| `ean` | `ean` (only if present **and** passes GTIN checksum validation) |
| `color` | `colour` (used as-is — the site already displays raw codes like `RN03`, no color-name translation happens today) |
| `price` | `retail_price` |
| `stock` | `stock` |

And for the base product itself:

| Site field | Comes from ERP |
|---|---|
| `slug` | `slugify(brand + "-" + code)` — matches existing slugs exactly (e.g. `rebecca-blu-rb-7613`) |
| `sku` | `code` |
| `brand` | `brand` (see brand-name mismatch warning below) |
| `category` | mapped: `Sunglasses` → `sunglasses`, `Ophthalmic Frame` → `ophthalmic_frames` |
| `audience` | mapped from `stype`: Male→men, Female→women, Unisex→unisex, Girl/Boy/Kids Unisex→kids |
| `title.el` / `title.en` | `{brand} {name}` if `name` present, else `{brand} {code}` (same string in both — ERP has no per-language title) |
| `attributes.eyeSize` | `boxsize` |
| `attributes.bridgeSize` | `bridge` |
| `attributes.templeLength` | `side` |
| `attributes.material` / `.shape` / `.style` | stored as-is, not currently rendered anywhere but kept for future use |
| `description` | **left blank** — you fill this in manually, per your instruction |
| `images` | **left empty** — you add these manually, per your instruction |

### A bug this investigation already found

Two products flagged by Google's "Invalid GTIN" issue (`ted-baker-tb-1796`,
`rebecca-blu-rb-8913`) turn out to have had the ERP's **`barcode`** value
(an internal 7-digit stock number, e.g. `3000696`) imported into the site's
`ean` field instead of the real `ean` (`4894917129864` for that same row) —
confirmed by checking that exact code in OptiAEye. **Fix for the ongoing
sync:** always map `ean` → `ean` and `barcode` → `sku`, never the reverse. I
haven't touched the two already-published bad values yet — worth a quick
manual correction in the admin panel once this sync is live, or I can
include a one-off correction script if you'd rather not do it by hand.

### Open question: brand name mismatches

OptiAEye has typos the live site doesn't (or vice versa):

- ERP `Rebbeca Blu` vs site `Rebecca Blu`
- ERP `Breavewear` vs site `Bravewear`

If the sync creates brands verbatim from ERP names, you'd end up with **two
separate brands** on the site (old correctly-spelled one + a new typo'd
one), splitting that brand's products across two brand filters.

**Resolved:** you confirmed **"Rebecca Blu"** and **"Bravewear"** are the
correct spellings — matching the site, not OptiAEye. The sync will use an
alias map (`{"Rebbeca Blu": "Rebecca Blu", "Breavewear": "Bravewear"}`) so
the site always gets the canonical name regardless of what's in OptiAEye —
this doesn't touch your ERP data at all, it's just a translation step in the
import code.

Still open: do you also want the two brand names **corrected at the source**
in OptiAEye's `brands` table? That's a separate, real write to your live
production database (not just the website), and needs updating every
referencing `frames`/`other_products`/`contact_lens` row in the same
transaction since `brand` is a text foreign key, not an id — not something
I'd do without you explicitly asking for it. The alias map alone is enough
to make the sync correct either way, so this is optional cleanup, not a
blocker.

Also confirmed: `Ana Hickmann` (ERP) matches the site's correct spelling —
this independently confirms the fix made to the homepage brand-logo bar a
few days ago was right.

---

## 3. File format: JSON, not XML

You mentioned XML — I'd steer away from it here, for a concrete reason:
the *existing* Search Console GTIN/SKU bugs we just fixed were caused by
exactly this kind of file-based import mangling data (percent-encoded Greek
text leaking into SKU fields, likely from XML/CSV encoding issues in the
original WooCommerce import). JSON has no encoding ambiguity for Greek text,
is trivial to validate strictly (reject the whole batch if one field is the
wrong type, instead of silently importing garbage), and is what the site's
own API already speaks natively — so the import endpoint can validate the
file against the exact same Pydantic schema used for manual product
creation. Recommended shape (one line per ERP row, flat — grouping into
variants happens server-side on the website, not in OptiAEye):

```json
{
  "exported_at": "2026-09-16T10:00:00Z",
  "since": "2026-09-01T00:00:00Z",
  "items": [
    {
      "code": "RB 7613",
      "colour": "RN03",
      "brand": "Rebbeca Blu",
      "category": "Sunglasses",
      "name": "",
      "stype": "Female",
      "material": "Acetate",
      "style": "Fashion",
      "shape": "Πεταλούδα",
      "boxsize": 54,
      "bridge": 16,
      "side": 145,
      "stock": 1,
      "retail_price": 100.00,
      "barcode": 2000128,
      "ean": "5200001134031",
      "updated_at": "2026-09-10T14:22:00Z"
    }
  ]
}
```

`since` lets OptiAEye export "only what changed" instead of all 801 rows
every time (see §5, incremental sync).

---

## 4. Merge algorithm (the core of your ask)

Runs entirely on the website's backend, per export file:

1. Group incoming rows by `(brand, code)` → one group = one product.
2. Compute the target `slug` for the group.
3. **Look up that slug on the site.**
   - **Not found → create** a new product: base fields as mapped above,
     `variants` = one entry per row in the group.
   - **Found → merge, never overwrite manual work:**
     - For each incoming row, match against the existing product's variants
       by `sku` (=barcode). No match → **append** as a new variant (this is
       your "second color added later" case). Match found → **update
       `price`, `stock`, and `ean`** on that variant (ean is factual barcode
       data, safe to always trust the ERP for it — this is what fixes the
       two already-published bad-GTIN products the first time their code
       comes through a sync, per your answer to #3 below), leave everything
       else (color, images) untouched.
     - The base product's `title`, `description`, and `images` are **never
       touched** on an update — only variants change. So editing the
       description/images by hand after the auto-import is permanent; a
       later color-add sync won't wipe it out.

This directly satisfies your requirement: two colors of the same code
always land under one product, whether they arrive in the same import batch
or weeks apart.

---

## 5. How the sync actually runs

Proposed flow, reusing infrastructure that already (half-)exists:

1. **OptiAEye side** (new, needs building in your Go backend): an
   "Export to website" action — manual button to start, producing the JSON
   file above for all rows changed since the last successful export
   (tracked via a stored watermark timestamp, compared against each row's
   `updated_at`). Given OptiAEye already has its own `catalogue_import_batches`
   concept (batch/status/summary) for the reverse direction, this export
   feature can follow the same shape for consistency.
2. **Website side** (new): a real backend behind the admin panel's existing
   **"Import προϊόντων από ERP"** page (`/admin/import` —
   `AdminImportProductsPage.jsx` already exists as UI-only scaffolding
   today, posting to `/api/admin/import-products`, which doesn't exist yet).
   Needs:
   - `POST /api/admin/erp-sync` (admin-auth + CSRF, same as every other
     admin endpoint) accepting the JSON file.
   - **Dry-run by default** — returns a summary (N new products, M new
     variants on existing products, K price/stock updates, plus a warnings
     list: unmapped brand, unmapped category/audience, invalid EAN, etc.)
     without writing anything. The existing scaffolded page already has
     "preview before first real import" in its instructions text — this
     makes that literally true instead of aspirational.
   - A second confirm step (`POST` with `dry_run=false`, or a "Confirm
     import" button after reviewing the dry-run) actually commits it.
3. You stay in the loop either way: export from OptiAEye → drag the file
   into the site's import page → review the dry-run summary → confirm.
   Nothing auto-publishes without you seeing a diff first.

**Not recommended for now:** a live API-to-API push straight from OptiAEye
to the site with no file/review step in between. It's more "automatic" but
removes your only checkpoint before bad data (a typo'd price, a mis-scanned
barcode) goes live on the public site. The file+dry-run approach is a few
extra clicks per batch in exchange for a safety net — worth it given we've
already found real data-quality issues (barcode/ean mixups, brand typos)
just from this one inspection.

---

## 6. Explicitly out of scope for this phase

- **Contact lenses / other_products** — different variant dimension
  (power/diopter, not color) and a different site-side variant model
  already (`ContactLensPDP.jsx`'s sphere/cylinder/axis selection). Worth
  its own plan later if you want it; not part of this one.
- **Deleting/archiving products** when removed from OptiAEye — the sync as
  designed only creates/updates, never deletes. A product removed from the
  ERP just stops receiving stock/price updates; archiving it on the site
  stays a manual admin action, deliberately, so a data-entry mistake in
  OptiAEye can't accidentally take a live listing down.
- **Automatic scheduling** — starts manual-only (you trigger the export,
  you trigger the import). A cron/scheduled version is a small follow-up
  once the manual flow is proven correct a few times.

---

## 7. Decisions — all resolved

1. ~~Brand typos~~ — **resolved**: "Rebecca Blu" / "Bravewear" are correct,
   sync will alias-map from the ERP's typo'd spellings. Still your call
   whether to also fix the two names in OptiAEye itself (optional, separate
   from the sync working correctly).
2. ~~Zero-stock rows~~ — **resolved: skip.** A row with `stock = 0` is not
   included in a sync batch at all (neither as a new product nor as a new
   variant on an existing one) until it has stock. Note: if a variant that
   *was* already synced later drops to zero stock in OptiAEye, a normal
   sync run will still update that existing matched variant's `stock` to 0
   (marking it out-of-stock on the site) — "skip" means zero-stock rows
   don't get newly *created*, not that stock updates stop flowing to
   already-published variants.
3. ~~Bad-GTIN products~~ — **resolved: folded into the first sync.** No
   separate manual fix needed — per the refined merge rule above, `ean` is
   always refreshed from the ERP on a matched variant, so the first sync
   batch that includes `1796`/`RN08`-equivalent codes corrects them
   automatically.
4. ~~File format / flow~~ — **resolved: JSON, manual trigger, dry-run
   first**, exactly as described in §3 and §5.

Implementation is now two pieces: the website's `/api/admin/erp-sync`
endpoint + wiring the existing admin import page to it (my side), and the
OptiAEye export feature (your side, in the Go backend) — happy to help
design that half's exact JSON-writing code too once you're ready.
