import { Link } from "react-router-dom";
import placeholder from "/placeholder.png"; // Vite-resolved path
import WishlistButton from "./WishlistButton";
import { categoryLabelEl } from "../utils/categoryHelpers";
import { formatPrice } from "../utils/formatPrice";

export default function ProductCard({ p }) {
  if (!p) return null;

  const title = p?.title?.el || p?.title?.en || "Product";
  const categoryLabel = categoryLabelEl(p?.category);
  // discountPrice is the pre-sale price when it exceeds price.
  const savingsPercent =
    p?.price > 0 && p?.discountPrice > p.price
      ? Math.round((1 - p.price / p.discountPrice) * 100)
      : 0;
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
    <article className="group relative flex h-full flex-col text-ink-primary">
      <Link
        to={productUrl}
        className="flex flex-1 flex-col rounded-xl focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
      >
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-surface-canvas">
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
          {savingsPercent > 0 && (
            <span className="absolute left-2 top-2.5 rounded-full bg-status-error px-2.5 py-1 text-xs font-semibold leading-none tabular-nums text-on-media">
              <span aria-hidden="true">−{savingsPercent}%</span>
              <span className="sr-only">Έκπτωση {savingsPercent}%</span>
            </span>
          )}
        </div>

        {/* Brand + category */}
        <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-ink-secondary">
          {p?.brand && (
            <span className="min-w-0 truncate font-medium uppercase tracking-wide">
              {p.brand}
            </span>
          )}
          {categoryLabel && (
            <span className="shrink-0 rounded-full border border-current px-2 py-0.5 text-xs uppercase tracking-wide">
              {categoryLabel}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mt-1 line-clamp-2 text-sm font-medium">
          {title}
        </div>

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          {p?.discountPrice != null && p?.price != null && p.discountPrice > p.price ? (
            <>
              <div className="text-xl font-bold text-brand-primary">{formatPrice(p.price)}</div>
              <div className="text-sm text-ink-muted line-through">{formatPrice(p.discountPrice)}</div>
            </>
          ) : (
            <div className="text-xl font-bold text-brand-primary">
              {formatPrice(p?.price ?? p?.discountPrice)}
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
