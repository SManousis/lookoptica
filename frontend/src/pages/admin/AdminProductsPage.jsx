// src/pages/admin/AdminProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

const STATUS_OPTIONS = [
  { value: "in_stock", label: "Διαθέσιμο" },
  { value: "preorder", label: "Κατόπιν παραγγελίας" },
  { value: "unavailable", label: "Μη διαθέσιμο" },
];

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const { csrfToken } = useAdminAuth();

  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [savingSku, setSavingSku] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    setState("loading");
    fetch(`${API}/api/products`)
      .then((r) => {
        if (!r.ok) throw new Error("Fetch failed");
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const enriched = list.map((p) => ({
          ...p,
          _editPrice: p.price ?? 0,
          _editDiscountPrice: p.discountPrice ?? "",
          _editStatus: p.status || "in_stock",
        }));
        setItems(enriched);
        setState("ok");
      })
      .catch((err) => {
        console.error("Error loading products for admin:", err);
        setErrorMsg("Δεν ήταν δυνατή η φόρτωση των προϊόντων.");
        setState("error");
      });
  }, []);

  function handleChangePrice(sku, value) {
    setItems((prev) =>
      prev.map((p) =>
        p.sku === sku ? { ...p, _editPrice: value } : p
      )
    );
  }

  function handleChangeDiscountPrice(sku, value) {
    setItems((prev) =>
      prev.map((p) =>
        p.sku === sku ? { ...p, _editDiscountPrice: value } : p
      )
    );
  }

  function handleChangeStatus(sku, value) {
    setItems((prev) =>
      prev.map((p) =>
        p.sku === sku ? { ...p, _editStatus: value } : p
      )
    );
  }

  async function handleSaveRow(product) {
    setSavingSku(product.sku);
    setErrorMsg("");

    try {
      const payload = {
        sku: product.sku,
        ean: product.ean || null,
        title: product.title || { el: "", en: "" },
        slug: product.slug,
        brand: product.brand || "",
        category: product.category || "",
        audience: product.audience || null,
        price: Number(product._editPrice) || 0,
        compare_at_price: product._editDiscountPrice
          ? Number(product._editDiscountPrice)
          : null,
        stock: product.stock ?? 0,
        status: product._editStatus || "in_stock",
        attributes: {},
        version: 1,
      };

      const res = await adminApiFetch(
        `${API}/api/admin/products/sync`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        csrfToken
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to save");
      }

      console.log("Saved product", product.sku);
    } catch (err) {
      console.error("Error saving product:", err);
      setErrorMsg(err.message || "Σφάλμα κατά την αποθήκευση.");
    } finally {
      setSavingSku(null);
    }
  }

  function handleEdit(product) {
    navigate(`/admin/products/${product.slug}/edit`);
  }

  function handleDuplicate(product) {
    navigate(`/admin/add-product?duplicate=${product.slug}`);
  }

  async function handleDelete(product) {
    if (!window.confirm(`Να γίνει αρχειοθέτηση του προϊόντος ${product.sku};`)) {
      return;
    }

    try {
      const res = await adminApiFetch(
        `${API}/api/admin/products/${product.sku}/unpublish`,
        {
          method: "POST",
        },
        csrfToken
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to unpublish");
      }

      setItems((prev) => prev.filter((p) => p.sku !== product.sku));
    } catch (err) {
      console.error("Error unpublishing product:", err);
      setErrorMsg(err.message || "Σφάλμα κατά την αρχειοθέτηση.");
    }
  }

  // ----- Filters & search -----

  const brands = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [items]);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      const title = (p?.title?.el || p?.title?.en || "").toString().toLowerCase();
      const sku = (p?.sku || "").toString().toLowerCase();
      const q = search.toLowerCase().trim();

      if (q && !title.includes(q) && !sku.includes(q)) {
        return false;
      }

      if (brandFilter && p.brand !== brandFilter) {
        return false;
      }

      if (categoryFilter && p.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [items, search, brandFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Διαχείριση προϊόντων</h1>
          <p className="text-xs text-slate-500">
            Γρήγορη αλλαγή τιμής, τιμής προσφοράς & διαθεσιμότητας, επεξεργασία, διπλασιασμός, διαγραφή.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/add-product")}
          className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-sm"
        >
          + Νέο προϊόν
        </button>
      </header>

      {/* Filters & search */}
      <div className="grid gap-3 md:grid-cols-3 bg-white border rounded-xl p-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-600">
            Αναζήτηση (τίτλος ή SKU)
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="π.χ. ray ban ή RB1234"
            className="border rounded-md px-2 py-1 text-xs"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-600">
            Φίλτρο brand
          </label>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="border rounded-md px-2 py-1 text-xs"
          >
            <option value="">Όλα τα brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-600">
            Φίλτρο κατηγορίας
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-md px-2 py-1 text-xs"
          >
            <option value="">Όλες οι κατηγορίες</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state === "loading" && (
        <div className="text-sm text-slate-500">Φόρτωση προϊόντων…</div>
      )}

      {state === "error" && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {errorMsg || "Δεν ήταν δυνατή η φόρτωση των προϊόντων."}
        </div>
      )}

      {state === "ok" && filteredItems.length === 0 && (
        <div className="text-sm text-slate-600">
          Δεν βρέθηκαν προϊόντα με αυτά τα φίλτρα.
        </div>
      )}

      {state === "ok" && filteredItems.length > 0 && (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">SKU</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Τίτλος</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Brand</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Κατηγορία</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Τιμή (€)</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Τιμή προσφοράς (€)
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Διαθεσιμότητα
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((p) => {
                const title = p?.title?.el || p?.title?.en || p.slug || p.sku;
                return (
                  <tr key={p.sku} className="border-b last:border-b-0">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {p.sku}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-medium text-slate-800 line-clamp-2">
                        {title}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {p.brand || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {p.category || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <input
                        type="number"
                        step="0.01"
                        value={p._editPrice}
                        onChange={(e) =>
                          handleChangePrice(p.sku, e.target.value)
                        }
                        className="w-24 border rounded-md px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <input
                        type="number"
                        step="0.01"
                        value={p._editDiscountPrice}
                        onChange={(e) =>
                          handleChangeDiscountPrice(p.sku, e.target.value)
                        }
                        className="w-24 border rounded-md px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <select
                        value={p._editStatus}
                        onChange={(e) =>
                          handleChangeStatus(p.sku, e.target.value)
                        }
                        className="border rounded-md px-2 py-1 text-xs"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-right space-x-2">
                      <button
                        onClick={() => handleSaveRow(p)}
                        disabled={savingSku === p.sku}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-600 text-white disabled:opacity-60"
                      >
                        {savingSku === p.sku ? "Αποθήκευση…" : "Αποθήκευση"}
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        className="inline-flex items-center px-2 py-1 rounded-md border border-slate-300 text-slate-700"
                      >
                        Επεξεργασία
                      </button>
                      <button
                        onClick={() => handleDuplicate(p)}
                        className="inline-flex items-center px-2 py-1 rounded-md border border-slate-300 text-slate-700"
                      >
                        Διπλασιασμός
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="inline-flex items-center px-2 py-1 rounded-md border border-red-200 text-red-700"
                      >
                        Διαγραφή
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
