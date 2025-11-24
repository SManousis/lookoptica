import { useState, useEffect } from "react";
import { CustomerAuthContext } from "./customerAuthShared";

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [guestEmail, setGuestEmail] = useState("");

  // Optional: restore from localStorage
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

  useEffect(() => {
    const payload = { customer, guestEmail };
    localStorage.setItem("customer_auth", JSON.stringify(payload));
  }, [customer, guestEmail]);

  // ---- these will later call your FastAPI endpoints ----

  async function login(email, password) {
    // TODO: replace with real API call
    // const res = await fetch(`${API}/api/shop/auth/login`, {...})
    // ...
    setCustomer({ email });
    setGuestEmail("");
  }

  async function register(data) {
    // TODO: replace with real API call
    // const res = await fetch(`${API}/api/shop/auth/register`, {...})
    // ...
    setCustomer({ email: data.email, fullName: data.fullName });
    setGuestEmail("");
  }

  function logout() {
    setCustomer(null);
    setGuestEmail("");
    // TODO: also tell backend to destroy session when you have it
  }

  const value = {
    customer,
    guestEmail,
    setGuestEmail,
    login,
    register,
    logout,
    isLoggedIn: !!customer,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

