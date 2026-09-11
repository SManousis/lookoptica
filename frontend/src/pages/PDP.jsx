import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import placeholder from "/placeholder.png";
import metrics from "/metrics.jpg";
import { usePageSEO } from "../hooks/usePageSEO";
import { useCart } from "../context/CartContext";
import ProductReviews from "../components/ProductReviews";
import { useProductReviews } from "../hooks/useProductReviews";

const API = import.meta.env.VITE_API_BASE || "";

function ShippingInfo() {
  return (
    <div className="space-y-1 text-sm text-slate-700">
      <p><strong>Μεταφορικά:</strong> <strong>Δωρεάν μεταφορικά</strong> σε όλη την Ελλάδα με Box Now για αγορές άνω τον 40€ και με Ελτά courier για αγορές άνω των 80€.</p>
      <p><strong>Αντικαταβολή:</strong> <strong>Δωρεάν αντικαταβολή</strong> για αγορες ανω το 60€.</p>
      <p><strong>Αποστολή:</strong> 1–3 εργάσιμες μέρες για προϊόντα που είναι σε διαθεσιμα στο κατάστημα.</p>
      <p><strong>Παραλαβή:</strong> <strong>Δωρεάν </strong>παραλαβή από το κατάστημα Look Optica (Χαλάνδρι).</p>
      <p><strong>Επιστροφές:</strong> Δικαίωμα υπαναχώρησης εντός 14 ημερολογιακών ημερών από την παραλαβή, με πλήρη επιστροφή χρημάτων. Δείτε τους <a href="/terms" className="underline">όρους χρήσης</a> για λεπτομέρειες και εξαιρέσεις. Τα έξοδα επιστροφής επιβαρύνουν τον καταναλωτή.</p>
      <p><strong>Προϊόντα </strong> Ολα τα προϊόντα είναι αυθεντικά από την επίσημη αντιπροσωπεία.</p>
      <p><strong>Πληροφοριες:</strong> Για πληροφορίες τηλεφωνήστε στο <strong>+30 210 6898658</strong> ή στο <strong>+30 6944 223853</strong>.</p>
    </div>
  );
}

