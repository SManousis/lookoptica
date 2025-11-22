import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";
const AVAILABILITY_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "preorder", label: "Preorder" },
  { value: "unavailable", label: "Unavailable" },
];

// --- Helpers for pretty labels & ranges ---

function formatDiopter(value) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
}

function familyLabel(value) {
  switch (value) {
    case "soft":
      return "Soft";
    case "rgp":
      return "RGP";
    case "keratoconic":
      return "Keratoconic";
    case "scleral":
      return "Scleral";
    case "other":
    default:
      return "Other";
  }
}

function durationLabel(value) {
  switch (value) {
    case "daily":
      return "Daily";
    case "monthly":
      return "Monthly";
    case "15days":
      return "15 Days";
    case "3months":
      return "3 Months";
    case "yearly":
      return "Yearly";
    default:
      return value || "—";
  }
}

function lensTypeLabel(value) {
  switch (value) {
    case "spherical":
      return "Spherical";
    case "astigmatic":
      return "Astigmatic";
    case "multifocal":
      return "Multifocal";
    default:
      return value || "—";
  }
}

function formatSphereRange(item) {
  const attrs = item.attributes || {};
  const min = attrs.sph_min;
  const max = attrs.sph_max;
  const arr = item.sphere || [];

  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${formatDiopter(min)} → ${formatDiopter(max)}`;
  }
  if (arr.length > 0) {
    return `${formatDiopter(arr[0])} → ${formatDiopter(arr[arr.length - 1])}`;
  }
  return "—";
}

function formatCylinderRange(item) {
  const attrs = item.attributes || {};
  const min = attrs.cyl_min;
  const max = attrs.cyl_max;
  const arr = item.cylinder || [];

  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${formatDiopter(min)} → ${formatDiopter(max)}`;
  }
  if (arr.length > 0) {
    return `${formatDiopter(arr[0])} → ${formatDiopter(arr[arr.length - 1])}`;
  }
  return "—";
}

function formatAdditionScheme(item) {
  const attrs = item.attributes || {};
  const scheme = attrs.addition_scheme;

  if (!scheme) return "—";

  switch (scheme) {
    case "HL":
      return "LOW / HIGH";
    case "HML":
      return "LOW / MEDIUM / HIGH";
    case "DN_RANGE":
      return "1.00–2.75 (D/N)";
    default:
      return scheme;
  }
}

function getAdditionOptions(scheme) {
  if (!scheme) return [];
  if (scheme === "HL") {
    return [
      { value: "LOW", label: "LOW", addition: null },
      { value: "HIGH", label: "HIGH", addition: null },
    ];
  }
  if (scheme === "HML") {
    return [
      { value: "LOW", label: "LOW", addition: null },
      { value: "MEDIUM", label: "MEDIUM", addition: null },
      { value: "HIGH", label: "HIGH", addition: null },
    ];
  }
  if (scheme === "DN_RANGE") {
    const opts = [];
    for (let val = 100; val <= 275; val += 25) {
      const display = (val / 100).toFixed(2);
      opts.push({
        value: `${display}D`,
        label: `${display} D (Distance)`,
        addition: val / 100,
      });
      opts.push({
        value: `${display}N`,
        label: `${display} N (Near)`,
        addition: val / 100,
      });
    }
    return opts;
  }
  return [];
}

function createEmptyVariantForm() {
  return {
    sphere: "",
    cylinder: "",
    axis: "",
    additionLabel: "",
    additionValue: "",
    availability: "preorder",
    quantity: "",
    ean: "",
  };
}

