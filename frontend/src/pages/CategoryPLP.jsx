import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

const API = import.meta.env.VITE_API_BASE || "";

const CATEGORY_MAP = {
  sunglasses: {
    labelEl: "Γυαλιά Ηλίου",
    apiCategory: "sunglasses",
  },
  frames: {
    labelEl: "Σκελετοί Οράσεως",
    apiCategory: "ophthalmic_frames",
  },
  "contact-lenses": {
    labelEl: "Φακοί Επαφής",
    apiCategory: "contact_lenses", // use whatever category string you'll store in DB
  },
  "other-products": {
    labelEl: "Άλλα προϊόντα",
    apiCategory: "other_products", // again, adjust to your DB naming
  },
};


export default function CategoryPLP() {
  const { categorySlug } = useParams();
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error

  const conf = CATEGORY_MAP[categorySlug];

  useEffect(() => {
    if (!conf) {
      setState("error");
      return;
    }
    setState("loading");
    fetch(`${API}/api/products`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter((p) => p.category === conf.apiCategory);
        setItems(filtered);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, [categorySlug]);

  if (!conf) {
    return (
      <div>
        <p className="text-sm text-red-600">Άγνωστη κατηγορία.</p>
        <Link to="/shop" className="text-teal-700 text-sm hover:underline">
          ← Πίσω στα προϊόντα
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* breadcrumbs */}
      <nav className="text-xs text-slate-500 mb-2">
        <Link to="/" className="hover:underline">
          Αρχική
        </Link>{" "}
        <span>›</span>{" "}
        <Link to="/shop" className="hover:underline">
          Κατάστημα
        </Link>{" "}
        <span>›</span>{" "}
        <span className="text-slate-700">{conf.labelEl}</span>
      </nav>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{conf.labelEl}</h1>
        <div className="text-xs text-slate-500">{items.length} προϊόντα</div>
      </div>

      {state === "loading" && <div>Φόρτωση…</div>}
      {state === "error" && (
        <div className="text-sm text-red-600">
          Δεν ήταν δυνατή η φόρτωση των προϊόντων.
        </div>
      )}
      {state === "ok" && items.length === 0 && (
        <div className="text-sm text-slate-600">
          Δεν υπάρχουν προϊόντα σε αυτή την κατηγορία.
        </div>
      )}
      {state === "ok" && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
