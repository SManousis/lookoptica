import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import placeholder from "/placeholder.png";
import { useCart } from "../context/CartContext";
import { usePageSEO } from "../hooks/usePageSEO";

const API = import.meta.env.VITE_API_BASE || "";

function formatDiopter(value) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
}

function formatAddition(addition, label) {
  if (label) return label;
  if (addition === null || addition === undefined) return "—";
  return addition.toFixed(2);
}

function ShippingInfo() {
  return (
    <div className="space-y-1 text-sm text-slate-700">
      <p>
        <strong>Μεταφορικά:</strong>{" "}
        <strong>Δωρεάν μεταφορικά</strong> σε όλη την Ελλάδα με Box Now για
        αγορές άνω τον 40€ και με Ελτά courier για αγορές άνω των 80€.
      </p>
      <p>
        <strong>Αντικαταβολή:</strong>{" "}
        <strong>Δωρεάν αντικαταβολή</strong> για αγορες ανω το 60€.
      </p>
      <p>
        <strong>Αποστολή:</strong> 1–3 εργάσιμες μέρες για προϊόντα που είναι
        διαθέσιμα στο κατάστημα.
      </p>
      <p>
        <strong>Παραλαβή:</strong>{" "}
        <strong>Δωρεάν </strong>
        παραλαβή από το κατάστημα Look Optica (Χαλάνδρι).
      </p>
      <p>
        <strong>Επιστροφές:</strong> 14 εργάσιμες μέρες για αλλαγές/επιστροφές,
        υπό την προϋπόθεση ότι το προϊόν δεν είναι χρησιμοποιημένο και στην
        αρχική του συσκευασία. Τα έξοδα επιστροφής επιβαρύνουν τον καταναλωτή.
      </p>
      <p>
        <strong>Προϊόντα:</strong> Όλα τα προϊόντα είναι αυθεντικά από την
        επίσημη αντιπροσωπεία.
      </p>
      <p>
        <strong>Πληροφορίες:</strong> Για πληροφορίες τηλεφωνήστε στο{" "}
        <strong>+30 210 6898658</strong> ή στο <strong>+30 6944 223853</strong>.
      </p>
    </div>
  );
}

