// Utilities for working with product categories (PLP/Shop filters)
const STOCK_KEYWORDS = ["stock", "stok", "στοκ"];

export function normalizeCategoryString(str = "") {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function matchesCategoryAlias(value, aliases = []) {
  const normalized = normalizeCategoryString(value);
  if (!normalized) return false;

  return aliases.some((alias) => {
    const normAlias = normalizeCategoryString(alias);
    if (!normAlias) return false;

    return (
      normalized === normAlias ||
      normalized.startsWith(normAlias) ||
      normalized.endsWith(normAlias)
    );
  });
}

export function isStockCategory(value) {
  const normalized = normalizeCategoryString(value);
  if (!normalized) return false;

  return STOCK_KEYWORDS.some((token) =>
    normalized.includes(normalizeCategoryString(token))
  );
}

export function isStockProduct(product = {}) {
  if (!product) return false;

  if (product.isStock === true || product.stock === true) return true;

  const attributes = product.attributes || {};
  if (
    attributes.is_stock === true ||
    attributes.isStock === true ||
    attributes.stock === true
  ) {
    return true;
  }

  const candidates = [
    product.category,
    product.stock_category,
    attributes.category,
    attributes.category_label,
    attributes.category_value,
    attributes.stock_category,
  ];

  const tags = Array.isArray(attributes.tags) ? attributes.tags : [];

  return [...candidates, ...tags].some((val) => isStockCategory(val));
}

// Short Greek labels for product-card category chips; order matters ("stock-frames" is frames, not stock).
const CATEGORY_LABELS_EL = [
  { label: "Ηλίου", aliases: ["sunglasses", "sun-glasses", "γυαλια ηλιου"] },
  { label: "Οράσεως", aliases: ["ophthalmic_frames", "frames", "σκελετοι ορασεως", "γυαλια ορασεως"] },
  { label: "Φακοί επαφής", aliases: ["contact_lenses", "contact-lenses", "φακοι επαφης"] },
  { label: "Αξεσουάρ", aliases: ["other_products", "other-products", "αλλα προιοντα", "accessor-eyes"] },
  { label: "Προσφορά", aliases: ["stock", "stok", "στοκ"] },
];

export function categoryLabelEl(value) {
  if (!value) return "";
  const match = CATEGORY_LABELS_EL.find(({ aliases }) => matchesCategoryAlias(value, aliases));
  if (match) return match.label;
  // Unknown values: keep ones already written in Greek, hide raw English keys.
  return /[Ͱ-Ͽ]/.test(value) ? value : "";
}
