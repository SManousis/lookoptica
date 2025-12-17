import { useEffect, useState } from "react";
import { useAdminAuth } from "../../context/useAdminAuth";
import { adminApiFetch } from "../../utils/adminApiFetch";

const API = import.meta.env.VITE_API_BASE || "";

export default function AdminOrdersPage() {
  const { csrfToken } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    setState("loading");
    setErrorMsg("");

    adminApiFetch(`${API}/admin/orders`, { method: "GET" }, csrfToken)
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load orders");
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setOrders(Array.isArray(data) ? data : []);
        setState("ok");
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load orders", err);
        setErrorMsg(err.message || "Failed to load orders");
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, [csrfToken]);

  const formatAddress = (order) => {
    const parts = [
      order.shipping_address_line1,
      order.shipping_address_line2,
      [order.shipping_postcode, order.shipping_city]
        .filter(Boolean)
        .join(" ")
        .trim(),
      order.shipping_region,
      order.shipping_country,
    ]
      .map((part) => (part || "").trim())
      .filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-amber-800">Orders</h1>
        <p className="text-sm text-slate-600">
          Overview of the orders placed via checkout (product codes, payment method, and contact details).
        </p>
      </header>

      {state === "loading" && (
        <div className="text-sm text-slate-500">Loading orders…</div>
      )}

      {state === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg || "Failed to load orders."}
        </div>
      )}

      {state === "ok" && orders.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          No orders have been recorded yet.
        </div>
      )}

      {state === "ok" && orders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Product Codes</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Payment Method</th>
                <th className="px-3 py-2">Shipping Address</th>
                <th className="px-3 py-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t last:border-b-0">
                  <td className="px-3 py-2 font-medium text-slate-800">{order.id}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {order.product_codes && order.product_codes.length > 0
                      ? order.product_codes.join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <div className="flex flex-col text-xs">
                      <span className="font-medium text-slate-800">
                        {order.contact_name || "—"}
                      </span>
                      <span>{order.contact_email || "—"}</span>
                      <span>{order.contact_phone || "—"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{order.payment_method}</td>
                  <td className="px-3 py-2 text-slate-700 text-xs">
                    {formatAddress(order) || "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">
                    {order.created_at
                      ? new Date(order.created_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
