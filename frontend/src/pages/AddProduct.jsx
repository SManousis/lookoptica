import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "";

const CATEGORY_OPTIONS = [
  { value: "Γυαλιά ηλίου", label: "Γυαλιά ηλίου", aliases: ["sunglasses", "sun-glasses"] },
  { value: "Σκελετοί οράσεως", label: "Σκελετοί οράσεως", aliases: ["ophthalmic_frames", "frames"] },
  { value: "Φακοί επαφής", label: "Φακοί επαφής", aliases: ["contact_lenses", "contact-lenses"] },
  { value: "Υγρά / Λύσεις", label: "Υγρά / Λύσεις", aliases: ["solutions"] },
  { value: "Λοιπά προϊόντα", label: "Λοιπά προϊόντα", aliases: ["other_products", "other-products"] },
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
  isStock: false,
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

function makeDuplicateSlug(slug) {
  if (!slug) return "";

  const match = slug.match(/^(.*?)-copy-(\d+)$/);
  if (match) {
    const [, base, num] = match;
    return `${base}-copy-${Number(num) + 1}`;
  }

  if (slug.endsWith("-copy")) {
    return `${slug}-2`;
  }

  return `${slug}-copy`;
}

export default function AddProduct() {
  const [form, setForm] = useState(initialForm);
  const [variants, setVariants] = useState([]);
  const [state, setState] = useState("idle"); // idle | saving | error | success
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const [localImages, setLocalImages] = useState([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const fileInputRef = useRef(null);
  

  // ⭐ NEW: brand options + modal state
  const [imageUploadState, setImageUploadState] = useState("idle");
  const [imageUploadMessage, setImageUploadMessage] = useState("");
  const [brandOptions, setBrandOptions] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: type === "checkbox" ? checked : value };

      if (name === "slug") {
        setSlugTouched(true);
        return next;
      }

      if (!slugTouched && (name === "titleEl" || name === "titleEn")) {
        const base = name === "titleEl" ? value || f.titleEn : value || f.titleEl;
        if (base) {
          next.slug = makeSlug(base);
        }
      }

      return next;
    });
  }

  function setDefaultVariant(idx) {
    setVariants((prev) => prev.map((v, i) => ({ ...v, isDefault: i === idx })));
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

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadState("uploading");
    setImageUploadMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/admin/uploads/product-image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Αποτυχία ανεβάσματος");
      }
      const data = await res.json();
      const imagePath = data?.path;
      if (imagePath) {
        setForm((prev) => ({
          ...prev,
          imagesText: prev.imagesText ? `${prev.imagesText}\n${imagePath}` : imagePath,
        }));
      }
      setImageUploadState("success");
      setImageUploadMessage("Η εικόνα αποθηκεύτηκε στο προϊόν.");
    } catch (err) {
      console.error("Image upload failed", err);
      setImageUploadState("error");
      setImageUploadMessage(err.message || "Αποτυχία ανεβάσματος.");
    } finally {
      e.target.value = "";
    }
  }

  // ⭐ NEW: handle adding a brand from the popup
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

    // set form brand to this new brand
    setForm((f) => ({ ...f, brand: trimmed }));
    setShowBrandModal(false);
  }

  async function saveProduct({ duplicate = false } = {}) {
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
      // offer/current price goes to price, regular/original to discountPrice
      price: v.discountPrice ? Number(v.discountPrice) : null,
      discountPrice: v.price ? Number(v.price) : null,
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
          price: form.discountPrice ? Number(form.discountPrice) : null,
          discountPrice: form.price ? Number(form.price) : null,
          stock: form.stock ? Number(form.stock) : null,
          reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : null,
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
      price: form.discountPrice ? Number(form.discountPrice) : null,
      discountPrice: form.price ? Number(form.price) : null,
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
        is_stock: form.isStock || undefined,
        stock_category: form.isStock ? "stock" : undefined,
      },
      stock: form.stock ? Number(form.stock) : null,
      reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : null,
      status: form.status || null,
      variants: variantsPayload,
    };
    const slugForNavigation = form.slug;

    try {
      const res = await fetch(`${API}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save product");
      }

      if (duplicate) {
        setState("idle");
        setSlugTouched(true);
        setForm((prev) => ({
          ...prev,
          slug: makeDuplicateSlug(prev.slug),
        }));
        return;
      }

      setState("success");
      navigate(`/product/${slugForNavigation}`);
    } catch (err) {
      setState("error");
      setErrorMsg(err.message || "Error saving product");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await saveProduct();
  }

  async function handleDuplicateSave() {
    await saveProduct({ duplicate: true });
  }

  function handleCancel() {
    navigate(-1);
  }

  useEffect(() => {
    async function loadBrands() {
      try {
        const limit = 200;
        let offset = 0;
        const all = [];
        while (true) {
          const res = await fetch(`${API}/products?limit=${limit}&offset=${offset}`);
          if (!res.ok) break;
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          all.push(...list);
          if (list.length < limit) break;
          offset += limit;
          if (offset > 5000) break; // safety
        }

        const unique = Array.from(
          new Set(
            all
              .map((p) => p.brand)
              .filter((b) => typeof b === "string" && b.trim().length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        setBrandOptions(unique);
      } catch (err) {
        console.error("Failed to load brands from products", err);
      }
    }

    loadBrands();
  }, []);


  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4 text-amber-700 border rounded-xl border-amber-700 border-b-2 bg-amber-50 p-2">Add product</h1>

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
                const slug = makeSlug(base);
                setForm((f) => ({ ...f, slug }));
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
              title="Προσθήκη νέου brand"
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
            <label className="block text-sm font-medium mb-1">Stock (qty)</label>
            <input
              type="number"
              name="stock"
              step="1"
              value={form.stock}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isStock"
                checked={form.isStock}
                onChange={handleChange}
              />
              Mark as Stock item (show in Stock listing)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reorder level</label>
            <input
              type="number"
              name="reorderLevel"
              step="1"
              value={form.reorderLevel}
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
        {/* Variants / Colors */}
        <div className="border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Χρώματα & Διαθεσιμότητα</h2>
            <button
            type="button"
            onClick={addVariant}
            className="px-3 py-1 rounded-full text-xs bg-amber-700 text-white"
            >
            + Προσθήκη χρώματος
            </button>
        </div>

    {variants.length === 0 && (
        <p className="text-xs text-slate-500">
        Δεν έχουν προστεθεί χρώματα. Μπορείς να χρησιμοποιήσεις μόνο τα γενικά
        στοιχεία SKU/τιμής ή να προσθέσεις χρώματα εδώ.
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
                    ???????????????????????? ?????????
                    </label>
                    <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="text-xs text-red-600 hover:underline"
                    >
                    ???????????????
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

            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Τιμή (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={v.price}
                  onChange={(e) => updateVariant(idx, "price", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Τιμή προσφοράς (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={v.discountPrice}
                  onChange={(e) => updateVariant(idx, "discountPrice", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Stock</label>
                <input
                  type="number"
                  step="1"
                  value={v.stock}
                  onChange={(e) => updateVariant(idx, "stock", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Διαθεσιμότητα</label>
                <select
                  value={v.status}
                  onChange={(e) => updateVariant(idx, "status", e.target.value)}
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
            <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">
                Image URLs (μία ανά γραμμή)
                </label>
                <textarea
                name="imagesText"
                value={form.imagesText}
                onChange={handleChange}
                rows={3}
                placeholder="https://...\nhttps://... ή /product_images/xxx"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-xs text-slate-600 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-sm"
                    />
                    Ανεβάστε εικόνα (αποθηκεύεται σε /product_images)
                  </label>
                  {imageUploadMessage && (
                    <span
                      className={`text-xs ${
                        imageUploadState === "success"
                          ? "text-green-700"
                          : imageUploadState === "error"
                          ? "text-red-600"
                          : "text-slate-600"
                      }`}
                    >
                      {imageUploadMessage}
                    </span>
                  )}
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Εικόνες από τον υπολογιστή
              </label>

              {/* hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* nice explicit button */}
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
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

        <div className="flex flex-wrap gap-3">
          
          <button
            type="submit"
            disabled={state === "saving"}
            className="px-4 py-2 rounded-xl bg-amber-700 text-white text-sm disabled:opacity-60"
          >
            {state === "saving" ? "Saving…" : "Save product"}
          </button>
          <button
            type="button"
            onClick={handleDuplicateSave}
            disabled={state === "saving"}
            className="px-4 py-2 rounded-xl bg-amber-100 border border-amber-700 text-amber-700 text-sm disabled:opacity-60"
          >
            {state === "saving" ? "Saving…" : "Save & Duplicate"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={state === "saving"}
            className="px-4 py-2 rounded-xl border border-amber-700 text-amber-700 text-sm disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* ⭐ NEW: Add Brand Modal */}
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

        {/* Variants */}
        {/* ... keep your variants block as is ... */}

        {/* Images */}
        {/* ... keep your images block as is ... */}

        
