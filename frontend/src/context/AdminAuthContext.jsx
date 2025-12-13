import { createContext, useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "";

export const AdminAuthContext = createContext(null);

function readCsrfCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )look_admin_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [csrfToken, setCsrfToken] = useState(() => readCsrfCookie());
  const [authLoading, setAuthLoading] = useState(true);

  const refreshAdmin = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${API}/admin/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Not authenticated");
      }
      const data = await res.json();
      setAdmin(data);
    } catch {
      setAdmin((prev) => (prev ? prev : null));
    } finally {
      setCsrfToken(readCsrfCookie());
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  function login(adminData, csrf) {
    setAdmin(adminData);
    setCsrfToken(csrf || readCsrfCookie());
  }

  async function logout() {
    try {
      const options = {
        method: "POST",
        credentials: "include",
      };
      if (csrfToken) {
        options.headers = { "X-CSRF-Token": csrfToken };
      }
      await fetch(`${API}/admin/auth/logout`, options);
    } catch {
      // ignore
    } finally {
      setAdmin(null);
      setCsrfToken(null);
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{ admin, login, logout, authLoading, refreshAdmin, csrfToken }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
