// src/pages/CheckoutDetailsPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "";

export default function CheckoutDetailsPage() {
  const navigate = useNavigate();

  const [state, setState] = useState("loading"); // loading | ok | saving | error
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [shipping, setShipping] = useState({
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    region: "",
    country: "Greece",
    is_default: true,
  });

  const [wantInvoice, setWantInvoice] = useState(false);
  const [invoiceSameAsShipping, setInvoiceSameAsShipping] = useState(true);
  const [invoice, setInvoice] = useState({
    company_name: "",
    vat_number: "",
    tax_office: "",
    profession: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    region: "",
    country: "Greece",
  });

  // ---------- Load existing checkout details ----------
  useEffect(() => {
    setState("loading");
    setErrorMsg("");
    setSuccessMsg("");

    fetch(`${API}/api/customer/checkout-details`, {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          // If 404 or 401, just treat as "no data yet"
          if (res.status === 404) return null;
          const text = await res.text();
          throw new Error(text || "Failed to load checkout details");
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.shipping) {
            setShipping((prev) => ({
              ...prev,
              ...data.shipping,
              country: data.shipping.country || "Greece",
            }));
          }
          if (data.invoice) {
            setInvoice((prev) => ({
              ...prev,
              ...data.invoice,
              country: data.invoice.country || "Greece",
            }));
            setWantInvoice(true);
            // naive guess: if invoice address exactly matches shipping → sameAsShipping
            const s = data.shipping || {};
            const i = data.invoice || {};
            const same =
              i.address_line1 === s.address_line1 &&
              i.address_line2 === s.address_line2 &&
              i.city === s.city &&
              i.postcode === s.postcode &&
              i.region === s.region &&
              i.country === s.country;
            setInvoiceSameAsShipping(same);
          }
        }
        setState("ok");
      })
      .catch((err) => {
        console.error("Failed to load checkout details", err);
        setErrorMsg(err.message || "Failed to load checkout details");
        setState("error");
      });
  }, []);

  // ---------- Handlers ----------

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));

    if (invoiceSameAsShipping) {
      setInvoice((prev) => ({
        ...prev,
        address_line1: name === "address_line1" ? value : prev.address_line1,
        address_line2: name === "address_line2" ? value : prev.address_line2,
        city: name === "city" ? value : prev.city,
        postcode: name === "postcode" ? value : prev.postcode,
        region: name === "region" ? value : prev.region,
        country: name === "country" ? value : prev.country,
      }));
    }
  };

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoice((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleInvoiceSameAsShipping = () => {
    const next = !invoiceSameAsShipping;
    setInvoiceSameAsShipping(next);
    if (next) {
      // copy over
      setInvoice((prev) => ({
        ...prev,
        address_line1: shipping.address_line1,
        address_line2: shipping.address_line2,
        city: shipping.city,
        postcode: shipping.postcode,
        region: shipping.region,
        country: shipping.country,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Basic client validation
    if (!shipping.full_name || !shipping.address_line1 || !shipping.city || !shipping.postcode || !shipping.phone) {
      setErrorMsg("Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία αποστολής.");
      return;
    }

    if (wantInvoice) {
      if (
        !invoice.company_name ||
        !invoice.vat_number ||
        !invoice.tax_office ||
        !invoice.profession
      ) {
        setErrorMsg(
          "Για τιμολόγιο απαιτούνται Επωνυμία, ΑΦΜ, ΔΟΥ και είδος δραστηριότητας."
        );
        return;
      }
    }

    const payload = {
      shipping,
      invoice: wantInvoice
        ? {
            ...invoice,
          }
        : null,
    };

    setState("saving");
    try {
      const res = await fetch(`${API}/api/customer/checkout-details`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save checkout details");
      }

      setSuccessMsg("Τα στοιχεία αποθηκεύτηκαν με επιτυχία.");
      setState("ok");

      // Next step of checkout – adjust route if you want another page (payment, confirmation, etc.)
      // Continue to payment step once details are saved.
      setTimeout(() => navigate("/checkout/payment"), 400);
    } catch (err) {
      console.error("Failed to save checkout details", err);
      setErrorMsg(err.message || "Failed to save checkout details");
      setState("error");
    }
  };

  const disabled = state === "loading" || state === "saving";

  return (
    <div className="max-w-4xl mx-auto">
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:underline">Home</Link> <span>›</span>{" "}
        <Link to="/cart" className="hover:underline">Καλάθι</Link> <span>›</span>{" "}
        <span className="text-slate-700">Στοιχεία αποστολής</span>
      </nav>

      <h1 className="text-xl font-semibold text-amber-700 mb-2">
        Στοιχεία αποστολής & τιμολόγησης
      </h1>
      <p className="text-xs text-slate-600 mb-4">
        Συμπληρώστε τα στοιχεία αποστολής. Αν χρειάζεστε τιμολόγιο, προσθέστε και τα στοιχεία τιμολόγησης.
      </p>

      {state === "loading" && (
        <div className="text-sm text-slate-500 mb-3">Φόρτωση στοιχείων…</div>
      )}

      {errorMsg && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-4 md:p-6"
      >
        {/* Shipping block */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Στοιχεία αποστολής
            </h2>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={shipping.is_default}
                onChange={(e) =>
                  setShipping((prev) => ({
                    ...prev,
                    is_default: e.target.checked,
                  }))
                }
                disabled={disabled}
                className="h-3 w-3"
              />
              Χρήση ως προεπιλεγμένη διεύθυνση
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Ονοματεπώνυμο *
              </label>
              <input
                name="full_name"
                value={shipping.full_name}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Τηλέφωνο επικοινωνίας *
              </label>
              <input
                name="phone"
                value={shipping.phone}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Διεύθυνση (γραμμή 1) *
              </label>
              <input
                name="address_line1"
                value={shipping.address_line1}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Διεύθυνση (γραμμή 2)
              </label>
              <input
                name="address_line2"
                value={shipping.address_line2}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Όροφος, διαμέρισμα κτλ."
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Πόλη *
              </label>
              <input
                name="city"
                value={shipping.city}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Τ.Κ. *
              </label>
              <input
                name="postcode"
                value={shipping.postcode}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Περιοχή / Νομός
              </label>
              <input
                name="region"
                value={shipping.region}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Χώρα
              </label>
              <input
                name="country"
                value={shipping.country}
                onChange={handleShippingChange}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {/* Invoice toggle */}
        <section className="space-y-3 border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={wantInvoice}
              onChange={(e) => setWantInvoice(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4"
            />
          Θέλω τιμολόγιο (εταιρεία / ελεύθερος επαγγελματίας)
          </label>

          {wantInvoice && (
            <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Επωνυμία *
                  </label>
                  <input
                    name="company_name"
                    value={invoice.company_name}
                    onChange={handleInvoiceChange}
                    disabled={disabled}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ΑΦΜ *
                  </label>
                  <input
                    name="vat_number"
                    value={invoice.vat_number}
                    onChange={handleInvoiceChange}
                    disabled={disabled}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    ΔΟΥ *
                  </label>
                  <input
                    name="tax_office"
                    value={invoice.tax_office}
                    onChange={handleInvoiceChange}
                    disabled={disabled}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Είδος δραστηριότητας *
                  </label>
                  <input
                    name="profession"
                    value={invoice.profession}
                    onChange={handleInvoiceChange}
                    disabled={disabled}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Προϊόντα ή υπηρεσίες"
                  />
                </div>
              </div>

              <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={invoiceSameAsShipping}
                  onChange={handleToggleInvoiceSameAsShipping}
                  disabled={disabled}
                  className="h-3 w-3"
                />
                Ίδια διεύθυνση με αποστολή
              </label>

              {!invoiceSameAsShipping && (
                <div className="mt-2 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Διεύθυνση (γραμμή 1)
                      </label>
                      <input
                        name="address_line1"
                        value={invoice.address_line1}
                        onChange={handleInvoiceChange}
                        disabled={disabled}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Διεύθυνση (γραμμή 2)
                      </label>
                      <input
                        name="address_line2"
                        value={invoice.address_line2}
                        onChange={handleInvoiceChange}
                        disabled={disabled}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Πόλη
                      </label>
                      <input
                        name="city"
                        value={invoice.city}
                        onChange={handleInvoiceChange}
                        disabled={disabled}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Τ.Κ.
                      </label>
                      <input
                        name="postcode"
                        value={invoice.postcode}
                        onChange={handleInvoiceChange}
                        disabled={disabled}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Περιοχή / Νομός
                      </label>
                      <input
                        name="region"
                        value={invoice.region}
                        onChange={handleInvoiceChange}
                        disabled={disabled}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Χώρα
                      </label>
                      <input
                        name="country"
                        value={invoice.country}
                        onChange={handleInvoiceChange}
                        disabled={disabled}
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="flex justify-between items-center pt-2">
          <Link
            to="/cart"
            className="text-xs text-slate-600 hover:text-amber-700"
          >
            ← Επιστροφή στο καλάθι
          </Link>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {state === "saving" ? "Αποθήκευση…" : "Αποθήκευση & συνέχεια"}
          </button>
        </div>
      </form>
    </div>
  );
}
