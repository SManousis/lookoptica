import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useCustomerAuth } from "../context/customerAuthShared";
import { useWishlist } from "../context/wishlistShared";
import { usePageSEO } from "../hooks/usePageSEO";

const API = import.meta.env.VITE_API_BASE || "";

export default function WishlistPage() {
  usePageSEO({ title: "Λίστα Επιθυμιών | Look Οπτικά", noindex: true });

  const navigate = useNavigate();
  const { isLoggedIn } = useCustomerAuth();
  const { wishlistSlugs, hydrated } = useWishlist();
  const [products, setProducts] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/account/login", { replace: true, state: { from: "/account/wishlist" } });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!hydrated) return;

    if (wishlistSlugs.length === 0) {
      setProducts([]);
      setState("ok");
      return;
    }

    let cancelled = false;
    setState("loading");

    Promise.all(
      wishlistSlugs.map((slug) =>
        fetch(`${API}/shop-products/${encodeURIComponent(slug)}`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      setProducts(results.filter(Boolean));
      setState("ok");
    });

    return () => {
      cancelled = true;
    };
  }, [wishlistSlugs, hydrated]);

  if (!isLoggedIn) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link to="/account" className="hover:underline">
          Ο λογαριασμός μου
        </Link>{" "}
        <span className="px-1 text-slate-400">›</span>
        <span className="text-slate-700">Λίστα επιθυμιών</span>
      </nav>

      <h1 className="mb-6 text-2xl font-semibold text-ink-heading">Λίστα επιθυμιών</h1>

      {state === "loading" && (
        <div className="text-sm text-slate-500">Φόρτωση...</div>
      )}

      {state === "ok" && products.length === 0 && (
        <section className="rounded-xl border border-dashed border-amber-200 bg-white p-10 text-center">
          <p className="text-lg font-medium text-slate-700">
            Η λίστα επιθυμιών σας είναι άδεια.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Πατήστε την καρδιά σε ένα προϊόν για να το προσθέσετε εδώ.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Όλα τα προϊόντα
          </Link>
        </section>
      )}

      {state === "ok" && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
