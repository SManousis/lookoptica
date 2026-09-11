import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "";

/**
 * Reusable image manager for the Add/Edit product forms:
 * - shows current images as removable thumbnails
 * - upload button (supports selecting multiple files at once)
 * - "choose from library" button that opens a picker over already-uploaded
 *   media, so admins stop re-uploading images whose link they forgot
 */
export default function ProductImagesField({
  images,
  onChange,
  onImageUploaded,
  label = "Εικόνες προϊόντος",
}) {
  const fileInputRef = useRef(null);
  const [uploadState, setUploadState] = useState("idle"); // idle | uploading | success | error
  const [uploadMessage, setUploadMessage] = useState("");

  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryState, setLibraryState] = useState("idle"); // idle | loading | ok | error
  const [libraryError, setLibraryError] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  function removeImage(index) {
    onChange(images.filter((_, i) => i !== index));
  }

  function addImages(paths) {
    if (!paths || paths.length === 0) return;
    const existing = new Set(images);
    const additions = paths.filter((p) => p && !existing.has(p));
    if (additions.length > 0) {
      onChange([...images, ...additions]);
    }
    if (onImageUploaded) {
      onImageUploaded(paths[paths.length - 1]);
    }
  }

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadState("uploading");
    setUploadMessage(`Ανέβασμα ${files.length} εικόνα/ών...`);

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API}/admin/uploads/product-image`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Αποτυχία ανεβάσματος");
        }
        const data = await res.json();
        if (data?.path) uploaded.push(data.path);
      } catch (err) {
        console.error("Image upload failed", file.name, err);
        failed.push(file.name);
      }
    }

    if (uploaded.length > 0) {
      addImages(uploaded);
    }

    if (failed.length > 0) {
      setUploadState("error");
      setUploadMessage(
        `Ανέβηκαν ${uploaded.length}/${files.length}. Απέτυχαν: ${failed.join(", ")}`
      );
    } else {
      setUploadState("success");
      setUploadMessage(
        uploaded.length === 1
          ? "Η εικόνα ανέβηκε με επιτυχία."
          : `Ανέβηκαν ${uploaded.length} εικόνες με επιτυχία.`
      );
    }

    e.target.value = "";
  }

  async function fetchLibrary(q) {
    setLibraryState("loading");
    setLibraryError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (q) params.set("q", q);
      const res = await fetch(`${API}/admin/media/files?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Αποτυχία φόρτωσης βιβλιοθήκης");
      }
      const data = await res.json();
      setLibraryItems(Array.isArray(data.items) ? data.items : []);
      setLibraryState("ok");
    } catch (err) {
      setLibraryError(err.message || "Αποτυχία φόρτωσης βιβλιοθήκης");
      setLibraryState("error");
    }
  }

  function openLibrary() {
    setSelectedIds(new Set());
    setLibrarySearch("");
    setShowLibrary(true);
    fetchLibrary("");
  }

  useEffect(() => {
    if (!showLibrary) return;
    const timer = setTimeout(() => fetchLibrary(librarySearch), 300);
    return () => clearTimeout(timer);
  }, [librarySearch, showLibrary]);

  function toggleSelect(item) {
    if (images.includes(item.public_path)) return; // already on this product
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function confirmLibrarySelection() {
    const chosen = libraryItems
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.public_path);
    addImages(chosen);
    setShowLibrary(false);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium mb-1">{label}</label>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative h-20 w-20 overflow-hidden rounded-md border border-slate-300 bg-white"
            >
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs shadow"
                aria-label="Remove image"
              >
                -
              </button>
              <img
                src={url}
                alt={`Εικόνα ${idx + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.png";
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadState === "uploading"}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 disabled:opacity-60"
        >
          {uploadState === "uploading" ? "Ανέβασμα..." : "+ Ανέβασμα εικόνας/ων"}
        </button>
        <button
          type="button"
          onClick={openLibrary}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700"
        >
          🖼️ Επιλογή από βιβλιοθήκη
        </button>
        {uploadMessage && (
          <span
            className={`text-xs ${
              uploadState === "success"
                ? "text-green-700"
                : uploadState === "error"
                ? "text-red-600"
                : "text-slate-600"
            }`}
          >
            {uploadMessage}
          </span>
        )}
      </div>

      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-xl bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-sm font-semibold text-slate-800">
                Βιβλιοθήκη εικόνων
              </h3>
              <button
                type="button"
                onClick={() => setShowLibrary(false)}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                ✕ Κλείσιμο
              </button>
            </div>

            <div className="p-4 border-b">
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Αναζήτηση με όνομα αρχείου..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {libraryState === "loading" && (
                <div className="text-sm text-slate-500">Φόρτωση...</div>
              )}
              {libraryState === "error" && (
                <div className="text-sm text-red-700">{libraryError}</div>
              )}
              {libraryState === "ok" && libraryItems.length === 0 && (
                <div className="text-sm text-slate-500">Δεν βρέθηκαν εικόνες.</div>
              )}
              {libraryState === "ok" && libraryItems.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {libraryItems.map((item) => {
                    const alreadyAdded = images.includes(item.public_path);
                    const selected = selectedIds.has(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => toggleSelect(item)}
                        disabled={alreadyAdded}
                        className={`relative h-24 rounded-md border overflow-hidden text-left ${
                          alreadyAdded
                            ? "opacity-50 cursor-not-allowed border-slate-200"
                            : selected
                            ? "border-teal-600 ring-2 ring-teal-500"
                            : "border-slate-300"
                        }`}
                        title={item.filename}
                      >
                        <img
                          src={`${API}/admin/media/preview?source=${encodeURIComponent(
                            item.source
                          )}&path=${encodeURIComponent(item.path)}`}
                          alt={item.filename}
                          className="h-full w-full object-cover"
                        />
                        {alreadyAdded && (
                          <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[10px] px-1 py-0.5 text-center">
                            Ήδη προστέθηκε
                          </span>
                        )}
                        {!alreadyAdded && selected && (
                          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white text-xs">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t p-4">
              <span className="text-xs text-slate-500">
                {selectedIds.size} επιλεγμένη/ες
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLibrary(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700"
                >
                  Άκυρο
                </button>
                <button
                  type="button"
                  onClick={confirmLibrarySelection}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm disabled:opacity-60"
                >
                  Προσθήκη επιλεγμένων
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
