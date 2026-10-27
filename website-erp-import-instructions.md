# Build spec: ERP catalogue import (lookoptica.gr admin)

This spec is self-contained: it assumes no access to OptiAEye's codebase or database, and
everything needed about the input file and the business rules is written out below. Where this
document references "the site" or "the website," that's the lookoptica.gr codebase this import
gets built in; "OptiAEye" is the separate desktop ERP app that produces the import file — already
built, not in scope here beyond the file format in §1.

## What this is

OptiAEye (the shop's desktop inventory system) now has an export feature: the shop owner filters
and selects exactly which frame rows to export, and gets a JSON file. Your job is the other half:
an admin-panel import that takes that file, shows a safe preview of what would change, and on
confirmation creates/updates products on the site. Nothing here ever runs automatically — a human
uploads the file and clicks confirm.

The site already has a scaffolded admin page at `/admin/import`
(`AdminImportProductsPage.jsx`) that currently POSTs to `/api/admin/import-products`, which
doesn't exist. **Change that page's fetch target to `/api/admin/erp-sync`** (the endpoint this
spec defines below) — `/api/admin/import-products` was a placeholder name, never implemented,
and should be abandoned in favor of the name used here.

## 1. Input file format

JSON, one file per import batch. Example:

```json
{
  "exported_at": "2026-09-16T10:00:00Z",
  "items": [
    {
      "code": "RB 7613",
      "colour": "RN03",
      "brand": "Rebbeca Blu",
      "category": "Sunglasses",
      "name": "",
      "stype": "Female",
      "material": "Accetate",
      "style": "Fashion",
      "shape": "Οβάλ",
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

Field notes (these are OptiAEye's raw column values — nothing in the file is pre-translated for
you, you do all mapping below):
- `code` + `colour` together identify one variant row. Multiple rows can share a `code` (same
  base product, different colors) — see §3.
- `category` is always exactly `"Sunglasses"` or `"Ophthalmic Frame"` — no other values exist.
- `brand` may be misspelled relative to the site's canonical brand name — see §4.
- `name` is frequently empty (common in the source data — treat as optional, not an error).
- `material`, `style`, `shape`, `stype` are free-text strings from the ERP's own lookup tables.
  `material` and `shape` matter for §5 (auto-drafted description); `style` and `stype` are stored
  but not otherwise acted on by this import.
- `ean` may be empty. `barcode` is always present and numeric.
- There is deliberately no `lenscolor` field — it was considered and explicitly dropped, not an
  oversight. Don't add it.
- Validate the file strictly against this schema: reject the whole batch (don't partially import)
  if a field has the wrong type. No silent coercion.

## 2. Field mapping: ERP row → site `Product` / variant

### Variant-level fields (one entry per `items[]` row)

| Site variant field | Comes from |
|---|---|
| `sku` | `barcode` |
| `ean` | `ean`, **only if** present AND passes GTIN checksum validation. If absent or invalid, leave the variant's `ean` unset — do not fall back to `barcode`. |
| `color` | `colour`, used verbatim (no color-name translation — the site already displays raw codes like `RN03` today) |
| `price` | `retail_price` |
| `stock` | `stock` |

**Known upstream bug to guard against:** some already-published products have `barcode`'s value
sitting in the `ean` field (an internal 7-digit stock number was put where a real EAN/GTIN
belongs). Never write a value into `ean` that fails GTIN checksum validation, regardless of
source — this import is also how those two already-bad products
(`ted-baker-tb-1796`, `rebecca-blu-rb-8913`) get silently corrected the first time their barcode
comes through a sync, because a matched variant's `ean` is always refreshed from the file (§3).

### Base-product-level fields (one per group — see §3 for grouping)

| Site field | Comes from |
|---|---|
| `slug` | `slugify(brand + "-" + code)`, using the **canonical** brand name (§4), not the raw ERP `brand` string |
| `sku` | `code` |
| `brand` | `brand`, passed through the alias map in §4 |
| `category` | `Sunglasses` → `sunglasses`, `Ophthalmic Frame` → `ophthalmic_frames` |
| `audience` | from `stype`: `Male`→`men`, `Female`→`women`, `Unisex`→`unisex`, `Girl`/`Boy`/`Kids Unisex`→`kids`. Unmapped/empty `stype` → leave `audience` unset, don't guess. |
| `title.el` / `title.en` | `{brand} {name}` if `name` is non-empty, else `{brand} {code}` — same string in both languages, the ERP has no per-language title |
| `attributes.eyeSize` | `boxsize` |
| `attributes.bridgeSize` | `bridge` |
| `attributes.templeLength` | `side` |
| `attributes.material` / `.shape` / `.style` | stored as-is (raw ERP strings) |
| `description` | **only auto-filled on first creation of a brand-new product** — see §5. Never touched on any update. |
| `images` | always left empty by this import — added manually in the admin panel afterward |

## 3. Grouping and merge algorithm

This is the core logic. Run it once per import batch, inside the confirm step (§6) — never
during the dry-run preview.

1. **Group** incoming `items[]` rows by `(brand, code)` after mapping `brand` through the alias
   table (§4) — so a brand typo doesn't create a second group. One group = one product.
2. **Compute the target `slug`** for the group (see mapping table above).
3. **Look up that slug** against existing products on the site.
   - **Not found → create** a new product. Base fields as mapped above. `variants` = one entry
     per row in the group. `description` gets auto-drafted per §5.
   - **Found → merge, never overwrite manual work:**
     - For each incoming row, match against the existing product's variants by `sku`
       (= `barcode`).
       - **No match → append** as a new variant (this is "a second color was added later in
         OptiAEye").
       - **Match found → update** that variant's `price`, `stock`, and `ean` only (per the GTIN
         rule in §2). Leave `color` and any variant-level images untouched.
     - The base product's `title`, `description`, and `images` are **never modified** on an
       update — only variant fields change. An admin's manual edits to description/images after
       the initial auto-import are permanent.

**Zero-stock rows:** a row with `stock = 0` is **not included** in a sync batch at all — it
creates nothing new (neither a new product nor a new variant). Exception: if a variant that was
already synced previously now shows `stock = 0` in a later file, a normal sync still updates that
existing matched variant's `stock` to 0 (marks it out of stock) — "skip" only applies to
first-time creation, not to updating something that already exists on the site.

## 4. Brand alias map

OptiAEye has typos the site doesn't:

```
"Rebbeca Blu" → "Rebecca Blu"
"Breavewear"  → "Bravewear"
```

Apply this translation to `brand` **before** computing the slug, before grouping, and before
writing the site's `brand` field. This is purely an import-time translation layer — it does not
imply anything about OptiAEye's own data, which you have no access to and should not need to
reason about. If a brand name arrives that isn't in this map, pass it through unchanged (don't
invent additional aliases).

## 5. Auto-drafted description (new products only)

When — and only when — this import is **creating a brand-new product** (not updating an existing
one), pre-fill `description` using this template:

```
Line 1: {material phrase} {category phrase}
Line 2: (blank — left for a human to fill in by hand afterward)
Line 3: Σχήμα {shape}        (omit this whole line if `shape` is empty)
```

Real example this was modeled on: `"Κοκάλινα γυαλιά ηλίου\n\nΣχήμα Οβάλ"` for an Accetate
Sunglasses frame with `shape = "Οβάλ"` — the blank middle line is intentional, not a bug; a human
fills in color/lens description text there afterward in the admin panel.

**Category phrase** (always present):

| ERP `category` | Phrase |
|---|---|
| `Sunglasses` | `γυαλιά ηλίου` |
| `Ophthalmic Frame` | `γυαλιά οράσεως` |

**Material phrase** — look up the group's `material` value (use the first row's value; in
practice every row in a group shares the same material). If `material` is empty/unrecognized,
omit the material phrase entirely and let line 1 be just the category phrase alone — don't guess,
don't default to anything.

| ERP `material` | Phrase |
|---|---|
| `Accetate` | `Κοκάλινα` |
| `Stainless Steel` | `μεταλλικά` |
| `TR90` | `TR90` (stands alone — do **not** prefix with "μεταλλικά", it's a plastic, not a metal) |
| `Nylor Stainless Steel` | `μεταλλικά nylor` |
| `Titanium` | `τιτάνιο` |
| `Griff stainless steel` | `μεταλλικά griff` |
| `Σύμμεικτα` | `Σύμμεικτα` (already Greek, used as-is) |
| `Injection` | `Injection` (used as-is) |
| *(anything else, including empty)* | omit — line 1 is just the category phrase |

This lookup table is final and confirmed against OptiAEye's real data — these are the only
`material` values that currently exist in that system. If a future export ever contains a
`material` value not in this table, treat it the same as "unrecognized": omit the phrase, don't
fail the import, and don't guess a translation.

**Shape line:** `shape` arrives already in Greek (e.g. `Οβάλ`, `Στρογγυλό`, `Πολυγωνικό`,
`Παραλληλόγραμμο`, `Μάσκα`, `Κουρμπέ`) — just prefix it with `Σχήμα `. If `shape` is empty, drop
line 3 entirely rather than writing `"Σχήμα "` with nothing after it.

**Hard rule:** this logic runs exactly once, at creation time, for exactly the group's chosen
material/shape. It must never run again for that product on a later sync, and must never touch
`description` on a product that already exists on the site — see §3's merge rule, which this
depends on.

## 6. API: dry-run then confirm

- `POST /api/admin/erp-sync` — same auth/CSRF as every other admin endpoint on this site. Accepts
  the JSON file (§1).
- **Dry-run by default.** Running the merge algorithm (§3) against the current catalogue and
  returning a summary — without writing anything — must be the default behavior with no
  additional flag, or behind an explicit `dry_run: true`/default-true flag, whichever matches
  this codebase's existing admin-endpoint conventions. Response should include:
  - Counts: new products, new variants on existing products, price/stock updates.
  - Warnings list: unmapped brand (shouldn't happen given §4, but don't crash if it does —
    pass the raw name through and warn), unmapped `category`/`stype`, invalid EAN rejected,
    zero-stock rows skipped.
- **Confirm step:** a second call (e.g. `dry_run: false`, or a distinct "confirm" action/button
  after the admin reviews the dry-run summary) that actually writes the changes, applying exactly
  what was computed — not a fresh re-parse that could drift from what the admin reviewed.
- The existing `/admin/import` page already has "preview before import" language in its UI copy —
  make that literally true instead of aspirational.

Nothing here should ever write to the database from the dry-run call. Treat that as a hard
invariant worth a test, not just a code review note.

## 7. Explicitly out of scope — do not build these

- **Contact lenses / other product types.** This import only ever handles frames. A different
  variant dimension (diopter/power, not color) would need its own separate design later.
- **Deleting or archiving products.** A product that disappears from a later OptiAEye export just
  stops receiving stock/price updates — it is never auto-archived or deleted by this import.
  Archiving stays a manual admin action.
- **Automatic/scheduled imports.** This is manual-trigger only: a human uploads a file and clicks
  through dry-run → confirm. No cron, no polling, no webhook from OptiAEye.
- **`lenscolor` in any form.** Was considered for the description draft, explicitly dropped by the
  shop owner (not relevant to the business, and the underlying OptiAEye data was empty anyway).
  Don't add it to the schema, don't look for it in the file.
- **Backfilling descriptions onto existing products.** §5 only ever fires for brand-new products.
  Retroactively drafting descriptions for products already on the site is a different, separate
  feature this spec does not cover.

## 8. Suggested acceptance tests

- A file with one new `(brand, code)` group, 2 colors → creates 1 product with 2 variants, and a
  2-line (if `shape` present) or 1-line (if not) auto-drafted description, blank middle line.
- The same file imported a second time → 0 new products/variants, 0 changes (fully idempotent),
  because stock/price/ean are unchanged.
- A file where one variant's `stock` or `retail_price` changed → exactly that variant's fields
  update; the product's `description`/`images`/`title` are byte-for-byte unchanged.
- A file with a brand´s known typo (`"Rebbeca Blu"`) matching an existing product created under
  the canonical name → merges into the existing product, does not create a duplicate under the
  typo'd brand.
- A row with `stock: 0` for a product/variant that doesn't exist yet → creates nothing.
- A row with `stock: 0` for a variant that already exists on the site → updates that variant's
  stock to 0; does not remove or archive it.
- A row whose `ean` fails GTIN checksum → variant's `ean` is left unset, not written with the bad
  value; no import-wide failure.
- Dry-run call twice in a row → identical summary both times, zero database writes either time.
- `material` value not in the §5 table → product still creates successfully, with line 1 being
  just the category phrase, no crash, no fabricated material word.
