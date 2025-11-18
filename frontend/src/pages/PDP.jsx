import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import placeholder from "/placeholder.png";
import metrics from "/metrics.png";
import { usePageSEO } from "../hooks/usePageSEO"; 

const API = import.meta.env.VITE_API_BASE || "";

function ShippingInfo() {
  return (
    <div className="space-y-1 text-sm text-slate-700">
      <p><strong>Μεταφορικά:</strong> <strong>Δωρεάν μεταφορικά</strong> σε όλη την Ελλάδα με Box Now για αγορές άνω τον 40€ και με Ελτά courier για αγορές άνω των 80€.</p>
      <p><strong>Αντικαταβολή:</strong> <strong>Δωρεάν αντικαταβολή</strong> για αγορες ανω το 60€.</p>
      <p><strong>Αποστολή:</strong> 1–3 εργάσιμες μέρες για προϊόντα που είναι σε διαθεσιμα στο κατάστημα.</p>
      <p><strong>Παραλαβή:</strong> <strong>Δωρεάν </strong>παραλαβή από το κατάστημα Look Optica (Χαλάνδρι).</p>
      <p><strong>Επιστροφες:</strong> 14 εργάσιμες μέρες για αλλαγές/επιστροφές, υπό την προϋπόθεση ότι το προϊόν δεν είναι χρησιμοποιημένο και στην αρχική του συσκευασία. Τα έξοδα επιστροφής επιβαρυνούν τον καταναλωτή.</p>
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
  const desc =
    product?.description ||
    product?.shortDescription ||
    product?.excerpt ||
    null;

  if (!desc) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Description</h3>
      <p className="text-sm text-slate-700 leading-relaxed">
        {desc}
      </p>
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

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/products/${slug}`)
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
        {filled ? "★" : "☆"}
      </button>
    );
  }

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

  const siteName = "Look Optica";
  const baseUrl = "https://lookoptica.gr";

  const seoTitle = `${title} | ${siteName}`;
  const seoDescription =
    p?.metaDescription ||
    p?.description ||
    "Γυαλιά οράσεως και ηλίου από το Look Optica στο Χαλάνδρι.";
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">Home</Link> <span>›</span>{" "}
        <Link to="/shop" className="hover:underline">Shop</Link> <span>›</span>{" "}
        <span className="text-slate-700">{slug}</span>
      </nav>

      {state === "loading" && <div>Loading…</div>}
      {state === "error" && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          Could not load product.
        </div>
      )}
      {state === "ok" && p && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* images */}
          <div>
            {/* κύρια εικόνα */}
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
            {discountPrice ? (
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold text-amber-700">
                  {discountPrice != null ? `€${discountPrice}` : "—"}
                </div>
                <div className="text-sm text-slate-400 line-through">
                  {price != null ? `€${price}` : "—"}
                </div>
              </div>
            ) : (
              <div className="text-xl font-bold text-amber-700">
                {price != null ? `€${price}` : "—"}
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

            {/* Description + size + shipping */}
            <div className="mt-4 space-y-6">
              <ProductDescription product={p} />
              <FrameSizeSection p={active || p} />
              <div>
                <h3 className="font-semibold text-sm mb-1">Πληροφορίες</h3>
                <ShippingInfo />
              </div>
            </div>
            
            {/* Related products */}
            {related.length > 0 && (
              <div className="pt-6 border-t border-slate-200 mt-4">
                <h3 className="text-sm font-semibold mb-3">
                  Παρόμοια προϊόντα
                </h3>
                <div className="grid grid-cols-2 gap-3">
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
                            €{rpPrice}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
)}


            {/* Buttons & back link */}
            <div className="pt-4">
              <button
                disabled
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-600 cursor-not-allowed"
                title="Coming soon"
              >
                Add to cart (soon)
              </button>
            </div>

            <div className="pt-4">
              <Link to="/shop" className="text-amber-700 hover:underline">
                ← Back to shop
              </Link>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-200 mt-4">
            <h3 className="text-sm font-semibold mb-2">Αξιολογήσεις</h3>

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
              placeholder="Γράψε την εμπειρία σου με το προϊόν..."
              className="w-full border rounded-lg px-3 py-2 text-xs mb-2"
            />

            <button
              type="button"
              className="px-3 py-1 rounded-lg bg-slate-200 text-xs text-slate-700"
              onClick={() => {
                // later will POST to backend
                setReviewText("");
                setRating(0);
                alert("Για την ώρα η αξιολόγηση δεν αποθηκεύεται – UI test 🙂");
              }}
            >
              Υποβολή αξιολόγησης
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
