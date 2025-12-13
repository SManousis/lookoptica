import { useState, useEffect } from "react";
import { CustomerAuthContext } from "./customerAuthShared";

const API = import.meta.env.VITE_API_BASE || "";

function parseErrorPayload(defaultMessage) {
  return async (res) => {
    try {
      const data = await res.json();
      if (data?.detail) {
        return typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail);
      }
    } catch (_) {
      /* ignore */
    }

    try {
      const text = await res.text();
      if (text) return text;
    } catch (_) {
      /* ignore */
    }
    return defaultMessage;
  };
}

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Optional: restore guest email & cached customer quickly
  useEffect(() => {
    const stored = localStorage.getItem("customer_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomer(parsed.customer || null);
        setGuestEmail(parsed.guestEmail || "");
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Hydrate from backend session cookie
  useEffect(() => {
    const controller = new AbortController();
    const loadSession = async () => {
      try {
        const res = await fetch(`${API}/auth/me`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setCustomer(data || null);
        } else {
          setCustomer(null);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setCustomer(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setHydrated(true);
        }
      }
    };

    loadSession();
    return () => controller.abort();
  }, []);

  // Persist lightweight snapshot locally
  useEffect(() => {
    const payload = { customer, guestEmail };
    localStorage.setItem("customer_auth", JSON.stringify(payload));
  }, [customer, guestEmail]);

  async function login({ email, password, turnstileToken }) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
        // Backend expects snake_case
        turnstile_token: turnstileToken || "",
      }),
    });

    if (!res.ok) {
      const message = await parseErrorPayload("Login failed")(res);
      throw new Error(message);
    }

    const data = await res.json();
    setCustomer(data || null);
    setGuestEmail("");
    return data;
  }

  async function register(data) {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        password_confirm: data.passwordConfirm ?? data.password,
        full_name: data.fullName ?? data.full_name ?? null,
        phone: data.phone ?? null,
        marketing_opt_in: data.marketing_opt_in ?? data.marketingOptIn ?? true,
      }),
    });

    if (!res.ok) {
      const message = await parseErrorPayload("Registration failed")(res);
      throw new Error(message);
    }

    const payload = await res.json();
    setCustomer(payload || null);
    setGuestEmail("");
    return payload;
  }

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {
      /* ignore network errors on logout */
    } finally {
      setCustomer(null);
      setGuestEmail("");
    }
  }

  const value = {
    customer,
    guestEmail,
    setGuestEmail,
    login,
    register,
    logout,
    isLoggedIn: !!customer,
    isHydrated: hydrated,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}
