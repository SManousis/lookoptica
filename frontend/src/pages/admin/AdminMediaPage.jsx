import { useEffect, useMemo, useState } from "react";

import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(epochSeconds) {
  if (!Number.isFinite(epochSeconds)) return "-";
  const dt = new Date(epochSeconds * 1000);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default function AdminMediaPage() {
  const { csrfToken } = useAdminAuth();
  const [state, setState] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [sources, setSources] = useState([]);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("source", sourceFilter || "all");
    params.set("unlinked_only", unlinkedOnly ? "true" : "false");
    params.set("limit", "5000");
    params.set("offset", "0");
    if (search.trim()) params.set("q", search.trim());
    return params.toString();
  }, [sourceFilter, unlinkedOnly, search]);

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      setState("loading");
      setErrorMsg("");
      try {
        const res = await adminApiFetch(`${API}/admin/media/files?${query}`, {}, csrfToken);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load media files");
        }
        const data = await res.json();
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setSources(Array.isArray(data.sources) ? data.sources : []);
        setState("ok");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err.message || "Failed to load media files");
        setState("error");
      }
    }

    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [query, csrfToken]);

  async function deleteFile(item, force = false) {
    setBusyId(item.id);
    setErrorMsg("");
    try {
      const res = await adminApiFetch(
        `${API}/admin/media/files`,
        {
          method: "DELETE",
          body: JSON.stringify({
            source: item.source,
            path: item.path,
            force,
          }),
        },
        csrfToken
      );

      if (res.status === 409 && !force) {
        const confirmForce = window.confirm(
          `File is linked to product(s): ${item.filename}. Force delete anyway?`
        );
        if (confirmForce) {
          await deleteFile(item, true);
        }
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to delete file");
      }

      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete file");
    } finally {
      setBusyId("");
    }
  }

  function handleDelete(item) {
    if (!window.confirm(`Delete image "${item.filename}"?`)) return;
    deleteFile(item, false);
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Media Library</h1>
          <p className="text-xs text-slate-500">
            Browse and manage current and legacy image folders. Use Unlinked only to find orphan files.
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4 bg-white border rounded-xl p-3 text-xs">
        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-600">Folder</label>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="border rounded-md px-2 py-1 text-xs"
          >
            <option value="all">All folders</option>
            {sources.map((src) => (
              <option key={src.id} value={src.id}>
                {src.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-600">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="filename or path..."
            className="border rounded-md px-2 py-1 text-xs"
          />
        </div>

        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={unlinkedOnly}
              onChange={(e) => setUnlinkedOnly(e.target.checked)}
            />
            Unlinked only
          </label>
        </div>

        <div className="flex items-end justify-end text-xs text-slate-500">
          {state === "ok" ? `${items.length} image(s)` : ""}
        </div>
      </div>

      {state === "loading" && <div className="text-sm text-slate-500">Loading images...</div>}
      {state === "error" && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{errorMsg}</div>
      )}

      {state === "ok" && items.length === 0 && (
        <div className="text-sm text-slate-600">No images found for current filters.</div>
      )}

      {state === "ok" && items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <article key={item.id} className="border rounded-xl bg-white p-2 space-y-2">
              <div className="aspect-square overflow-hidden rounded-lg border bg-slate-50">
                <img
                  src={`${API}/admin/media/preview?source=${encodeURIComponent(item.source)}&path=${encodeURIComponent(item.path)}`}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-800 break-all">{item.filename}</p>
                <p className="text-[11px] text-slate-500 break-all">{item.path}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{item.source_label}</span>
                  <span>{formatBytes(item.size_bytes)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={item.is_linked ? "text-emerald-700" : "text-amber-700"}>
                    {item.is_linked ? "Linked" : "Unlinked"}
                  </span>
                  <span className="text-slate-500">{formatDate(item.updated_at)}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(item)}
                disabled={busyId === item.id}
                className="w-full px-2 py-1 rounded-md border border-red-200 text-red-700 text-xs disabled:opacity-60"
              >
                {busyId === item.id ? "Deleting..." : "Delete"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
