import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/useAdminAuth";

export default function ProtectAdminRoute({ children }) {
  const { admin, authLoading } = useAdminAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Επαλήθευση πρόσβασης...
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
