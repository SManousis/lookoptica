import { Link } from "react-router-dom";
import placeholder from "/placeholder.png"; // Vite-resolved path

function formatCategory(category) {
  if (!category) return "";
  // "ophthalmic_frames" -> "Ophthalmic Frames"
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProductCard({ p }) {
  if (!p) return null;

  const title = p?.title?.el || p?.title?.en || "Product";
  const isContactLens =
    String(p?.category || "").toLowerCase().includes("contact") ||
    p?.attributes?.product_type === "contact_lens";
  const productUrl = isContactLens
    ? `/contact-lens/${p.slug || ""}`
    : `/product/${p.slug || ""}`;

  const firstImage =
    (Array.isArray(p?.images) && p.images.find(Boolean)) ||
    p?.image ||
    placeholder;

  return (
    <Link to={productUrl} className="block group">
        <div className="w-full rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
          <img
            src={firstImage}
            alt={title}
            className="w-full max-h-[520px] object-contain cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
          />
        </div>

      {/* Brand + category */}
      <div className="mt-2 text-xs text-amber-500 flex items-center gap-2">
        {p?.brand && (
          <span className="font-medium uppercase tracking-wide">
            {p.brand}
          </span>
        )}
        {p?.category && (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {formatCategory(p.category)}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="mt-1 text-sm font-medium line-clamp-2">
        {title}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <div className="text-xl font-bold text-amber-700">€{p?.price}</div>
        <div className="text-sm text-slate-400 line-through">€{p?.discountPrice}</div> 
      </div>
    </Link>
  );
}
