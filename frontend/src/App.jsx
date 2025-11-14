import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ProductCard from "./components/ProductCard";
import PDP from "./pages/PDP";
import AddProduct from "./pages/AddProduct";
import CategoryPLP from "./pages/CategoryPLP"; // 👈 NEW
import "./index.css";
import HomePage from "./pages/HomePage";

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

  if (state === "loading") return <div>Loading…</div>;
  if (state === "error") {
    return (
      <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
        Failed to load products.
      </div>
    );
  }

  return items.length === 0 ? (
    <div className="text-slate-600">No products found.</div>
  ) : (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((p) => (
        <ProductCard key={p.slug} p={p} />
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 h-24 flex items-center justify-between">
            <Link to="/" className="font-semibold">
            <img src="/logo.png" alt="Look Optica" className="w-24 h-24" />
            </Link>
            <nav className="text-sm text-amber-700 flex gap-4 text-[20px] ">
              <Link to="/shop/sunglasses" className="hover:text-red-800">
                Γυαλιά Ηλίου
              </Link>
              <Link to="/shop/frames" className="hover:text-red-800">
                Σκελετοί Οράσεως
              </Link>
              <Link to="/shop/contact-lenses" className="hover:text-red-800">
                Φακοί Επαφής
              </Link>
              <Link to="/shop" className="hover:text-red-800">
                Όλα τα προϊόντα
              </Link>
              <Link to="/contact" className="hover:text-red-800">
                Επικοινωνία
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPLP />} />
            <Route path="/shop/:categorySlug" element={<CategoryPLP />} />
            <Route path="/product/:slug" element={<PDP />} />
            <Route path="/admin/add-product" element={<AddProduct />} />
            {/* <Route path="/contact" element={<Contact />} /> */}
          </Routes>
        </main>

        <footer className="mt-12 border-t">
          <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-slate-600">
            © {new Date().getFullYear()} Look Optica — Chalandri
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
