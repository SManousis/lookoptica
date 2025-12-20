import { useEffect, useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, Link, useSearchParams, useNavigate } from "react-router-dom";
import ProductCard from "./components/ProductCard";
import PDP from "./pages/PDP";
import { NAV_CATEGORIES } from "./components/NavConfig";
import AddProduct from "./pages/AddProduct";
import CategoryPLP from "./pages/PLP";
import "./index.css";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import UsageTerms from "./pages/UsageTerms";
import Contact from "./pages/Contact";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import ScrollToTop from "./components/ScrollToTop";
import AddContactLens from "./pages/admin/AddContactLens";
import EditContactLens from "./pages/admin/EditContactLens";
import LookAtHome from "./pages/LookAtHome";
import LowVision from "./pages/LowVision";
import AboutUs from "./pages/AboutUs";
import AdminLogin from "./pages/admin/AdminLogin";
import ProtectAdminRoute from "./components/ProtectAdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import EditProduct from "./pages/admin/EditProduct";
import AdminContactLensesPage from "./pages/admin/AdminContactLensesPage";
import AdminContactLensVariantsPage from "./pages/admin/AdminContactLensVariantsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminImportProductsPage from "./pages/admin/AdminImportProductsPage";
import ContactLensPDP from "./pages/ContactLensPDP";
import CheckoutIdentifyPage from "./pages/CheckoutIdentifyPage";
import AccountRegisterPage from "./pages/AccountRegisterPage";
import AccountLoginPage from "./pages/AccountLoginPage";
import AccountHomePage from "./pages/AccountHomePage";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import CheckoutDetailsPage from "./pages/CheckoutDetailsPage";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { useCustomerAuth } from "./context/customerAuthShared";
import { useAdminAuth } from "./context/useAdminAuth";
import CheckoutPaymentPage from "./pages/CheckoutPaymentPage";
import BankTransferIrisPage from "./pages/BankTransferIrisPage";
import { isStockProduct } from "./utils/categoryHelpers";

const API = import.meta.env.VITE_API_BASE;

