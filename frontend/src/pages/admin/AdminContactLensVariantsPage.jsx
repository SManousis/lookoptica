import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

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

const AVAILABILITY_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "preorder", label: "Preorder" },
  { value: "unavailable", label: "Unavailable" },
];

export default function AdminContactLensVariantsPage() {
  const { sku } = useParams();
  const { csrfToken } = useAdminAuth();
  const navigate = useNavigate();

  const [state, setState] = useState("loading"); // loading | ok | error | saving
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [meta, setMeta] = useState(null); // title, lens_type, etc.
  const [variants, setVariants] = useState([]);

  const loadVariants = useCallback(() => {
    if (!sku) return;
    setState("loading");
    setErrorMsg("");
    setSuccessMsg("");

    adminApiFetch(
      `${API}/admin/contact-lenses/${encodeURIComponent(sku)}/variants`,
      {},
      csrfToken
    )
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load variants");
        }
        return res.json();
      })
      .then((data) => {
        setMeta({
          sku: data.sku,
          title: data.title,
          brand: data.brand,
          lens_type: data.lens_type,
          family: data.family,
          duration: data.duration,
          bc: data.bc,
          diameter: data.diameter,
        });
        // ensure quantity/availability exist
        const normalized = (data.variants || []).map((v) => ({
          ...v,
          availability: v.availability || "preorder",
          quantity: typeof v.quantity === "number" ? v.quantity : 0,
          ean: typeof v.ean === "string" ? v.ean : "",
        }));
        setVariants(normalized);
        setState("ok");
      })
      .catch((err) => {
        console.error("Failed to load variants", err);
        setErrorMsg(err.message || "Failed to load variants");
        setState("error");
      });
  }, [sku, csrfToken]);

  // Load variants on mount/sku change
  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === index
          ? {
              ...v,
              [field]:
                field === "quantity"
                  ? value === ""
                    ? ""
                    : Math.max(0, Number(value))
                  : value,
            }
          : v
      )
    );
  };

  const handleSave = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setState("saving");

    const payload = {
      variants: variants.map((v) => ({
        sphere: v.sphere ?? null,
        cylinder: v.cylinder ?? null,
        axis: v.axis ?? null,
        addition: v.addition ?? null,
        addition_label: v.addition_label ?? null,
        ean: v.ean ? v.ean : null,
        availability: v.availability,
        quantity:
          v.quantity === "" || v.quantity === null || v.quantity === undefined
            ? 0
            : Number(v.quantity),
      })),
    };

    try {
      const res = await adminApiFetch(
        `${API}/admin/contact-lenses/${encodeURIComponent(sku)}/variants`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        csrfToken
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save variants");
      }

      const data = await res.json();
      setSuccessMsg(
        `Saved successfully. Updated ${data.updated_count ?? "?"} variants. Overall availability: ${data.availability ?? "?"}.`
      );
      loadVariants();
      setState("ok");
    } catch (err) {
      console.error("Failed to save variants", err);
      setErrorMsg(err.message || "Failed to save variants");
      setState("error");
    }
  };

  const handleDelete = async (v) => {
    if (
      !window.confirm(
        "Delete this variant? This cannot be undone and will remove it from the list."
      )
    ) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setState("saving");
    try {
      const res = await adminApiFetch(
        `${API}/admin/contact-lenses/${encodeURIComponent(sku)}/variants`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sphere: v.sphere ?? null,
            cylinder: v.cylinder ?? null,
            axis: v.axis ?? null,
            addition: v.addition ?? null,
            addition_label: v.addition_label ?? null,
          }),
        },
        csrfToken
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete variant");
      }

      // optimistic local update
      setVariants((prev) =>
        prev.filter(
          (item) =>
            !(
              (item.sphere ?? null) === (v.sphere ?? null) &&
              (item.cylinder ?? null) === (v.cylinder ?? null) &&
              (item.axis ?? null) === (v.axis ?? null) &&
              (item.addition ?? null) === (v.addition ?? null) &&
              (item.addition_label ?? null) === (v.addition_label ?? null)
            )
        )
      );
      setSuccessMsg("Variant deleted.");
      loadVariants();
      setState("ok");
    } catch (err) {
      console.error("Failed to delete variant", err);
      setErrorMsg(err.message || "Failed to delete variant");
      setState("error");
    }
  };

  const lensTypeLabel = (value) => {
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
  };

  const familyLabel = (value) => {
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
        return value || "Other";
    }
  };

  const durationLabel = (value) => {
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
  };

  const disabled = state === "loading" || state === "saving";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-amber-700">
            Manage Contact Lens Stock
          </h1>
          {meta && (
            <p className="text-xs text-slate-600">
              {meta.title?.el || meta.title?.en || meta.sku} –{" "}
              <span className="font-medium">{meta.sku}</span> –{" "}
              {lensTypeLabel(meta.lens_type)} •{" "}
              {familyLabel(meta.family)} • {durationLabel(meta.duration)}
              {meta.bc && <> • BC {meta.bc}</>}
              {meta.diameter && <> • Dia {meta.diameter}</>}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/contact-lenses")}
          className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          ← Back to contact lenses
        </button>
      </div>

      {state === "loading" && (
        <div className="text-sm text-slate-500">Loading variants…</div>
      )}

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

      {state === "ok" && variants.length === 0 && (
        <div className="text-sm text-slate-600">
          No variants defined for this lens.
        </div>
      )}

      {variants.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-left text-[11px] text-slate-600">
                <tr>
                  <th className="px-2 py-2">Sphere</th>
                  <th className="px-2 py-2">Cylinder</th>
                  <th className="px-2 py-2">Axis</th>
                  <th className="px-2 py-2">Addition</th>
                  <th className="px-2 py-2">EAN</th>
                  <th className="px-2 py-2">Availability</th>
                  <th className="px-2 py-2">Quantity</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, idx) => {
                  const key = `${v.sphere ?? "ns"}_${v.cylinder ?? "nc"}_${
                    v.axis ?? "na"
                  }_${v.addition_label ?? v.addition ?? "nadd"}`;
                  return (
                    <tr key={key} className="border-t">
                      <td className="px-2 py-1 text-slate-800">
                        {formatDiopter(v.sphere)}
                      </td>
                      <td className="px-2 py-1 text-slate-800">
                        {v.cylinder !== null && v.cylinder !== undefined
                          ? formatDiopter(v.cylinder)
                          : "—"}
                      </td>
                      <td className="px-2 py-1 text-slate-800">
                        {v.axis !== null && v.axis !== undefined ? v.axis : "—"}
                      </td>
                      <td className="px-2 py-1 text-slate-800">
                        {formatAddition(v.addition, v.addition_label)}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={v.ean || ""}
                          disabled={disabled}
                          onChange={(e) =>
                            handleVariantChange(idx, "ean", e.target.value)
                          }
                          className="w-36 rounded border px-2 py-1 text-[11px]"
                          placeholder="EAN"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={v.availability}
                          disabled={disabled}
                          onChange={(e) =>
                            handleVariantChange(
                              idx,
                              "availability",
                              e.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1 text-[11px]"
                        >
                          {AVAILABILITY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={v.quantity}
                          disabled={disabled}
                          onChange={(e) =>
                            handleVariantChange(idx, "quantity", e.target.value)
                          }
                          className="w-20 rounded border px-2 py-1 text-[11px]"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleDelete(v)}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {state === "saving" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
