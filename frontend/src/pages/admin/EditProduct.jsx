import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "";

const CATEGORY_OPTIONS = [
  { value: "sunglasses", label: "Sunglasses" },
  { value: "ophthalmic_frames", label: "Ophthalmic Frames" },
  { value: "contact_lenses", label: "Contact Lenses" },
  { value: "solutions", label: "Solutions" },
  { value: "other_products", label: "Other Products" },
];

const audienceOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unisex", label: "Unisex" },
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
  { value: "kids_unisex", label: "Kids Unisex" },
];

const initialForm = {
  titleEl: "",
  titleEn: "",
  slug: "",
  brand: "",
  category: "",
  audience: "",
  price: "",
  discountPrice: "",
  sku: "",
  ean: "",
  description: "",
  imagesText: "",
  eyeSize: "",
  bridgeSize: "",
  templeLength: "",
  stock: "",
  reorderLevel: "",
  isDefault: false,
  status: "in_stock",
  color: "",
};

const initialVariant = {
  color: "",
  sku: "",
  ean: "",
  price: "",
  discountPrice: "",
  stock: "",
  reorderLevel: "",
  allowBackorder: false,
  imageUrl: "",
  status: "in_stock",
};

function makeSlug(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function EditProduct() {
  const { slug: originalSlug } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [variants, setVariants] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [localImages, setLocalImages] = useState([]);
  const [slugTouched, setSlugTouched] = useState(true); // editing: do not auto-change slug
  const [state, setState] = useState("loading"); // loading | idle | saving | error | success
  const [errorMsg, setErrorMsg] = useState("");
  
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const fileInputRef = useRef(null);

  // ---------- Load existing product ----------
  useEffect(() => {
    if (!originalSlug) return;

    setState("loading");
    fetch(`${API}/api/products/${originalSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((data) => {
        // map API shape -> form state
        const attrs = data.attributes || {};
        const eyeSize = attrs.eyeSize || "";
        const bridgeSize = attrs.bridgeSize || "";
        const templeLength = attrs.templeLength || "";

        const variantList = Array.isArray(data.variants) ? data.variants : [];
        const defaultVariant =
          variantList.find((v) => v.isDefault) || variantList[0] || null;

        setForm({
          titleEl: data.title?.el || "",
          titleEn: data.title?.en || "",
          slug: data.slug || "",
          brand: data.brand || "",
          category: data.category || "",
          audience: data.audience || "",
          price: data.price ?? "",
          discountPrice: data.discountPrice ?? "",
          sku: data.sku || "",
          ean: data.ean || "",
          description: data.description || "",
          imagesText: Array.isArray(data.images)
            ? data.images.join("\n")
            : "",
          eyeSize,
          bridgeSize,
          templeLength,
          stock: data.stock ?? "",
          reorderLevel: data.reorderLevel ?? "",
          isDefault: defaultVariant?.isDefault || false,
          status: data.status || "in_stock",
          color: defaultVariant?.color || "",
        });

        setVariants(
          variantList.map((v) => ({
            ...initialVariant,
            ...v,
            imageUrl: Array.isArray(v.images) && v.images.length > 0
              ? v.images[0]
              : "",
          }))
        );

        // if (data.brand) {
        //   setBrandOptions([data.brand]);
        // }

        // local preview from URLs only – not original files
        setLocalImages(
          Array.isArray(data.images)
            ? data.images.map((url) => ({ file: null, url }))
            : []
        );

        setState("idle");
      })
      .catch((err) => {
        console.error("Failed to load product", err);
        setErrorMsg("Failed to load product");
        setState("error");
      });
  }, [originalSlug]);

  // ---------- Form handlers ----------
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };

      if (name === "slug") {
        setSlugTouched(true);
        return next;
      }

      if (!slugTouched && (name === "titleEl" || name === "titleEn")) {
        const base =
          name === "titleEl" ? value || f.titleEn : value || f.titleEl;
        if (base) {
          next.slug = makeSlug(base);
        }
      }

      return next;
    });
  }

  function setDefaultVariant(idx) {
    setVariants((prev) =>
      prev.map((v, i) => ({ ...v, isDefault: i === idx }))
    );
  }

  function addVariant() {
    setVariants((prev) => [...prev, { ...initialVariant }]);
  }

  function updateVariant(index, field, value) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function removeVariant(index) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setLocalImages(previews);
  }

  // brand modal
  function handleOpenBrandModal() {
    setNewBrandName("");
    setShowBrandModal(true);
  }

  function handleSaveBrand() {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;

    setBrandOptions((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed].sort((a, b) => a.localeCompare(b));
    });

    setForm((f) => ({ ...f, brand: trimmed }));
    setShowBrandModal(false);
  }

  // ---------- Submit (PUT) ----------
  async function handleSubmit(e) {
    e.preventDefault();
    setState("saving");
    setErrorMsg("");

    const images = form.imagesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    let variantsPayload = variants.map((v) => ({
      color: v.color,
      sku: v.sku || null,
      ean: v.ean || null,
      price: v.price ? Number(v.price) : null,
      discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
      stock: v.stock ? Number(v.stock) : null,
      reorderLevel: v.reorderLevel ? Number(v.reorderLevel) : null,
      allowBackorder: !!v.allowBackorder,
      images: v.imageUrl ? [v.imageUrl] : [],
      isDefault: !!v.isDefault,
      status: v.status || "in_stock",
    }));

    if (variantsPayload.length === 0 && form.color) {
      variantsPayload = [
        {
          color: form.color,
          sku: form.sku || null,
          ean: form.ean || null,
          price: form.price ? Number(form.price) : null,
          discountPrice: form.discountPrice
            ? Number(form.discountPrice)
            : null,
          stock: form.stock ? Number(form.stock) : null,
          reorderLevel: form.reorderLevel
            ? Number(form.reorderLevel)
            : null,
          allowBackorder: false,
          images: images.length > 0 ? [images[0]] : [],
          isDefault: true,
          status: form.status || "in_stock",
        },
      ];
    }

    const payload = {
      slug: form.slug,
      brand: form.brand || null,
      category: form.category || null,
      price: form.price ? Number(form.price) : null,
      discountPrice: form.discountPrice
        ? Number(form.discountPrice)
        : null,
      sku: form.sku || null,
      ean: form.ean || null,
      title: {
        el: form.titleEl || form.titleEn,
        en: form.titleEn || form.titleEl,
      },
      description: form.description || null,
      images: images,
      audience: form.audience || null,
      attributes: {
        eyeSize: form.eyeSize || undefined,
        bridgeSize: form.bridgeSize || undefined,
        templeLength: form.templeLength || undefined,
      },
      stock: form.stock ? Number(form.stock) : null,
      reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : null,
      status: form.status || null,
      variants: variantsPayload,
    };

    try {
      const res = await fetch(`${API}/api/products/${originalSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update product");
      }

      setState("success");
      navigate(`/product/${form.slug}`);
    } catch (err) {
      setState("error");
      setErrorMsg(err.message || "Error updating product");
    }
  }

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch(`${API}/api/products`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        const unique = Array.from(
          new Set(
            list
              .map((p) => p.brand)
              .filter((b) => typeof b === "string" && b.trim().length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        setBrandOptions(unique);
      } catch (err) {
        console.error("Failed to load brands", err);
      }
    }

    loadBrands();
  }, []);


  if (state === "loading") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        Φόρτωση προϊόντος…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          {errorMsg || "Δεν ήταν δυνατή η φόρτωση του προϊόντος."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">
        Edit product: {originalSlug}
      </h1>

      {state === "error" && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Titles */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Τίτλος (Ελληνικά)
            </label>
            <input
              type="text"
              name="titleEl"
              value={form.titleEl}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Title (English)
            </label>
            <input
              type="text"
              name="titleEn"
              value={form.titleEn}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Slug (URL, π.χ. ana-hickmann-ah-1457)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
            <button
              type="button"
              onClick={() => {
                const base = form.titleEl || form.titleEn || "";
                if (!base) return;
                const newSlug = makeSlug(base);
                setForm((f) => ({ ...f, slug: newSlug }));
                setSlugTouched(true);
              }}
              className="px-3 py-2 text-xs rounded-lg border bg-slate-50"
            >
              Δημιουργία
            </button>
          </div>
        </div>

        {/* Brand / category / audience */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Brand</label>
              <select
                name="brand"
                value={form.brand}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select brand</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleOpenBrandModal}
              className="px-1.5 py-2 text-sm border rounded-lg bg-slate-50"
            >
              +
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a category</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Audience</label>
            <select
              name="audience"
              value={form.audience}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select audience</option>
              {audienceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price / SKU / EAN */}
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Τιμή (€)</label>
            <input
              type="number"
              name="price"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Τιμή προσφοράς (€)
            </label>
            <input
              type="number"
              name="discountPrice"
              step="0.01"
              value={form.discountPrice}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SKU</label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">EAN</label>
            <input
              type="text"
              name="ean"
              value={form.ean}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Χρώμα (π.χ. Havana / Brown)
            </label>
            <input
              type="text"
              name="color"
              value={form.color}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Κατάσταση προϊόντος
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="in_stock">Διαθέσιμο</option>
              <option value="preorder">Διαθέσιμο κατόπιν παραγγελίας</option>
              <option value="unavailable">Μη διαθέσιμο</option>
            </select>
          </div>
        </div>

        {/* Size */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Μέγεθος φακού (π.χ. 53)
            </label>
            <input
              type="text"
              name="eyeSize"
              value={form.eyeSize}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Γέφυρα (π.χ. 17)
            </label>
            <input
              type="text"
              name="bridgeSize"
              value={form.bridgeSize}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Μήκος βραχίονα (π.χ. 145)
            </label>
            <input
              type="text"
              name="templeLength"
              value={form.templeLength}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Variants */}
        <div className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Χρώματα & Διαθεσιμότητα</h2>
            <button
              type="button"
              onClick={addVariant}
              className="px-3 py-1 rounded-full text-xs bg-teal-600 text-white"
            >
              + Προσθήκη χρώματος
            </button>
          </div>

          {variants.length === 0 && (
            <p className="text-xs text-slate-500">
              Δεν έχουν προστεθεί χρώματα. Μπορείς να χρησιμοποιήσεις μόνο τα γενικά στοιχεία
              SKU/τιμής ή να προσθέσεις χρώματα εδώ.
            </p>
          )}

          <div className="space-y-4">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 space-y-3 bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Χρώμα #{idx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="radio"
                        name="defaultColor"
                        checked={v.isDefault}
                        onChange={() => setDefaultVariant(idx)}
                      />
                      Προεπιλεγμένο χρώμα
                    </label>
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Αφαίρεση
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Χρώμα (π.χ. Havana / Brown)
                    </label>
                    <input
                      type="text"
                      value={v.color}
                      onChange={(e) =>
                        updateVariant(idx, "color", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) =>
                        updateVariant(idx, "sku", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      EAN
                    </label>
                    <input
                      type="text"
                      value={v.ean}
                      onChange={(e) =>
                        updateVariant(idx, "ean", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Τιμή (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={v.price}
                      onChange={(e) =>
                        updateVariant(idx, "price", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Τιμή προσφοράς (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={v.discountPrice}
                      onChange={(e) =>
                        updateVariant(idx, "discountPrice", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Κατάσταση
                    </label>
                    <select
                      value={v.status}
                      onChange={(e) =>
                        updateVariant(idx, "status", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    >
                      <option value="in_stock">Διαθέσιμο</option>
                      <option value="preorder">Κατόπιν παραγγελίας</option>
                      <option value="unavailable">Μη διαθέσιμο</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Σημείο επαναπαραγγελίας
                    </label>
                    <input
                      type="number"
                      value={v.reorderLevel}
                      onChange={(e) =>
                        updateVariant(idx, "reorderLevel", e.target.value)
                      }
                      className="w-full border rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <input
                      id={`allowBackorder-${idx}`}
                      type="checkbox"
                      checked={v.allowBackorder}
                      onChange={(e) =>
                        updateVariant(idx, "allowBackorder", e.target.checked)
                      }
                    />
                    <label
                      htmlFor={`allowBackorder-${idx}`}
                      className="text-xs text-slate-700"
                    >
                      Επιτρέπεται παραγγελία χωρίς απόθεμα
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">
                    Εικόνα για αυτό το χρώμα (URL)
                  </label>
                  <input
                    type="text"
                    value={v.imageUrl}
                    onChange={(e) =>
                      updateVariant(idx, "imageUrl", e.target.value)
                    }
                    placeholder="https://..."
                    className="w-full border rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Image URLs (μία ανά γραμμή)
            </label>
            <textarea
              name="imagesText"
              value={form.imagesText}
              onChange={handleChange}
              rows={3}
              placeholder="https://...\nhttps://..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Εικόνες από τον υπολογιστή
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current && fileInputRef.current.click()
              }
              className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-sm hover:bg-slate-100"
            >
              Προσθήκη εικόνων…
            </button>

            {localImages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {localImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="w-16 h-16 rounded-md overflow-hidden border border-slate-300"
                  >
                    <img
                      src={img.url}
                      alt={`Τοπική εικόνα ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={state === "saving"}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm disabled:opacity-60"
        >
          {state === "saving" ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Add Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg space-y-3">
            <h2 className="text-sm font-semibold">Προσθήκη νέου brand</h2>
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="π.χ. Ray-Ban"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={handleSaveBrand}
                className="px-3 py-1.5 text-xs rounded-lg bg-amber-700 text-white"
              >
                Αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
