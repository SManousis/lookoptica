import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../context/customerAuthShared";
import { useTurnstile } from "../hooks/useTurnstile";

export default function CheckoutIdentifyPage() {
  const { isLoggedIn, customer, login, register, guestEmail, setGuestEmail } =
    useCustomerAuth();
  const {
    isEnabled: hasTurnstile,
    turnstileToken,
    resetTurnstile,
    containerRef: turnstileRef,
  } = useTurnstile();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regData, setRegData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [guestInput, setGuestInput] = useState(guestEmail || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // When a guest lands on the identify step, clear any guest drafts from prior sessions
  useEffect(() => {
    if (isLoggedIn) return;
    const prefix = "look_checkout_details:guest:";
    if (typeof window === "undefined") return;
    try {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      setGuestEmail("");
      setGuestInput("");
    } catch (err) {
      console.warn("Failed to clear guest checkout drafts", err);
    }
  }, [isLoggedIn, setGuestEmail]);

  // If already logged in, just show a small message and button to continue
  if (isLoggedIn && customer) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold text-amber-700">
          Checkout – Στοιχεία πελάτη
        </h1>
        <p className="text-sm text-slate-700">
          Εχετε συνδεθεί ως{" "}
          <span className="font-semibold">{customer.email}</span>.
        </p>
        <button
          onClick={() =>
            navigate("/checkout/details", {
              state: { guestEmail: customer?.email || "" },
            })
          }
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Συνέχεια στα στοιχεία αποστολής
        </button>
        <p className="text-xs text-slate-500">
          Όχι εσείς;{" "}
          <Link to="/account/logout" className="underline">
            Αποσύνδεση
          </Link>
        </p>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      if (hasTurnstile && !turnstileToken) {
        throw new Error("Παρακαλούμε ολοκληρώστε την επαλήθευση ασφαλείας.");
      }
      await login({
        email: loginEmail,
        password: loginPassword,
        turnstileToken: hasTurnstile ? turnstileToken : "",
      });
      navigate("/checkout/details");
    } catch (err) {
      setErrorMsg(
        err?.message ||
          "Δεν ήταν δυνατή η σύνδεση. Ελέγξτε τα στοιχεία σας."
      );
      if (hasTurnstile) {
        resetTurnstile();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      await register({
        email: regData.email,
        password: regData.password,
        passwordConfirm: regData.password,
        fullName: regData.fullName,
      });
      navigate("/checkout/details");
    } catch {
      setErrorMsg("Δεν ήταν δυνατή η εγγραφή. Δοκιμάστε ξανά.");
    } finally {
      setSaving(false);
    }
  };

  const handleGuest = (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!guestInput || !guestInput.includes("@")) {
      setErrorMsg(
        "Συμπληρώστε ένα έγκυρο email για να συνεχίσετε ως επισκέπτης."
      );
      return;
    }
    const normalized = guestInput.trim();
    setGuestEmail(normalized);
    navigate("/checkout/details", { state: { guestEmail: normalized } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-amber-700">
        Checkout – Ποιος είστε;
      </h1>
      <p className="text-sm text-slate-700">
        Μπορείτε να ολοκληρώσετε την παραγγελία με λογαριασμό ή ως επισκέπτης.
      </p>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Column 1: Login */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Έχω ήδη λογαριασμό
          </h2>
          <form onSubmit={handleLogin} className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Κωδικός
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            {hasTurnstile && (
              <div className="flex justify-center">
                <div ref={turnstileRef} className="my-2" />
              </div>
            )}
            <button
              type="submit"
              disabled={saving || (hasTurnstile && !turnstileToken)}
              className="mt-2 w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Σύνδεση
            </button>
          </form>
          <p className="text-[11px] text-slate-500">
            Ξεχάσατε τον κωδικό; (feature για αργότερα)
          </p>
        </div>

        {/* Column 2: Register */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Δημιουργία λογαριασμού
          </h2>
          <form onSubmit={handleRegister} className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Ονοματεπώνυμο
              </label>
              <input
                type="text"
                value={regData.fullName}
                onChange={(e) =>
                  setRegData((prev) => ({ ...prev, fullName: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={regData.email}
                onChange={(e) =>
                  setRegData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Κωδικός
              </label>
              <input
                type="password"
                value={regData.password}
                onChange={(e) =>
                  setRegData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Εγγραφή & συνέχεια
            </button>
          </form>
          <p className="text-[11px] text-slate-500">
            Με την εγγραφή αποδέχεστε τους{" "}
            <Link to="/terms" className="underline">
              όρους χρήσης
            </Link>
            .
          </p>
        </div>

        {/* Column 3: Guest checkout */}
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Συνέχεια ως επισκέπτης
          </h2>
          <form onSubmit={handleGuest} className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Email για επιβεβαίωση & ενημερώσεις
              </label>
              <input
                type="email"
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="example@mail.com"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Συνέχεια χωρίς λογαριασμό
            </button>
          </form>
          <p className="text-[11px] text-slate-500">
            Θα χρησιμοποιήσουμε το email μόνο για την παραγγελία και την
            απόδειξη.
          </p>
        </div>
      </div>
    </div>
  );
}
