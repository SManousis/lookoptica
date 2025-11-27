import { useLocation, useNavigate, Link } from "react-router-dom";

const IBAN = import.meta.env.VITE_BANK_IBAN || "GR00 0000 0000 0000 0000 0000 000";
const BANK_NAME = import.meta.env.VITE_BANK_NAME || "Eurobank";
const BENEFICIARY = import.meta.env.VITE_BANK_BENEFICIARY || "ΜΑΝΟΥΣΗΣ ΣΤΑΜΑΤΙΟΣ";
const BIC = import.meta.env.VITE_BANK_BIC || "BANKGRXX";
const IRIS_HINT = import.meta.env.VITE_IRIS_HINT || "Χρησιμοποιήστε την εφαρμογή της τράπεζάς σας για πληρωμή μέσω IRIS.";

function CopyField({ label, value }) {
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .catch(() => {});
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-slate-50 px-3 py-2">
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="font-mono text-sm text-slate-800 break-all">{value}</span>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
      >
        Αντιγραφή
      </button>
    </div>
  );
}

export default function BankTransferIrisPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Expecting state from checkout: { orderId, total, currency, paymentReference }
  const state = location.state || {};
  const orderId = state.orderId || "—";
  const total = typeof state.total === "number" ? state.total.toFixed(2) : "—";
  const currency = state.currency || "EUR";
  const paymentReference = state.paymentReference || `ORDER-${orderId}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-2">
        <Link to="/" className="hover:underline">
          Αρχική
        </Link>{" "}
        <span>›</span>{" "}
        <Link to="/cart" className="hover:underline">
          Καλάθι
        </Link>{" "}
        <span>›</span>{" "}
        <span className="text-slate-700">Ολοκλήρωση παραγγελίας</span>
      </nav>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-amber-800">
          Πληρωμή με Τραπεζική Κατάθεση / IRIS
        </h1>
        <p className="text-sm text-slate-600">
          Δημιουργήσαμε την παραγγελία σας. Για να ολοκληρωθεί, παρακαλούμε
          πραγματοποιήστε την πληρωμή μέσω τραπεζικής κατάθεσης ή IRIS,
          χρησιμοποιώντας τα παρακάτω στοιχεία.
        </p>
      </header>

      {/* Order summary */}
      <section className="rounded-xl border bg-white p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">
          Σύνοψη παραγγελίας
        </h2>
        <div className="text-sm text-slate-700">
          <div>
            <span className="font-medium">Αριθμός παραγγελίας:</span>{" "}
            <span>{orderId}</span>
          </div>
          <div>
            <span className="font-medium">Ποσό πληρωμής:</span>{" "}
            <span>
              {total} {currency}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            * Παρακαλούμε συμπληρώστε τον αριθμό παραγγελίας ή τον κωδικό
            πληρωμής ως αιτιολογία.
          </div>
        </div>
      </section>

      {/* IRIS section */}
      <section className="rounded-xl border border-sky-100 bg-sky-50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-sky-900">
              Πληρωμή μέσω IRIS
            </h2>
            <p className="text-xs text-sky-900">
              Ανοίξτε την εφαρμογή της τράπεζάς σας και επιλέξτε πληρωμή μέσω IRIS.
              Σκανάρετε το QR ή χρησιμοποιήστε τα στοιχεία κατάθεσης.
            </p>
          </div>
          {/* Placeholder for QR – replace with πραγματικό QR αργότερα */}
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-sky-200 bg-white text-[10px] text-slate-500">
            QR IRIS
          </div>
        </div>
        <p className="text-[11px] text-sky-900">{IRIS_HINT}</p>
        <CopyField label="Αιτιολογία πληρωμής" value={paymentReference} />
      </section>

      {/* Classic bank transfer section */}
      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Στοιχεία Τραπεζικής Κατάθεσης
        </h2>
        <div className="space-y-2">
          <CopyField label="Δικαιούχος" value={BENEFICIARY} />
          <CopyField label="Τράπεζα" value={BANK_NAME} />
          <CopyField label="IBAN" value={IBAN} />
          <CopyField label="BIC / SWIFT" value={BIC} />
          <CopyField
            label="Αιτιολογία (Πολύ Σημαντικό)"
            value={paymentReference}
          />
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Μόλις πραγματοποιηθεί η κατάθεση, η παραγγελία σας θα επιβεβαιωθεί
          μέσα σε 1–2 εργάσιμες ημέρες. Μπορείτε να μας στείλετε και το αποδεικτικό
          στο{" "}
          <a
            href="mailto:info@lookoptica.gr"
            className="underline text-amber-700"
          >
            info@lookoptica.gr
          </a>{" "}
          για πιο γρήγορη διεκπεραίωση.
        </p>
      </section>

      {/* Actions */}
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Εντάξει, θα ολοκληρώσω την πληρωμή
        </button>
        <p className="text-[11px] text-slate-500">
          Αν κάτι δεν λειτουργεί σωστά ή χρειάζεστε βοήθεια, καλέστε μας στο{" "}
          <span className="font-medium">210 6898658</span>.
        </p>
      </section>
    </div>
  );
}