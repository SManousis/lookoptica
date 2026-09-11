import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { isStockProduct, matchesCategoryAlias } from "../utils/categoryHelpers";
import { usePageSEO } from "../hooks/usePageSEO";

const API = import.meta.env.VITE_API_BASE || "";
const normalizeBrand = (value) => (value || "").trim().toLowerCase();
const resolveBrand = (product) =>
  product?.brand ||
  product?.attributes?.brand ||
  product?.attributes?.brand_label ||
  product?.attributes?.brand_name ||
  product?.attributes?.brand_value ||
  "";

// Map URL slug -> config + possible category values from backend
const CATEGORY_CONFIG = {
  sunglasses: {
    labelEl: "Γυαλιά Ηλίου",
    subtitle:
      "Στο Look Οπτικά θα βρεις μεγάλη ποικιλία γυαλιών ηλίου από αναγνωρισμένες μάρκες όπως Converse, Guess, DKNY, Ted Baker, Pepe Jeans και Hickmann, για άνδρες, γυναίκες και παιδιά. Όλα τα γυαλιά ηλίου διαθέτουν φακούς με προστασία UV400 και είναι αυθεντικά προϊόντα από την επίσημη αντιπροσωπεία κάθε μάρκας. Είτε ψάχνεις κάτι κλασικό για την καθημερινότητα είτε ένα statement κομμάτι για το καλοκαίρι, θα βρεις σκελετούς σε κάθε στυλ. Δωρεάν παραλαβή από το κατάστημά μας στο Χαλάνδρι ή δωρεάν μεταφορικά για αγορές άνω των 40€.",
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
      "Οι σκελετοί οράσεως του Look Οπτικά καλύπτουν κάθε ανάγκη, από την καθημερινή χρήση στο γραφείο μέχρι πιο ιδιαίτερα σχέδια για βραδινές εξόδους. Συνεργαζόμαστε με αναγνωρισμένες μάρκες όπως Converse, Guess, DKNY, Ted Baker, Pepe Jeans και Hickmann, ώστε να βρεις τον σκελετό που ταιριάζει στο πρόσωπο και στο στυλ σου. Με πάνω από 50 χρόνια εμπειρίας στην οπτομετρία, η ομάδα μας μπορεί να σε καθοδηγήσει στην επιλογή του κατάλληλου μεγέθους και σχήματος. Όλοι οι σκελετοί είναι αυθεντικοί, με δυνατότητα δωρεάν παραλαβής από το κατάστημά μας στο Χαλάνδρι.",
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
      "Στην κατηγορία Stock θα βρεις επιλεγμένα γυαλιά ηλίου και οράσεως σε προνομιακές τιμές, σε περιορισμένη διαθεσιμότητα τεμαχίων. Πρόκειται για αυθεντικά προϊόντα από τις ίδιες αναγνωρισμένες μάρκες που διαθέτουμε στο κατάστημα, σε τελευταία τεμάχια ή προηγούμενες σεζόν. Ιδανική επιλογή αν ψάχνεις ποιοτικά γυαλιά σε καλύτερη τιμή, χωρίς συμβιβασμό στην αυθεντικότητα.",
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
      "Το Look Οπτικά προσφέρει ημερήσιους, μηνιαίους και εξειδικευμένους φακούς επαφής (τορικούς, πολυεστιακούς) από αξιόπιστες μάρκες, ανάλογα με τις ανάγκες της όρασής σου. Αν δεν είσαι σίγουρος/η ποιος τύπος φακού σου ταιριάζει, η ομάδα μας με εμπειρία στην οπτομετρία μπορεί να σε καθοδηγήσει. Δωρεάν παραλαβή από το κατάστημα στο Χαλάνδρι ή αποστολή σε όλη την Ελλάδα.",
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
      "Στα Άλλα Προϊόντα θα βρεις ό,τι χρειάζεσαι για τη φροντίδα των γυαλιών και των φακών επαφής σου: υγρά φακών επαφής, θήκες, πανάκια καθαρισμού και αξεσουάρ όπως αλυσίδες γυαλιών (Accessor-Eyes). Αυθεντικά προϊόντα, άμεσα διαθέσιμα με παραλαβή από το κατάστημα ή αποστολή σε όλη την Ελλάδα.",
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

  const plpTitle = config
    ? `${config.labelEl}${audienceConfig ? ` ${audienceConfig.labelEl}` : ""} | Look Οπτικά`
    : "Look Οπτικά";
  const plpDescription = config
    ? `${config.subtitle} Δες όλη τη συλλογή${audienceConfig ? ` για ${audienceConfig.labelEl.toLowerCase()}` : ""} στο Look Οπτικά.`
    : undefined;
  const plpUrl = `https://www.lookoptica.gr/shop/${categorySlug || ""}${audienceSlug ? `/${audienceSlug}` : ""}`;
  const plpCategoryUrl = `https://www.lookoptica.gr/shop/${categorySlug || ""}`;

  usePageSEO({
    title: plpTitle,
    description: plpDescription,
    url: plpUrl,
    jsonLd: config
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Αρχική",
              item: "https://www.lookoptica.gr/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: config.labelEl,
              item: audienceConfig ? plpCategoryUrl : plpUrl,
            },
            ...(audienceConfig
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: audienceConfig.labelEl,
                    item: plpUrl,
                  },
                ]
              : []),
          ],
        }
      : undefined,
  });

  const view = searchParams.get("view") === "stock" ? "stock" : "all";
  const isStockView = view === "stock";
  const brandParam = searchParams.get("brand") || "";
  const normalizedBrandParam = normalizeBrand(brandParam);

  const [items, setItems] = useState([]);
  //const [all, setAll] = useState([]); // for debug / inspection
  const [state, setState] = useState("loading"); // loading | ok | error
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState(brandParam);
  const [brandOptions, setBrandOptions] = useState([]);
  const normalizedBrandFilter = normalizeBrand(brandFilter);
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

  const updateBrandParam = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set("brand", value);
    } else {
      nextParams.delete("brand");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const filterAndProject = useCallback(
    (list, brandNormalized = "") => {
      if (!config) return [];
      const filtered = list.filter((p) => {
        const stockMatch = isStockProduct(p);
        const baseMatch = (() => {
          const aliases = config.aliases || [];
          const candidates = [
            p?.category,
            p?.attributes?.category,
            p?.attributes?.category_label,
            p?.attributes?.category_value,
            ...(Array.isArray(p?.attributes?.tags) ? p.attributes.tags : []),
          ];
          return candidates.some((value) => matchesCategoryAlias(value, aliases));
        })();
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

        if (brandNormalized) {
          const productBrand = normalizeBrand(resolveBrand(p));
          if (productBrand !== brandNormalized) return false;
        }

        return true;
      });

      return filtered.map((p) => ({
        ...p,
        title: p.title,
        slug: p.slug,
        category: p.category,
        audience: p.audience,
        brand: resolveBrand(p),
      }));
    },
    [config, categorySlug, isStockView, audienceConfig]
  );

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

  const loadPage = async (nextOffset = 0, replace = false, searchQuery = "") => {
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
      // Any sort other than "newest" needs the *entire* matching set fetched
      // before the client-side sort is stable - "newest" is the only order
      // that naturally lines up with incremental, creation-date-ordered
      // pagination from the backend. Otherwise each additional batch would
      // get re-sorted into the middle of what's already shown instead of
      // appending at the end.
      const needsFullScan = Boolean(normalizedBrandFilter) || sortBy !== "newest";
      const requestLimit = needsFullScan ? PAGE_SIZE * 5 : PAGE_SIZE;
      const MAX_FETCHES = needsFullScan ? 120 : 6;

      while (
        (needsFullScan || aggregatedUnique.length < PAGE_SIZE) &&
        iterations < MAX_FETCHES
      ) {
        iterations += 1;
        const params = new URLSearchParams();
        params.set("limit", requestLimit);
        params.set("offset", batchOffset);
        if (searchQuery) params.set("q", searchQuery);
        (config?.aliases || []).forEach((alias) => params.append("category", alias));
        (audienceConfig?.allowed || []).forEach((aud) => params.append("audience", aud));
        const res = await fetch(`${API}/shop-products?${params.toString()}`);
        if (!res.ok) throw new Error(`Fetch failed (offset ${batchOffset})`);
        const batch = await res.json();
        const list = Array.isArray(batch) ? batch : [];
        lastBatchLength = list.length;

        // Process every match in this batch before deciding whether to fetch
        // another one - breaking early here would silently discard matches
        // that were already fetched (e.g. a single batch containing more
        // than PAGE_SIZE matches), since batchOffset advances past the whole
        // batch regardless of how much of it we actually used.
        const projected = filterAndProject(list, normalizedBrandFilter);
        for (const product of projected) {
          const key = getProductKey(product);
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);
          aggregatedUnique.push(product);
        }
        batchOffset += list.length;

        if (list.length < requestLimit) break; // no more data server-side
      }

      let nextLength = 0;
      setItems((prev) => {
        const base = replace ? [] : prev;
        const next = [...base, ...aggregatedUnique];
        nextLength = next.length;
        return next;
      });

      setOffset(batchOffset);
      setHasMore(lastBatchLength === requestLimit);
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

  // Debounced search term for server-side queries
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!config) {
      console.warn("No CATEGORY_CONFIG for slug:", categorySlug);
      setState("error");
      return;
    }

    loadPage(0, true, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, audienceSlug, config, audienceConfig, isStockView, normalizedBrandFilter, filterAndProject, debouncedSearch, sortBy]);

  useEffect(() => {
    if (!config) {
      setBrandOptions([]);
      return;
    }
    let cancelled = false;
    const loadBrandOptions = async () => {
      try {
        const brandSet = new Set();
        let offsetCursor = 0;
        const LIMIT = 200;
        const MAX_FETCHES = 6;
        for (let i = 0; i < MAX_FETCHES; i += 1) {
          const params = new URLSearchParams();
          params.set("limit", LIMIT);
          params.set("offset", offsetCursor);
          (config?.aliases || []).forEach((alias) => params.append("category", alias));
          (audienceConfig?.allowed || []).forEach((aud) => params.append("audience", aud));
          const res = await fetch(`${API}/shop-products?${params.toString()}`);
          if (!res.ok) break;
          const batch = await res.json();
          const list = Array.isArray(batch) ? batch : [];
          const projected = filterAndProject(list);
          projected.forEach((p) => {
            if (p?.brand) brandSet.add(p.brand);
          });
          if (list.length < LIMIT) break;
          offsetCursor += list.length;
        }
        if (!cancelled) {
          setBrandOptions(Array.from(brandSet).sort((a, b) => a.localeCompare(b)));
        }
      } catch (err) {
        console.error("Failed to load brand options", err);
        if (!cancelled) setBrandOptions([]);
      }
    };
    loadBrandOptions();
    return () => {
      cancelled = true;
    };
  }, [config, audienceConfig, categorySlug, audienceSlug, isStockView, filterAndProject]);

  const availableBrands = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      const brandValue = resolveBrand(p);
      if (brandValue) set.add(brandValue);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const selectableBrands = useMemo(() => {
    return brandOptions.length > 0 ? brandOptions : availableBrands;
  }, [brandOptions, availableBrands]);

  useEffect(() => {
    if (!normalizedBrandParam) {
      if (normalizedBrandFilter === "") return;
      setBrandFilter("");
      return;
    }
    setBrandFilter((prev) => {
      const prevNormalized = normalizeBrand(prev);
      if (prevNormalized === normalizedBrandParam) return prev;
      const match =
        selectableBrands.find(
          (brand) => normalizeBrand(brand) === normalizedBrandParam
        ) || brandParam;
      return match;
    });
  }, [normalizedBrandParam, brandParam, selectableBrands, normalizedBrandFilter]);

  const displayItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = items.filter((p) => {
      const resolvedBrand = resolveBrand(p);
      if (normalizedBrandFilter && normalizeBrand(resolvedBrand) !== normalizedBrandFilter) return false;
      if (isStockView && !isStockProduct(p)) return false;
      if (!q) return true;
      const title = (p?.title?.el || p?.title?.en || "").toLowerCase();
      const brand = resolveBrand(p).toLowerCase();
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
      // `price` is the actual/offer price the customer pays; `discountPrice`
      // is the original/starting reference price shown struck-through.
      // Sort by what they'd actually pay, falling back to discountPrice only
      // when a product has no price set at all.
      const price = normalizePrice(p?.price);
      const discount = normalizePrice(p?.discountPrice);
      if (Number.isFinite(price) && price > 0 && price !== Number.POSITIVE_INFINITY) {
        return price;
      }
      if (Number.isFinite(discount) && discount > 0 && discount !== Number.POSITIVE_INFINITY) {
        return discount;
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
  }, [items, normalizedBrandFilter, searchTerm, sortBy, isStockView]);

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
      await loadPage(offset, false, debouncedSearch);
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
                const nextValue = e.target.value;
                setBrandFilter(nextValue);
                updateBrandParam(nextValue);
              }}
              className="border rounded-md px-3 py-1 text-sm md:w-48"
            >
              <option value="">Όλα τα brands</option>
              {selectableBrands.map((b) => (
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
            <label className="font-medium text-slate-700 text-xs">Ταξινόμηση</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-md px-3 py-1 text-sm md:w-52"
            >
              <option value="newest">Νεότερα</option>
              <option value="oldest">Παλαιότερα</option>
              <option value="price">Τιμή: Αύξουσα</option>
              <option value="price-desc">Τιμή: Φθίνουσα</option>
              <option value="brand">Brand: Α έως Ω</option>
              <option value="brand-desc">Brand: Ω έως Α</option>
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
          <div>Δεν βρέθηκαν ακόμα προϊόντα.</div>
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Φόρτωση..." : "Περισσότερα αποτελέσματα"}
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
                {isLoadingMore ? "Φόρτωση..." : "Περισσότερα"}
              </button>
            )}
            {visibleCount > PAGE_SIZE && (
              <button
                type="button"
                onClick={handleShowLess}
                disabled={state === "loading"}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Λιγότερα
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
