// src/pages/AccountLoginPage.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTurnstile } from "../hooks/useTurnstile";

const API = import.meta.env.VITE_API_BASE || "";

export default function AccountLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const { isEnabled: hasTurnstile, turnstileToken, resetTurnstile, containerRef: turnstileRef } =
    useTurnstile();

  const redirectTo = location.state?.from || "/checkout";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (hasTurnstile && !turnstileToken) {
      setErrorMsg("Please complete the Turnstile verification.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          ...(hasTurnstile ? { turnstileToken } : {}),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
      }

      await res.json(); // we ignore payload for now, rely on cookie
      navigate(redirectTo);
    } catch (err) {
      console.error(err);
      setErrorMsg("Λάθος email ή κωδικός.");
      if (hasTurnstile) {
        resetTurnstile();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-amber-800 mb-4">Σύνδεση</h1>

      {errorMsg && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Κωδικός</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        {hasTurnstile && (
          <div className="flex justify-center">
            <div ref={turnstileRef} className="my-2" />
          </div>
        )}

        {/* Later: Google / Facebook buttons here */}

        <button
          type="submit"
          disabled={loading || (hasTurnstile && !turnstileToken)}
          className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 mt-2"
        >
          {loading ? "Σύνδεση..." : "Σύνδεση"}
        </button>
      </form>

      <p className="mt-3 text-xs text-slate-600">
        Δεν έχεις λογαριασμό;{" "}
        <Link className="text-amber-700 font-medium hover:underline" to="/account/register">
          Δημιούργησε λογαριασμό
        </Link>
      </p>
    </div>
  );
}
