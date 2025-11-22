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
      <img
        src={firstImage}
        alt={title}
        className="w-full aspect-square object-cover rounded-xl bg-gray-100"
        onError={(e) => {
          e.currentTarget.src = "/placeholder.png";
        }}
      />

      {/* Brand + category */}
      <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
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
      <div className="text-sm">€{p?.price}</div>
    </Link>
  );
}
