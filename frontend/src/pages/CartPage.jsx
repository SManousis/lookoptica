// src/pages/CheckoutIdentifyPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCustomerAuth } from "../context/customerAuthShared";

export default function CheckoutIdentifyPage() {
  const { items, totals } = useCart();
  const navigate = useNavigate();
  const { guestEmail: savedGuestEmail, setGuestEmail: setGuestEmailCtx } =
    useCustomerAuth();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [guestEmail, setGuestEmail] = useState(savedGuestEmail || "");
  const [errorMsg, setErrorMsg] = useState("");

  // If cart is empty, send user back to cart
  useEffect(() => {
    if (!items || items.length === 0) {
      navigate("/cart");
    }
  }, [items, navigate]);

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!loginForm.email || !loginForm.password) {
      setErrorMsg("Συμπλήρωσε email και κωδικό.");
      return;
    }

    // TODO: Call customer login endpoint + set auth context
    // For now just go to next checkout step placeholder:
    navigate("/checkout/details");
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const normalizedGuestEmail = guestEmail.trim();
    if (!normalizedGuestEmail) {
      setErrorMsg("Συμπλήρωσε το email σου για να συνεχίσεις ως επισκέπτης.");
      return;
    }

    setGuestEmailCtx(normalizedGuestEmail);
    navigate("/checkout/details", {
      state: { guestEmail: normalizedGuestEmail },
    });
  };

  const totalItems = totals?.itemCount ?? 0;
  const totalPrice = totals?.total ?? 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">
          Home
        </Link>{" "}
        <span>›</span>{" "}
        <Link to="/cart" className="hover:underline">
          Cart
        </Link>{" "}
        <span>›</span> <span className="text-slate-700">Checkout</span>
      </nav>

      <h1 className="text-2xl font-semibold text-amber-800 mb-4">
        Ολοκλήρωση παραγγελίας
      </h1>

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left side: login + guest */}
        <div className="lg:col-span-2 space-y-6">
          {/* Login box */}
          <section className="rounded-xl border bg-white p-4 md:p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Έχεις ήδη λογαριασμό;
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              Συνδέσου για να χρησιμοποιήσεις τα αποθηκευμένα στοιχεία αποστολής σου
              και να δεις το ιστορικό παραγγελιών.
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Κωδικός
                </label>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="submit"
                  className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                >
                  Σύνδεση και συνέχεια
                </button>

                {/* Registration link under/next to login */}
                <div className="text-xs text-slate-600 text-right">
                  Δεν έχεις λογαριασμό;{" "}
                  <Link
                    to="/account/register"
                    className="text-amber-700 font-medium hover:underline"
                  >
                    Δημιούργησε λογαριασμό
                  </Link>
                </div>
              </div>
            </form>
          </section>

          {/* Guest checkout box */}
          <section className="rounded-xl border bg-white p-4 md:p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Συνέχεια ως επισκέπτης
            </h2>
            <p className="text-xs text-slate-600 mb-3">
              Μπορείς να ολοκληρώσεις την παραγγελία σου χωρίς εγγραφή. Θα
              χρησιμοποιήσουμε το email σου μόνο για ενημερώσεις σχετικά με την
              παραγγελία.
            </p>

            <form onSubmit={handleGuestSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Email για την παραγγελία
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Συνέχεια ως επισκέπτης
              </button>
            </form>
          </section>
        </div>

        {/* Right side: order summary */}
        <aside className="rounded-xl border bg-white p-4 md:p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Σύνοψη παραγγελίας
          </h2>

          <div className="max-h-64 overflow-y-auto border rounded-lg bg-slate-50 p-2 text-xs space-y-2">
            {items.map((item) => (
              <div
                key={item.variantKey || item.id || item.sku}
                className="flex justify-between gap-2"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {item.title || item.slug || "Προϊόν"}
                  </div>
                  {item.variantLabel && (
                    <div className="text-[11px] text-slate-500">
                      {item.variantLabel}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500">
                    Ποσότητα: {item.quantity}
                  </div>
                </div>
                <div className="text-right font-semibold text-slate-800">
                  €{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm pt-1">
            <span>Σύνολο προϊόντων</span>
            <span>
              {totalItems} {totalItems === 1 ? "τεμ." : "τεμάχια"}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-amber-800">
            <span>Σύνολο (με ΦΠΑ)</span>
            <span>€{totalPrice.toFixed(2)}</span>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            Τα μεταφορικά και τυχόν επιπλέον χρεώσεις (αντικαταβολή κτλ.) θα
            υπολογιστούν στο επόμενο βήμα.
          </p>
        </aside>
      </div>
    </div>
  );
}
