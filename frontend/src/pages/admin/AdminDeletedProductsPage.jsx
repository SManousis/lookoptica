import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

function formatDeletedAt(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminDeletedProductsPage() {
  const navigate = useNavigate();
  const { csrfToken } = useAdminAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busySku, setBusySku] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDeleted() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await adminApiFetch(`${API}/admin/products/deleted?limit=500&offset=0`, {}, csrfToken);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load deleted products");
        }
        const data = await res.json();
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || "Failed to load deleted products");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDeleted();
    return () => {
      cancelled = true;
    };
  }, [csrfToken]);

  async function handleRestore(item) {
    if (!window.confirm(`Restore product ${item.sku}?`)) {
      return;
    }
    setBusySku(item.sku);
    setErrorMsg("");
    try {
      const res = await adminApiFetch(
        `${API}/admin/products/${encodeURIComponent(item.sku)}/restore`,
        { method: "POST" },
        csrfToken
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to restore product");
      }
      setItems((prev) => prev.filter((p) => p.sku !== item.sku));
    } catch (err) {
      setErrorMsg(err.message || "Failed to restore product");
    } finally {
      setBusySku(null);
    }
  }

  async function handlePermanentDelete(item) {
    if (!window.confirm(`Permanent delete ${item.sku}? This cannot be undone.`)) {
      return;
    }
    setBusySku(item.sku);
    setErrorMsg("");
    try {
      const res = await adminApiFetch(
        `${API}/admin/products/${encodeURIComponent(item.sku)}?delete_images=true`,
        { method: "DELETE" },
        csrfToken
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to permanently delete product");
      }
      setItems((prev) => prev.filter((p) => p.sku !== item.sku));
    } catch (err) {
      setErrorMsg(err.message || "Failed to permanently delete product");
    } finally {
      setBusySku(null);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Deleted Products</h1>
          <p className="text-xs text-slate-500">
            Restore archived products or permanently delete them with related uploaded images.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/products")}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700"
          >
            Back to Products
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-sm"
          >
            Refresh
          </button>
        </div>
      </header>

      {loading && <div className="text-sm text-slate-500">Loading deleted products...</div>}
      {!loading && errorMsg && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{errorMsg}</div>
      )}
      {!loading && !errorMsg && items.length === 0 && (
        <div className="text-sm text-slate-600">No deleted products found.</div>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 w-20">Image</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Title</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">SKU</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Deleted At</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const title = item?.title?.el || item?.title?.en || item.slug || item.sku;
                const image = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : "";
                const isBusy = busySku === item.sku;
                return (
                  <tr key={item.sku} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      {image ? (
                        <img src={image} alt={title} className="w-14 h-14 rounded-md object-cover border" />
                      ) : (
                        <div className="w-14 h-14 rounded-md border bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-800">{title}</td>
                    <td className="px-3 py-2 text-xs">{item.sku}</td>
                    <td className="px-3 py-2 text-xs">{item.status || "archived"}</td>
                    <td className="px-3 py-2 text-xs">{formatDeletedAt(item.deleted_at)}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isBusy}
                          className="px-2 py-1 rounded-md border border-emerald-200 text-emerald-700 disabled:opacity-60"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item)}
                          disabled={isBusy}
                          className="px-2 py-1 rounded-md border border-red-200 text-red-700 disabled:opacity-60"
                        >
                          Permanent Delete
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
