import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "";

export function useProductReviews(slug) {
  const [data, setData] = useState({ reviews: [], average_rating: null, count: 0 });
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState("loading");
    fetch(`${API}/products/${encodeURIComponent(slug)}/reviews`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setState("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { ...data, state };
}
