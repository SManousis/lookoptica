import { useEffect, useState } from "react";
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
import { useCart } from "./context/CartContext";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import EditProduct from "./pages/admin/EditProduct";
import AdminContactLensesPage from "./pages/admin/AdminContactLensesPage";
import AdminContactLensVariantsPage from "./pages/admin/AdminContactLensVariantsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
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
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const view = searchParams.get("view") === "stock" ? "stock" : "all";
  const isStockView = view === "stock";
  const PAGE_SIZE = 12;

  const buildQueryParams = (nextOffset) => {
    const params = new URLSearchParams();
    params.set("limit", PAGE_SIZE);
    params.set("offset", nextOffset);
    if (isStockView) {
      ["stock", "stok"].forEach((alias) => params.append("category", alias));
    }
    return params;
  };

  const loadProducts = async (replace = false) => {
    const nextOffset = replace ? 0 : offset;
    if (!replace && !hasMore) return;

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
      const params = buildQueryParams(nextOffset);
      const res = await fetch(`${API}/shop-products?${params.toString()}`);
      if (!res.ok) throw new Error(`Fetch failed (offset ${nextOffset})`);
      const batch = await res.json();
      const list = Array.isArray(batch) ? batch : [];
      const filteredList = isStockView ? list.filter((p) => isStockProduct(p)) : list;

      setItems((prev) => (replace ? filteredList : [...prev, ...filteredList]));
      setOffset(nextOffset + list.length);
      setHasMore(list.length === PAGE_SIZE);
      setState("ok");
      if (replace) {
        setVisibleCount(Math.min(PAGE_SIZE, filteredList.length));
      }
    } catch (err) {
      if (replace) {
        console.error("Failed to load products (replace)", err);
        setState("error");
      }
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStockView]);

  const handleLoadMore = async () => {
    if (visibleCount < displayItems.length) {
      setVisibleCount((c) => c + PAGE_SIZE);
      return;
    }
    if (hasMore) {
      await loadProducts(false);
      setVisibleCount((c) => c + PAGE_SIZE);
    }
  };

  const handleShowLess = () => {
    setVisibleCount(PAGE_SIZE);
  };

  const updateView = (nextView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === "stock") {
      nextParams.set("view", "stock");
    } else {
      nextParams.delete("view");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const displayItems = items.filter((p) => !isStockView || isStockProduct(p));
  const visibleItems = displayItems.slice(0, visibleCount);

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-amber-700">
          {isStockView ? "Προϊόντα Stock" : "Όλα τα προϊόντα"}
        </h2>
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
            Όλα
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

      {displayItems.length === 0 ? (
        <div className="space-y-3 text-center text-slate-600">
          <div>{isStockView ? "Δεν βρέθηκαν προϊόντα stock." : "No products found."}</div>
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
          <ScrollToTop />
          <AppShell />
        </CustomerAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
