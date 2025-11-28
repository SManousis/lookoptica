import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
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

const API = import.meta.env.VITE_API_BASE || "";

function ShopPLP() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  if (state === "loading") return <div>Loading...</div>;
  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Failed to load products.
      </div>
    );
  }

  return items.length === 0 ? (
    <div className="text-slate-600">No products found.</div>
  ) : (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.slug} p={p} />
      ))}
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
            {NAV_CATEGORIES.map((cat) => (
              <div
                key={cat.slug}
                className="relative"
                onMouseEnter={() => setOpenCategory(cat.slug)}
                onMouseLeave={() => setOpenCategory(null)}
              >
                {/* Main link */}
                <Link
                  to={`/shop/${cat.slug}`}
                  className="hover:text-amber-600"
                  onClick={() => setOpenCategory(null)}
                >
                  {cat.label}
                </Link>

                {/* Dropdown */}
                <div
                  className={`absolute left-1/2 w-full top-full ${
                    openCategory === cat.slug ? "flex" : "hidden"
                  } -translate-x-1/2 flex-col bg-white shadow-lg border rounded-lg z-50 pt-2`}
                >
                  {cat.audiences.map((aud) => (
                    <Link
                      key={aud.slug}
                      to={`/shop/${cat.slug}/${aud.slug}`}
                      className="block px-4 py-2 text-sm hover:bg-slate-100 whitespace-nowrap"
                      onClick={() => setOpenCategory(null)}
                    >
                      {aud.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <Link to="/shop/contact-lenses" className="hover:text-red-800">
              Φακοί Επαφής
            </Link>
            <Link to="/shop" className="hover:text-red-800">
              Όλα τα προϊόντα
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