export default function ContactLensPDP() {
  const { slug } = useParams();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [errorMsg, setErrorMsg] = useState("");
  const [added, setAdded] = useState(false);

  // selection state
  const [sphereSel, setSphereSel] = useState("");
  const [cylinderSel, setCylinderSel] = useState("");
  const [axisSel, setAxisSel] = useState("");
  const [additionSel, setAdditionSel] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setState("loading");
    setErrorMsg("");

    fetch(`${API}/api/products/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        setProduct(data);
        setState("ok");

        // reset selection when product changes
        setSphereSel("");
        setCylinderSel("");
        setAxisSel("");
        setAdditionSel("");
        setQty(1);
        setAdded(false);
      })
      .catch((err) => {
        console.error("Failed to load contact lens PDP", err);
        setState("error");
        setErrorMsg("Could not load product.");
      });
  }, [slug]);

  const attrs = product?.attributes || {};
  const isContactLens = attrs.product_type === "contact_lens";

  const variants = useMemo(
    () => (Array.isArray(attrs.variants) ? attrs.variants : []),
    [attrs.variants]
  );

  const lensType = attrs.lens_type; // "spherical" | "astigmatic" | "multifocal"
  const family = attrs.lens_family; // "soft" etc.
  const duration = attrs.duration; // "daily" etc.
  const bc = attrs.bc;
  const diameter = attrs.diameter;

  // derive image (single)
  const mainImage =
    (Array.isArray(product?.images) && product.images[0]) ||
    product?.image ||
    placeholder;

  const title =
    product?.title?.el || product?.title?.en || attrs.title || "Contact lens";

  const price = product?.price ?? attrs.price;
  const discountPrice = product?.discountPrice ?? attrs.discountPrice;

  const sku = product?.sku;
  const ean = product?.ean;

  const siteName = "Look Optica";
  const baseUrl = "https://www.lookoptica.gr";
  const seoTitle = `${title} | ${siteName}`;
  const seoDescription =
    product?.metaDescription ||
    product?.description ||
    "Φακοί επαφής από το Look Optica στο Χαλάνδρι.";
  const canonicalUrl = `${baseUrl}/contact-lens/${slug}`;
  const mainImageUrl =
    (Array.isArray(product?.images) && product.images[0]) ||
    `${baseUrl}/placeholder.png`;

  usePageSEO({
    title: seoTitle,
    description: seoDescription,
    url: canonicalUrl,
    image: mainImageUrl,
  });

  // ---------- options derived from variants ----------

  const availableSpheres = useMemo(() => {
    const set = new Set();
    variants.forEach((v) => {
      if (v.sphere !== null && v.sphere !== undefined) {
        set.add(Number(v.sphere));
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [variants]);

  const availableCylinders = useMemo(() => {
    if (lensType !== "astigmatic" || sphereSel === "") return [];
    const s = Number(sphereSel);
    const set = new Set();
    variants.forEach((v) => {
      if (
        v.sphere === s &&
        v.cylinder !== null &&
        v.cylinder !== undefined
      ) {
        set.add(Number(v.cylinder));
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [variants, lensType, sphereSel]);

  const availableAxes = useMemo(() => {
    if (lensType !== "astigmatic" || sphereSel === "" || cylinderSel === "")
      return [];
    const s = Number(sphereSel);
    const c = Number(cylinderSel);
    const set = new Set();
    variants.forEach((v) => {
      if (
        v.sphere === s &&
        v.cylinder === c &&
        v.axis !== null &&
        v.axis !== undefined
      ) {
        set.add(v.axis);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [variants, lensType, sphereSel, cylinderSel]);

  const availableAdditions = useMemo(() => {
    if (lensType !== "multifocal" || sphereSel === "") return [];
    const s = Number(sphereSel);
    const map = new Map(); // key -> { addition, label }

    variants.forEach((v) => {
      if (v.sphere !== s) return;
      const label = v.addition_label || formatAddition(v.addition, null);
      const key = label;
      if (!map.has(key)) {
        map.set(key, { key, label, addition: v.addition });
      }
    });

    return Array.from(map.values());
  }, [variants, lensType, sphereSel]);

  // when sphere changes, reset others
  const handleSphereChange = (value) => {
    setSphereSel(value);
    setCylinderSel("");
    setAxisSel("");
    setAdditionSel("");
    setAdded(false);
  };

  const handleCylinderChange = (value) => {
    setCylinderSel(value);
    setAxisSel("");
    setAdded(false);
  };

  const handleAxisChange = (value) => {
    setAxisSel(value);
    setAdded(false);
  };

  const handleAdditionChange = (value) => {
    setAdditionSel(value);
    setAdded(false);
  };

  // find selected variant
  const selectedVariant = useMemo(() => {
    if (!variants.length || !sphereSel) return null;
    const s = Number(sphereSel);

    if (lensType === "spherical") {
      return variants.find((v) => v.sphere === s) || null;
    }

    if (lensType === "astigmatic") {
      if (!cylinderSel || !axisSel) return null;
      const c = Number(cylinderSel);
      const a = Number(axisSel);
      return (
        variants.find(
          (v) => v.sphere === s && v.cylinder === c && v.axis === a
        ) || null
      );
    }

    if (lensType === "multifocal") {
      if (!additionSel) return null;
      return (
        variants.find(
          (v) =>
            v.sphere === s &&
            (v.addition_label === additionSel ||
              formatAddition(v.addition, v.addition_label) === additionSel)
        ) || null
      );
    }

    return null;
  }, [variants, lensType, sphereSel, cylinderSel, axisSel, additionSel]);

  const status = selectedVariant?.availability || attrs.availability || product?.status;

  function renderStatus(statusValue) {
    if (!statusValue) return null;
    let label = "";
    let classes =
      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ";

    switch (statusValue) {
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
        label = statusValue;
        classes += "bg-slate-50 text-slate-600 border border-slate-200";
    }

    return <span className={classes}>{label}</span>;
  }

  const familyLabel = (() => {
    switch (family) {
      case "soft":
        return "Soft";
      case "rgp":
        return "RGP";
      case "keratoconic":
        return "Keratoconic";
      case "scleral":
        return "Scleral";
      default:
        return family || "";
    }
  })();

  const durationLabel = (() => {
    switch (duration) {
      case "daily":
        return "Ημερήσιοι";
      case "monthly":
        return "Μηνιαίοι";
      case "15days":
        return "15 ημερών";
      case "3months":
        return "Τριμηνιαίοι";
      case "yearly":
        return "Ετήσιοι";
      default:
        return duration || "";
    }
  })();

  const lensTypeLabel = (() => {
    switch (lensType) {
      case "spherical":
        return "Σφαιρικοί";
      case "astigmatic":
        return "Αστιγματικοί";
      case "multifocal":
        return "Πολυεστιακοί";
      default:
        return "";
    }
  })();

  const canAddToCart =
    price != null &&
    sphereSel &&
    ((lensType === "spherical" && selectedVariant) ||
      (lensType === "astigmatic" &&
        cylinderSel &&
        axisSel &&
        selectedVariant) ||
      (lensType === "multifocal" && additionSel && selectedVariant)) &&
    qty > 0;

  const handleAddToCart = () => {
    setErrorMsg("");
    if (!canAddToCart || !selectedVariant) {
      setErrorMsg("Παρακαλώ επιλέξτε σωστά τους βαθμούς πριν προσθέσετε στο καλάθι.");
      return;
    }

    const unitPrice = Number(price ?? 0) || 0;

    let variantLabel = `Sph ${formatDiopter(selectedVariant.sphere)}`;
    if (lensType === "astigmatic") {
      variantLabel += ` / Cyl ${formatDiopter(
        selectedVariant.cylinder
      )} / Axis ${selectedVariant.axis}°`;
    }
    if (lensType === "multifocal") {
      variantLabel += ` / Add ${formatAddition(
        selectedVariant.addition,
        selectedVariant.addition_label
      )}`;
    }

    const cartId =
      selectedVariant.ean ||
      `${sku || product.id}-` +
        `${selectedVariant.sphere ?? "s"}-` +
        `${selectedVariant.cylinder ?? "c"}-` +
        `${selectedVariant.axis ?? "a"}-` +
        `${selectedVariant.addition_label || selectedVariant.addition || "add"}`;

    addItem(
      {
        id: cartId,
        sku: sku,
        slug: product.slug,
        title,
        price: unitPrice,
        image: mainImage,
        variantLabel,
        variantKey: cartId,
      },
      qty
    );

    setAdded(true);
  };

  useEffect(() => {
    setAdded(false);
  }, [sphereSel, cylinderSel, axisSel, additionSel, qty]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">
          Home
        </Link>{" "}
        <span>›</span>{" "}
        <Link to="/shop/contact-lenses" className="hover:underline">
          Φακοί επαφής
        </Link>{" "}
        <span>›</span>{" "}
        <span className="text-slate-700">{slug}</span>
      </nav>

      {state === "loading" && <div>Loading…</div>}
      {state === "error" && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
          {errorMsg || "Could not load product."}
        </div>
      )}

      {state === "ok" && product && isContactLens && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image (single) */}
          <div>
            <div className="w-full aspect-square rounded-xl bg-gray-100 overflow-hidden">
              <img
                src={mainImage}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.png";
                }}
              />
            </div>
          </div>

          {/* Info / selection */}
          <div className="space-y-4">
            {/* Brand + meta */}
            <div className="text-sm text-slate-500 flex flex-wrap items-center gap-2">
              {product.brand && (
                <span className="font-semibold uppercase tracking-wide">
                  {product.brand}
                </span>
              )}
              {durationLabel && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] tracking-wide">
                  {durationLabel}
                </span>
              )}
              {lensTypeLabel && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] tracking-wide">
                  {lensTypeLabel}
                </span>
              )}
              {familyLabel && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] tracking-wide">
                  {familyLabel}
                </span>
              )}
              {renderStatus(status)}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold">{title}</h1>

            {/* Price */}
            {discountPrice ? (
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold text-amber-700">
                  €{Number(discountPrice).toFixed(2)}
                </div>
                <div className="text-sm text-slate-400 line-through">
                  €{Number(price).toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="text-xl font-bold text-amber-700">
                {price != null ? `€${Number(price).toFixed(2)}` : "—"}
              </div>
            )}

            {/* SKU / EAN */}
            <div className="text-sm text-slate-600">
              {sku && <span className="mr-4">SKU: {sku}</span>}
              {ean && <span>EAN: {ean}</span>}
            </div>

            {/* BC / Dia */}
            {(bc || diameter) && (
              <div className="text-sm text-slate-600">
                {bc && <span className="mr-3">BC: {bc}</span>}
                {diameter && <span>Dia: {diameter} mm</span>}
              </div>
            )}

            {/* Selection controls */}
            <div className="mt-4 space-y-4">
              {/* Sphere */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sphere (Sph)
                </label>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={sphereSel}
                  onChange={(e) => handleSphereChange(e.target.value)}
                >
                  <option value="">Επιλέξτε σφαίρωμα</option>
                  {availableSpheres.map((s) => (
                    <option key={s} value={s}>
                      {formatDiopter(s)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Astigmatic extra */}
              {lensType === "astigmatic" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Cylinder (Cyl)
                    </label>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={cylinderSel}
                      onChange={(e) => handleCylinderChange(e.target.value)}
                      disabled={!sphereSel}
                    >
                      <option value="">Επιλέξτε κύλινδρο</option>
                      {availableCylinders.map((c) => (
                        <option key={c} value={c}>
                          {formatDiopter(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Άξονας (Axis)
                    </label>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={axisSel}
                      onChange={(e) => handleAxisChange(e.target.value)}
                      disabled={!sphereSel || !cylinderSel}
                    >
                      <option value="">Επιλέξτε άξονα</option>
                      {availableAxes.map((a) => (
                        <option key={a} value={a}>
                          {a}°
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Multifocal extra */}
              {lensType === "multifocal" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Addition
                  </label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={additionSel}
                    onChange={(e) => handleAdditionChange(e.target.value)}
                    disabled={!sphereSel}
                  >
                    <option value="">Επιλέξτε Addition</option>
                    {availableAdditions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ποσότητα (κουτιά)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={qty}
                    onChange={(e) =>
                      setQty(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-24 rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Description + shipping */}
            <div className="mt-4 space-y-4">
              {product.description && (
                <div>
                  <h3 className="font-semibold text-sm mb-1">Περιγραφή</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-sm mb-1">Πληροφορίες</h3>
                <ShippingInfo />
              </div>
            </div>

            {/* Add to cart */}
            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="px-4 py-2 rounded-xl bg-amber-700 text-white font-semibold hover:bg-amber-800 disabled:opacity-60"
                disabled={!canAddToCart}
              >
                Προσθήκη στο καλάθι
              </button>
              {added && (
                <p className="text-sm text-emerald-700">
                  Προστέθηκε στο καλάθι!{" "}
                  <Link to="/cart" className="underline">
                    Δες το καλάθι
                  </Link>
                </p>
              )}
            </div>

            <div className="pt-4">
              <Link to="/shop/contact-lenses" className="text-amber-700 hover:underline">
                ← Πίσω στους φακούς επαφής
              </Link>
            </div>
          </div>
        </div>
      )}

      {state === "ok" && product && !isContactLens && (
        <div className="text-sm text-slate-600">
          This product is not marked as a contact lens (product_type ≠
          contact_lens).
        </div>
      )}
    </div>
  );
}
