import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";

const API = import.meta.env.VITE_API_BASE || "";

// Map URL slug -> config + possible category values from backend
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

  const config = CATEGORY_CONFIG[categorySlug];
  const audienceConfig = audienceSlug ? AUDIENCE_CONFIG[audienceSlug] : null;

  const [items, setItems] = useState([]);
  //const [all, setAll] = useState([]); // for debug / inspection
  const [state, setState] = useState("loading"); // loading | ok | error

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

    fetch(`${API}/api/products`)
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        //setAll(list);

        console.log("ALL PRODUCTS FOR CATEGORY PAGE:", list);

        const filtered = list.filter((p) => {
          const rawCategory = (p.category || "").toString().toLowerCase().trim();
          const categoryMatch = config.matches.some(
            (m) => rawCategory === m.toLowerCase()
          );

          if (!categoryMatch) return false;

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

        setItems(filtered);
        setState("ok");
      })
      .catch((err) => {
        console.error("Error loading products for category page:", err);
        setState("error");
      });
  }, [categorySlug, audienceSlug, config, audienceConfig]);

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

      {/* Category hero */}
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold text-amber-800">
          {config.labelEl}
          {audienceConfig ? ` – ${audienceConfig.labelEl}` : ""}
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl">
          {audienceConfig?.subtitle || config.subtitle}
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
