import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <p className="text-sm text-slate-600">
        Welcome <strong>{admin?.email}</strong>
      </p>

      <div className="space-x-3">
        <Link to="/admin/products" className="text-amber-700 underline text-sm">
          Sunglasses & Frames
        </Link>
        <Link to="/admin/products/deleted" className="text-amber-700 underline text-sm">
          Deleted products
        </Link>
        <Link to="/admin/media" className="text-amber-700 underline text-sm">
          Media library
        </Link>
        <Link to="/admin/contact-lenses" className="text-amber-700 underline text-sm">
          Contact lenses
        </Link>
        <Link to="/admin/orders" className="text-amber-700 underline text-sm">
          Orders
        </Link>

        <button
          onClick={logout}
          className="text-xs text-red-600 underline cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