function FrameSizeSection({ p }) {
  const attrs = p?.attributes || {};
  // Προσαρμόζεις τα κλειδιά όταν ξέρουμε ακριβώς τα ονόματα
  const eyeSize = attrs.eyeSize || attrs.lensWidth || attrs.eye || "53";
  const bridgeSize = attrs.bridgeSize || attrs.bridge || "17";
  const templeLength = attrs.templeLength || attrs.temple || "145";

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Μέγεθος σκελετού</h3>

      {/* Αριθμοί */}
      <div className="flex gap-4 text-sm">
        <div>
          <div className="font-semibold">{eyeSize} mm</div>
          <div className="text-xs text-slate-500">Μέγεθος φακού</div>
        </div>
        <div>
          <div className="font-semibold">{bridgeSize} mm</div>
          <div className="text-xs text-slate-500">Γέφυρα</div>
        </div>
        <div>
          <div className="font-semibold">{templeLength} mm</div>
          <div className="text-xs text-slate-500">Μήκος βραχίονα</div>
        </div>
      </div>

      {/* Η δική σου εικόνα με το σχεδιάγραμμα */}
      <div className="mt-2 rounded-lg border bg-slate-50 p-3 flex flex-col items-center">
        <img
          src={metrics}
          alt="Οδηγός μετρήσεων σκελετού"
          className="w-full max-w-sm h-auto"
        />
        <p className="mt-2 text-[10px] text-slate-500 text-center">
          Παράδειγμα: 53 ☐ 17 – 145 → μέγεθος φακού 53mm, γέφυρα 17mm, μήκος βραχίονα 145mm.
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

  const bulletLines = lines.filter((l) => l.startsWith("-") || l.startsWith("•"));
  const hasBullets = bulletLines.length >= 2;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Description</h3>
      {hasBullets ? (
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
          {lines.map((l, idx) => (
            <li key={idx}>{l.replace(/^[-•]\s*/, "")}</li>
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
  const reviewsData = useProductReviews(slug);
  const [added, setAdded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/products/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        setP(data);
        setState("ok");

        const variants = data.variants || [];
        const defaultIndex = variants.findIndex((v) => v.isDefault);
        setVariantIndex(defaultIndex >= 0 ? defaultIndex : 0);  // 👈 use default colour
        setImageIndex(0);
      })
      .catch(() => setState("error"));
  }, [slug]);
  useEffect(() => {
    // after product is loaded, fetch all to compute related
    if (state !== "ok" || !p) return;

    fetch(`${API}/products`)
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

  function renderStatus(status) {
    if (!status) return null;
    let label = "";
    let classes = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ";

    switch (status) {
      case "in_stock":
        label = "Διαθέσιμο";
        classes += "bg-emerald-50 text-emerald-700 border border-emerald-200";
        break;
      case "preorder":
        label = "Κατόπιν παραγγελίας";
        classes += "bg-amber-50 text-amber-700 border border-amber-200";
        break;
      case "unavailable":
        label = "Μη διαθέσιμο";
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
  const imageList = (() => {
    const combined = [];
    const pushUnique = (url) => {
      if (!url) return;
      if (!combined.includes(url)) {
        combined.push(url);
      }
    };
    variantImages.forEach(pushUnique);
    productImages.forEach(pushUnique);
    if (combined.length === 0) {
      combined.push(placeholder);
    }
    return combined;
  })();
  const safeImageIndex = Math.min(imageIndex, imageList.length - 1);
  const mainImage = imageList[safeImageIndex];

  const brand = p?.brand || active?.brand;
  const category = p?.category || active?.category;
  const audience = p?.audience || active?.audience;
  const statusValue = active?.status || p?.status;
  const variantLabel =
    active?.color || active?.colour || active?.name || active?.variantLabel || "";

  const siteName = "Look Optica";
  const baseUrl = "https://www.lookoptica.gr";
  const absoluteUrl = (path) =>
    !path ? null : path.startsWith("http") ? path : `${baseUrl}${path}`;

  const seoTitle = brand
    ? `${title} | ${brand} | ${siteName}`
    : `${title} | ${siteName}`;

  const truncate = (text, max) =>
    text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;

  const seoDescription =
    p?.metaDescription ||
    (p?.description ? truncate(p.description, 157) : null) ||
    [
      title,
      brand ? `από ${brand}` : null,
      (price ?? discountPrice) != null
        ? `${Number(price ?? discountPrice).toFixed(2)}€`
        : null,
    ]
      .filter(Boolean)
      .join(" – ") +
      ". Αυθεντικό προϊόν, δωρεάν παραλαβή από το Look Optica στο Χαλάνδρι.";
  const canonicalUrl = `${baseUrl}/product/${slug}`;

  const mainImageUrl =
    Array.isArray(p?.images) && p.images.length > 0
      ? absoluteUrl(p.images[0])
      : `${baseUrl}/placeholder.png`;

  const AVAILABILITY_MAP = {
    in_stock: "https://schema.org/InStock",
    preorder: "https://schema.org/PreOrder",
    unavailable: "https://schema.org/OutOfStock",
  };

  const sellingPrice = price ?? discountPrice;

  const productJsonLd =
    p && sellingPrice != null
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: title,
          description: seoDescription,
          image: imageList.map(absoluteUrl).filter(Boolean),
          sku: sku || undefined,
          gtin: ean || undefined,
          brand: brand ? { "@type": "Brand", name: brand } : undefined,
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "EUR",
            price: Number(sellingPrice).toFixed(2),
            availability:
              AVAILABILITY_MAP[statusValue] || "https://schema.org/InStock",
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "GR",
              returnPolicyCategory:
                "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 14,
              returnMethod: "https://schema.org/ReturnByMail",
              returnFees: "https://schema.org/ReturnShippingFees",
            },
          },
          aggregateRating:
            reviewsData.count > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: reviewsData.average_rating,
                  reviewCount: reviewsData.count,
                }
              : undefined,
        }
      : null;

  usePageSEO({
    title: seoTitle,
    description: seoDescription,
    url: canonicalUrl,
    image: mainImageUrl,
    jsonLd: [
      productJsonLd,
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Αρχική",
            item: baseUrl + "/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    ].filter(Boolean),
  });

  useEffect(() => {
    setAdded(false);
    setLightboxOpen(false);
  }, [variantIndex, slug]);

  const handleAddToCart = () => {
    if (!p) return;
    const salePrice = price ?? discountPrice;
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
        <Link to="/" className="hover:underline">Αρχική</Link> <span>›</span>{" "}
        <Link to="/shop" className="hover:underline">Κατάστημα</Link> <span>›</span>{" "}
        <span className="text-slate-700">{p ? title : slug}</span>
      </nav>

      {state === "loading" && <div>Loading…</div>}
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
            {/* κύρια εικόνα */}
            <div className="w-full rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
              <img
                src={mainImage}
                alt={title}
                className="w-full max-h-[520px] object-contain cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]"
                onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
                onClick={() => setLightboxOpen(true)}
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
                    aria-label={`Εικόνα ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Εικόνα ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
                    />
                  </button>
                ))}
              </div>
            )}
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
            {discountPrice != null && price != null && discountPrice > price ? (
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold text-amber-700">{`€${price}`}</div>
                <div className="text-sm text-slate-400 line-through">{`€${discountPrice}`}</div>
              </div>
            ) : (
              <div className="text-xl font-bold text-amber-700">
                {price != null ? `€${price}` : discountPrice != null ? `€${discountPrice}` : "€"}
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
                  Διαθεσιμότητα: {active.stock} τεμ.
                  {active.reorderLevel != null &&
                    active.stock <= active.reorderLevel && (
                      <span className="text-amber-600 ml-1">
                        (Χαμηλό απόθεμα – προτείνεται επαναπαραγγελία)
                      </span>
                    )}
                </span>
              ) : p?.stock != null ? (
                <span>Συνολικό απόθεμα: {p.stock} τεμ.</span>
              ) : (
                <span>Διαθεσιμότητα κατόπιν συνεννόησης</span>
              )}
            </div>


            {/* Colour / variant selector */}
            {hasVariants && (
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  Διαθέσιμα χρώματα
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
                      {v.color || v.colour || v.name || `Χρώμα ${idx + 1}`}
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
                Προσθήκη στο καλάθι
              </button>
              {added && (
                <p className="text-sm text-red-700">
                  Προστέθηκε στο καλάθι!{" "}
                  <Link to="/cart" className="underline">
                    Προβολή καλαθιού
                  </Link>
                </p>
              )}
            </div>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-sm mb-2">Πληροφορίες</h3>
              <ShippingInfo />
            </div>

            <div className="pt-4">
              <Link to="/shop" className="text-amber-700 hover:underline">
                ← Πίσω στο κατάστημα
              </Link>
            </div>
          </div>
          {/* end info column */}
        </div>

          {lightboxOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setLightboxOpen(false)}
            >
              <div
                className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-[1000px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-black">
                  <img
                    src={mainImage}
                    alt={title}
                    className="w-full h-[500px] max-h-[75vh] object-contain"
                    onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
                  />
                </div>
                <div className="flex justify-end p-3">
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(false)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Related products full width */}
          {related.length > 0 && (
            <div className="pt-6 border-t border-slate-200 mt-10">
              <h3 className="text-sm font-semibold mb-3">
                Παρόμοια προϊόντα
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {related.map((rp) => {
                  const rpTitle =
                    rp?.title?.el || rp?.title?.en || "Product";
                  const rpPrice = rp?.price ?? rp?.discountPrice;
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
                          €{rpPrice}
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
            <ProductReviews slug={slug} reviewsData={reviewsData} />
          </div>
        </>
      )}
    </div>
  );
}
