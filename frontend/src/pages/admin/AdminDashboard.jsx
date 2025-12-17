import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/useAdminAuth";

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <p className="text-sm text-slate-600">
        Καλωσήρθατε <strong>{admin?.email}</strong>
      </p>

      <div className="space-x-3">
        <Link
          to="/admin/products"
          className="text-amber-700 underline text-sm"
        >
          Σκελετοί και Γυαλιά Ηλίου
        </Link>
        <Link
          to="/admin/contact-lenses"
          className="text-amber-700 underline text-sm"
        >
          Available contact lenses
        </Link>
        <Link
          to="/admin/orders"
          className="text-amber-700 underline text-sm"
        >
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
