// src/pages/AccountHomePage.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCustomerAuth } from "../context/customerAuthShared";
import { usePageSEO } from "../hooks/usePageSEO";

const API = import.meta.env.VITE_API_BASE || "";

const PAYMENT_LABEL = {
  cod: "Αντικαταβολή",
  cash: "Μετρητά στο κατάστημα",
  card: "Κάρτα",
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("el-GR");
  } catch {
    return iso;
  }
}

function OrderHistory() {
  const [state, setState] = useState("loading");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const res = await fetch(`${API}/customer/orders`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load orders");
        const data = await res.json();
        if (cancelled) return;
        setOrders(Array.isArray(data) ? data : []);
        setState("ok");
      } catch {
        if (cancelled) return;
        setState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <div className="text-sm text-slate-500">Φόρτωση παραγγελιών...</div>;
  }

  if (state === "error") {
    return (
      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
        Δεν ήταν δυνατή η φόρτωση του ιστορικού παραγγελιών.
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-sm text-slate-600">
        Δεν έχετε πραγματοποιήσει ακόμα κάποια παραγγελία.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="rounded-xl border bg-white p-4 space-y-1 text-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-slate-800">
              Παραγγελία #{order.id}
            </span>
            <span className="text-xs text-slate-500">{formatDate(order.created_at)}</span>
          </div>
          <div className="text-slate-600">
            {order.product_codes?.length || 0} προϊόν
            {order.product_codes?.length === 1 ? "" : "α"} &middot;{" "}
            {PAYMENT_LABEL[order.payment_method] || order.payment_method}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AccountHomePage() {
  usePageSEO({ title: "Ο Λογαριασμός μου | Look Οπτικά", noindex: true });

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
    <div className="max-w-xl mx-auto space-y-6">
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

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-amber-800">Οι παραγγελίες μου</h2>
        <OrderHistory />
      </div>
    </div>
  );
}
