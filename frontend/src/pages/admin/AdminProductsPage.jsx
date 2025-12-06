// src/pages/admin/AdminProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

const CATEGORY_OPTIONS = [
  {
    value: "sunglasses",
    label: "Γυαλιά ηλίου",
    aliases: ["sunglasses", "γυαλιά ηλίου", "γυαλια ηλιου", "sun-glasses"],
  },
  {
    value: "ophthalmic_frames",
    label: "Σκελετοί οράσεως",
    aliases: ["ophthalmic_frames", "frames", "σκελετοι ορασεως", "σκελετοί οράσεως", "γυαλια ορασεως"],
  },
  {
    value: "contact_lenses",
    label: "Φακοί επαφής",
    aliases: ["contact_lenses", "contact-lenses", "φακοι επαφης", "φακοί επαφής"],
  },
  {
    value: "solutions",
    label: "Υγρά / Λύσεις",
    aliases: ["solutions", "υγρα", "λυσεις", "διαλυματα", "διαλύματα"],
  },
  {
    value: "other_products",
    label: "Λοιπά προϊόντα",
    aliases: ["other_products", "other-products", "αλλα", "άλλα", "λοιπα", "λοιπά"],
  },
];

function normalizeCategoryString(str) {
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9α-ω]/g, "");
}

function resolveCategoryValue(raw) {
  if (!raw) return "";
  const norm = normalizeCategoryString(raw);
  const match = CATEGORY_OPTIONS.find(
    (opt) =>
      normalizeCategoryString(opt.value) === norm ||
      (opt.aliases || []).some((a) => normalizeCategoryString(a) === norm)
  );
  return match?.value || raw;
}

function categoryLabelFromValue(value) {
  const norm = resolveCategoryValue(value);
  const match = CATEGORY_OPTIONS.find((opt) => opt.value === norm);
  return match?.label || value;
}

const PAGE_SIZE_OPTIONS = [24, 50, 100];

