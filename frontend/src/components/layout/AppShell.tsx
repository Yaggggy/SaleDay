import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Package,
  QrCode,
  Receipt,
  Settings,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const saleNav = (saleId: string) => [
  { to: `/sales/${saleId}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { to: `/sales/${saleId}/scan`, label: "Scan", icon: QrCode },
  { to: `/sales/${saleId}/inventory`, label: "Inventory", icon: Package },
  { to: `/sales/${saleId}/transactions`, label: "Sales", icon: Receipt },
  { to: `/sales/${saleId}/team`, label: "Team", icon: Users },
  { to: `/sales/${saleId}/activity`, label: "Activity", icon: Activity },
  { to: `/sales/${saleId}/reports`, label: "Reports", icon: BarChart3 },
  { to: `/sales/${saleId}/settings`, label: "Settings", icon: Settings },
];

export function AppShell() {
  const { saleId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = saleId ? saleNav(saleId) : [];

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-paper-line bg-paper-soft/60 px-4 py-6">
        <button
          onClick={() => navigate("/sales")}
          className="flex items-center gap-2 px-2 mb-8 group"
        >
          <span className="h-9 w-9 rounded-xl bg-tag flex items-center justify-center rotate-[-8deg] group-hover:rotate-0 transition-transform">
            <Tag className="h-5 w-5 text-white" />
          </span>
          <span className="font-display text-xl font-bold">SaleDay</span>
        </button>

        <nav className="flex-1 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-tag text-sm font-medium transition-colors ${
                  isActive ? "bg-tag text-white shadow-tag" : "text-ink-soft hover:bg-ink/5"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          {!saleId && (
            <NavLink
              to="/sales"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-tag text-sm font-medium transition-colors ${
                  isActive ? "bg-tag text-white shadow-tag" : "text-ink-soft hover:bg-ink/5"
                }`
              }
            >
              <Store className="h-4 w-4" />
              My Sales
            </NavLink>
          )}
        </nav>

        <div className="border-t border-paper-line pt-4 mt-4">
          <p className="text-sm font-semibold truncate">{user?.full_name}</p>
          <p className="text-xs text-ink-faint truncate mb-3">{user?.email}</p>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="flex items-center gap-2 text-sm text-ink-faint hover:text-tag transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-paper-line bg-paper-soft/80 backdrop-blur sticky top-0 z-30">
          <button onClick={() => navigate("/sales")} className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-tag flex items-center justify-center rotate-[-8deg]">
              <Tag className="h-4 w-4 text-white" />
            </span>
            <span className="font-display font-bold">SaleDay</span>
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="text-ink-faint"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {saleId && (
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-paper-soft/95 backdrop-blur border-t border-paper-line grid grid-cols-4 px-2 py-1.5">
            {nav.slice(0, 4).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-tag text-[11px] font-medium ${
                    isActive ? "text-tag" : "text-ink-faint"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
