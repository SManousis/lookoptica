// src/pages/AccountRegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "";

export default function AccountRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    marketing_opt_in: true,
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Registration failed");
      }

      // auto-login via cookie; redirect to checkout or account page
      navigate("/checkout");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-amber-800 mb-4">
        Δημιουργία λογαριασμού
      </h1>

      {errorMsg && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-slate-700">Ονοματεπώνυμο</label>
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
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
          <label className="block text-xs font-medium text-slate-700">Κωδικός (τουλάχιστον 8 χαρακτήρες)</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">Τηλέφωνο (προαιρετικό)</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <input
            id="marketing_opt_in"
            type="checkbox"
            name="marketing_opt_in"
            checked={form.marketing_opt_in}
            onChange={handleChange}
            className="h-4 w-4"
          />
          <label htmlFor="marketing_opt_in">
            Θέλω να λαμβάνω ενημερωτικά email (μπορείς να το αλλάξεις ανά πάσα στιγμή).
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 mt-2"
        >
          {loading ? "Δημιουργία..." : "Δημιουργία λογαριασμού"}
        </button>
      </form>

      <p className="mt-3 text-xs text-slate-600">
        Έχεις ήδη λογαριασμό;{" "}
        <Link className="text-amber-700 font-medium hover:underline" to="/account/login">
          Σύνδεση
        </Link>
      </p>
    </div>
  );
}