const STATUS_OPTIONS = [
  { value: "in_stock", label: "Διαθέσιμο" },
  { value: "preorder", label: "Κατόπιν παραγγελίας" },
  { value: "unavailable", label: "Μη διαθέσιμο" },
];

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const { csrfToken } = useAdminAuth();

  const [allItems, setAllItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [savingSku, setSavingSku] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    async function loadAll() {
      setState("loading");
      const limit = 200;
      let offset = 0;
      const all = [];
      try {
        while (true) {
          const res = await fetch(`${API}/api/products?limit=${limit}&offset=${offset}`);
          if (!res.ok) throw new Error("Fetch failed");
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          all.push(...list);
          if (list.length < limit) break;
          offset += limit;
          if (offset > 5000) break; // safety guard
        }
        const enriched = all.map((p) => ({
          ...p,
          categoryNormalized: resolveCategoryValue(p.category),
          categoryLabel: categoryLabelFromValue(p.category),
          _mainImage: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "",
          _editPrice: p.discountPrice ?? "",
          _editDiscountPrice: p.price ?? "",
          _editStatus: p.status || "in_stock",
          _editBrand: p.brand || "",
          _editCategory: resolveCategoryValue(p.category) || p.category || "",
          _editStock: p.stock ?? 0,
        }));
        setAllItems(enriched);
        setState("ok");
      } catch (err) {
        console.error("Error loading products for admin:", err);
        setErrorMsg("Δεν ήταν δυνατή η φόρτωση των προϊόντων.");
        setState("error");
      }
    }
    loadAll();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search, brandFilter, categoryFilter]);

  useEffect(() => {
    async function loadOptions() {
      const limit = 200;
      let offset = 0;
      const all = [];
      try {
        while (true) {
          const res = await fetch(`${API}/api/products?limit=${limit}&offset=${offset}`);
          if (!res.ok) break;
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          all.push(...list);
          if (list.length < limit) break;
          offset += limit;
          if (offset > 5000) break; // safety guard
        }
        const bSet = new Set();
        const cSet = new Set();
        all.forEach((p) => {
          if (p?.brand) bSet.add(p.brand);
          const catVal = resolveCategoryValue(p?.category);
          if (catVal) cSet.add(catVal);
        });
        setBrandOptions(Array.from(bSet).sort((a, b) => a.localeCompare(b)));
        const catList = Array.from(cSet)
          .map((val) => ({ value: val, label: categoryLabelFromValue(val) }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setCategoryOptions(catList);
      } catch (err) {
        console.error("Error loading dropdown options", err);
      }
    }
    loadOptions();
  }, []);

  function handleChangePrice(sku, value) {
    setAllItems((prev) =>
      prev.map((p) =>
        p.sku === sku ? { ...p, _editPrice: value } : p
      )
    );
  }

  function handleChangeDiscountPrice(sku, value) {
    setAllItems((prev) =>
      prev.map((p) =>
        p.sku === sku ? { ...p, _editDiscountPrice: value } : p
      )
    );
  }

  function handleChangeStock(sku, value) {
    setAllItems((prev) =>
      prev.map((p) =>
        p.sku === sku ? { ...p, _editStock: value } : p
      )
    );
  }

  function handleChangeStatus(sku, value) {
    setAllItems((prev) =>
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
        brand: product._editBrand ?? product.brand ?? "",
        category: resolveCategoryValue(product._editCategory ?? product.category),
        audience: product.audience || null,
        // offer/current price -> price, regular/original -> compare_at_price
        price:
          product._editDiscountPrice !== "" && product._editDiscountPrice !== null
            ? Number(product._editDiscountPrice)
            : null,
        compare_at_price:
          product._editPrice !== "" && product._editPrice !== null
            ? Number(product._editPrice)
            : null,
        stock:
          product._editStock !== undefined && product._editStock !== null
            ? Number(product._editStock)
            : product.stock ?? 0,
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

      // Optimistically update the row so the table reflects the saved values
      setAllItems((prev) =>
        prev.map((p) => {
          if (p.sku !== product.sku) return p;
          return {
            ...p,
            brand: payload.brand,
            category: payload.category,
            price: payload.price,
            discountPrice: payload.compare_at_price,
            stock: payload.stock,
            status: payload.status,
            _editBrand: payload.brand,
            _editCategory: payload.category,
            _editPrice: payload.compare_at_price ?? "",
            _editDiscountPrice: payload.price ?? "",
            _editStock: payload.stock,
            _editStatus: payload.status,
          };
        })
      );
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

  function handleNextPage() {
    if (hasNextPage) {
      setPage((prev) => prev + 1);
    }
  }

  function handlePrevPage() {
    if (page > 1) {
      setPage((prev) => Math.max(1, prev - 1));
    }
  }

  function handleChangeBrand(sku, value) {
    setAllItems((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, _editBrand: value } : p))
    );
  }

  function handleChangeCategory(sku, value) {
    setAllItems((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, _editCategory: value } : p))
    );
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

      setAllItems((prev) => prev.filter((p) => p.sku !== product.sku));
    } catch (err) {
      console.error("Error unpublishing product:", err);
      setErrorMsg(err.message || "Σφάλμα κατά την αρχειοθέτηση.");
    }
  }

  // ----- Filters & search -----

  const brands = useMemo(() => {
    const set = new Set();
    allItems.forEach((p) => {
      const b = p._editBrand ?? p.brand;
      if (b) set.add(b);
    });
    return Array.from(set).sort();
  }, [allItems]);

  const categories = useMemo(() => categoryOptions, [categoryOptions]);

  const filteredItems = useMemo(() => {
    return allItems.filter((p) => {
      const title = (p?.title?.el || p?.title?.en || "").toString().toLowerCase();
      const sku = (p?.sku || "").toString().toLowerCase();
      const q = search.toLowerCase().trim();

      if (q && !title.includes(q) && !sku.includes(q)) {
        return false;
      }

      const brandVal = p._editBrand ?? p.brand;
      if (brandFilter && brandVal !== brandFilter) {
        return false;
      }

      const catVal = resolveCategoryValue(p._editCategory ?? p.categoryNormalized ?? p.category);
      if (categoryFilter && catVal !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [allItems, search, brandFilter, categoryFilter]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setHasNextPage(page * pageSize < filteredItems.length);
  }, [page, pageSize, filteredItems.length]);

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + paginatedItems.length - 1, filteredItems.length);

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
            {(brandOptions.length > 0 ? brandOptions : brands).map((b) => (
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
            {(categoryOptions.length > 0 ? categoryOptions : categories).map((c) => {
              const val = typeof c === "string" ? c : c.value;
              const label = typeof c === "string" ? c : c.label;
              return (
                <option key={val} value={val}>
                  {label}
                </option>
              );
            })}
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
        <div className="space-y-3">
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600 w-20">Image</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Τίτλος</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Brand</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Κατηγορία</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Stock</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Τιμή (€)</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Τιμή προσφοράς (€)</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Διαθεσιμότητα</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-600">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
              {paginatedItems.map((p) => {
                const title = p?.title?.el || p?.title?.en || p.slug || p.sku;
                const mainImage = p._mainImage;
                return (
                  <tr key={p.sku} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={title}
                          className="w-14 h-14 rounded-md object-cover border"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-md border bg-slate-50 flex items-center justify-center text-[10px] text-slate-400">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-medium text-slate-800 line-clamp-2">
                        {title}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <select
                        value={p._editBrand}
                        onChange={(e) => handleChangeBrand(p.sku, e.target.value)}
                        className="border rounded-md px-2 py-1 text-xs w-full"
                      >
                        <option value="">-</option>
                        {(brandOptions.length > 0 ? brandOptions : brands).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <select
                        value={p._editCategory}
                        onChange={(e) => handleChangeCategory(p.sku, e.target.value)}
                        className="border rounded-md px-2 py-1 text-xs w-full"
                      >
                        <option value="">-</option>
                        {(categoryOptions.length > 0 ? categoryOptions : categories).map((c) => {
                          const val = typeof c === "string" ? c : c.value;
                          const label = typeof c === "string" ? c : c.label;
                          return (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <input
                        type="number"
                        step="1"
                        value={p._editStock}
                        onChange={(e) => handleChangeStock(p.sku, e.target.value)}
                        className="w-15 border rounded-md px-2 py-1 text-xs"
                      />
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
                        className="border rounded-md px-2 py-1 text-xs w-30"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="grid grid-cols-2 gap-1 text-right">
                        <button
                          onClick={() => handleSaveRow(p)}
                          disabled={savingSku === p.sku}
                          className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-emerald-600 text-white disabled:opacity-60"
                        >
                          {savingSku === p.sku ? "Αποθήκευση…" : "Αποθήκευση"}
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-slate-300 text-slate-700"
                        >
                          Επεξεργασία
                        </button>
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-slate-300 text-slate-700"
                        >
                          Διπλασιασμός
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-red-200 text-red-700"
                        >
                          Διαγραφή
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs">
            <div className="text-slate-600">
              Προηγούμενη Επόμενη {startIndex} - {endIndex}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-slate-600">Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border rounded-md px-2 py-1"
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className="px-2 py-1 rounded-md border border-slate-300 text-slate-700 disabled:opacity-50"
                >
                  Προηγούμενη
                </button>
                <span className="text-slate-700">Page {page}</span>
                <button
                  onClick={handleNextPage}
                  disabled={!hasNextPage}
                  className="px-2 py-1 rounded-md border border-slate-300 text-slate-700 disabled:opacity-50"
                >
                  Επόμενη
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
