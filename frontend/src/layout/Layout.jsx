import { Link, Outlet, NavLink } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            {/* Later: logo image */}
            <span className="font-semibold tracking-tight text-lg">
              Look Optica
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? "font-medium text-teal-700"
                  : "text-slate-600 hover:text-teal-700"
              }
            >
              Αρχική
            </NavLink>
            <NavLink
              to="/shop/sunglasses"
              className={({ isActive }) =>
                isActive
                  ? "font-medium text-teal-700"
                  : "text-slate-600 hover:text-teal-700"
              }
            >
              Γυαλιά Ηλίου
            </NavLink>
            <NavLink
              to="/shop/frames"
              className={({ isActive }) =>
                isActive
                  ? "font-medium text-teal-700"
                  : "text-slate-600 hover:text-teal-700"
              }
            >
              Σκελετοί Οράσεως
            </NavLink>
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                isActive
                  ? "font-medium text-teal-700"
                  : "text-slate-600 hover:text-teal-700"
              }
            >
              Όλα τα προϊόντα
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* Simple footer for now */}
      <footer className="border-t bg-white text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between">
          <span>© {new Date().getFullYear()} Look Optica</span>
          <span>Χαλάνδρι, Αθήνα</span>
        </div>
      </footer>
    </div>
  );
}
