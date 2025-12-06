import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import placeholder from "/placeholder.png";
import metrics from "/metrics.png";
import { usePageSEO } from "../hooks/usePageSEO"; 
import { useCart } from "../context/CartContext";

const API = import.meta.env.VITE_API_BASE || "";

function ShippingInfo() {
  return (
    <div className="space-y-1 text-sm text-slate-700">
      <p><strong>╬ε╬╡╧Ε╬▒╧Η╬┐╧Β╬╣╬║╬υ:</strong> <strong>╬Φ╧Κ╧Β╬╡╬υ╬╜ ╬╝╬╡╧Ε╬▒╧Η╬┐╧Β╬╣╬║╬υ</strong> ╧Δ╬╡ ╧Ν╬╗╬╖ ╧Ε╬╖╬╜ ╬Χ╬╗╬╗╬υ╬┤╬▒ ╬╝╬╡ Box Now ╬│╬╣╬▒ ╬▒╬│╬┐╧Β╬φ╧Γ ╬υ╬╜╧Κ ╧Ε╬┐╬╜ 40έΓυ ╬║╬▒╬╣ ╬╝╬╡ ╬Χ╬╗╧Ε╬υ courier ╬│╬╣╬▒ ╬▒╬│╬┐╧Β╬φ╧Γ ╬υ╬╜╧Κ ╧Ε╧Κ╬╜ 80έΓυ.</p>
      <p><strong>╬Σ╬╜╧Ε╬╣╬║╬▒╧Ε╬▒╬▓╬┐╬╗╬χ:</strong> <strong>╬Φ╧Κ╧Β╬╡╬υ╬╜ ╬▒╬╜╧Ε╬╣╬║╬▒╧Ε╬▒╬▓╬┐╬╗╬χ</strong> ╬│╬╣╬▒ ╬▒╬│╬┐╧Β╬╡╧Γ ╬▒╬╜╧Κ ╧Ε╬┐ 60έΓυ.</p>
      <p><strong>╬Σ╧Α╬┐╧Δ╧Ε╬┐╬╗╬χ:</strong> 1έΑΥ3 ╬╡╧Β╬│╬υ╧Δ╬╣╬╝╬╡╧Γ ╬╝╬φ╧Β╬╡╧Γ ╬│╬╣╬▒ ╧Α╧Β╬┐╧Λ╧Ν╬╜╧Ε╬▒ ╧Α╬┐╧Ζ ╬╡╬ψ╬╜╬▒╬╣ ╧Δ╬╡ ╬┤╬╣╬▒╬╕╬╡╧Δ╬╣╬╝╬▒ ╧Δ╧Ε╬┐ ╬║╬▒╧Ε╬υ╧Δ╧Ε╬╖╬╝╬▒.</p>
      <p><strong>╬ι╬▒╧Β╬▒╬╗╬▒╬▓╬χ:</strong> <strong>╬Φ╧Κ╧Β╬╡╬υ╬╜ </strong>╧Α╬▒╧Β╬▒╬╗╬▒╬▓╬χ ╬▒╧Α╧Ν ╧Ε╬┐ ╬║╬▒╧Ε╬υ╧Δ╧Ε╬╖╬╝╬▒ Look Optica (╬π╬▒╬╗╬υ╬╜╬┤╧Β╬╣).</p>
      <p><strong>╬Χ╧Α╬╣╧Δ╧Ε╧Β╬┐╧Η╬╡╧Γ:</strong> 14 ╬╡╧Β╬│╬υ╧Δ╬╣╬╝╬╡╧Γ ╬╝╬φ╧Β╬╡╧Γ ╬│╬╣╬▒ ╬▒╬╗╬╗╬▒╬│╬φ╧Γ/╬╡╧Α╬╣╧Δ╧Ε╧Β╬┐╧Η╬φ╧Γ, ╧Ζ╧Α╧Ν ╧Ε╬╖╬╜ ╧Α╧Β╬┐╧Μ╧Α╧Ν╬╕╬╡╧Δ╬╖ ╧Ν╧Ε╬╣ ╧Ε╬┐ ╧Α╧Β╬┐╧Λ╧Ν╬╜ ╬┤╬╡╬╜ ╬╡╬ψ╬╜╬▒╬╣ ╧Θ╧Β╬╖╧Δ╬╣╬╝╬┐╧Α╬┐╬╣╬╖╬╝╬φ╬╜╬┐ ╬║╬▒╬╣ ╧Δ╧Ε╬╖╬╜ ╬▒╧Β╧Θ╬╣╬║╬χ ╧Ε╬┐╧Ζ ╧Δ╧Ζ╧Δ╬║╬╡╧Ζ╬▒╧Δ╬ψ╬▒. ╬ν╬▒ ╬φ╬╛╬┐╬┤╬▒ ╬╡╧Α╬╣╧Δ╧Ε╧Β╬┐╧Η╬χ╧Γ ╬╡╧Α╬╣╬▓╬▒╧Β╧Ζ╬╜╬┐╧Ξ╬╜ ╧Ε╬┐╬╜ ╬║╬▒╧Ε╬▒╬╜╬▒╬╗╧Κ╧Ε╬χ.</p>
      <p><strong>╬ι╧Β╬┐╧Λ╧Ν╬╜╧Ε╬▒ </strong> ╬θ╬╗╬▒ ╧Ε╬▒ ╧Α╧Β╬┐╧Λ╧Ν╬╜╧Ε╬▒ ╬╡╬ψ╬╜╬▒╬╣ ╬▒╧Ζ╬╕╬╡╬╜╧Ε╬╣╬║╬υ ╬▒╧Α╧Ν ╧Ε╬╖╬╜ ╬╡╧Α╬ψ╧Δ╬╖╬╝╬╖ ╬▒╬╜╧Ε╬╣╧Α╧Β╬┐╧Δ╧Κ╧Α╬╡╬ψ╬▒.</p>
      <p><strong>╬ι╬╗╬╖╧Β╬┐╧Η╬┐╧Β╬╣╬╡╧Γ:</strong> ╬Υ╬╣╬▒ ╧Α╬╗╬╖╧Β╬┐╧Η╬┐╧Β╬ψ╬╡╧Γ ╧Ε╬╖╬╗╬╡╧Η╧Κ╬╜╬χ╧Δ╧Ε╬╡ ╧Δ╧Ε╬┐ <strong>+30 210 6898658</strong> ╬χ ╧Δ╧Ε╬┐ <strong>+30 6944 223853</strong>.</p>
    </div>
  );
}

