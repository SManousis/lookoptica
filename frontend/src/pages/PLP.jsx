import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import {
  isStockCategory,
  matchesCategoryAlias,
} from "../utils/categoryHelpers";

const API = import.meta.env.VITE_API_BASE || "";


// Map URL slug -> config + possible category values from backend
const CATEGORY_CONFIG = {
  sunglasses: {
    labelEl: "Γυαλιά Ηλίου",
    subtitle:
      "Στυλάτα και προστατευτικά γυαλιά ηλίου για πόλη, θάλασσα και οδήγηση.",
    aliases: [
      "sunglasses",
      "sun-glasses",
      "γυαλια ηλιου",
      "γυαλιά ηλίου",
      "γυαλια_ηλιου",
      "sunglasses-stock",
      "stock-sunglasses",
      "stock γυαλια ηλιου",
    ],
    includeStock: true,
  },
  frames: {
    labelEl: "Σκελετοί Οράσεως",
    subtitle:
      "Σκελετοί για καθημερινή χρήση, γραφείο και οδήγηση – από minimal μέχρι statement.",
    aliases: [
      "ophthalmic_frames",
      "frames",
      "σκελετοι ορασεως",
      "σκελετοί οράσεως",
      "γυαλια ορασεως",
      "ophthalmic-frames",
      "frames-stock",
      "stock-frames",
      "stock γυαλια ορασεως",
    ],
    includeStock: true,
  },
  stock: {
    labelEl: "Stock",
    subtitle:
      "Προσφορές stock για γυαλιά ηλίου και οράσεως σε περιορισμένα τεμάχια.",
    aliases: [
      "stock",
      "stok",
      "στοκ",
      "stock-sunglasses",
      "sunglasses-stock",
      "stock-frames",
      "frames-stock",
      "stock γυαλια",
    ],
    includeStock: true,
  },
  "contact-lenses": {
    labelEl: "Φακοί Επαφής",
    subtitle:
      "Ημερήσιοι, μηνιαίοι και ειδικές λύσεις ανάλογα με τις ανάγκες της όρασής σου.",
    aliases: [
      "contact_lenses",
      "contact-lenses",
      "φακοι επαφης",
      "φακοί επαφής",
      "υγρά φακών επαφής",
    ],
  },
  "other-products": {
    labelEl: "Άλλα προϊόντα",
    subtitle:
      "Αξεσουάρ, θήκες, καθαριστικά και άλλα προϊόντα φροντίδας για τα γυαλιά σου.",
    aliases: [
      "other_products",
      "other-products",
      "αλλα προιοντα",
      "αλλα",
      "accessor-eyes",
      "υγρά φακών επαφής",
      "bulget",
      "4square",
    ],
  },
};

// Map audience slug in URL -> which backend audience values we accept
const AUDIENCE_CONFIG = {
  men: {
    labelEl: "Άνδρας",
    subtitle:
      "Σκελετοί και γυαλιά ηλίου για άνδρες – από κλασικά έως μοντέρνα σχέδια.",
    allowed: ["male", "unisex"],
  },
  women: {
    labelEl: "Γυναίκα",
    subtitle:
      "Γυναικεία γυαλιά με έμφαση στο στυλ και την άνεση για κάθε στιγμή της ημέρας.",
    allowed: ["female", "unisex"],
  },
  unisex: {
    labelEl: "Unisex",
    subtitle:
      "Σχέδια που ταιριάζουν άνετα σε άνδρες και γυναίκες, για ευέλικτο στυλ.",
    allowed: ["unisex"],
  },
  kids: {
    labelEl: "Παιδί",
    subtitle:
      "Παιδικά σκελετά και γυαλιά ηλίου, ανθεκτικά και ασφαλή για τους μικρούς μας φίλους.",
    allowed: ["boy", "girl", "kids_unisex"],
  },
};

