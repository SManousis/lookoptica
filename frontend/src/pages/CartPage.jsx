import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartPage() {
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
          Home
        </Link>{" "}
        <span className="px-1 text-slate-400">›</span>
        <span className="text-slate-700">Cart</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-amber-800">Shopping Cart</h1>
          <p className="text-sm text-slate-600">
            {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={clearCart}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Clear cart
          </button>
        )}
      </div>

      {isEmpty ? (
        <section className="rounded-xl border border-dashed border-amber-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-medium text-slate-700">
            Your cart is empty.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Browse our categories and add products you love.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/shop"
              className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Shop all products
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-amber-200 px-5 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              Back to home
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
                      alt={item.title || item.slug || "Product photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <h2 className="text-base font-semibold text-slate-800">
                    {item.title || item.slug || "Product"}
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
                    Remove
                  </button>
                </div>

                <div className="text-right text-base font-semibold text-slate-800 sm:w-28">
                  €{(item.price * item.quantity).toFixed(2)}
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Order summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Items</span>
                <span>{itemCount}</span>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Shipping and taxes calculated at checkout.
              </div>
            </div>

            <Link
              to="/checkout"
              className="mt-6 block rounded-lg bg-amber-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-amber-800"
            >
              Proceed to checkout
            </Link>

            <Link
              to="/shop"
              className="mt-3 block rounded-lg border border-amber-200 px-4 py-3 text-center text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
