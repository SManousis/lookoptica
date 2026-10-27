import { useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import BackupTableIcon from "@mui/icons-material/BackupTable";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

const COUNT_LABELS = {
  new_products: "Νέα προϊόντα",
  new_variants_on_existing_products: "Νέα χρώματα σε υπάρχοντα προϊόντα",
  updated_variants: "Ενημερώσεις τιμής/αποθέματος",
  skipped_zero_stock_rows: "Παραλείφθηκαν (μηδενικό απόθεμα)",
};

export default function AdminImportProductsPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileText, setFileText] = useState(null);
  const [stage, setStage] = useState("idle"); // idle | previewing | previewed | confirming | done | error
  const [summary, setSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setSummary(null);
    setErrorMsg("");
    setStage("idle");
    if (!file) {
      setFileText(null);
      return;
    }
    try {
      const text = await file.text();
      JSON.parse(text); // just a client-side sanity check, server is the real validator
      setFileText(text);
    } catch {
      setFileText(null);
      setErrorMsg("Το αρχείο δεν είναι έγκυρο JSON.");
      setStage("error");
    }
  }

  async function runSync(dryRun) {
    if (!fileText) return;
    setStage(dryRun ? "previewing" : "confirming");
    setErrorMsg("");
    try {
      const res = await adminApiFetch(`${API}/admin/erp-sync?dry_run=${dryRun}`, {
        method: "POST",
        body: fileText,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Το import απέτυχε");
      }
      const data = await res.json();
      setSummary(data);
      setStage(dryRun ? "previewed" : "done");
    } catch (err) {
      console.error("ERP sync failed", err);
      setErrorMsg(err.message || "Κάτι πήγε στραβά κατά το import.");
      setStage("error");
    }
  }

  function reset() {
    setSelectedFile(null);
    setFileText(null);
    setSummary(null);
    setErrorMsg("");
    setStage("idle");
  }

  const canConfirm = stage === "previewed" && summary;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-amber-800">Import προϊόντων από ERP</h1>
        <p className="text-sm text-slate-600">
          Ανέβασε το αρχείο εξαγωγής (JSON) από το OptiAEye. Η προεπισκόπηση δείχνει ακριβώς τι θα
          αλλάξει πριν γραφτεί οτιδήποτε στη βάση — μετά, μπορείς να επιβεβαιώσεις την εισαγωγή.
          Η περιγραφή και οι φωτογραφίες συμπληρώνονται χειροκίνητα μετά την εισαγωγή.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-amber-800">
          <CloudUploadIcon />
          <h2 className="text-lg font-semibold">Αρχείο εξαγωγής</h2>
        </div>

        <label
          htmlFor="erp-file"
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-6 py-10 text-center text-amber-800 cursor-pointer hover:border-amber-400"
        >
          <BackupTableIcon fontSize="large" className="mb-2" />
          <span className="font-medium">{selectedFile?.name || "Επιλέξτε αρχείο JSON"}</span>
          <input
            id="erp-file"
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => runSync(true)}
            disabled={!fileText || stage === "previewing" || stage === "confirming"}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {stage === "previewing" ? "Προεπισκόπηση..." : "Προεπισκόπηση"}
          </button>
          <button
            type="button"
            onClick={() => runSync(false)}
            disabled={!canConfirm || stage === "confirming"}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            title={!canConfirm ? "Κάνε πρώτα προεπισκόπηση του τρέχοντος αρχείου" : undefined}
          >
            {stage === "confirming" ? "Εισαγωγή..." : "Επιβεβαίωση εισαγωγής"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-amber-300"
          >
            Καθαρισμός
          </button>
        </div>

        {errorMsg && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

        {summary && (
          <div
            className={`space-y-3 rounded-lg border px-4 py-3 text-sm ${
              stage === "done"
                ? "border-green-100 bg-green-50 text-green-800"
                : "border-amber-100 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold">
              {stage === "done"
                ? "Η εισαγωγή ολοκληρώθηκε."
                : "Προεπισκόπηση — τίποτα δεν έχει γραφτεί ακόμα στη βάση."}
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(summary.counts || {}).map(([key, value]) => (
                <li key={key} className="flex justify-between gap-2">
                  <span>{COUNT_LABELS[key] || key}</span>
                  <span className="font-semibold tabular-nums">{value}</span>
                </li>
              ))}
            </ul>
            {summary.warnings?.length > 0 && (
              <div>
                <p className="font-semibold">Προειδοποιήσεις</p>
                <ul className="list-disc space-y-1 pl-5">
                  {summary.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {stage === "previewed" && (
              <p>Αν τα παραπάνω φαίνονται σωστά, πάτα «Επιβεβαίωση εισαγωγής».</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