function FrameSizeSection({ p }) {
  const attrs = p?.attributes || {};
  // ╬ι╧Β╬┐╧Δ╬▒╧Β╬╝╧Ν╬╢╬╡╬╣╧Γ ╧Ε╬▒ ╬║╬╗╬╡╬╣╬┤╬╣╬υ ╧Ν╧Ε╬▒╬╜ ╬╛╬φ╧Β╬┐╧Ζ╬╝╬╡ ╬▒╬║╧Β╬╣╬▓╧Ο╧Γ ╧Ε╬▒ ╬┐╬╜╧Ν╬╝╬▒╧Ε╬▒
  const eyeSize = attrs.eyeSize || attrs.lensWidth || attrs.eye || "53";
  const bridgeSize = attrs.bridgeSize || attrs.bridge || "17";
  const templeLength = attrs.templeLength || attrs.temple || "145";

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">╬ε╬φ╬│╬╡╬╕╬┐╧Γ ╧Δ╬║╬╡╬╗╬╡╧Ε╬┐╧Ξ</h3>

      {/* ╬Σ╧Β╬╣╬╕╬╝╬┐╬ψ */}
      <div className="flex gap-4 text-sm">
        <div>
          <div className="font-semibold">{eyeSize} mm</div>
          <div className="text-xs text-slate-500">╬ε╬φ╬│╬╡╬╕╬┐╧Γ ╧Η╬▒╬║╬┐╧Ξ</div>
        </div>
        <div>
          <div className="font-semibold">{bridgeSize} mm</div>
          <div className="text-xs text-slate-500">╬Υ╬φ╧Η╧Ζ╧Β╬▒</div>
        </div>
        <div>
          <div className="font-semibold">{templeLength} mm</div>
          <div className="text-xs text-slate-500">╬ε╬χ╬║╬┐╧Γ ╬▓╧Β╬▒╧Θ╬ψ╬┐╬╜╬▒</div>
        </div>
      </div>

      {/* ╬Ω ╬┤╬╣╬║╬χ ╧Δ╬┐╧Ζ ╬╡╬╣╬║╧Ν╬╜╬▒ ╬╝╬╡ ╧Ε╬┐ ╧Δ╧Θ╬╡╬┤╬╣╬υ╬│╧Β╬▒╬╝╬╝╬▒ */}
      <div className="mt-2 rounded-lg border bg-slate-50 p-3 flex flex-col items-center">
        <img
          src={metrics}
          alt="╬θ╬┤╬╖╬│╧Ν╧Γ ╬╝╬╡╧Ε╧Β╬χ╧Δ╬╡╧Κ╬╜ ╧Δ╬║╬╡╬╗╬╡╧Ε╬┐╧Ξ"
          className="w-full max-w-sm h-auto"
        />
        <p className="mt-2 text-[10px] text-slate-500 text-center">
          ╬ι╬▒╧Β╬υ╬┤╬╡╬╣╬│╬╝╬▒: 53 έαΡ 17 έΑΥ 145 έΗΤ ╬╝╬φ╬│╬╡╬╕╬┐╧Γ ╧Η╬▒╬║╬┐╧Ξ 53mm, ╬│╬φ╧Η╧Ζ╧Β╬▒ 17mm, ╬╝╬χ╬║╬┐╧Γ ╬▓╧Β╬▒╧Θ╬ψ╬┐╬╜╬▒ 145mm.
        </p>
      </div>
    </div>
  );
}

