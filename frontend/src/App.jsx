import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "";

function ProductCard({ p }) {
  return (
    <div className="group rounded-2xl bg-white shadow hover:shadow-lg transition p-4">
      {/* Image placeholder for now */}
      <div className="aspect-square rounded-xl bg-slate-100 mb-3 overflow-hidden">
        {/* When images API is ready, render first image here */}
        {/* <img src={p.images?.[0]} alt={p.title?.el || p.title} className="w-full h-full object-cover" /> */}
      </div>

      <div className="text-sm text-slate-500 mb-1">{p.sku}</div>
      <h3 className="text-base font-semibold text-slate-900 group-hover:underline">
        {p?.title?.el || p?.title?.en || p?.title || "—"}
      </h3>

      <div className="mt-1 text-lg font-bold text-teal-700">€{p.price}</div>

      {/* Link to PDP when routing is added */}
      {/* <Link to={`/product/${p.slug}`} className="mt-3 inline-block text-sm text-teal-700 hover:underline">View</Link> */}
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">Look Optica</div>
          <div className="text-sm text-slate-600">Warm-Clinical Demo</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Shop</h1>

        {state === "loading" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-4 shadow animate-pulse">
                <div className="aspect-square bg-slate-200 rounded-xl mb-3" />
                <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-40 mb-1" />
                <div className="h-4 bg-slate-200 rounded w-16" />
              </div>
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-4">
            Failed to load products. Check that the backend is running and
            <code className="ml-1 px-1 py-0.5 bg-slate-100 rounded">VITE_API_BASE</code> is correct.
          </div>
        )}

        {state === "ok" && (
          <>
            {items.length === 0 ? (
              <div className="text-slate-600">No products found.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((p) => (
                  <ProductCard key={p.sku} p={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="mt-12 border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-slate-600">
          © {new Date().getFullYear()} Look Optica — Chalandri
        </div>
      </footer>
    </div>
  );
}
