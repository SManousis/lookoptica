import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageSEO } from "../hooks/usePageSEO";

const API = import.meta.env.VITE_API_BASE || "";

export default function WithdrawalRequestPage() {
  usePageSEO({
    title: "Δήλωση Υπαναχώρησης | Look Οπτικά",
    description:
      "Δηλώστε ηλεκτρονικά την υπαναχώρησή σας από μια παραγγελία εντός 14 ημερών.",
    noindex: true,
  });

  const [step, setStep] = useState("lookup"); // lookup | confirm | done
  const [lookupForm, setLookupForm] = useState({ order_id: "", email: "" });
  const [order, setOrder] = useState(null);
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [declared, setDeclared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  async function handleLookup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: Number(lookupForm.order_id),
          email: lookupForm.email.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Δεν βρέθηκε παραγγελία με αυτά τα στοιχεία.");
      }
      const data = await res.json();
      setOrder(data);
      setStep("confirm");
    } catch (err) {
      setError(err.message || "Κάτι πήγε στραβά. Δοκιμάστε ξανά.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitWithdrawal(e) {
    e.preventDefault();
    if (!declared) {
      setError("Παρακαλώ επιβεβαιώστε τη δήλωση υπαναχώρησης.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders/withdrawal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          email: lookupForm.email.trim(),
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Η υποβολή απέτυχε. Δοκιμάστε ξανά.");
      }
      const data = await res.json();
      setConfirmation(data);
      setStep("done");
    } catch (err) {
      setError(err.message || "Κάτι πήγε στραβά. Δοκιμάστε ξανά.");
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString("el-GR");
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">Αρχική</Link> <span>›</span>{" "}
        <span className="text-slate-700">Δήλωση Υπαναχώρησης</span>
      </nav>

      <h1 className="text-2xl font-semibold text-amber-700 mb-2">
        Δήλωση Υπαναχώρησης
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Έχετε δικαίωμα να υπαναχωρήσετε από την αγορά σας εντός 14 ημερολογιακών
        ημερών από την παραλαβή, χωρίς να χρειάζεται να αιτιολογήσετε την
        απόφασή σας. Συμπληρώστε τα στοιχεία της παραγγελίας σας παρακάτω.
      </p>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {step === "lookup" && (
        <form onSubmit={handleLookup} className="space-y-4 rounded-xl border bg-white p-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Αριθμός Παραγγελίας
            </label>
            <input
              type="number"
              required
              value={lookupForm.order_id}
              onChange={(e) =>
                setLookupForm((prev) => ({ ...prev, order_id: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="π.χ. 128"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Email παραγγελίας
            </label>
            <input
              type="email"
              required
              value={lookupForm.email}
              onChange={(e) =>
                setLookupForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Αναζήτηση..." : "Αναζήτηση παραγγελίας"}
          </button>
        </form>
      )}

      {step === "confirm" && order && (
        <form onSubmit={handleSubmitWithdrawal} className="space-y-4 rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-700 space-y-1 bg-slate-50 rounded-lg p-3">
            <div><strong>Παραγγελία:</strong> #{order.order_id}</div>
            <div><strong>Ημερομηνία:</strong> {formatDate(order.created_at)}</div>
            <div><strong>Προϊόντα:</strong> {order.product_codes.join(", ")}</div>
            <div><strong>Τρόπος πληρωμής:</strong> {order.payment_method}</div>
            <div>
              <strong>Προθεσμία υπαναχώρησης έως:</strong>{" "}
              {formatDate(order.withdrawal_deadline)}
            </div>
          </div>

          {!order.eligible && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Η προθεσμία των 14 ημερών για αυτή την παραγγελία έχει παρέλθει.
              Επικοινωνήστε μαζί μας στο info@lookoptica.gr αν χρειάζεστε βοήθεια.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Ονοματεπώνυμο</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Τηλέφωνο</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Σχόλιο (προαιρετικό)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              className="mt-1"
            />
            Δηλώνω ότι επιθυμώ να υπαναχωρήσω από την αγορά μου (παραγγελία #{order.order_id}).
          </label>

          <button
            type="submit"
            disabled={loading || !order.eligible}
            className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Υποβολή..." : "Υποβολή δήλωσης υπαναχώρησης"}
          </button>
        </form>
      )}

      {step === "done" && confirmation && (
        <div className="space-y-3 rounded-xl border bg-emerald-50 border-emerald-200 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Η δήλωση υπαναχώρησής σας καταχωρήθηκε.</p>
          <p>Αριθμός αναφοράς: <strong>{confirmation.reference}</strong></p>
          <p>Ημερομηνία &amp; ώρα λήψης: {formatDate(confirmation.submitted_at)}</p>
          <p>
            Θα επικοινωνήσουμε μαζί σας σύντομα στο email που δηλώσατε για τα
            επόμενα βήματα επιστροφής του προϊόντος.
          </p>
        </div>
      )}
    </div>
  );
}
