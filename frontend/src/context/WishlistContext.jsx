import { useCallback, useEffect, useState } from "react";
import { useCustomerAuth } from "./customerAuthShared";
import { WishlistContext } from "./wishlistShared";

const API = import.meta.env.VITE_API_BASE || "";

export function WishlistProvider({ children }) {
  const { isLoggedIn, isHydrated: authHydrated } = useCustomerAuth();
  const [slugs, setSlugs] = useState(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!authHydrated) return;

    if (!isLoggedIn) {
      setSlugs(new Set());
      setHydrated(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/customer/wishlist`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load wishlist");
        const data = await res.json();
        if (cancelled) return;
        setSlugs(new Set((Array.isArray(data) ? data : []).map((it) => it.product_slug)));
      } catch (err) {
        console.error("Failed to load wishlist", err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, authHydrated]);

  const isWishlisted = useCallback((slug) => slugs.has(slug), [slugs]);

  const toggleWishlist = useCallback(
    async (slug) => {
      if (!isLoggedIn || !slug) return { ok: false, requiresLogin: !isLoggedIn };

      const currentlyWishlisted = slugs.has(slug);
      setSlugs((prev) => {
        const next = new Set(prev);
        if (currentlyWishlisted) next.delete(slug);
        else next.add(slug);
        return next;
      });

      try {
        if (currentlyWishlisted) {
          const res = await fetch(`${API}/customer/wishlist/${encodeURIComponent(slug)}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!res.ok) throw new Error("Failed to remove from wishlist");
        } else {
          const res = await fetch(`${API}/customer/wishlist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ product_slug: slug }),
          });
          if (!res.ok) throw new Error("Failed to add to wishlist");
        }
        return { ok: true };
      } catch (err) {
        console.error("Wishlist toggle failed", err);
        // revert optimistic update
        setSlugs((prev) => {
          const next = new Set(prev);
          if (currentlyWishlisted) next.add(slug);
          else next.delete(slug);
          return next;
        });
        return { ok: false };
      }
    },
    [isLoggedIn, slugs]
  );

  const value = {
    isWishlisted,
    toggleWishlist,
    hydrated,
    count: slugs.size,
    wishlistSlugs: Array.from(slugs),
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
