import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";

const API = import.meta.env.VITE_API_BASE || "";

export default function PLP() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setItems)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div className="text-red-600">Failed to load: {err}</div>;
  if (!items.length) return <div>No products yet.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((p) => (
        <ProductCard key={p.sku} p={p} />
      ))}
    </div>
  );
}
