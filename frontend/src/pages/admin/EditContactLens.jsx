import { useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

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

  { value: "DN_RANGE", label: "1.00-2.75 (D/N pairs)" },

];



const initialForm = {

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

  diameter: "",

  price: "",

  sph_min: "",

  sph_max: "",

  cyl_min: "",

  cyl_max: "",

  addition_scheme: "",

};



function makeSlug(str) {

  return str

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-+|-+$/g, "");

}



export default function EditContactLens() {

  const { sku } = useParams();

  const navigate = useNavigate();

  const { csrfToken } = useAdminAuth();



  const [form, setForm] = useState(initialForm);

  const [state, setState] = useState("loading"); // loading | ready | saving | error

  const [errorMsg, setErrorMsg] = useState("");

  const [successMsg, setSuccessMsg] = useState("");

  const [brandOptions, setBrandOptions] = useState([]);

  const [showBrandModal, setShowBrandModal] = useState(false);

  const [newBrandName, setNewBrandName] = useState("");

  const [regenerateVariants, setRegenerateVariants] = useState(false);



  useEffect(() => {

    async function loadBrands() {

      try {

        const res = await adminApiFetch(

          `${API}/admin/contact-lenses`,

          {},

          csrfToken

        );

        if (!res.ok) {

          return;

        }

        const data = await res.json();

        const list = Array.isArray(data) ? data : []; 

        const unique = Array.from(

          new Set(

            list

              .map((lens) => lens.brand || lens.attributes.brand_label)

              .filter((b) => typeof b === "string" && b.trim().length > 0)

          )

        ).sort((a, b) => a.localeCompare(b));

        setBrandOptions(unique);

      } catch (err) {

        console.error("Failed to load brands", err);

      }

    }



    loadBrands();

  }, [csrfToken]);



  useEffect(() => {

    if (!sku) return;



    async function loadContactLens() {

      setState("loading");

      setErrorMsg("");

      setSuccessMsg("");

      try {

        const res = await adminApiFetch(
          `${API}/admin/contact-lenses/${encodeURIComponent(sku)}`,
          {},
          csrfToken
        );

        if (!res.ok) {

          const txt = await res.text();

          throw new Error(txt || "Failed to load contact lens");

        }

        const data = await res.json();

        const attrs = data.attributes || {};



        const numericToString = (value) =>

          value === null || value === undefined ? "" : value.toString();



        setForm({

          title: data.title?.el || data.title?.en || "",

          slug: data.slug || "",

          sku: data.sku || "",

          brand: data.brand || attrs.brand_label || "",

          description: data.description || "",

          image: data.image || "",

          family: attrs.lens_family || data.family || "soft",

          duration: attrs.duration || data.duration || "monthly",

          lens_type: attrs.lens_type || data.lens_type || "spherical",

          bc: numericToString(attrs.bc),

          diameter: numericToString(attrs.diameter),

          price:

            data.price === null || data.price === undefined ? "" : data.price.toString(),

          sph_min: numericToString(attrs.sph_min),

          sph_max: numericToString(attrs.sph_max),

          cyl_min: numericToString(attrs.cyl_min),

          cyl_max: numericToString(attrs.cyl_max),

          addition_scheme: attrs.addition_scheme || "",

        });

        setState("ready");

      } catch (err) {

        console.error("Failed to load contact lens", err);

        setErrorMsg(err.message || "Failed to load contact lens");

        setState("error");

      }

    }



    loadContactLens();

  }, [sku, csrfToken]);



  const isAstigmatic = form.lens_type === "astigmatic";

  const isMultifocal = form.lens_type === "multifocal";



  function handleChange(e) {

    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

  }



  function handleLensTypeChange(e) {

    const { value } = e.target;

    setForm((prev) => ({

      ...prev,

      lens_type: value,

      cyl_min: value === "astigmatic" ? prev.cyl_min : "",

      cyl_max: value === "astigmatic" ? prev.cyl_max : "",

      addition_scheme: value === "multifocal" ? prev.addition_scheme : "",

    }));

  }



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

    setForm((prev) => ({ ...prev, brand: trimmed }));

    setShowBrandModal(false);

  }



  async function handleSubmit(e) {

    e.preventDefault();

    if (!sku) return;



    setErrorMsg("");

    setSuccessMsg("");



    if (!form.title || !form.slug || !form.price || !form.sph_min || !form.sph_max) {

      setErrorMsg("Title, slug, price and sphere range are required.");

      return;

    }

    if (isAstigmatic && (!form.cyl_min || !form.cyl_max)) {

      setErrorMsg("Cylinder min and max are required for astigmatic lenses.");

      return;

    }

    if (isMultifocal && !form.addition_scheme) {

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

      price: form.price ? parseFloat(form.price) : null,

      sph_min: form.sph_min ? parseFloat(form.sph_min) : null,

      sph_max: form.sph_max ? parseFloat(form.sph_max) : null,

      cyl_min:

        isAstigmatic && form.cyl_min ? parseFloat(form.cyl_min) : null,

      cyl_max:

        isAstigmatic && form.cyl_max ? parseFloat(form.cyl_max) : null,

      addition_scheme:

        isMultifocal && form.addition_scheme ? form.addition_scheme : null,

      regenerate_variants: regenerateVariants,

    };



    if (

      payload.price === null ||

      Number.isNaN(payload.price) ||

      payload.sph_min === null ||

      payload.sph_max === null ||

      Number.isNaN(payload.sph_min) ||

      Number.isNaN(payload.sph_max)

    ) {

      setErrorMsg("Provide valid numeric values for price and sphere range.");

      return;

    }



    setState("saving");

    try {

      const res = await adminApiFetch(

        `${API}/admin/contact-lenses/${encodeURIComponent(sku)}`,

        {

          method: "PUT",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify(payload),

        },

        csrfToken

      );

      if (!res.ok) {

        const txt = await res.text();

        throw new Error(txt || "Failed to update contact lens");

      }

      await res.json();

      setSuccessMsg("Contact lens updated successfully.");

      setTimeout(() => {

        navigate("/admin/contact-lenses");

      }, 1000);

    } catch (err) {

      console.error("Failed to update contact lens", err);

      setErrorMsg(err.message || "Failed to update contact lens");

      setState("ready");

      return;

    }

  }



  if (state === "loading") {

    return (

      <div className="space-y-4">

        <div className="text-sm text-slate-600">Loading contact lens...</div>

      </div>

    );

  }



  if (state === "error") {

    return (

      <div className="space-y-4">

        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">

          {errorMsg || "Failed to load contact lens"}

        </div>

        <Link

          to="/admin/contact-lenses"

          className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"

        >

          Back to contact lenses

        </Link>

      </div>

    );

  }



  return (

    <div className="space-y-4">

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

        <div>

          <h1 className="text-xl font-semibold text-amber-700">

            Edit Contact Lens

          </h1>

          <p className="text-xs text-slate-600">

            SKU: <span className="font-medium">{form.sku}</span>

          </p>

        </div>

        <Link

          to="/admin/contact-lenses"

          className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"

        >

          Back to contact lenses

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



      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-4 md:p-6">

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

              required

            />

          </div>

          <div>

            <label className="block text-xs font-medium text-slate-700">

              Slug

            </label>

            <div className="flex gap-2">

              <input

                name="slug"

                value={form.slug}

                onChange={handleChange}

                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"

                required

              />

              <button

                type="button"

                onClick={() => {

                  if (!form.title) return;

                  setForm((prev) => ({ ...prev, slug: makeSlug(form.title) }));

                }}

                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700"

              >

                Auto

              </button>

            </div>

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

              readOnly

              className="mt-1 w-full rounded-lg border bg-slate-100 px-3 py-2 text-sm"

            />

            <p className="mt-1 text-[11px] text-slate-500">

              SKU cannot be changed.

            </p>

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

          <div>

            <label className="block text-xs font-medium text-slate-700">

              Price (EUR)

            </label>

            <input

              type="number"

              step="0.01"

              name="price"

              value={form.price}

              onChange={handleChange}

              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"

              required

            />

          </div>

        </div>



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

          <div />

        </div>



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

              required

            />

          </div>

        </div>



        {isAstigmatic && (

          <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 space-y-3">

            <p className="text-xs font-semibold text-amber-800">

              Astigmatic ranges

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

                  required

                />

              </div>

            </div>

          </div>

        )}



        {isMultifocal && (

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">

            <p className="text-xs font-semibold text-sky-900">

              Multifocal additions

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



        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">

          <label className="flex items-start gap-2 text-sm text-amber-900">

            <input

              type="checkbox"

              checked={regenerateVariants}

              onChange={(e) => setRegenerateVariants(e.target.checked)}

            />

            <span>

              Regenerate variants from the ranges above (overwrites stock,

              availability, and EAN data for all variants).

            </span>

          </label>

          {!regenerateVariants && (

            <p className="text-[11px] text-amber-900">

              To change the lens type you must regenerate variants. Existing

              stock data will be preserved if regeneration is disabled.

            </p>

          )}

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

            disabled={state === "saving"}

            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"

          >

            {state === "saving" ? "Saving..." : "Save changes"}

          </button>

        </div>

      </form>



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
