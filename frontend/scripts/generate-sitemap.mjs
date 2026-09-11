// Generates frontend/public/sitemap.xml before each production build.
// Pulls the live product catalog from the production API so the sitemap
// always reflects the current DB, not whatever's in local dev.
//
// Fails gracefully: if the API is unreachable (offline work, API down),
// this warns and leaves any existing sitemap.xml untouched rather than
// breaking `npm run build`.

import { writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SITE_URL = process.env.SITEMAP_SITE_URL || "https://www.lookoptica.gr";
const API_BASE = process.env.SITEMAP_API_BASE || `${SITE_URL}/api`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "public", "sitemap.xml");

const STATIC_PATHS = [
  "/",
  "/shop",
  "/shop/sunglasses",
  "/shop/sunglasses/men",
  "/shop/sunglasses/women",
  "/shop/sunglasses/unisex",
  "/shop/sunglasses/kids",
  "/shop/frames",
  "/shop/frames/men",
  "/shop/frames/women",
  "/shop/frames/unisex",
  "/shop/frames/kids",
  "/shop/contact-lenses",
  "/shop/other-products",
  "/about-us",
  "/contact",
  "/terms",
  "/low-vision",
  "/look-at-home",
];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, { priority, changefreq } = {}) {
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority != null ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchAllProducts() {
  const res = await fetch(`${API_BASE}/products`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GET /products failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const entries = STATIC_PATHS.map((p) =>
    urlEntry(`${SITE_URL}${p}`, {
      priority: p === "/" ? "1.0" : "0.6",
      changefreq: p === "/" ? "daily" : "weekly",
    })
  );

  try {
    const products = await fetchAllProducts();
    for (const product of Array.isArray(products) ? products : []) {
      if (!product?.slug) continue;
      const isContactLens =
        product?.attributes?.product_type === "contact_lens";
      const path = isContactLens
        ? `/contact-lens/${product.slug}`
        : `/product/${product.slug}`;
      entries.push(
        urlEntry(`${SITE_URL}${path}`, { priority: "0.8", changefreq: "weekly" })
      );
    }
    console.log(`sitemap: included ${products.length} products`);
  } catch (err) {
    console.warn(
      `sitemap: could not fetch products from ${API_BASE} (${err.message}). ` +
        `Writing static pages only.` +
        (existsSync(OUT_PATH) ? " Existing sitemap.xml left in place if this fails." : "")
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join("\n") +
    `\n</urlset>\n`;

  writeFileSync(OUT_PATH, xml, "utf-8");
  console.log(`sitemap: wrote ${OUT_PATH} (${entries.length} URLs)`);
}

main().catch((err) => {
  console.error("sitemap: unexpected error, continuing build:", err);
});