function ShopPLP() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "stock" ? "stock" : "all";
  const isStockView = view === "stock";
  const brandParam = searchParams.get("brand") || "";
  const normalizeBrand = (value) => (value || "").trim().toLowerCase();
  const resolveProductBrand = (product) =>
    product?.brand ||
    product?.attributes?.brand ||
    product?.attributes?.brand_label ||
    product?.attributes?.brand_name ||
    product?.attributes?.brand_value ||
    "";
  const normalizedBrandParam = normalizeBrand(brandParam);

  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState(brandParam);
  const [brandOptions, setBrandOptions] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const normalizedBrandFilter = normalizeBrand(brandFilter);
  const PAGE_SIZE = 12;

  const updateView = (nextView) => {
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

  const getProductKey = (product) =>
    product?.slug ||
    product?.id ||
    product?._id ||
    product?.attributes?.slug ||
    product?.attributes?.sku ||
    product?.attributes?.barcode ||
    product?.sku ||
    product?.barcode ||
    `${product?.title?.el || product?.title?.en || product?.title || ""}-${product?.variantLabel || ""}`;

  const loadProducts = async (nextOffset = 0, replace = false) => {
    if (replace) {
      setState("loading");
      setHasMore(true);
      setOffset(0);
      setItems([]);
      setVisibleCount(PAGE_SIZE);
    } else {
      setIsLoadingMore(true);
    }

    try {
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
      const requestLimit = normalizedBrandFilter ? PAGE_SIZE * 5 : PAGE_SIZE;
      const MAX_FETCHES = normalizedBrandFilter ? 120 : 6;

      while (aggregatedUnique.length < PAGE_SIZE && iterations < MAX_FETCHES) {
        iterations += 1;
        const params = new URLSearchParams();
        params.set("limit", requestLimit);
        params.set("offset", batchOffset);
        if (isStockView) {
          ["stock", "stok"].forEach((alias) => params.append("category", alias));
        }
        const res = await fetch(`${API}/shop-products?${params.toString()}`);
        if (!res.ok) throw new Error(`Fetch failed (offset ${batchOffset})`);
        const batch = await res.json();
        const list = Array.isArray(batch) ? batch : [];
        lastBatchLength = list.length;

        const filtered = list
          .map((p) => ({ ...p, brand: resolveProductBrand(p) }))
          .filter((p) => {
            if (isStockView && !isStockProduct(p)) return false;
            if (normalizedBrandFilter && normalizeBrand(p.brand) !== normalizedBrandFilter) return false;
            return true;
          });

        for (const product of filtered) {
          const key = getProductKey(product);
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);
          aggregatedUnique.push(product);
          if (aggregatedUnique.length >= PAGE_SIZE) break;
        }

        batchOffset += list.length;

        if (list.length < requestLimit) break;
      }

      setItems((prev) => (replace ? aggregatedUnique : [...prev, ...aggregatedUnique]));
      setOffset(batchOffset);
      setHasMore(lastBatchLength === requestLimit);
      if (replace) {
        setVisibleCount(Math.min(PAGE_SIZE, aggregatedUnique.length));
      }
      setState("ok");
    } catch (err) {
      if (replace) {
        console.error("Failed to load products", err);
        setState("error");
      }
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadProducts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStockView, normalizedBrandFilter]);

  useEffect(() => {
    let cancelled = false;
    const loadBrandOptions = async () => {
      try {
        const brandSet = new Set();
        let offsetCursor = 0;
        const LIMIT = 200;
        const MAX_FETCHES = 8;
        for (let i = 0; i < MAX_FETCHES; i += 1) {
          const params = new URLSearchParams();
          params.set("limit", LIMIT);
          params.set("offset", offsetCursor);
          const res = await fetch(`${API}/shop-products?${params.toString()}`);
          if (!res.ok) break;
          const batch = await res.json();
          const list = Array.isArray(batch) ? batch : [];
          list.forEach((p) => {
            if (isStockView && !isStockProduct(p)) return;
            const brandValue = resolveProductBrand(p);
            if (brandValue) brandSet.add(brandValue);
          });
          if (list.length < LIMIT) break;
          offsetCursor += list.length;
        }
        if (!cancelled) {
          setBrandOptions(Array.from(brandSet).sort((a, b) => a.localeCompare(b)));
        }
      } catch (err) {
        console.error("Failed to load brand options for shop", err);
        if (!cancelled) setBrandOptions([]);
      }
    };
    loadBrandOptions();
    return () => {
      cancelled = true;
    };
  }, [isStockView]);

  const availableBrands = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      const brandValue = resolveProductBrand(p);
      if (brandValue) set.add(brandValue);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const selectableBrands = useMemo(() => {
    const set = new Set(brandOptions);
    availableBrands.forEach((brand) => set.add(brand));
    if (brandFilter) set.add(brandFilter);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [brandOptions, availableBrands, brandFilter]);

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
      const resolvedBrand = resolveProductBrand(p);
      if (normalizedBrandFilter && normalizeBrand(resolvedBrand) !== normalizedBrandFilter) return false;
      if (isStockView && !isStockProduct(p)) return false;
      if (!q) return true;
      const title = (p?.title?.el || p?.title?.en || "").toLowerCase();
      const brand = resolvedBrand.toLowerCase();
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
      const discount = normalizePrice(p?.discountPrice);
      const price = normalizePrice(p?.price);
      if (Number.isFinite(discount) && discount > 0 && discount !== Number.POSITIVE_INFINITY) {
        return discount;
      }
      if (Number.isFinite(price) && price > 0 && price !== Number.POSITIVE_INFINITY) {
        return price;
      }
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
      await loadProducts(offset, false);
      setVisibleCount((c) => c + PAGE_SIZE);
    }
  };

  const handleShowLess = () => {
    setVisibleCount(PAGE_SIZE);
  };

  if (state === "loading") return <div>Loading...</div>;
  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Failed to load products.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold text-amber-800">
            {isStockView ? "Προϊόντα Stock" : "Όλα τα προϊόντα"}
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl">
            Περιηγηθείτε σε όλες τις συλλογές Look Optica και φιλτράρετε όπως στις σελίδες κατηγορίας.
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
              placeholder="π.χ. Guess ή Havana"
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
                onClick={() => updateView("all")}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  !isStockView
                    ? "bg-amber-700 text-white border-amber-700"
                    : "bg-white text-slate-700 hover:border-amber-400"
                }`}
              >
                Κανονικά
              </button>
              <button
                type="button"
                onClick={() => updateView("stock")}
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

      {state === "ok" && displayItems.length === 0 ? (
        <div className="space-y-3 text-center text-slate-600">
          <div>Δεν βρέθηκαν προϊόντα με τα συγκεκριμένα φίλτρα.</div>
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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

// Inner shell that can use hooks like useCart / useCustomerAuth
function AppShell() {
  const [openCategory, setOpenCategory] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totals } = useCart();
  const { isLoggedIn } = useCustomerAuth();
  const { admin, logout: logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const itemCount = totals?.itemCount ?? 0;

  const baseMobileOptions = [
    { label: "Home", to: "/" },
    ...NAV_CATEGORIES.map((cat) => {
      const mainHref = cat.href || (cat.slug ? `/shop/${cat.slug}` : "/shop");
      return { label: cat.label, to: mainHref };
    }),
    { label: "Stock", to: "/shop?view=stock" },
    { label: "Contact", to: "/contact" },
    { label: "Low Vision", to: "/low-vision" },
    { label: "Look at Home", to: "/look-at-home" },
    { label: "About us", to: "/about-us" },
  ];

  const mobileOptions = admin
    ? [
        ...baseMobileOptions,
        { label: "Admin · Orders", to: "/admin/orders" },
        { label: "Admin · Sunglasses & Frames", to: "/admin/products" },
        { label: "Admin · Contact Lenses", to: "/admin/contact-lenses" },
        { label: "Admin · ERP Import", to: "/admin/import" },
        { label: "Admin · Logout", action: "logout" },
      ]
    : baseMobileOptions;

  const handleMobileNav = (next) => {
    if (next) {
      navigate(next);
      setOpenCategory(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="flex w-full flex-col gap-3 px-3 py-2 md:h-24 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="font-semibold">
              <img src="/logo.png" alt="Look Optica" className="h-12 w-12 md:h-24 md:w-24" />
            </Link>
            {/* Mobile icons row */}
            <div className="flex items-center gap-3 text-xl text-slate-500 md:hidden">
              <Link
                to={isLoggedIn ? "/account" : "/account/login"}
                className="relative text-slate-600 hover:text-amber-700"
                aria-label="Λογαριασμός"
              >
                <PersonOutlineIcon fontSize="inherit" />
              </Link>
              <Link
                to="/cart"
                className="relative text-slate-600 hover:text-amber-700"
                aria-label="Καλάθι"
              >
                <ShoppingCartOutlinedIcon fontSize="inherit" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-2 rounded-full bg-amber-700 px-1.5 text-[10px] font-semibold text-white">
                    {itemCount}
                  </span>
                )}
              </Link>
              <Link
                to="https://www.facebook.com/lookoptikahalandri"
                target="_blank"
              >
                <FacebookIcon className="text-blue-700" />
              </Link>
              <Link
                to="https://www.instagram.com/lookopticahalandri"
                target="_blank"
              >
                <InstagramIcon className="text-red-700" />
              </Link>
            </div>
          </div>

          {/* Mobile hamburger menu */}
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:border-amber-400"
              aria-label="Toggle navigation"
            >
              <span className="flex h-4 w-4 flex-col justify-between">
                <span className="h-[2px] w-full rounded-sm bg-amber-700"></span>
                <span className="h-[2px] w-full rounded-sm bg-amber-700"></span>
                <span className="h-[2px] w-full rounded-sm bg-amber-700"></span>
              </span>
              <span>Menu</span>
            </button>
            <div
              className={`${
                mobileMenuOpen ? "flex" : "hidden"
              } absolute left-0 right-0 top-full mt-2 flex-col gap-1 rounded-2xl border border-amber-100 bg-white p-3 text-sm text-amber-800 shadow-lg`}
            >
              {mobileOptions.map((opt) => (
                <button
                  key={opt.to || opt.label}
                  type="button"
                  onClick={() => {
                    if (opt.action === "logout") {
                      logoutAdmin();
                      navigate("/admin/login");
                    } else if (opt.to) {
                      handleMobileNav(opt.to);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-lg px-3 py-2 text-left hover:bg-amber-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main navigation */}
          <nav className="hidden items-center gap-4 text-sm text-amber-700 md:flex md:text-md">
            {NAV_CATEGORIES.map((cat) => {
              const hasChildren = Array.isArray(cat.children) && cat.children.length > 0;
              const hasAudiences = Array.isArray(cat.audiences) && cat.audiences.length > 0;
              const mainHref = cat.href || (cat.slug ? `/shop/${cat.slug}` : "/shop");

              return (
                <div
                  key={cat.slug || cat.label}
                  className="relative"
                  onMouseEnter={() => setOpenCategory(cat.slug || cat.label)}
                  onMouseLeave={() => setOpenCategory(null)}
                >
                  {/* Main link */}
                  <Link
                    to={mainHref}
                    className="hover:text-amber-600"
                    onClick={() => setOpenCategory(null)}
                  >
                    {cat.label}
                  </Link>

                  {/* Dropdown */}
                  {(hasChildren || hasAudiences || cat.extras?.length) && (
                    <div
                      className={`absolute left-0 top-full min-w-[12rem] w-max ${
                        openCategory === (cat.slug || cat.label) ? "flex" : "hidden"
                      } flex-col bg-white shadow-lg border rounded-lg z-50 pt-2`}
                    >
                      {hasChildren &&
                        cat.children.map((item) => (
                          <Link
                            key={item.to || item.label}
                            to={item.to || "/shop"}
                            className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                            onClick={() => setOpenCategory(null)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      {hasAudiences &&
                        cat.audiences.map((aud) => (
                          <Link
                            key={aud.slug}
                            to={`/shop/${cat.slug}/${aud.slug}`}
                            className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                            onClick={() => setOpenCategory(null)}
                          >
                            {aud.label}
                          </Link>
                        ))}
                      {cat.extras?.map((extra) => (
                        <Link
                          key={`${cat.slug || cat.label}-${extra.view || extra.label}`}
                          to={
                            extra.view
                              ? `${mainHref}${mainHref.includes("?") ? "&" : "?"}view=${extra.view}`
                              : mainHref
                          }
                          className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                          onClick={() => setOpenCategory(null)}
                        >
                          {extra.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <Link to="/shop?view=stock" className="hover:text-red-800">
              Stock
            </Link>
            <Link to="/contact" className="hover:text-red-800">
              Επικοινωνία
            </Link>
            <Link to="/low-vision" className="hover:text-red-800">
              Βοηθήματα Χαμηλής Όρασης
            </Link>
            <Link to="/look-at-home" className="hover:text-red-800">
              Οπτικά στο σπίτι
            </Link>
            <Link to="/about-us" className="hover:text-red-800">
              Σχετικά με εμάς
            </Link>
            {admin && (
              <div
                className="relative"
                onMouseEnter={() => setOpenCategory("admin-menu")}
                onMouseLeave={() => setOpenCategory(null)}
              >
                <button
                  type="button"
                  className="hover:text-amber-600"
                  onClick={() =>
                    setOpenCategory((prev) =>
                      prev === "admin-menu" ? null : "admin-menu"
                    )
                  }
                >
                  Admin
                </button>
                <div
                  className={`absolute right-0 top-full min-w-[12rem] w-max ${
                    openCategory === "admin-menu" ? "flex" : "hidden"
                  } flex-col bg-white shadow-lg border rounded-lg z-50 pt-2`}
                >
                  <Link
                    to="/admin/orders"
                    className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                    onClick={() => setOpenCategory(null)}
                  >
                    Orders
                  </Link>
                  <Link
                    to="/admin/products"
                    className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                    onClick={() => setOpenCategory(null)}
                  >
                    Sunglasses & Frames
                  </Link>
                  <Link
                    to="/admin/contact-lenses"
                    className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                    onClick={() => setOpenCategory(null)}
                  >
                    Contact Lenses
                  </Link>
                  <Link
                    to="/admin/import"
                    className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                    onClick={() => setOpenCategory(null)}
                  >
                    ERP Import
                  </Link>
                  <button
                    type="button"
                    className="block px-4 py-2 text-left text-sm hover:bg-slate-100 whitespace-nowrap text-red-600"
                    onClick={() => {
                      setOpenCategory(null);
                      logoutAdmin();
                      navigate("/admin/login");
                    }}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
            {/* (Cart text link removed because we now have icon on the right) */}
          </nav>

          {/* Right side: account + cart + socials */}
          <div className="hidden items-center gap-4 text-2xl text-slate-500 md:flex">
            {/* Account icon */}
            <Link
              to={isLoggedIn ? "/account" : "/account/login"}
              className="relative text-slate-600 hover:text-amber-700"
              aria-label="Ο λογαριασμός μου"
            >
              <PersonOutlineIcon fontSize="inherit" />
            </Link>

            {/* Cart icon with badge */}
            <Link
              to="/cart"
              className="relative text-slate-600 hover:text-amber-700"
              aria-label="Καλάθι"
            >
              <ShoppingCartOutlinedIcon fontSize="inherit" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-2 rounded-full bg-amber-700 px-1.5 text-[10px] font-semibold text-white">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Socials */}
            <Link
              to="https://www.facebook.com/lookoptikahalandri"
              target="_blank"
            >
              <FacebookIcon className="text-blue-700" />
            </Link>
            <Link
              to="https://www.instagram.com/lookopticahalandri"
              target="_blank"
            >
              <InstagramIcon className="text-red-700" />
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-6">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPLP />} />
          <Route path="/shop/:categorySlug" element={<CategoryPLP />} />
          <Route
            path="/shop/:categorySlug/:audienceSlug"
            element={<CategoryPLP />}
          />
          <Route path="/contact-lens/:slug" element={<ContactLensPDP />} />
          <Route path="/product/:slug" element={<PDP />} />
          <Route path="/terms" element={<UsageTerms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout/details" element={<CheckoutDetailsPage />} />
          {/* Checkout gate (login/register/guest) */}
          <Route path="/checkout" element={<CheckoutIdentifyPage />} />
          <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />      
          <Route path="/look-at-home" element={<LookAtHome />} />
          <Route path="/low-vision" element={<LowVision />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/account/register" element={<AccountRegisterPage />} />
          <Route path="/account/login" element={<AccountLoginPage />} />
          <Route path="/account" element={<AccountHomePage />} />
          <Route path="/checkout/bank-transfer" element={<BankTransferIrisPage />} />

          {/* Admin products list (protected) */}
          <Route
            path="/admin/products"
            element={
              <ProtectAdminRoute>
                <AdminProductsPage />
              </ProtectAdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectAdminRoute>
                <AdminOrdersPage />
              </ProtectAdminRoute>
            }
          />
          {/* Admin auth route (public) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin/products/:slug/edit"
            element={
              <ProtectAdminRoute>
                <EditProduct />
              </ProtectAdminRoute>
            }
          />
          <Route
            path="/admin/contact-lenses"
            element={
              <ProtectAdminRoute>
                <AdminContactLensesPage />
              </ProtectAdminRoute>
            }
          />
          <Route
            path="/admin/contact-lenses/add"
            element={
              <ProtectAdminRoute>
                <AddContactLens />
              </ProtectAdminRoute>
            }
          />
          <Route
            path="/admin/contact-lenses/:sku/edit"
            element={
              <ProtectAdminRoute>
                <EditContactLens />
              </ProtectAdminRoute>
            }
          />
          <Route
            path="/admin/contact-lenses/:sku/variants"
            element={
              <ProtectAdminRoute>
                <AdminContactLensVariantsPage />
              </ProtectAdminRoute>
            }
          />
          <Route
            path="/admin/import"
            element={
              <ProtectAdminRoute>
                <AdminImportProductsPage />
              </ProtectAdminRoute>
            }
          />
          {/* Admin dashboard (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectAdminRoute>
                <AdminDashboard />
              </ProtectAdminRoute>
            }
          />
          {/* Add product (protected) */}
          <Route
            path="/admin/add-product"
            element={
              <ProtectAdminRoute>
                <AddProduct />
              </ProtectAdminRoute>
            }
          />
        </Routes>
      </main>

      <footer className="border-t bg-white/90">
        <div className="flex w-full flex-col gap-3 px-6 py-8 text-sm text-amber-700 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} Look Optica — A different point of
            view
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Link to="/faq" className="hover:text-red-800">
              Faq
            </Link>
            <span>|</span>
            <Link to="/contact" className="hover:text-red-800">
              Επικοινωνία
            </Link>
            <span>|</span>
            <Link to="/terms" className="hover:text-red-800">
              Όροι χρήσης
            </Link>
          </span>
          <span className="md:text-right">
            Αγίας Παρασκευής 30, Χαλάνδρι
            <br />
            Τηλ: 210 6898658 |{" "}
            <a href="mailto:info@lookoptica.gr" className="underline">
              info@lookoptica.gr
            </a>{" "}
            |{" "}
            <a href="https://www.lookoptica.gr" className="underline">
              www.lookoptica.gr
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* admin + customer auth available everywhere */}
      <AdminAuthProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <ScrollToTop />
            <AppShell />
          </CartProvider>
        </CustomerAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
