// Guards against garbage import data (empty or absurdly long variant SKUs,
// non-GTIN "ean" values) leaking into Product structured data - this is what
// Google Search Console flagged as "Invalid string length in field sku" and
// "Invalid GTIN" for Merchant listings. Some WooCommerce-imported variant
// SKUs are URL-encoded slug fragments up to ~200 characters long instead of
// real codes; some "ean" values are 7/11/14-digit numbers that aren't valid
// GTIN-8/12/13/14 (wrong length or failed check digit).

// Real base-product SKUs in the catalog top out around 32 chars; garbage
// imported variant SKUs (URL-encoded slug fragments) start around 51 chars
// and run up to ~200 - 50 cleanly separates the two and matches Google
// Merchant Center's documented SKU length limit.
const MAX_SKU_LENGTH = 50;

export function sanitizeSku(value) {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (!str || str.length > MAX_SKU_LENGTH) return undefined;
  return str;
}

// GS1 "Restricted Circulation Numbers" (RCN): checksummed, correctly
// formatted GTINs reserved for a single company/region's internal use
// (e.g. in-store variable-weight labels) and explicitly never globally
// unique - EAN-13 prefixes "02", "04", "20"-"29", and the equivalent UPC-A
// leading digit "2". Found ~84 catalog products using a "2000000..." EAN,
// clearly an internal placeholder rather than a real manufacturer barcode -
// this is what Google's "Not a globally valid GTIN" flags, distinct from
// (and not caught by) plain checksum validity.
function isRestrictedCirculationNumber(str) {
  if (str.length === 13) {
    const prefix = str.slice(0, 2);
    return prefix === "02" || prefix === "04" || (Number(prefix) >= 20 && Number(prefix) <= 29);
  }
  if (str.length === 12) {
    return str[0] === "2";
  }
  return false;
}

export function sanitizeGtin(value) {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) return undefined;
  if (![8, 12, 13, 14].includes(str.length)) return undefined;
  if (isRestrictedCirculationNumber(str)) return undefined;

  const digits = str.split("").map(Number);
  const check = digits[digits.length - 1];
  const body = digits.slice(0, -1);
  let total = 0;
  let weight = 3;
  for (let i = body.length - 1; i >= 0; i--) {
    total += body[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const calc = (10 - (total % 10)) % 10;
  return calc === check ? str : undefined;
}
