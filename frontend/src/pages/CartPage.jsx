import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { usePageSEO } from "../hooks/usePageSEO";

// Mirrors the thresholds in backend/app/routers/final_checkout.py
// (FREE_BOXNOW_THRESHOLD / FREE_SHIPPING_THRESHOLD) - informational nudge
// only, the real charge is always computed server-side at checkout.
const FREE_BOXNOW_THRESHOLD = 40;
const FREE_SHIPPING_THRESHOLD = 80;

function ShippingProgress({ subtotal }) {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
        🎉 Έχετε δωρεάν μεταφορικά (courier ή Box Now) και δωρεάν αντικαταβολή!
      </div>
    );
  }

  if (subtotal >= FREE_BOXNOW_THRESHOLD) {
    const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
    const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 space-y-2">
        <div>✅ Έχετε δωρεάν μεταφορικά με Box Now!</div>
        <div className="text-xs text-emerald-700">
          Πρόσθεσε ακόμα <strong>€{remaining.toFixed(2)}</strong> για δωρεάν
          μεταφορικά με courier και δωρεάν αντικαταβολή.
        </div>
        <div className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  const remaining = FREE_BOXNOW_THRESHOLD - subtotal;
  const pct = Math.min(100, (subtotal / FREE_BOXNOW_THRESHOLD) * 100);
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-2">
      <div>
        Πρόσθεσε ακόμα <strong>€{remaining.toFixed(2)}</strong> για δωρεάν
        μεταφορικά με Box Now!
      </div>
      <div className="h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CartPage() {
  usePageSEO({ title: "Καλάθι Αγορών | Look Οπτικά", noindex: true });

  const { items, totals, removeItem, updateQuantity, clearCart } = useCart();

  const subtotal = totals?.subtotal ?? 0;
  const itemCount = totals?.itemCount ?? 0;
  const isEmpty = !items || items.length === 0;

  const handleDecrease = (key, quantity) => {
    if (quantity <= 1) return;
    updateQuantity(key, quantity - 1);
  };

  const handleIncrease = (key, quantity) => {
    updateQuantity(key, quantity + 1);
  };

  const handleQuantityInput = (key, value) => {
    updateQuantity(key, Number(value));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link to="/" className="hover:underline">
          Αρχική
        </Link>{" "}
        <span className="px-1 text-slate-400">›</span>
        <span className="text-slate-700">Καλάθι</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-amber-800">Καλάθι Αγορών</h1>
          <p className="text-sm text-slate-600">
            {itemCount} {itemCount === 1 ? "προϊόν" : "προϊόντα"} στο καλάθι σας
          </p>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={clearCart}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Άδειασμα καλαθιού
          </button>
        )}
      </div>

      {isEmpty ? (
        <section className="rounded-xl border border-dashed border-amber-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-medium text-slate-700">
            Το καλάθι σας είναι άδειο.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Περιηγηθείτε στις κατηγορίες μας και προσθέστε προϊόντα που σας αρέσουν.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/shop"
              className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Όλα τα προϊόντα
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-amber-200 px-5 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              Πίσω στην αρχική
            </Link>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <article
                key={item._key}
                className="flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="h-32 w-full overflow-hidden rounded-lg bg-slate-100 sm:h-28 sm:w-28">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title || item.slug || "Φωτογραφία προϊόντος"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      Χωρίς εικόνα
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">
                    {item.title || item.slug || "Προϊόν"}
                  </h2>
                  {item.variantLabel && (
                    <p className="text-sm text-slate-500">{item.variantLabel}</p>
                  )}
                  {item.sku && (
                    <p className="text-xs text-slate-400">SKU: {item.sku}</p>
                  )}
                  <div className="text-sm font-semibold text-amber-800">
                    €{item.price.toFixed(2)}
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:w-44">
                  <div className="flex items-center justify-between rounded-lg border bg-slate-50">
                    <button
                      type="button"
                      onClick={() => handleDecrease(item._key, item.quantity)}
                      className="px-3 py-2 text-lg text-slate-600 hover:text-slate-900 disabled:text-slate-300"
                      disabled={item.quantity <= 1}
                    >
                      –
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityInput(item._key, e.target.value)
                      }
                      className="w-16 border-x bg-white px-2 py-2 text-center text-sm font-semibold text-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleIncrease(item._key, item.quantity)}
                      className="px-3 py-2 text-lg text-slate-600 hover:text-slate-900"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item._key)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Αφαίρεση
                  </button>
                </div>

                <div className="text-right text-base font-semibold text-slate-800 sm:w-28">
                  €{(item.price * item.quantity).toFixed(2)}
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Σύνοψη παραγγελίας</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Υποσύνολο</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Προϊόντα</span>
                <span>{itemCount}</span>
              </div>
            </div>

            <div className="mt-3">
              <ShippingProgress subtotal={subtotal} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Το τελικό κόστος μεταφορικών και τυχόν αντικαταβολής υπολογίζεται στο checkout.
            </p>

            <Link
              to="/checkout"
              className="mt-6 block rounded-lg bg-amber-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-amber-800"
            >
              Συνέχεια στο checkout
            </Link>

            <Link
              to="/shop"
              className="mt-3 block rounded-lg border border-amber-200 px-4 py-3 text-center text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              Συνέχεια αγορών
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