function ProductDescription({ product }) {
  const raw =
    product?.description ||
    product?.shortDescription ||
    product?.excerpt ||
    "";

  if (!raw) return null;

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((l) => l.startsWith("-") || l.startsWith("έΑλ"));
  const hasBullets = bulletLines.length >= 2;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Description</h3>
      {hasBullets ? (
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
          {lines.map((l, idx) => (
            <li key={idx}>{l.replace(/^[-έΑλ]\s*/, "")}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {raw}
        </p>
      )}
    </div>
  );
}

function formatCategory(category) {
  if (!category) return "";
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAudience(audience) {
  if (!audience) return "";
  return audience
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PDP() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [variantIndex, setVariantIndex] = useState(0); // NEW: active colour
  const [imageIndex, setImageIndex] = useState(0);     // NEW: active image
  const [related, setRelated] = useState([]);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/products/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        setP(data);
        setState("ok");

        const variants = data.variants || [];
        const defaultIndex = variants.findIndex((v) => v.isDefault);
        setVariantIndex(defaultIndex >= 0 ? defaultIndex : 0);  // ΏθΣΙ use default colour
        setImageIndex(0);
      })
      .catch(() => setState("error"));
  }, [slug]);
  useEffect(() => {
    // after product is loaded, fetch all to compute related
    if (state !== "ok" || !p) return;

    fetch(`${API}/api/products`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((all) => {
        const list = Array.isArray(all) ? all : [];
        const brand = p.brand;
        const category = p.category;
        const audience = p.audience;
        const slugCurrent = p.slug;

        const relatedByBrand = list.filter(
          (prod) => prod.slug !== slugCurrent && brand && prod.brand === brand
        );
        const relatedByCategory = list.filter(
          (prod) =>
            prod.slug !== slugCurrent &&
            category &&
            prod.category === category &&
            (!brand || prod.brand !== brand)
        );

        const relatedByAudience = list.filter(
          (prod) =>
            prod.slug !== slugCurrent &&
            audience &&
            prod.audience === audience &&
            (!brand || prod.brand !== brand)
        );

        const combined = [...relatedByBrand, ...relatedByCategory, ...relatedByAudience].slice(0, 4);
        setRelated(combined);
      })
      .catch(() => {
        setRelated([]);
      });
  }, [state, p]);

  function Star({ filled, onClick }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-xl"
        aria-label="star"
      >
        {filled ? "έαΖ" : "έαΗ"}
      </button>
    );
  }

  function renderStatus(status) {
    if (!status) return null;
    let label = "";
    let classes = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ";

    switch (status) {
      case "in_stock":
        label = "╬Φ╬╣╬▒╬╕╬φ╧Δ╬╣╬╝╬┐";
        classes += "bg-emerald-50 text-emerald-700 border border-emerald-200";
        break;
      case "preorder":
        label = "╬γ╬▒╧Ε╧Ν╧Α╬╣╬╜ ╧Α╬▒╧Β╬▒╬│╬│╬╡╬╗╬ψ╬▒╧Γ";
        classes += "bg-amber-50 text-amber-700 border border-amber-200";
        break;
      case "unavailable":
        label = "╬ε╬╖ ╬┤╬╣╬▒╬╕╬φ╧Δ╬╣╬╝╬┐";
        classes += "bg-slate-100 text-slate-500 border border-slate-200";
        break;
      default:
        label = status;
        classes += "bg-slate-50 text-slate-600 border border-slate-200";
    }

    return <span className={classes}>{label}</span>;
  }


  // ---------- Derived data for variants & images ----------

  const variants = p?.variants || [];
  const hasVariants = variants.length > 0;  
  const active = hasVariants ? variants[variantIndex] : p; // NEW: active variant or base product

  const title =
    active?.title?.el ||
    active?.title?.en ||
    p?.title?.el ||
    p?.title?.en ||
    "Product";

  const price = active?.price ?? p?.price;
  const discountPrice = active?.discountPrice ?? p?.discountPrice;
  const sku = active?.sku || p?.sku;
  const ean = active?.ean || p?.ean;

  // images: first prefer active.images, then p.images, then placeholder
  const variantImages = Array.isArray(active?.images) ? active.images.filter(Boolean) : [];
  const productImages = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  const imageList =
    variantImages.length > 0
      ? variantImages
      : productImages.length > 0
        ? productImages
        : [placeholder];
  const safeImageIndex = Math.min(imageIndex, imageList.length - 1);
  const mainImage = imageList[safeImageIndex];

  const brand = p?.brand || active?.brand;
  const category = p?.category || active?.category;
  const audience = p?.audience || active?.audience;
  const statusValue = active?.status || p?.status;
  const variantLabel =
    active?.color || active?.colour || active?.name || active?.variantLabel || "";

  const siteName = "Look Optica";
  const baseUrl = "https://lookoptica.gr";

  const seoTitle = `${title} | ${siteName}`;
  const seoDescription =
    p?.metaDescription ||
    p?.description ||
    "╬Υ╧Ζ╬▒╬╗╬╣╬υ ╬┐╧Β╬υ╧Δ╬╡╧Κ╧Γ ╬║╬▒╬╣ ╬╖╬╗╬ψ╬┐╧Ζ ╬▒╧Α╧Ν ╧Ε╬┐ Look Optica ╧Δ╧Ε╬┐ ╬π╬▒╬╗╬υ╬╜╬┤╧Β╬╣.";
  const canonicalUrl = `${baseUrl}/product/${slug}`;

  const mainImageUrl =
    Array.isArray(p?.images) && p.images.length > 0
      ? p.images[0]
      : `${baseUrl}/placeholder.png`;

  usePageSEO({
    title: seoTitle,
    description: seoDescription,
    url: canonicalUrl,
    image: mainImageUrl,
  });

  useEffect(() => {
    setAdded(false);
  }, [variantIndex, slug]);

  const handleAddToCart = () => {
    if (!p) return;
    const salePrice = discountPrice ?? price;
    const unitPrice = Number(salePrice ?? 0) || 0;
    addItem(
      {
        id: active?.id || p?.id || sku,
        sku,
        slug: p.slug,
        title,
        price: unitPrice,
        image: mainImage,
        variantLabel,
        variantKey: hasVariants ? `${sku || active?.id || variantIndex}` : undefined,
      },
      1
    );
    setAdded(true);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">Home</Link> <span>έΑ║</span>{" "}
        <Link to="/shop" className="hover:underline">Shop</Link> <span>έΑ║</span>{" "}
        <span className="text-slate-700">{slug}</span>
      </nav>

      {state === "loading" && <div>LoadingέΑο</div>}
      {state === "error" && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          Could not load product.
        </div>
      )}
      {state === "ok" && p && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* images */}
          <div>
            {/* ╬║╧Ξ╧Β╬╣╬▒ ╬╡╬╣╬║╧Ν╬╜╬▒ */}
            <div className="w-full aspect-square rounded-xl bg-gray-100 overflow-hidden">
              <img
                src={mainImage}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
              />
            </div>

            {/* thumbnails */}
            {imageList.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {imageList.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setImageIndex(idx)}
                    className={`w-16 h-16 rounded-md overflow-hidden border ${
                      idx === safeImageIndex
                        ? "border-amber-600 ring-1 ring-amber-600"
                        : "border-slate-200"
                    }`}
                    aria-label={`╬Χ╬╣╬║╧Ν╬╜╬▒ ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`╬Χ╬╣╬║╧Ν╬╜╬▒ ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-sm mb-2">╬ι╬╗╬╖╧Β╬┐╧Η╬┐╧Β╬ψ╬╡╧Γ</h3>
              <ShippingInfo />
            </div>
          </div>

          {/* info */}
          <div className="space-y-4">
            {/* Brand + category */}
            <div className="text-sm text-slate-500 flex items-center gap-2">
              {brand && (
                <span className="font-semibold uppercase tracking-wide">
                  {brand}
                </span>
              )}
              {category && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide">
                  {formatCategory(category)}
                </span>
              )}
              {audience && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide">
                  {formatAudience(audience)}
                </span>
              )}
              {/* status pill */}
              {renderStatus(statusValue)}
            </div>


            {/* Title */}
            <h1 className="text-2xl font-semibold">
              {title}
            </h1>

            {/* Price */}
            {discountPrice ? (
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold text-amber-700">
                  {discountPrice != null ? `έΓυ${discountPrice}` : "έΑΦ"}
                </div>
                <div className="text-sm text-slate-400 line-through">
                  {price != null ? `έΓυ${price}` : "έΑΦ"}
                </div>
              </div>
            ) : (
              <div className="text-xl font-bold text-amber-700">
                {price != null ? `έΓυ${price}` : "έΑΦ"}
              </div>
            )}

            {/* SKU / EAN */}
            <div className="text-sm text-slate-600">
              {sku && <span className="mr-4">SKU: {sku}</span>}
              {ean && <span>EAN: {ean}</span>}
            </div>

            {/* Stock info */}
            <div className="text-xs text-slate-500">
              {active?.stock != null ? (
                <span>
                  ╬Φ╬╣╬▒╬╕╬╡╧Δ╬╣╬╝╧Ν╧Ε╬╖╧Ε╬▒: {active.stock} ╧Ε╬╡╬╝.
                  {active.reorderLevel != null &&
                    active.stock <= active.reorderLevel && (
                      <span className="text-amber-600 ml-1">
                        (╬π╬▒╬╝╬╖╬╗╧Ν ╬▒╧Α╧Ν╬╕╬╡╬╝╬▒ έΑΥ ╧Α╧Β╬┐╧Ε╬╡╬ψ╬╜╬╡╧Ε╬▒╬╣ ╬╡╧Α╬▒╬╜╬▒╧Α╬▒╧Β╬▒╬│╬│╬╡╬╗╬ψ╬▒)
                      </span>
                    )}
                </span>
              ) : p?.stock != null ? (
                <span>╬μ╧Ζ╬╜╬┐╬╗╬╣╬║╧Ν ╬▒╧Α╧Ν╬╕╬╡╬╝╬▒: {p.stock} ╧Ε╬╡╬╝.</span>
              ) : (
                <span>╬Φ╬╣╬▒╬╕╬╡╧Δ╬╣╬╝╧Ν╧Ε╬╖╧Ε╬▒ ╬║╬▒╧Ε╧Ν╧Α╬╣╬╜ ╧Δ╧Ζ╬╜╬╡╬╜╬╜╧Ν╬╖╧Δ╬╖╧Γ</span>
              )}
            </div>


            {/* Colour / variant selector */}
            {hasVariants && (
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  ╬Φ╬╣╬▒╬╕╬φ╧Δ╬╣╬╝╬▒ ╧Θ╧Β╧Ο╬╝╬▒╧Ε╬▒
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      type="button"
                      onClick={() => {
                        setVariantIndex(idx);
                        setImageIndex(0);
                      }}
                      className={`px-3 py-1 rounded-full border text-xs ${
                        idx === variantIndex
                          ? "border-amber-600 bg-amber-50 text-amber-800"
                          : "border-slate-300 text-slate-700"
                      }`}
                    >
                      {v.color || v.colour || v.name || `╬π╧Β╧Ο╬╝╬▒ ${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description + size */}
            <div className="mt-4 space-y-6">
              <ProductDescription product={p} />
              <FrameSizeSection p={active || p} />
            </div>
            
            {/* Buttons & back link */}
            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="px-4 py-2 rounded-xl bg-amber-700 text-white font-semibold hover:bg-amber-800"
                disabled={!price}
              >
                Add to cart
              </button>
              {added && (
                <p className="text-sm text-red-700">
                  Added to cart!{" "}
                  <Link to="/cart" className="underline">
                    View cart
                  </Link>
                </p>
              )}
            </div>

            <div className="pt-4">
              <Link to="/shop" className="text-amber-700 hover:underline">
                έΗΡ Back to shop
              </Link>
            </div>
          </div>
          {/* end info column */}
        </div>

          {/* Related products full width */}
          {related.length > 0 && (
            <div className="pt-6 border-t border-slate-200 mt-10">
              <h3 className="text-sm font-semibold mb-3">
                ╬ι╬▒╧Β╧Ν╬╝╬┐╬╣╬▒ ╧Α╧Β╬┐╧Λ╧Ν╬╜╧Ε╬▒
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {related.map((rp) => {
                  const rpTitle =
                    rp?.title?.el || rp?.title?.en || "Product";
                  const rpPrice = rp?.discountPrice ?? rp?.price;
                  const rpImage =
                    Array.isArray(rp.images) && rp.images.length > 0
                      ? rp.images[0]
                      : "/placeholder.png";

                  return (
                    <Link
                      key={rp.slug}
                      to={`/product/${rp.slug}`}
                      className="block text-xs"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-100 mb-1">
                        <img
                          src={rpImage}
                          alt={rpTitle}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.png";
                          }}
                        />
                      </div>
                      <div className="font-medium line-clamp-2">
                        {rpTitle}
                      </div>
                      {rpPrice != null && (
                        <div className="text-xs text-amber-700 font-semibold">
                          έΓυ{rpPrice}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews full width */}
          <div className="pt-6 border-t border-slate-200 mt-6">
            <h3 className="text-sm font-semibold mb-2">╬Σ╬╛╬╣╬┐╬╗╬┐╬│╬χ╧Δ╬╡╬╣╧Γ</h3>

            <div className="mb-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  filled={rating >= n}
                  onClick={() => setRating(n)}
                />
              ))}
              {rating > 0 && (
                <span className="ml-2 text-xs text-slate-600">
                  {rating} / 5
                </span>
              )}
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              placeholder="╬Υ╧Β╬υ╧Ι╬╡ ╧Ε╬╖╬╜ ╬╡╬╝╧Α╬╡╬╣╧Β╬ψ╬▒ ╧Δ╬┐╧Ζ ╬╝╬╡ ╧Ε╬┐ ╧Α╧Β╬┐╧Λ╧Ν╬╜..."
              className="w-full border rounded-lg px-3 py-2 text-xs mb-2"
            />

            <button
              type="button"
              className="px-3 py-1 rounded-lg bg-slate-200 text-xs text-slate-700"
              onClick={() => {
                // later will POST to backend
                setReviewText("");
                setRating(0);
                alert("╬Υ╬╣╬▒ ╧Ε╬╖╬╜ ╧Ο╧Β╬▒ ╬╖ ╬▒╬╛╬╣╬┐╬╗╧Ν╬│╬╖╧Δ╬╖ ╬┤╬╡╬╜ ╬▒╧Α╬┐╬╕╬╖╬║╬╡╧Ξ╬╡╧Ε╬▒╬╣ έΑΥ UI test ΏθβΓ");
              }}
            >
              ╬ξ╧Α╬┐╬▓╬┐╬╗╬χ ╬▒╬╛╬╣╬┐╬╗╧Ν╬│╬╖╧Δ╬╖╧Γ
            </button>
          </div>
        </>
      )}
    </div>
  );
}
