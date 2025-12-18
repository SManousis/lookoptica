import { useMemo, useState } from "react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import BackupTableIcon from "@mui/icons-material/BackupTable";
import ScheduleIcon from "@mui/icons-material/Schedule";

const API = import.meta.env.VITE_API_BASE || "";

export default function AdminImportProductsPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importState, setImportState] = useState("idle"); // idle | uploading | success | error
  const [importLog, setImportLog] = useState("");
  const [schedule, setSchedule] = useState("manual");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [notes, setNotes] = useState("");

  const instructions = useMemo(
    () => [
      "Accepted formats: CSV (UTF-8) or XLSX converted to CSV.",
      "The importer expects at minimum sku, title, price, stock, category, brand.",
      "Images are not processed; upload them separately inside the admin product editor.",
      "Use the preview button before the first real import to verify mappings.",
    ],
    []
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setImportState("idle");
    setImportLog("");
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setImportState("error");
      setImportLog("Παρακαλώ επιλέξτε αρχείο πρώτα.");
      return;
    }
    setImportState("uploading");
    setImportLog("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("notes", notes);
      const res = await fetch(`${API}/admin/import-products`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Το import απέτυχε");
      }
      const data = await res.json().catch(() => ({}));
      setImportState("success");
      setImportLog(
        data?.message ||
          "Το αρχείο ανέβηκε. Ο εξυπηρετητής θα το επεξεργαστεί και θα ενημερώσει τα προϊόντα."
      );
    } catch (err) {
      console.error("Failed to upload ERP import file", err);
      setImportState("error");
      setImportLog(err.message || "Κάτι πήγε στραβά κατά το import.");
    }
  };

  const handleScheduleSave = (event) => {
    event.preventDefault();
    // This simply simulates saving configuration.
    setImportState("success");
    setImportLog("Οι ρυθμίσεις συγχρονισμού αποθηκεύτηκαν τοπικά. Συνδέστε το backend για να τις εφαρμόσετε.");
  };

  const renderStatus = () => {
    if (importState === "uploading") {
      return <p className="text-sm text-slate-600">Γίνεται αποστολή και προετοιμασία...</p>;
    }
    if (!importLog) return null;
    const color =
      importState === "success"
        ? "text-green-700 bg-green-50 border border-green-100"
        : importState === "error"
        ? "text-red-700 bg-red-50 border border-red-100"
        : "text-slate-600";
    return (
      <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${color}`}>
        {importLog}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-amber-800">Import προϊόντων από ERP</h1>
        <p className="text-sm text-slate-600">
          Ανέβασε τα δεδομένα του ERP ή όρισε επαναλαμβανόμενο συγχρονισμό ώστε να ενημερώνονται
          οι τιμές και τα αποθέματα χωρίς χειροκίνητες κινήσεις.
        </p>
      </header>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-amber-800">
          <CloudUploadIcon />
          <h2 className="text-lg font-semibold">Χειροκίνητο import αρχείου</h2>
        </div>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
          {instructions.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>

        <form className="space-y-3" onSubmit={handleUpload}>
          <label
            htmlFor="erp-file"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-6 py-10 text-center text-amber-800 cursor-pointer hover:border-amber-400"
          >
            <BackupTableIcon fontSize="large" className="mb-2" />
            <span className="font-medium">{selectedFile?.name || "Επιλέξτε αρχείο CSV"}</span>
            <span className="text-xs text-amber-900">Μέγιστο μέγεθος 20MB</span>
            <input
              id="erp-file"
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Προαιρετικές σημειώσεις (π.χ. ποια fields περιέχει το αρχείο)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={importState === "uploading"}
              className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Έναρξη import
            </button>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-amber-300"
            >
              Καθαρισμός
            </button>
          </div>
        </form>

        {renderStatus()}
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-amber-800">
          <ScheduleIcon />
          <h2 className="text-lg font-semibold">Ρυθμίσεις συγχρονισμού</h2>
        </div>
        <p className="text-sm text-slate-600">
          Εδώ μπορείτε να ορίσετε URL/Token για REST API του ERP. Το backend μπορεί να «τραβάει»
          τα δεδομένα στο χρονοδιάγραμμα που θα επιλέξετε.
        </p>

        <form className="space-y-3" onSubmit={handleScheduleSave}>
          <label className="text-sm font-medium text-slate-700">
            Συχνότητα
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="manual">Μόνο manual imports</option>
              <option value="daily">Καθημερινά (02:00)</option>
              <option value="weekly">Εβδομαδιαία (Κάθε Δευτέρα)</option>
              <option value="hourly">Κάθε ώρα</option>
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            ERP Endpoint URL
            <input
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://erp.example.com/api/products-export"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            API Token / Key
            <input
              type="text"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="π.χ. 4c1ab7f6-xxxx-xxxx-xxxx"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Αποθήκευση ρυθμίσεων
            </button>
            <button
              type="button"
              className="rounded-xl border border-amber-200 px-4 py-2 text-sm text-amber-700 hover:border-amber-400"
              onClick={() => alert("TODO: Trigger backend ERP sync")}
            >
              Εκτέλεση τώρα
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
