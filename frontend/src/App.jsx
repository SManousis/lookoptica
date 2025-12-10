import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useSearchParams } from "react-router-dom";
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
import CheckoutPaymentPage from "./pages/CheckoutPaymentPage";
import BankTransferIrisPage from "./pages/BankTransferIrisPage";
import { isStockCategory } from "./utils/categoryHelpers";

const API = import.meta.env.VITE_API_BASE;

function ShopPLP() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");

  const view = searchParams.get("view") === "stock" ? "stock" : "all";
  const isStockView = view === "stock";

  useEffect(() => {
    setState("loading");
    async function loadAllProducts() {
      const limit = 200;
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
        if (offset > 5000) break; // safety
      }
      return all;
    }

    loadAllProducts()
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [isStockView]);

  const updateView = (nextView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === "stock") {
      nextParams.set("view", "stock");
    } else {
      nextParams.delete("view");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const displayItems = items.filter(
    (p) => !isStockView || isStockCategory(p.category)
  );

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
        <div className="text-slate-600">
          {isStockView ? "Δεν βρέθηκαν προϊόντα stock." : "No products found."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayItems.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// Inner shell that can use hooks like useCart / useCustomerAuth
function AppShell() {
  const [openCategory, setOpenCategory] = useState(null);
  const { totals } = useCart();
  const { isLoggedIn } = useCustomerAuth();

  const itemCount = totals?.itemCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="flex h-24 w-full items-center justify-between px-6">
          <Link to="/" className="font-semibold">
            <img src="/logo.png" alt="Look Optica" className="h-24 w-24" />
          </Link>

          {/* Main navigation */}
          <nav className="flex gap-4 text-sm text-amber-700 md:text-md">
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
            {/* (Cart text link removed because we now have icon on the right) */}
          </nav>

          {/* Right side: account + cart + socials */}
          <div className="flex items-center gap-4 text-2xl text-slate-500">
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
