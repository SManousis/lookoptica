// src/pages/AccountHomePage.jsx
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCustomerAuth } from "../context/customerAuthShared";

export default function AccountHomePage() {
  const navigate = useNavigate();
  const { customer, isLoggedIn, logout } = useCustomerAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/account/login", { replace: true, state: { from: "/account" } });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-amber-800">Ο λογαριασμός μου</h1>
      <div className="rounded-xl border bg-white p-4 space-y-2 text-sm text-slate-800">
        <div>
          <span className="font-semibold text-slate-700">Email:</span>{" "}
          <span>{customer?.email}</span>
        </div>
        {customer?.full_name && (
          <div>
            <span className="font-semibold text-slate-700">Όνομα:</span>{" "}
            <span>{customer.full_name}</span>
          </div>
        )}
        {customer?.phone && (
          <div>
            <span className="font-semibold text-slate-700">Τηλέφωνο:</span>{" "}
            <span>{customer.phone}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          to="/checkout/details"
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Συνέχεια στο checkout
        </Link>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Αποσύνδεση
        </button>
      </div>
    </div>
  );
}
