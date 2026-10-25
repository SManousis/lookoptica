import { Link } from "react-router-dom";
import { usePageSEO } from "../hooks/usePageSEO";

export default function NotFoundPage() {
  usePageSEO({
    title: "Η σελίδα δεν βρέθηκε | Look Οπτικά",
    noindex: true,
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center space-y-6">
      <h1 className="text-3xl font-semibold text-ink-heading">404 — Η σελίδα δεν βρέθηκε</h1>
      <p className="text-sm text-slate-600">
        Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί. Ίσως ο σύνδεσμος
        είναι παλιός ή έχει γραφτεί λάθος.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          Αρχική σελίδα
        </Link>
        <Link
          to="/shop"
          className="rounded-lg border border-amber-200 px-5 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
        >
          Όλα τα προϊόντα
        </Link>
      </div>
    </div>
  );
}
