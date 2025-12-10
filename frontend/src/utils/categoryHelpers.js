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

