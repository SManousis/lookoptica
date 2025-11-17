import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

const API = import.meta.env.VITE_API_BASE || "";

// Map URL slug -> config + possible category values
const CATEGORY_CONFIG = {
  sunglasses: {
    labelEl: "Γυαλιά Ηλίου",
    subtitle:
      "Στυλάτα και προστατευτικά γυαλιά ηλίου για πόλη, θάλασσα και οδήγηση.",
    matches: ["sunglasses", "γυαλιά ηλίου", "γυαλια ηλιου"],
  },
  frames: {
    labelEl: "Σκελετοί Οράσεως",
    subtitle:
      "Σκελετοί για καθημερινή χρήση, γραφείο και οδήγηση – από minimal μέχρι statement.",
    matches: ["ophthalmic_frames", "frames", "σκελετοί οράσεως", "σκελετοι ορασεως"],
  },
  "contact-lenses": {
    labelEl: "Φακοί Επαφής",
    subtitle:
      "Ημερήσιοι, μηνιαίοι και ειδικές λύσεις ανάλογα με τις ανάγκες της όρασής σου.",
    matches: ["contact_lenses", "contact-lenses", "φακοί επαφής", "φακοι επαφης"],
  },
  "other-products": {
    labelEl: "Άλλα προϊόντα",
    subtitle:
      "Αξεσουάρ, θήκες, καθαριστικά και άλλα προϊόντα φροντίδας για τα γυαλιά σου.",
    matches: ["other_products", "other-products", "άλλα προϊόντα", "αλλα προιοντα"],
  },
};

export default function CategoryPLP() {
  const { categorySlug } = useParams();
  const config = CATEGORY_CONFIG[categorySlug];

  const [items, setItems] = useState([]);
  const [all, setAll] = useState([]); // for debug / inspection
  const [state, setState] = useState("loading"); // loading | ok | error

  // 🔍 log on every render so we *know* component runs
  console.log("CategoryPLP render, slug =", categorySlug, "config =", config);

  useEffect(() => {
    if (!config) {
      console.warn("No CATEGORY_CONFIG for slug:", categorySlug);
      setState("error");
      return;
    }

    setState("loading");

    fetch(`${API}/api/products`)
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAll(list); // keep everything for debug

        console.log("ALL PRODUCTS FOR CATEGORY PAGE:", list);

        const filtered = list.filter((p) => {
          const raw = (p.category || "").toString().toLowerCase().trim();
          return config.matches.some((m) => raw === m.toLowerCase());
        });

        console.log(
          "FILTERED PRODUCTS FOR",
          categorySlug,
          "=>",
          filtered.map((p) => ({ slug: p.slug, category: p.category }))
        );

        setItems(filtered);
        setState("ok");
      })
      .catch((err) => {
        console.error("Error loading products for category page:", err);
        setState("error");
      });
  }, [categorySlug, config]);

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
        <span className="text-slate-700">{config.labelEl}</span>
      </nav>

      {/* Category hero */}
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold text-amber-800">
          {config.labelEl}
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl">
          {config.subtitle}
        </p>
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

      {state === "ok" && items.length === 0 && (
        <div className="space-y-4">
          <div className="text-slate-600">
            Δεν υπάρχουν προϊόντα σε αυτή την κατηγορία αυτή τη στιγμή.
          </div>

          {/* 🔍 Debug panel so we can *see* what categories come from backend */}
          <details className="text-xs text-slate-500 bg-slate-50 border rounded-lg p-3">
            <summary className="cursor-pointer">
              Debug: Προϊόντα που επιστρέφει το /api/products
            </summary>
            <div className="mt-2 space-y-1">
              {all.map((p) => (
                <div key={p.slug}>
                  slug: <code>{p.slug}</code> — category:{" "}
                  <code>{String(p.category)}</code>
                </div>
              ))}
            </div>
          </details>
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
