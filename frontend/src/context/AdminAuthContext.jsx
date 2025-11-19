import { createContext,  useState } from "react";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null); 
  // admin = { email, full_name, roles, ... }

  function login(adminData) {
    setAdmin(adminData);
    // Temporary phase 1: persist in localStorage
    localStorage.setItem("adminUser", JSON.stringify(adminData));
  }

  function logout() {
    setAdmin(null);
    localStorage.removeItem("adminUser");
  }

  // Restore session on reload
  useState(() => {
    const saved = localStorage.getItem("adminUser");
    if (saved) setAdmin(JSON.parse(saved));
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}


