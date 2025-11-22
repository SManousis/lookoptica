import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { items, totals, updateQuantity, removeItem, clearCart } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold text-amber-700">Your cart</h1>
        <p className="text-sm text-slate-600">
          Your cart is empty. Browse our products and add something you like!
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-amber-700">Your cart</h1>
          <p className="text-sm text-slate-600">
            Review your items before checkout. Quantity updates are saved
            automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
        >
          Clear cart
        </button>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="divide-y">
          {items.map((item) => (
            <div key={item._key} className="flex flex-col gap-3 p-4 md:flex-row">
              <div className="flex items-center gap-3 md:flex-1">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">
                    No image
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {item.title}
                  </p>
                  {item.variantLabel && (
                    <p className="text-xs text-slate-500">{item.variantLabel}</p>
                  )}
                  {item.slug && (
                    <Link
                      to={`/product/${item.slug}`}
                      className="text-xs text-amber-700 underline"
                    >
                      View product
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 text-sm text-slate-700 md:flex-row md:items-center md:justify-end">
                <div>
                  <label className="block text-xs text-slate-500">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item._key, e.target.value)}
                    className="w-20 rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Unit price</p>
                  <p className="font-medium">
                    €{Number(item.price || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-medium">
                    €{(Number(item.price || 0) * item.quantity).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item._key)}
                  className="text-xs text-red-600 underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            Subtotal ({totals.itemCount} items)
          </p>
          <p className="text-2xl font-semibold text-slate-900">
            €{totals.subtotal.toFixed(2)}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to="/shop"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 text-center"
          >
            Continue shopping
          </Link>
          <button
            type="button"
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => alert("Checkout integration coming soon!")}
          >
            Proceed to checkout
          </button>
        </div>
      </div>
    </div>
  );
}