export default function AdminContactLensesPage() {
  const { csrfToken } = useAdminAuth();
  //const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deletingSku, setDeletingSku] = useState(null);
  const [addVariantLens, setAddVariantLens] = useState(null);
  const [addVariantForm, setAddVariantForm] = useState(() =>
    createEmptyVariantForm()
  );
  const [addVariantError, setAddVariantError] = useState("");
  const [addVariantSaving, setAddVariantSaving] = useState(false);

  const loadContactLenses = useCallback(
    async ({ silent = false, clearSuccess = false } = {}) => {
      if (!silent) {
        setState("loading");
      }
      setErrorMsg("");
      if (clearSuccess) {
        setSuccessMsg("");
      }
      try {
        const res = await adminApiFetch(
          `${API}/api/admin/contact-lenses`,
          {},
          csrfToken
        );
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load contact lenses");
        }
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
        setState("ok");
      } catch (err) {
        console.error("Failed to load contact lenses", err);
        setErrorMsg(err.message || "Failed to load contact lenses");
        setSuccessMsg("");
        setState("error");
      }
    },
    [csrfToken]
  );

  useEffect(() => {
    loadContactLenses({ clearSuccess: true });
  }, [loadContactLenses]);

  const handleVariantFieldChange = (field, value) => {
    setAddVariantForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenAddVariant = (lens) => {
    setAddVariantLens(lens);
    setAddVariantForm(createEmptyVariantForm());
    setAddVariantError("");
  };

  const handleCloseAddVariant = () => {
    if (addVariantSaving) return;
    setAddVariantLens(null);
    setAddVariantForm(createEmptyVariantForm());
    setAddVariantError("");
  };

  const additionScheme = addVariantLens?.attributes?.addition_scheme;
  const additionOptions = useMemo(
    () => getAdditionOptions(additionScheme),
    [additionScheme]
  );
  const addVariantLensType = addVariantLens
    ? addVariantLens.lens_type || addVariantLens.attributes?.lens_type
    : null;
  const addVariantLensLabel = addVariantLens
    ? addVariantLens?.title?.el ||
      addVariantLens?.title?.en ||
      addVariantLens.slug ||
      addVariantLens.sku
    : "";
  const isAstigmatic = addVariantLensType === "astigmatic";
  const isMultifocal = addVariantLensType === "multifocal";

  const handleAdditionSelect = (value) => {
    const option = additionOptions.find((opt) => opt.value === value);
    setAddVariantForm((prev) => ({
      ...prev,
      additionLabel: value,
      additionValue:
        option && option.addition !== null && option.addition !== undefined
          ? option.addition.toString()
          : "",
    }));
  };

  const handleAddVariantSubmit = async (e) => {
    e.preventDefault();
    if (!addVariantLens) return;

    if (!addVariantLensType) {
      setAddVariantError("Lens type information is missing for this product.");
      return;
    }

    const sphere = parseFloat(addVariantForm.sphere);
    if (Number.isNaN(sphere)) {
      setAddVariantError("Sphere value is required.");
      return;
    }

    const quantityValue =
      addVariantForm.quantity === "" || addVariantForm.quantity === null
        ? 0
        : Number(addVariantForm.quantity);
    if (!Number.isFinite(quantityValue) || quantityValue < 0) {
      setAddVariantError("Quantity must be zero or greater.");
      return;
    }

    const eanClean = (addVariantForm.ean || "").trim();
    const payload = {
      sphere,
      ean: eanClean || null,
      availability: addVariantForm.availability,
      quantity: quantityValue,
    };

    if (isAstigmatic) {
      const cylinder = parseFloat(addVariantForm.cylinder);
      const axis = Number.parseInt(addVariantForm.axis, 10);
      if (Number.isNaN(cylinder)) {
        setAddVariantError("Cylinder value is required for astigmatic variants.");
        return;
      }
      if (Number.isNaN(axis)) {
        setAddVariantError("Axis value is required for astigmatic variants.");
        return;
      }
      payload.cylinder = cylinder;
      payload.axis = axis;
    } else {
      payload.cylinder = null;
      payload.axis = null;
    }

    if (isMultifocal) {
      if (!additionScheme) {
        setAddVariantError("Addition scheme is not defined for this lens.");
        return;
      }
      const additionLabel = (addVariantForm.additionLabel || "").trim();
      if (!additionLabel) {
        setAddVariantError("Addition selection is required for multifocal variants.");
        return;
      }
      payload.addition_label = additionLabel;
      if (additionScheme === "DN_RANGE") {
        const additionValue = parseFloat(addVariantForm.additionValue);
        if (Number.isNaN(additionValue)) {
          setAddVariantError("Addition value is required for DN range variants.");
          return;
        }
        payload.addition = additionValue;
      } else {
        payload.addition = null;
      }
    } else {
      payload.addition = null;
      payload.addition_label = null;
    }

    setAddVariantSaving(true);
    setAddVariantError("");
    try {
      const res = await adminApiFetch(
        `${API}/api/admin/contact-lenses/${encodeURIComponent(
          addVariantLens.sku
        )}/variants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        csrfToken
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to add variant");
      }
      await res.json();
      setSuccessMsg(`Variant added to ${addVariantLens.sku}.`);
      setAddVariantLens(null);
      setAddVariantForm(createEmptyVariantForm());
      await loadContactLenses({ silent: true });
    } catch (err) {
      console.error("Failed to add variant", err);
      setAddVariantError(err.message || "Failed to add variant");
    } finally {
      setAddVariantSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const label =
      item?.title?.el || item?.title?.en || item.slug || item.sku || "this lens";
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(`Delete contact lens "${label}"?`);
    if (!confirmed) return;

    setErrorMsg("");
    setDeletingSku(item.sku);
    try {
      const res = await adminApiFetch(
        `${API}/api/admin/contact-lenses/${encodeURIComponent(item.sku)}`,
        { method: "DELETE" },
        csrfToken
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to delete contact lens");
      }
      setItems((prev) => prev.filter((p) => p.sku !== item.sku));
    } catch (err) {
      console.error("Failed to delete contact lens", err);
      setErrorMsg(err.message || "Failed to delete contact lens");
    } finally {
      setDeletingSku(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-amber-700">
            Available Contact Lenses
          </h1>
          <p className="text-xs text-slate-600">
            Only in-stock lenses are shown. Use this page to verify ranges,
            pricing and manage variants.
          </p>
        </div>
        <Link
          to="/admin/contact-lenses/add"
          className="inline-flex items-center rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white"
        >
          + Add contact lens
        </Link>
      </div>

      {state === "loading" && (
        <div className="text-sm text-slate-500">Loading contact lenses…</div>
      )}

      {state === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {state === "ok" && errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {state === "ok" && items.length === 0 && (
        <div className="text-sm text-slate-600">
          No in-stock contact lenses found.
        </div>
      )}

      {state === "ok" && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2">Family</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Price (€)</th>
                <th className="px-3 py-2">Sphere range</th>
                <th className="px-3 py-2">Cylinder range</th>
                <th className="px-3 py-2">Additions</th>
                <th className="px-3 py-2">BC</th>
                <th className="px-3 py-2">Dia</th>
                <th className="px-3 py-2">Variants</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const family = familyLabel(item.family || item.attributes?.lens_family);
                const duration = durationLabel(
                  item.duration || item.attributes?.duration
                );
                const lensType = lensTypeLabel(
                  item.lens_type || item.attributes?.lens_type
                );
                const bc =
                  item.bc ??
                  item.attributes?.bc ??
                  "—";
                const diameter =
                  item.diameter ??
                  item.attributes?.diameter ??
                  "—";
                const variantsCount =
                  item.variants_count ??
                  item.attributes?.variants?.length ??
                  0;

                return (
                  <tr key={item.sku} className="border-t text-xs">
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {item?.title?.el ||
                        item?.title?.en ||
                        item.slug ||
                        item.sku}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{item.sku}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {item.brand || item.attributes?.brand_label || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{family}</td>
                    <td className="px-3 py-2 text-slate-700">{duration}</td>
                    <td className="px-3 py-2 text-slate-700">{lensType}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {typeof item.price === "number"
                        ? item.price.toFixed(2)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {formatSphereRange(item)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {formatCylinderRange(item)}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {formatAdditionScheme(item)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {bc !== "—" ? bc : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {diameter !== "—" ? diameter : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 text-center">
                      {variantsCount}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="flex flex-wrap gap-1">
                        <Link
                          to={`/admin/contact-lenses/${encodeURIComponent(
                            item.sku
                          )}/edit`}
                          className="inline-flex items-center rounded border border-slate-300 px-2 py-1 text-[11px]"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/admin/contact-lenses/${encodeURIComponent(
                            item.sku
                          )}/variants`}
                          className="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800"
                        >
                          Manage stock
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenAddVariant(item)}
                          className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700"
                        >
                          + Var
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingSku === item.sku}
                          className="inline-flex items-center rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700 disabled:opacity-60"
                        >
                          {deletingSku === item.sku ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addVariantLens && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Add variant
                </h2>
                <p className="text-[11px] text-slate-500">
                  {addVariantLensLabel} �?� {addVariantLens?.sku} �?�{" "}
                  {lensTypeLabel(addVariantLensType)}
                </p>
                {isMultifocal && additionScheme && (
                  <p className="text-[11px] text-slate-500">
                    Scheme: {additionScheme}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseAddVariant}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddVariantSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Sphere (D)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={addVariantForm.sphere}
                  onChange={(e) => handleVariantFieldChange("sphere", e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              {isAstigmatic && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Cylinder (D)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      value={addVariantForm.cylinder}
                      onChange={(e) =>
                        handleVariantFieldChange("cylinder", e.target.value)
                      }
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Axis (0‑180)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      step={1}
                      value={addVariantForm.axis}
                      onChange={(e) =>
                        handleVariantFieldChange("axis", e.target.value)
                      }
                      className="mt-1 w-full rounded border px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              {isMultifocal && (
                <div className="space-y-2 rounded border border-blue-100 bg-blue-50 p-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Addition label
                    </label>
                    {additionOptions.length > 0 ? (
                      <select
                        value={addVariantForm.additionLabel}
                        onChange={(e) => handleAdditionSelect(e.target.value)}
                        className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select addition...</option>
                        {additionOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={addVariantForm.additionLabel}
                        onChange={(e) =>
                          handleVariantFieldChange("additionLabel", e.target.value)
                        }
                        className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        placeholder="e.g. LOW / HIGH"
                        required
                      />
                    )}
                  </div>
                  {additionScheme === "DN_RANGE" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Addition value (D)
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        value={addVariantForm.additionValue}
                        onChange={(e) =>
                          handleVariantFieldChange("additionValue", e.target.value)
                        }
                        className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        placeholder="e.g. 1.50"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  EAN (optional)
                </label>
                <input
                  type="text"
                  value={addVariantForm.ean}
                  onChange={(e) => handleVariantFieldChange("ean", e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Availability
                  </label>
                  <select
                    value={addVariantForm.availability}
                    onChange={(e) =>
                      handleVariantFieldChange("availability", e.target.value)
                    }
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  >
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={addVariantForm.quantity}
                    onChange={(e) =>
                      handleVariantFieldChange("quantity", e.target.value)
                    }
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {addVariantError && (
                <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {addVariantError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAddVariant}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                  disabled={addVariantSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addVariantSaving}
                  className="rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {addVariantSaving ? "Adding�??" : "Add variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
