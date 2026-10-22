import { Link } from "react-router-dom";
import placeholder from "/placeholder.png"; // Vite-resolved path
import WishlistButton from "./WishlistButton";

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
    p?.productType === "contact_lens" ||
    p?.attributes?.product_type === "contact_lens";
  const productUrl = isContactLens
    ? `/contact-lens/${p.slug || ""}`
    : `/product/${p.slug || ""}`;

  const firstImage =
    (Array.isArray(p?.images) && p.images.find(Boolean)) ||
    p?.image ||
    placeholder;

  return (
    <article className="group relative text-ink-primary">
      <Link
        to={productUrl}
        className="block rounded-xl focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
      >
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-surface-canvas">
          <img
            src={firstImage}
            alt={title}
            width="600"
            height="600"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/placeholder.png";
            }}
          />
        </div>

        {/* Brand + category */}
        <div className="mt-2 flex items-center gap-2 text-xs text-brand-primary">
          {p?.brand && (
            <span className="font-medium uppercase tracking-wide">
              {p.brand}
            </span>
          )}
          {p?.category && (
            <span className="inline-flex items-center rounded-full border border-current px-2 py-0.5 text-[10px] uppercase tracking-wide">
              {formatCategory(p.category)}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mt-1 line-clamp-2 text-sm font-medium">
          {title}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          {p?.discountPrice != null && p?.price != null && p.discountPrice > p.price ? (
            <>
              <div className="text-xl font-bold text-brand-primary">€{p.price}</div>
              <div className="text-sm text-ink-muted line-through">€{p.discountPrice}</div>
            </>
          ) : (
            <div className="text-xl font-bold text-brand-primary">
              €{p?.price ?? p?.discountPrice}
            </div>
          )}
        </div>
      </Link>
      <WishlistButton
        slug={p.slug}
        className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-surface-raised/90 shadow transition hover:bg-surface-raised focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      />
    </article>
  );
}
