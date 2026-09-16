import { useEffect, useState } from "react";

import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("el-GR");
  } catch {
    return iso;
  }
}

const EMPTY_FORM = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  min_order_amount: "",
  max_uses: "",
  expires_at: "",
};

export default function AdminPromoCodesPage() {
  const { csrfToken } = useAdminAuth();
  const [state, setState] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await adminApiFetch(`${API}/admin/promo-codes`, {}, csrfToken);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCodes(Array.isArray(data) ? data : []);
      setState("ok");
    } catch (err) {
      setErrorMsg(err.message || "Failed to load promo codes");
      setState("error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csrfToken]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const body = {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      };
      const res = await adminApiFetch(
        `${API}/admin/promo-codes`,
        { method: "POST", body: JSON.stringify(body) },
        csrfToken
      );
      if (!res.ok) throw new Error(await res.text());
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setCreateError(err.message || "Failed to create promo code");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(row) {
    setBusyId(row.id);
    try {
      const res = await adminApiFetch(
        `${API}/admin/promo-codes/${row.id}`,
        { method: "PATCH", body: JSON.stringify({ is_active: !row.is_active }) },
        csrfToken
      );
      if (!res.ok) throw new Error(await res.text());
      setCodes((prev) =>
        prev.map((c) => (c.id === row.id ? { ...c, is_active: !row.is_active } : c))
      );
    } catch (err) {
      setErrorMsg(err.message || "Failed to update promo code");
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Διαγραφή αυτού του κωδικού;")) return;
    setBusyId(id);
    try {
      const res = await adminApiFetch(
        `${API}/admin/promo-codes/${id}`,
        { method: "DELETE" },
        csrfToken
      );
      if (!res.ok) throw new Error(await res.text());
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete promo code");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-amber-800">Κωδικοί Προσφορών</h1>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border bg-white p-4 grid gap-3 sm:grid-cols-2"
      >
        <div className="sm:col-span-2 text-sm font-semibold text-slate-700">
          Νέος κωδικός
        </div>
        <label className="text-xs text-slate-600 space-y-1">
          <span>Κωδικός</span>
          <input
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm uppercase"
            placeholder="π.χ. SUMMER10"
          />
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>Τύπος έκπτωσης</span>
          <select
            value={form.discount_type}
            onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="percent">Ποσοστό (%)</option>
            <option value="fixed">Σταθερό ποσό (€)</option>
          </select>
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>Αξία έκπτωσης</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.discount_value}
            onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>Ελάχιστη παραγγελία € (προαιρετικό)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.min_order_amount}
            onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>Μέγιστες χρήσεις (προαιρετικό)</span>
          <input
            type="number"
            min="1"
            value={form.max_uses}
            onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>Λήξη (προαιρετικό)</span>
          <input
            type="date"
            value={form.expires_at}
            onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>

        {createError && (
          <div className="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
            {createError}
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Δημιουργία..." : "Δημιουργία κωδικού"}
          </button>
        </div>
      </form>

      {state === "loading" && <div className="text-sm text-slate-500">Φόρτωση...</div>}
      {errorMsg && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {errorMsg}
        </div>
      )}

      {state === "ok" && codes.length === 0 && (
        <div className="text-sm text-slate-600">Δεν υπάρχουν κωδικοί προσφορών ακόμα.</div>
      )}

      {state === "ok" && codes.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Κωδικός</th>
                <th className="px-3 py-2">Έκπτωση</th>
                <th className="px-3 py-2">Ελάχιστο</th>
                <th className="px-3 py-2">Χρήσεις</th>
                <th className="px-3 py-2">Λήξη</th>
                <th className="px-3 py-2">Κατάσταση</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 font-mono font-semibold text-slate-800">{c.code}</td>
                  <td className="px-3 py-2">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `€${c.discount_value}`}
                  </td>
                  <td className="px-3 py-2">
                    {c.min_order_amount != null ? `€${c.min_order_amount}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {c.times_used}
                    {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-3 py-2">{formatDate(c.expires_at)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        c.is_active
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                          : "border-slate-300 text-slate-600 bg-slate-50"
                      }`}
                    >
                      {c.is_active ? "Ενεργός" : "Ανενεργός"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c)}
                      disabled={busyId === c.id}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                    >
                      {c.is_active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={busyId === c.id}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-60"
                    >
                      Διαγραφή
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