export default function CategoryPLP() {
  // 👉 Expect two params from the route: /shop/:categorySlug/:audienceSlug?
  const { categorySlug, audienceSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const config = CATEGORY_CONFIG[categorySlug];
  const audienceConfig = audienceSlug ? AUDIENCE_CONFIG[audienceSlug] : null;
  const view = searchParams.get("view") === "stock" ? "stock" : "all";
  const isStockView = view === "stock";

  const [items, setItems] = useState([]);
  //const [all, setAll] = useState([]); // for debug / inspection
  const [state, setState] = useState("loading"); // loading | ok | error
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | price | brand

  const updateViewParam = (nextView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === "stock") {
      nextParams.set("view", "stock");
    } else {
      nextParams.delete("view");
    }
    setSearchParams(nextParams, { replace: true });
  };

  console.log(
    "CategoryPLP render",
    { categorySlug, audienceSlug, config, audienceConfig }
  );

  useEffect(() => {
    if (!config) {
      console.warn("No CATEGORY_CONFIG for slug:", categorySlug);
      setState("error");
      return;
    }

    setState("loading");

    async function loadAllProducts() {
      const limit = 200; // batch size
      let offset = 0;
      const all = [];
      while (true) {
        const res = await fetch(`${API}/api/products?limit=${limit}&offset=${offset}`);
        if (!res.ok) throw new Error(`Fetch failed (offset ${offset})`);
        const batch = await res.json();
        const list = Array.isArray(batch) ? batch : [];
        all.push(...list);
        if (list.length < limit) break;
        offset += limit;
        if (offset > 5000) break; // safety guard
      }
      return all;
    }

    loadAllProducts()
      .then((list) => {
        //setAll(list);

        console.log("ALL PRODUCTS FOR CATEGORY PAGE:", list);

        const matchesCategoryConfig = (product) => {
          const aliases = config.aliases || [];
          // Check multiple sources because some stock items only carry the base category inside tags/labels
          const candidates = [
            product?.category,
            product?.attributes?.category,
            product?.attributes?.category_label,
            product?.attributes?.category_value,
            ...(Array.isArray(product?.attributes?.tags) ? product.attributes.tags : []),
          ];
          return candidates.some((value) => matchesCategoryAlias(value, aliases));
        };

        const filtered = list.filter((p) => {
          const stockMatch = isStockCategory(p.category);
          const baseMatch = matchesCategoryConfig(p);
          const tagMatch = (Array.isArray(p?.attributes?.tags) ? p.attributes.tags : []).some(
            (tag) => matchesCategoryAlias(tag, config.aliases || [])
          );
          // For stock toggle under a specific category, keep items that belong to that category
          const matchesCategory = (() => {
            if (categorySlug === "stock") {
              return stockMatch || baseMatch || tagMatch;
            }
            if (isStockView) {
              // When viewing stock inside a specific category, require stock + some signal of the base category (aliases/tags)
              return stockMatch && (baseMatch || tagMatch);
            }
            return baseMatch;
          })();

          if (!matchesCategory) return false;

          // Global stock page or explicit stock toggle should only show stock-tagged items
          const requireStockOnly = categorySlug === "stock" || isStockView;
          if (requireStockOnly && !stockMatch) return false;

          // If no audience filter in URL, show all audiences for this category
          if (!audienceConfig) return true;

          const rawAudience = (p.audience || "")
            .toString()
            .toLowerCase()
            .trim();

          const allowed = audienceConfig.allowed || [];
          if (allowed.length === 0) return true; // safety

          return allowed.includes(rawAudience);
        });

        console.log(
          "FILTERED PRODUCTS FOR",
          categorySlug,
          audienceSlug,
          "=>",
          filtered.map((p) => ({
            slug: p.slug,
            category: p.category,
            audience: p.audience,
          }))
        );

        // Deduplicate by slug to avoid React key collisions if backend returns duplicates
        const seen = new Set();
        const deduped = [];
        for (const item of filtered) {
          if (seen.has(item.slug)) continue;
          seen.add(item.slug);
          deduped.push(item);
        }

        setItems(deduped);
        setState("ok");
      })
      .catch((err) => {
        console.error("Error loading products for category page:", err);
        setState("error");
      });
  }, [categorySlug, audienceSlug, config, audienceConfig, isStockView]);

  const availableBrands = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      if (p?.brand) set.add(p.brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const displayItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = items.filter((p) => {
      if (brandFilter && p.brand !== brandFilter) return false;
      if (isStockView && !isStockCategory(p.category)) return false;
      if (!q) return true;
      const title = (p?.title?.el || p?.title?.en || "").toLowerCase();
      const brand = (p?.brand || "").toLowerCase();
      const color =
        (p?.attributes?.color ||
          p?.attributes?.colour ||
          p?.variantLabel ||
          "").toLowerCase();
      return (
        title.includes(q) ||
        brand.includes(q) ||
        color.includes(q)
      );
    });
    const sorted = [...filtered];

    const parseDate = (value) => {
      const raw = value ?? "";
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) return numeric;
      const parsed = Date.parse(raw);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const normalizePrice = (raw) => {
      if (raw == null) return Number.POSITIVE_INFINITY;
      const cleaned = String(raw)
        .replace(/[^0-9,.-]/g, "")
        .replace(",", ".");
      if (cleaned.trim() === "") return Number.POSITIVE_INFINITY;
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
    };

    const getEffectivePrice = (p) => {
      // Prefer discount price; if not present/invalid, fall back to current price
      const discount = normalizePrice(p?.discountPrice);
      const price = normalizePrice(p?.price);
      if (Number.isFinite(discount) && discount > 0 && discount !== Number.POSITIVE_INFINITY) {
        return discount;
      }
      if (Number.isFinite(price) && price > 0 && price !== Number.POSITIVE_INFINITY) {
        return price;
      }
      // Treat missing/zero/invalid prices as the most expensive so they sink to bottom
      return Number.POSITIVE_INFINITY;
    };

    switch (sortBy) {
      case "price":
        sorted.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case "price-desc":
        sorted.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case "brand":
        sorted.sort((a, b) =>
          (a?.brand || "").localeCompare(b?.brand || "", undefined, { sensitivity: "base" })
        );
        break;
      case "brand-desc":
        sorted.sort((a, b) =>
          (b?.brand || "").localeCompare(a?.brand || "", undefined, { sensitivity: "base" })
        );
        break;
      case "oldest":
        sorted.sort(
          (a, b) =>
            parseDate(a?.createdAt || a?.created_at) -
            parseDate(b?.createdAt || b?.created_at)
        );
        break;
      case "newest":
      default:
        sorted.sort(
          (a, b) =>
            parseDate(b?.createdAt || b?.created_at) -
            parseDate(a?.createdAt || a?.created_at)
        );
        break;
    }

    return sorted;
  }, [items, brandFilter, searchTerm, sortBy, isStockView]);

  // If the slug doesn't exist in CATEGORY_CONFIG
  if (!config) {
    return (
      <div className="space-y-4">
        <nav className="text-sm text-slate-500 mb-2">
          <Link to="/" className="hover:underline">
            Αρχική
          </Link>{" "}
          <span>›</span>{" "}
          <Link to="/shop" className="hover:underline">
            Κατάστημα
          </Link>{" "}
          <span>›</span>{" "}
          <span className="text-slate-700">Άγνωστη κατηγορία</span>
        </nav>
        <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          Η κατηγορία <code>{categorySlug}</code> δεν βρέθηκε στο CATEGORY_CONFIG.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500">
        <Link to="/" className="hover:underline">
          Αρχική
        </Link>{" "}
        <span>›</span>{" "}
        <Link to="/shop" className="hover:underline">
          Κατάστημα
        </Link>{" "}
        <span>›</span>{" "}
        <span className="text-slate-700">
          {config.labelEl}
          {audienceConfig ? ` · ${audienceConfig.labelEl}` : ""}
        </span>
      </nav>

      {/* Category hero + compact filters */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold text-amber-800">
            {config.labelEl}
            {audienceConfig ? ` – ${audienceConfig.labelEl}` : ""}
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl">
            {audienceConfig?.subtitle || config.subtitle}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-end text-sm">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700 text-xs">
              Αναζήτηση (brand / τίτλος / χρώμα)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="π.χ. harrison ή havana"
              className="border rounded-md px-3 py-1 text-sm md:w-64"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700 text-xs">Brand</label>
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value);
              }}
              className="border rounded-md px-3 py-1 text-sm md:w-48"
            >
              <option value="">Όλα τα brands</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700 text-xs">Προβολή</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateViewParam("all")}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  !isStockView
                    ? "bg-amber-700 text-white border-amber-700"
                    : "bg-white text-slate-700 hover:border-amber-400"
                }`}
              >
                Όλα
              </button>
              <button
                type="button"
                onClick={() => updateViewParam("stock")}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  isStockView
                    ? "bg-amber-700 text-white border-amber-700"
                    : "bg-white text-slate-700 hover:border-amber-400"
                }`}
              >
                Stock
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-slate-700 text-xs">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-md px-3 py-1 text-sm md:w-52"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="brand">Brand: A to Z</option>
              <option value="brand-desc">Brand: Z to A</option>
            </select>
          </div>
        </div>
      </header>

      {/* State handling */}
      {state === "loading" && (
        <div className="text-sm text-slate-500">Φόρτωση προϊόντων…</div>
      )}

      {state === "error" && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          Δεν ήταν δυνατή η φόρτωση των προϊόντων.
        </div>
      )}

      {state === "ok" && displayItems.length === 0 && (
        <div className="space-y-4">
          <div className="text-slate-600">
            Δεν υπάρχουν προϊόντα σε αυτή την κατηγορία αυτή τη στιγμή.
          </div>

          {/* Debug panel
          <details className="text-xs text-slate-500 bg-slate-50 border rounded-lg p-3">
            <summary className="cursor-pointer">
              Debug: Προϊόντα που επιστρέφει το /api/products
            </summary>
            <div className="mt-2 space-y-1">
              {all.map((p) => (
                <div key={p.slug}>
                  slug: <code>{p.slug}</code> — category:{" "}
                  <code>{String(p.category)}</code> — audience:{" "}
                  <code>{String(p.audience)}</code>
                </div>
              ))}
            </div>
          </details> */}
        </div>
      )}

      {state === "ok" && displayItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayItems.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

