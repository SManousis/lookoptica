import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

const FAMILY_OPTIONS = [
  { value: "soft", label: "Soft" },
  { value: "rgp", label: "RGP" },
  { value: "keratoconic", label: "Keratoconic" },
  { value: "scleral", label: "Scleral" },
  { value: "other", label: "Other" },
];

const DURATION_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "15days", label: "15 Days" },
  { value: "3months", label: "3 Months" },
  { value: "yearly", label: "Yearly" },
];

const LENS_TYPE_OPTIONS = [
  { value: "spherical", label: "Spherical" },
  { value: "astigmatic", label: "Astigmatic (Toric)" },
  { value: "multifocal", label: "Multifocal" },
];

const ADDITION_SCHEME_OPTIONS = [
  { value: "HL", label: "High / Low (HL)" },
  { value: "HML", label: "High / Medium / Low (HML)" },
  { value: "DN_RANGE", label: "1.00–2.75 (D/N pairs)" },
];

export default function AdminAddContactLensPage() {
  const { csrfToken } = useAdminAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [brandOptions, setBrandOptions] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  // form state (all strings, we’ll convert to numbers on submit)
  const [form, setForm] = useState({
    title: "",
    slug: "",
    sku: "",
    brand: "",
    description: "",
    image: "",

    family: "soft",
    duration: "monthly",
    lens_type: "spherical",

    bc: "",
    diameter: "14.2",
    price: "",

    sph_min: "",
    sph_max: "",

    cyl_min: "",
    cyl_max: "",

    addition_scheme: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // small helper: auto-generate slug from title if slug is empty
      if (name === "title" && !prev.slug) {
        next.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]+/g, "")
          .replace(/\s+/g, "-");
      }

      return next;
    });
  };

  const handleLensTypeChange = (e) => {
    const { value } = e.target;
    setForm((prev) => ({
      ...prev,
      lens_type: value,
      // clear fields that no longer apply
      cyl_min: value === "astigmatic" ? prev.cyl_min : "",
      cyl_max: value === "astigmatic" ? prev.cyl_max : "",
      addition_scheme: value === "multifocal" ? prev.addition_scheme : "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // basic client-side checks
    if (!form.title || !form.slug || !form.sku) {
      setErrorMsg("Title, slug and SKU are required.");
      return;
    }
    if (!form.price) {
      setErrorMsg("Price is required.");
      return;
    }
    if (!form.sph_min || !form.sph_max) {
      setErrorMsg("Sphere min and max are required.");
      return;
    }
    if (form.lens_type === "astigmatic" && (!form.cyl_min || !form.cyl_max)) {
      setErrorMsg("Cylinder min and max are required for astigmatic lenses.");
      return;
    }
    if (form.lens_type === "multifocal" && !form.addition_scheme) {
      setErrorMsg("Addition scheme is required for multifocal lenses.");
      return;
    }

    const payload = {
      title: form.title,
      slug: form.slug,
      sku: form.sku,
      brand: form.brand || null,
      description: form.description || null,
      image: form.image || null,

      family: form.family,
      duration: form.duration,
      lens_type: form.lens_type,

      bc: form.bc ? parseFloat(form.bc) : null,
      diameter: form.diameter ? parseFloat(form.diameter) : null,
      price: parseFloat(form.price),

      sph_min: parseFloat(form.sph_min),
      sph_max: parseFloat(form.sph_max),

      cyl_min:
        form.lens_type === "astigmatic" && form.cyl_min
          ? parseFloat(form.cyl_min)
          : null,
      cyl_max:
        form.lens_type === "astigmatic" && form.cyl_max
          ? parseFloat(form.cyl_max)
          : null,

      addition_scheme:
        form.lens_type === "multifocal" && form.addition_scheme
          ? form.addition_scheme
          : null,
    };

    setSaving(true);
    try {
      const res = await adminApiFetch(
        `${API}/admin/contact-lenses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        csrfToken
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save contact lens");
      }

      const data = await res.json();
      setSuccessMsg(
        data.created
          ? `Contact lens created (variants: ${data.product.variants_count ?? "?"}).`
          : `Contact lens updated (variants: ${data.product.variants_count ?? "?"}).`
      );

      // Option: redirect back to list after short delay
      setTimeout(() => {
        navigate("/admin/contact-lenses");
      }, 1000);
    } catch (err) {
      console.error("Failed to save contact lens", err);
      setErrorMsg(err.message || "Failed to save contact lens");
    } finally {
      setSaving(false);
    }
  };

  //const isSpherical = form.lens_type === "spherical";
  const isAstigmatic = form.lens_type === "astigmatic";
  const isMultifocal = form.lens_type === "multifocal";

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await adminApiFetch(
          `${API}/admin/contact-lenses`,
          {},
          csrfToken
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load contact lens brands");
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const unique = Array.from(
          new Set(
            list
              .map((lens) => lens.brand || lens.attributes?.brand_label)
              .filter((b) => typeof b === "string" && b.trim().length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));
        setBrandOptions(unique);
      } catch (err) {
        console.error("Failed to load contact lens brands", err);
      }
    }

    loadBrands();
  }, [csrfToken]);

  const handleOpenBrandModal = () => {
    setNewBrandName("");
    setShowBrandModal(true);
  };

  const handleSaveBrand = () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;

    setBrandOptions((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed].sort((a, b) => a.localeCompare(b));
    });

    setForm((f) => ({ ...f, brand: trimmed }));
    setShowBrandModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-amber-700">
            Add Contact Lens
          </h1>
          <p className="text-xs text-slate-600">
            Define the base product and ranges. Variants will be generated
            automatically on the backend.
          </p>
        </div>
        <Link
          to="/admin/contact-lenses"
          className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          ← Back to contact lenses
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-4 md:p-6"
      >
        {/* Basic identity */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Title
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. Air Optix Aqua"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Slug
            </label>
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="air-optix-aqua"
              required
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              SKU
            </label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. AOA-6PK"
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700">
                Brand
              </label>
              <select
                name="brand"
                value={form.brand}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
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
              className="h-10 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-700"
            >
              +
            </button>
          </div>
        </div>

        {/* Classification / geometry */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Family
            </label>
            <select
              name="family"
              value={form.family}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              {FAMILY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Duration
            </label>
            <select
              name="duration"
              value={form.duration}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Lens type
            </label>
            <select
              name="lens_type"
              value={form.lens_type}
              onChange={handleLensTypeChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            >
              {LENS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BC / Diameter / Price */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              BC (Base curve)
            </label>
            <input
              type="number"
              step="0.01"
              name="bc"
              value={form.bc}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. 8.6"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Diameter (mm)
            </label>
            <input
              type="number"
              step="0.01"
              name="diameter"
              value={form.diameter}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. 14.2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Price (€)
            </label>
            <input
              type="number"
              step="0.01"
              name="price"
              value={form.price}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="e.g. 25.00"
              required
            />
          </div>
        </div>

        {/* Sphere range (all types) */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Sphere min (D)
            </label>
            <input
              type="number"
              step="0.25"
              name="sph_min"
              value={form.sph_min}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="-10.00"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Sphere max (D)
            </label>
            <input
              type="number"
              step="0.25"
              name="sph_max"
              value={form.sph_max}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="+6.00"
              required
            />
          </div>
        </div>

        {/* Astigmatic: cyl range */}
        {isAstigmatic && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-amber-800">
              Astigmatic ranges
            </p>
            <p className="text-[11px] text-amber-900">
              Cylinder will be generated in 0.50 steps, usually negative (e.g.
              -0.75, -1.25…). Axis from 0° to 180° in 10° steps.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Cylinder min (D)
                </label>
                <input
                  type="number"
                  step="0.50"
                  name="cyl_min"
                  value={form.cyl_min}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="-0.75"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Cylinder max (D)
                </label>
                <input
                  type="number"
                  step="0.50"
                  name="cyl_max"
                  value={form.cyl_max}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="-2.25"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Multifocal: addition scheme */}
        {isMultifocal && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-sky-900">
              Multifocal additions
            </p>
            <p className="text-[11px] text-sky-900">
              HL = High/Low, HML = High/Medium/Low. DN range = additions from
              1.00 to 2.75 in 0.25 steps, each with D and N option.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Addition scheme
              </label>
              <select
                name="addition_scheme"
                value={form.addition_scheme}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                required
              >
                <option value="">Select scheme...</option>
                {ADDITION_SCHEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Description / image */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Image URL
            </label>
            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://..."
            />
            {form.image && (
              <div className="mt-3">
                <p className="text-[11px] text-slate-500 mb-1">Preview</p>
                <img
                  src={form.image}
                  alt={form.title || "Preview"}
                  className="h-24 w-24 rounded-lg border object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/contact-lenses")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save and generate variants"}
          </button>
        </div>
      </form>

      {/* Add Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg space-y-3">
            <h2 className="text-sm font-semibold">Add new brand</h2>
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="e.g. Alcon"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBrand}
                className="px-3 py-1.5 text-xs rounded-lg bg-amber-700 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
