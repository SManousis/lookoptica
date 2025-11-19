import { Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <p className="text-sm text-slate-600">
        Συνδεδεμένος ως <strong>{admin?.email}</strong>
      </p>

      <div className="space-x-3">
        <Link
          to="/admin/products"
          className="text-amber-700 underline text-sm"
        >
          Διαχείριση προϊόντων
        </Link>

        <button
          onClick={logout}
          className="text-xs text-red-600 underline"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
