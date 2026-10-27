from pydantic import BaseModel, ConfigDict, StrictFloat, StrictInt, StrictStr

# exported_at/updated_at are accepted but never read by the merge logic, and
# OptiAEye's own export doesn't emit one consistent timestamp format (the
# per-row updated_at is a raw Postgres timestamp-as-text, e.g.
# "2026-10-21 12:28:16.766276+00" - a short "+00" offset that even pydantic's
# lenient datetime parser rejects). Since nothing here does date arithmetic
# on either field, they're plain strings, not datetimes - no format to get
# wrong, nothing to reject real export data over.


class ErpItem(BaseModel):
    """One frame row from an OptiAEye export. Strict + forbid-extra: a field
    of the wrong type, or a field this schema doesn't know about, rejects the
    whole batch instead of silently coercing or ignoring it."""

    model_config = ConfigDict(strict=True, extra="forbid")

    code: StrictStr
    colour: StrictStr
    brand: StrictStr
    category: StrictStr
    name: StrictStr = ""
    stype: StrictStr = ""
    material: StrictStr = ""
    style: StrictStr = ""
    shape: StrictStr = ""
    boxsize: StrictInt
    bridge: StrictInt
    side: StrictInt
    stock: StrictInt
    retail_price: StrictFloat | StrictInt
    barcode: StrictInt
    ean: StrictStr | None = None
    updated_at: StrictStr | None = None


class ErpExportFile(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    exported_at: StrictStr
    items: list[ErpItem]


# OptiAEye has typos the site doesn't - corrected before grouping, slugging,
# or writing the site's brand field.
BRAND_ALIASES: dict[str, str] = {
    "Rebbeca Blu": "Rebecca Blu",
    "Breavewear": "Bravewear",
}

# ERP `category` -> site category value. category is always exactly one of
# these two per the ERP's own contract; an unrecognized value is warned about
# and the product's category is left unset rather than guessed.
CATEGORY_MAP: dict[str, str] = {
    "Sunglasses": "sunglasses",
    "Ophthalmic Frame": "ophthalmic_frames",
}

# ERP `category` -> Greek phrase for the auto-drafted description (line 1).
CATEGORY_PHRASES: dict[str, str] = {
    "Sunglasses": "γυαλιά ηλίου",
    "Ophthalmic Frame": "γυαλιά οράσεως",
}

# ERP `stype` -> site audience value. These are the site's real stored
# values (confirmed against frontend/src/pages/PLP.jsx's AUDIENCE_CONFIG and
# admin EditProduct.jsx's audienceOptions) - not the "men/women/kids" section
# labels those values later get grouped under on /shop URLs.
AUDIENCE_MAP: dict[str, str] = {
    "Male": "male",
    "Female": "female",
    "Unisex": "unisex",
    "Girl": "girl",
    "Boy": "boy",
    "Kids Unisex": "kids_unisex",
}

# ERP `material` -> Greek phrase for the auto-drafted description (line 1).
# Final, confirmed list - a material not in this table is treated as
# unrecognized: omit the phrase, don't guess a translation.
MATERIAL_PHRASES: dict[str, str] = {
    "Accetate": "Κοκάλινα",
    "Stainless Steel": "Μεταλλικά",
    "TR90": "TR90",
    "Nylor Stainless Steel": "Μεταλλικά nylor",
    "Titanium": "Τιτάνιο",
    "Griff stainless steel": "Μεταλλικά griff",
    "Σύμμεικτα": "Σύμμεικτα",
    "Injection": "Injection",
}
