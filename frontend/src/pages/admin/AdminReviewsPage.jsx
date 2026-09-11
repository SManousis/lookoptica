import { useEffect, useState } from "react";

import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("el-GR");
  } catch {
    return iso;
  }
}

const STATUS_LABEL = {
  pending: "Σε αναμονή",
  approved: "Εγκεκριμένη",
  rejected: "Απορρίφθηκε",
};

export default function AdminReviewsPage() {
  const { csrfToken } = useAdminAuth();
  const [state, setState] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reviews, setReviews] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState("pending"); // pending | approved | rejected | all

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      setErrorMsg("");
      try {
        const res = await adminApiFetch(`${API}/admin/reviews`, {}, csrfToken);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load reviews");
        }
        const data = await res.json();
        if (cancelled) return;
        setReviews(Array.isArray(data) ? data : []);
        setState("ok");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err.message || "Failed to load reviews");
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [csrfToken]);

  const visibleReviews =
    filter === "all" ? reviews : reviews.filter((r) => r.status === filter);

  async function handleApprove(id) {
    setBusyId(id);
    try {
      const res = await adminApiFetch(
        `${API}/admin/reviews/${id}/approve`,
        { method: "POST" },
        csrfToken
      );
      if (!res.ok) throw new Error(await res.text());
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
      );
    } catch (err) {
      setErrorMsg(err.message || "Failed to approve review");
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Διαγραφή αυτής της αξιολόγησης;")) return;
    setBusyId(id);
    try {
      const res = await adminApiFetch(
        `${API}/admin/reviews/${id}`,
        { method: "DELETE" },
        csrfToken
      );
      if (!res.ok) throw new Error(await res.text());
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete review");
    } finally {
      setBusyId("");
    }
  }

  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold text-amber-800">
          Αξιολογήσεις Προϊόντων
        </h1>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1">
            {pendingCount} σε αναμονή
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md border ${
              filter === f
                ? "border-amber-600 bg-amber-50 text-amber-800"
                : "border-slate-300 text-slate-700"
            }`}
          >
            {f === "all" ? "Όλες" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {state === "loading" && <div className="text-sm text-slate-500">Φόρτωση...</div>}
      {errorMsg && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {errorMsg}
        </div>
      )}

      {state === "ok" && visibleReviews.length === 0 && (
        <div className="text-sm text-slate-600">Δεν υπάρχουν αξιολογήσεις σε αυτή την κατηγορία.</div>
      )}

      {state === "ok" && visibleReviews.length > 0 && (
        <div className="space-y-3">
          {visibleReviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <a
                    href={`/product/${r.product_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-amber-700 hover:underline"
                  >
                    {r.product_slug}
                  </a>
                  <div className="text-xs text-slate-500">
                    {r.customer_name} &middot; {formatDate(r.created_at)}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    r.status === "approved"
                      ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                      : r.status === "rejected"
                      ? "border-red-300 text-red-700 bg-red-50"
                      : "border-amber-300 text-amber-700 bg-amber-50"
                  }`}
                >
                  {STATUS_LABEL[r.status] || r.status}
                </span>
              </div>

              <div className="text-amber-500 text-sm">
                {"★".repeat(r.rating)}
                <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span>
              </div>

              {r.comment && <p className="text-sm text-slate-700">{r.comment}</p>}

              <div className="flex gap-2 pt-1">
                {r.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => handleApprove(r.id)}
                    disabled={busyId === r.id}
                    className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold disabled:opacity-60"
                  >
                    Έγκριση
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={busyId === r.id}
                  className="px-3 py-1.5 rounded-md border border-red-200 text-red-700 text-xs font-semibold disabled:opacity-60"
                >
                  Διαγραφή
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
