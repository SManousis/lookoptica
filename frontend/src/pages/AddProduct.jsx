import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "";

const initialForm = {
  titleEl: "",
  titleEn: "",
  slug: "",
  brand: "",
  category: "",
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
    .normalize("NFD")                      // remove accents
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")          // non-alphanumeric -> -
    .replace(/^-+|-+$/g, "");             // trim - from start/end
}


export default function AddProduct() {
  const [form, setForm] = useState(initialForm);
  const [variants, setVariants] = useState([]);
  const [state, setState] = useState("idle"); // idle | saving | error | success
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const [localImages, setLocalImages] = useState([]);
  const [slugTouched, setSlugTouched] = useState(false);

  function handleChange(e) {
  const { name, value } = e.target;
  setForm((f) => {
    const next = { ...f, [name]: value };

    // If user edits slug manually, remember that
    if (name === "slug") {
      setSlugTouched(true);
      return next;
    }

    // Auto-generate slug from title if slug not touched yet
    if (!slugTouched && (name === "titleEl" || name === "titleEn")) {
      const base =
        name === "titleEl"
          ? value || f.titleEn
          : value || f.titleEl;

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

    // If no variants defined but main color is set, create a single default variant
    if (variantsPayload.length === 0 && form.color) {
      variantsPayload = [
        {
          color: form.color,
          sku: form.sku || null,
          ean: form.ean || null,
          price: form.price ? Number(form.price) : null,
          discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
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
      price: form.price ? Number(form.price) : null,
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      sku: form.sku || null,
      ean: form.ean || null,
      title: {
        el: form.titleEl || form.titleEn,
        en: form.titleEn || form.titleEl,
      },
      description: form.description || null,
      images: images,
      attributes: {
        eyeSize: form.eyeSize || undefined,
        bridgeSize: form.bridgeSize || undefined,
        templeLength: form.templeLength || undefined,
      },
      stock: form.stock ? Number(form.stock) : null,
      reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : null,
      status: form.status || null,
      variants: variantsPayload,  // 👈 use this
    };


    try {
      const res = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save product");
      }

      setState("success");
      // go straight to PDP of this product
      navigate(`/product/${form.slug}`);
    } catch (err) {
      setState("error");
      setErrorMsg(err.message || "Error saving product");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Add product</h1>

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


        {/* Brand / category */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <input
              type="text"
              name="brand"
              value={form.brand}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="sunglasses, ophthalmic_frames..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
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
        {/* Variants / Colors */}
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
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm"
                />
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
          {state === "saving" ? "Saving…" : "Save product"}
        </button>
      </form>
    </div>
  );
}
