import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

const API = import.meta.env.VITE_API_BASE || "";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");

  const { login } = useAdminAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${API}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Invalid credentials");
      }

      const data = await res.json();
      login(data);             // save admin to context & localStorage
      navigate("/admin");      // redirect to admin dashboard
    } catch (err) {
      setState("error");
      setErrorMsg(err.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-xl font-semibold mb-6">Admin Login</h1>

        {state === "error" && (
          <div className="mb-4 text-red-700 bg-red-100 border border-red-300 rounded-lg p-2 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full py-2 rounded-lg bg-amber-700 text-white font-medium disabled:opacity-60"
          >
            {state === "loading" ? "Logging in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
