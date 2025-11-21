import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

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

export default function AdminContactLensesPage() {
  const { csrfToken } = useAdminAuth();
  //const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setState("loading");
    adminApiFetch(
      `${API}/api/admin/contact-lenses?available_only=true`,
      {},
      csrfToken
    )
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load contact lenses");
        }
        return res.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setState("ok");
      })
      .catch((err) => {
        console.error("Failed to load contact lenses", err);
        setErrorMsg(err.message || "Failed to load contact lenses");
        setState("error");
      });
  }, [csrfToken]);

  const handleDelete = (item) => {
    // For later: wire to DELETE endpoint when you add it.
    // For now, just a placeholder:
    // eslint-disable-next-line no-alert
    alert(`TODO: Delete lens with SKU ${item.sku}`);
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
                          onClick={() => handleDelete(item)}
                          className="inline-flex items-center rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700"
                        >
                          Delete
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
    </div>
  );
}
