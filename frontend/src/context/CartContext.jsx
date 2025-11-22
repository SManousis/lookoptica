import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "lookoptica_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load cart from storage", err);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to save cart to storage", err);
    }
  }, [items]);

  const addItem = (item, qty = 1) => {
    setItems((prev) => {
      // key = product + variant (if any)
      const key = `${item.sku || item.id || item.slug}__${item.variantKey || ""}`;
      const existing = prev.find((it) => it._key === key);

      if (existing) {
        return prev.map((it) =>
          it._key === key
            ? { ...it, quantity: it.quantity + qty }
            : it
        );
      }

      return [
        ...prev,
        {
          _key: key,
          sku: item.sku || null,
          productId: item.id || null,
          slug: item.slug || null,
          title: item.title,
          price: item.price,
          image: item.image || null,
          variantLabel: item.variantLabel || "",
          quantity: qty,
        },
      ];
    });
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((it) => it._key !== key));
  };

  const updateQuantity = (key, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    setItems((prev) =>
      prev.map((it) =>
        it._key === key ? { ...it, quantity: q } : it
      )
    );
  };

  const clearCart = () => setItems([]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );
    return {
      subtotal,
      itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
    };
  }, [items]);

  const value = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totals,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
