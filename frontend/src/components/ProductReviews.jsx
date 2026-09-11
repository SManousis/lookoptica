import { useState } from "react";
import { useTurnstile } from "../hooks/useTurnstile";

const API = import.meta.env.VITE_API_BASE || "";

function StarDisplay({ rating, size = "text-base" }) {
  return (
    <span className={`text-amber-500 ${size}`} aria-label={`${rating} από 5 αστέρια`}>
      {"★".repeat(Math.round(rating))}
      <span className="text-slate-300">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-2xl leading-none"
          aria-label={`${n} αστέρια`}
        >
          <span className={n <= value ? "text-amber-500" : "text-slate-300"}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ slug, reviewsData }) {
  const { reviews, average_rating: averageRating, count, state } = reviewsData;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitState, setSubmitState] = useState("idle"); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const {
    isEnabled: hasTurnstile,
    turnstileToken,
    resetTurnstile,
    containerRef: turnstileRef,
  } = useTurnstile();

  async function handleSubmit(e) {
    e.preventDefault();
    if (hasTurnstile && !turnstileToken) {
      setErrorMsg("Παρακαλώ ολοκληρώστε την επαλήθευση πριν στείλετε την αξιολόγηση.");
      return;
    }
    setSubmitState("sending");
    setErrorMsg("");
    try {
      const res = await fetch(`${API}/products/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          rating,
          comment: comment.trim() || undefined,
          turnstile_token: turnstileToken || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Η αποστολή απέτυχε. Δοκιμάστε ξανά.");
      }
      setSubmitState("success");
      setName("");
      setRating(5);
      setComment("");
      if (hasTurnstile) resetTurnstile();
    } catch (err) {
      setSubmitState("error");
      setErrorMsg(err.message || "Η αποστολή απέτυχε. Δοκιμάστε ξανά.");
    }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString("el-GR");
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-sm mb-1">Αξιολογήσεις</h3>
          {count > 0 ? (
            <div className="flex items-center gap-2">
              <StarDisplay rating={averageRating} />
              <span className="text-sm text-slate-600">
                {averageRating.toFixed(1)}/5 ({count}{" "}
                {count === 1 ? "αξιολόγηση" : "αξιολογήσεις"})
              </span>
            </div>
          ) : (
            state === "ok" && (
              <p className="text-sm text-slate-500">
                Δεν υπάρχουν ακόμα αξιολογήσεις για αυτό το προϊόν.
              </p>
            )
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          {showForm ? "Ακύρωση" : "Γράψτε μια αξιολόγηση"}
        </button>
      </div>

      {showForm && submitState !== "success" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Βαθμολογία</label>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Όνομα</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Σχόλιο (προαιρετικό)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
              {errorMsg}
            </div>
          )}

          {hasTurnstile && (
            <div className="flex justify-center">
              <div ref={turnstileRef} className="my-1" />
            </div>
          )}

          <button
            type="submit"
            disabled={submitState === "sending"}
            className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-60"
          >
            {submitState === "sending" ? "Αποστολή..." : "Υποβολή αξιολόγησης"}
          </button>
          <p className="text-[11px] text-slate-500">
            Οι αξιολογήσεις εμφανίζονται μετά από έγκριση.
          </p>
        </form>
      )}

      {submitState === "success" && (
        <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          Ευχαριστούμε! Η αξιολόγησή σας στάλθηκε και θα εμφανιστεί μετά από
          έγκριση.
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarDisplay rating={r.rating} size="text-sm" />
                  <span className="text-sm font-medium text-slate-700">
                    {r.customer_name}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
              </div>
              {r.comment && (
                <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
