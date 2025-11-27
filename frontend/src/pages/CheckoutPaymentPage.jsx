import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const API = import.meta.env.VITE_API_BASE || "";

const SHIPPING_OPTIONS = [
  { value: "pickup_store", label: "Παραλαβή από κατάστημα" },
  { value: "courier_home", label: "Courier (ΕΛΤΑ / άλλος)" },
  { value: "boxnow", label: "Box Now locker" },
];

const PAYMENT_OPTIONS = [
  { value: "card", label: "Κάρτα (Viva Wallet)" },
  { value: "bank_transfer", label: "Τραπεζική κατάθεση" },
  { value: "paypal", label: "PayPal" },
  { value: "cod", label: "Αντικαταβολή" },
  { value: "iris", label: "IRIS" },
  { value: "pay_in_store", label: "Πληρωμή στο κατάστημα" },
];

export default function CheckoutPaymentPage() {
  const { items } = useCart();
  const navigate = useNavigate();

  const [shippingMethod, setShippingMethod] = useState("courier_home");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [selectedLockerId, setSelectedLockerId] = useState(""); // future BoxNow integration

  const [quote, setQuote] = useState(null);
  const [quoteState, setQuoteState] = useState("idle"); // idle | loading | ok | error
  const [quoteError, setQuoteError] = useState("");

  // If cart is empty, go back to cart
  useEffect(() => {
    if (!items || items.length === 0) {
      navigate("/cart");
    }
  }, [items, navigate]);

  const subtotal = useMemo(() => {
    if (!items) return 0;
    return items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [items]);

  // Build payload for backend quote API
  const buildPayload = () => ({
    items: (items || []).map((it) => ({
      sku: it.sku || it.id || "",
      quantity: Number(it.quantity || 1),
      unit_price: Number(it.price || 0),
    })),
    shipping_method: shippingMethod, // pickup_store | courier_home | boxnow
    payment_method: paymentMethod, // card | bank_transfer | paypal | cod | iris | pay_in_store
    boxnow_locker_id:
      shippingMethod === "boxnow" && selectedLockerId.trim().length > 0
        ? selectedLockerId.trim()
        : null,
  });

  // Call backend whenever shipping / payment / items change
  useEffect(() => {
    if (!items || items.length === 0) return;

    const payload = buildPayload();
    setQuoteState("loading");
    setQuoteError("");

    fetch(`${API}/api/checkout/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to calculate totals");
        }
        return res.json();
      })
      .then((data) => {
        setQuote(data);
        setQuoteState("ok");
      })
      .catch((err) => {
        console.error("Failed to get checkout quote", err);
        setQuoteError(err.message || "Failed to calculate totals");
        setQuoteState("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingMethod, paymentMethod, selectedLockerId, subtotal]);

  const handlePlaceOrder = () => {
    if (!quote) {
      setQuoteError("Υπολογίστε πρώτα το συνολικό ποσό πριν προχωρήσετε.");
      setQuoteState("error");
      return;
    }

    if (paymentMethod === "bank_transfer" || paymentMethod === "iris") {
      navigate("/checkout/bank-transfer", {
        state: {
          total: quote.total,
          currency: quote.currency || "EUR",
          paymentMethod,
          paymentReference: `QUOTE-${Date.now()}`,
        },
      });
      return;
    }

    // Later:
    // - Validate quote
    // - Redirect to Viva / PayPal / bank details / confirmation page
    alert("Next step: create order + integrate Viva/PayPal. Για την ώρα είναι demo.");
  };

    const formattedSubtotal = subtotal.toFixed(2);
    const formattedShipping =
    quote && typeof quote.shipping_cost === "number"
        ? quote.shipping_cost.toFixed(2)
        : "—";
    const formattedCod =
    quote && typeof quote.cod_fee === "number"
        ? quote.cod_fee.toFixed(2)
        : "—";
    const formattedTotal =
    quote && typeof quote.total === "number"
        ? quote.total.toFixed(2)
        : "—";


  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">
          Home
        </Link>{" "}
        <span>›</span>{" "}
        <Link to="/cart" className="hover:underline">
          Cart
        </Link>{" "}
        <span>›</span>{" "}
        <span className="text-slate-700">Πληρωμή & αποστολή</span>
      </nav>

      <h1 className="text-2xl font-semibold mb-4 text-amber-700">
        Τρόπος αποστολής & πληρωμής
      </h1>

      {/* Business rules info */}
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
        <p>
          • <strong>Δωρεάν μεταφορικά & αντικαταβολή</strong> για αγορές{" "}
          <strong>άνω των 80€</strong> με όλους τους τρόπους αποστολής.
        </p>
        <p>
          • Για <strong>Box Now</strong>: δωρεάν μεταφορικά & αντικαταβολή για
          αγορές <strong>άνω των 40€</strong>.
        </p>
        <p>
          • <strong>Πάντα δωρεάν</strong> για{" "}
          <strong>παραλαβή από το κατάστημα</strong>.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        {/* Left column: options */}
        <div className="space-y-6">
          {/* Shipping method */}
          <section className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Τρόπος αποστολής
            </h2>
            <div className="space-y-2 text-sm text-slate-700">
              {SHIPPING_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="shipping_method"
                    value={opt.value}
                    checked={shippingMethod === opt.value}
                    onChange={(e) => setShippingMethod(e.target.value)}
                    className="mt-1"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {shippingMethod === "boxnow" && (
              <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">
                  Box Now locker (placeholder – API αργότερα)
                </p>
                <p>
                  Στο επόμενο βήμα θα ενσωματώσουμε επιλογή locker μέσω Box Now
                  API. Προς το παρόν, μπορείς να δώσεις ένα προσωρινό ID.
                </p>
                <input
                  type="text"
                  value={selectedLockerId}
                  onChange={(e) => setSelectedLockerId(e.target.value)}
                  placeholder="Προσωρινό Box Now locker ID"
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
            )}
          </section>

          {/* Payment method */}
          <section className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Τρόπος πληρωμής
            </h2>
            <div className="space-y-2 text-sm text-slate-700">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {paymentMethod === "card" && (
              <p className="mt-2 text-xs text-slate-500">
                Η πληρωμή με κάρτα ολοκληρώνεται στο ασφαλές περιβάλλον της{" "}
                <strong>Viva Wallet</strong>.
              </p>
            )}
            {paymentMethod === "bank_transfer" && (
              <p className="mt-2 text-xs text-slate-500">
                Μετά την ολοκλήρωση θα λάβετε οδηγίες για κατάθεση στον
                τραπεζικό μας λογαριασμό.
              </p>
            )}
            {paymentMethod === "cod" && (
              <p className="mt-2 text-xs text-slate-500">
                Πληρώνετε με αντικαταβολή στον courier κατά την παράδοση.
                Η υπηρεσία έχει μια μικρή προμήθεια.
              </p>
            )}
            {paymentMethod === "iris" && (
              <p className="mt-2 text-xs text-slate-500">
                Πληρώνετε μέσω <strong>IRIS</strong> με άμεση μεταφορά από το
                e-banking σας.
              </p>
            )}
            {paymentMethod === "pay_in_store" && (
              <p className="mt-2 text-xs text-slate-500">
                Διατηρούμε την παραγγελία σας και πληρώνετε στο κατάστημα
                κατά την παραλαβή.
              </p>
            )}
          </section>
        </div>

        {/* Right column: summary */}
        <aside className="rounded-xl border bg-white p-4 space-y-3 text-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Σύνοψη παραγγελίας
          </h2>

          <div className="flex justify-between">
            <span>Υποσύνολο προϊόντων</span>
            <span>€{formattedSubtotal}</span>
          </div>

          <div className="flex justify-between">
            <span>Μεταφορικά</span>
            <span>
                {quoteState === "loading"
                ? "Υπολογισμός..."
                : quote
                ? `€${formattedShipping}`
                : "—"}
            </span>
            </div>

            <div className="flex justify-between">
            <span>Έξοδα αντικαταβολής</span>
            <span>
                {paymentMethod !== "cod"
                ? "—"
                : quoteState === "loading"
                ? "Υπολογισμός..."
                : quote
                ? `€${formattedCod}`
                : "—"}
            </span>
          </div>

          <hr className="my-2" />

          <div className="flex justify-between font-semibold text-slate-900">
            <span>Τελικό σύνολο</span>
            <span>
              {quoteState === "loading" ? "…" : quote ? `€${formattedTotal}` : "—"}
            </span>
          </div>

          {quoteState === "error" && (
            <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
              {quoteError}
            </p>
          )}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={quoteState === "loading" || !quote}
            className="mt-3 w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Συνέχεια στην ολοκλήρωση
          </button>

          <p className="mt-2 text-[11px] text-slate-500">
            Στο επόμενο βήμα θα επιβεβαιώσετε τα στοιχεία και θα μεταφερθείτε
            στο ασφαλές περιβάλλον πληρωμής (Viva / PayPal) ή θα δείτε οδηγίες
            για τραπεζική κατάθεση.
          </p>
        </aside>
      </div>
    </div>
  );
}
