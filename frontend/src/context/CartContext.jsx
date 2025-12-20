import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCustomerAuth } from "./customerAuthShared";

const CartContext = createContext(null);

const STORAGE_KEY = "lookoptica_cart_v1";
const CART_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [lastTouchedAt, setLastTouchedAt] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const expiryTimerRef = useRef(null);
  const { isLoggedIn, isHydrated: authHydrated } = useCustomerAuth();

  const touchCart = () => setLastTouchedAt(Date.now());

  const clearExpiryTimer = () => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  };

  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Failed to clear cart storage", err);
    }
  };

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          setLastTouchedAt(Date.now());
        } else if (parsed && Array.isArray(parsed.items)) {
          setItems(parsed.items);
          setLastTouchedAt(
            typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now()
          );
        }
      }
    } catch (err) {
      console.error("Failed to load cart from storage", err);
    } finally {
      setHydrated(true);
    }

    return () => {
      clearExpiryTimer();
    };
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      if (!items.length) {
        clearStorage();
        return;
      }

      const payload = {
        version: 2,
        items,
        updatedAt: lastTouchedAt ?? Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to save cart to storage", err);
    }
  }, [items, lastTouchedAt, hydrated]);

  // Enforce 12h TTL for guests
  useEffect(() => {
    if (!hydrated || !authHydrated) {
      return;
    }

    if (isLoggedIn || !lastTouchedAt) {
      clearExpiryTimer();
      return;
    }

    const now = Date.now();
    const age = now - lastTouchedAt;
    if (age >= CART_TTL_MS) {
      clearExpiryTimer();
      setItems([]);
      setLastTouchedAt(null);
      clearStorage();
      return;
    }

    const remaining = CART_TTL_MS - age;
    clearExpiryTimer();
    expiryTimerRef.current = setTimeout(() => {
      setItems([]);
      setLastTouchedAt(null);
      clearStorage();
    }, remaining);
  }, [hydrated, authHydrated, isLoggedIn, lastTouchedAt]);

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
    touchCart();
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((it) => it._key !== key));
    touchCart();
  };

  const updateQuantity = (key, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    setItems((prev) =>
      prev.map((it) =>
        it._key === key ? { ...it, quantity: q } : it
      )
    );
    touchCart();
  };

  const clearCart = () => {
    setItems([]);
    touchCart();
  };

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
