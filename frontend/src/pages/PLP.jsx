import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { isStockProduct, matchesCategoryAlias } from "../utils/categoryHelpers";

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
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const PAGE_SIZE = 12;

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

  const getProductKey = (product) => {
    return (
      product?.slug ||
      product?.id ||
      product?._id ||
      product?.attributes?.slug ||
      product?.attributes?.sku ||
      product?.attributes?.barcode ||
      product?.sku ||
      product?.barcode ||
      `${product?.title?.el || product?.title?.en || product?.title || ""}-${product?.variantLabel || ""}`
    );
  };

  const loadPage = async (nextOffset = 0, replace = false) => {
    if (!config) {
      setState("error");
      return;
    }

    if (replace) {
      setState("loading");
      setHasMore(true);
      setOffset(0);
      setVisibleCount(PAGE_SIZE);
      setItems([]);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const matchesCategoryConfig = (product) => {
        const aliases = config.aliases || [];
        const candidates = [
          product?.category,
          product?.attributes?.category,
          product?.attributes?.category_label,
          product?.attributes?.category_value,
          ...(Array.isArray(product?.attributes?.tags) ? product.attributes.tags : []),
        ];
        return candidates.some((value) => matchesCategoryAlias(value, aliases));
      };

      const filterAndProject = (list) => {
        const filtered = list.filter((p) => {
          const stockMatch = isStockProduct(p);
          const baseMatch = matchesCategoryConfig(p);
          const tagMatch = (Array.isArray(p?.attributes?.tags) ? p.attributes.tags : []).some(
            (tag) => matchesCategoryAlias(tag, config.aliases || [])
          );
          const matchesCategory = (() => {
            if (categorySlug === "stock") {
              return stockMatch || baseMatch || tagMatch;
            }
            if (isStockView) {
              return stockMatch && (baseMatch || tagMatch);
            }
            return baseMatch;
          })();

          if (!matchesCategory) return false;

          const requireStockOnly = categorySlug === "stock" || isStockView;
          if (requireStockOnly && !stockMatch) return false;

          if (audienceConfig) {
            const allowed = audienceConfig.allowed || [];
            const matchesAudience =
              allowed.includes(p.audience) ||
              allowed.includes(p.attributes?.audience) ||
              allowed.some((aud) => (p.attributes?.audiences || []).includes(aud));
            if (!matchesAudience) return false;
          }

          if (categorySlug === "stock" && !stockMatch) return false;

          return true;
        });

        return filtered.map((p) => ({
          ...p,
          title: p.title,
          slug: p.slug,
          category: p.category,
          audience: p.audience,
        }));
      };

      // Keep fetching until we have PAGE_SIZE filtered items or no more data
      const baseItems = replace ? [] : items;
      const seenKeys = new Set(
        baseItems
          .map((p) => getProductKey(p))
          .filter(Boolean)
      );
      const aggregatedUnique = [];
      let batchOffset = nextOffset;
      let lastBatchLength = 0;
      let iterations = 0;
      const MAX_FETCHES = 6; // safety guard

      while (aggregatedUnique.length < PAGE_SIZE && iterations < MAX_FETCHES) {
        iterations += 1;
        const params = new URLSearchParams();
        params.set("limit", PAGE_SIZE);
        params.set("offset", batchOffset);
        (config?.aliases || []).forEach((alias) => params.append("category", alias));
        (audienceConfig?.allowed || []).forEach((aud) => params.append("audience", aud));
        const res = await fetch(`${API}/shop-products?${params.toString()}`);
        if (!res.ok) throw new Error(`Fetch failed (offset ${batchOffset})`);
        const batch = await res.json();
        const list = Array.isArray(batch) ? batch : [];
        lastBatchLength = list.length;

        const projected = filterAndProject(list);
        for (const product of projected) {
          const key = getProductKey(product);
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);
          aggregatedUnique.push(product);
          if (aggregatedUnique.length >= PAGE_SIZE) break;
        }
        batchOffset += list.length;

        if (list.length < PAGE_SIZE) break; // no more data server-side
      }

      let nextLength = 0;
      setItems((prev) => {
        const base = replace ? [] : prev;
        const next = [...base, ...aggregatedUnique];
        nextLength = next.length;
        return next;
      });

      setOffset(batchOffset);
      setHasMore(lastBatchLength === PAGE_SIZE);
      setVisibleCount((c) => Math.min(Math.max(c, PAGE_SIZE), nextLength));
      setState("ok");
    } catch (err) {
      console.error("Error loading products for category page:", err);
      if (replace) setState("error");
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!config) {
      console.warn("No CATEGORY_CONFIG for slug:", categorySlug);
      setState("error");
      return;
    }

    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (isStockView && !isStockProduct(p)) return false;
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

  const visibleItems = useMemo(
    () => displayItems.slice(0, visibleCount),
    [displayItems, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, brandFilter, sortBy, isStockView]);

  const handleLoadMore = async () => {
    if (visibleCount < displayItems.length) {
      setVisibleCount((c) => c + PAGE_SIZE);
      return;
    }
    if (hasMore) {
      await loadPage(offset, false);
      setVisibleCount((c) => c + PAGE_SIZE);
    }
  };

  const handleShowLess = () => {
    setVisibleCount(PAGE_SIZE);
  };

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
        <div className="space-y-4 text-center text-slate-600">
          <div>No products matched yet.</div>
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Loading..." : "Load more results"}
            </button>
          )}
        </div>
      )}

      {state === "ok" && displayItems.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleItems.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(hasMore || visibleCount < displayItems.length) && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            )}
            {visibleCount > PAGE_SIZE && (
              <button
                type="button"
                onClick={handleShowLess}
                disabled={state === "loading"}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Show less
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
