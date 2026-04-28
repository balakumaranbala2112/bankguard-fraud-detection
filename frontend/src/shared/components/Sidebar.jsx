import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/shared/utils";
import {
  LayoutDashboard,
  SendHorizontal,
  ClockArrowUp,
  TriangleAlert,
  UserRound,
  ShieldCheck,
  LogOut,
  Star,
  Menu,
  X,
  PieChart,
  BookUser,
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: SendHorizontal,  label: "Send Money", to: "/send" },
  { icon: ClockArrowUp,   label: "History",    to: "/history" },
  { icon: BookUser,       label: "Contacts",   to: "/contacts" },
  { icon: TriangleAlert,  label: "Alerts",     to: "/alerts" },
  { icon: PieChart,       label: "Analytics",  to: "/analytics" },
  { icon: UserRound,      label: "Profile",    to: "/profile" },
];

const ADMIN_NAV = { icon: Star, label: "Admin", to: "/admin" };

/* ── shared nav link ── */
function SidebarLink({ icon: Icon, label, to, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13px] font-medium transition-colors duration-100 no-underline
         ${isActive
           ? "bg-blue-900 text-blue-100 [&>svg]:text-blue-300"
           : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`
      }
    >
      <Icon size={16} strokeWidth={2} className="shrink-0" />
      {label}
    </NavLink>
  );
}

/* ── sidebar inner content ── */
function SidebarContent({ user, navItems, onNav, onLogout }) {
  const initials = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06] justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-100 m-0 leading-tight">BankGuard</p>
            <p className="text-[11px] text-slate-500 m-0">Banking Platform</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      {user && (
        <div className="mx-3.5 mt-3.5 px-4 py-3.5 bg-white/[0.04] border border-white/[0.07] rounded-xl">
          <p className="text-[10px] tracking-widest uppercase text-slate-500 mb-1.5 m-0">
            Available balance
          </p>
          <p className="font-mono text-[18px] font-medium text-slate-100 m-0 mb-1 leading-none">
            {formatCurrency(user.balance || 0)}
          </p>
          <p className="font-mono text-[11px] text-slate-600 m-0">
            {user.accountNumber || "—"}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ icon, label, to }) => (
          <SidebarLink key={to} icon={icon} label={label} to={to} onClick={onNav} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
            <span className="text-[12px] font-bold text-blue-300">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-200 m-0 truncate">{user?.name || "User"}</p>
            <p className="text-[11px] text-slate-500 m-0 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[9px] bg-transparent border-none cursor-pointer text-[13px] font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={15} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAdmin ? [...NAV, ADMIN_NAV] : NAV;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-slate-950 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck size={15} color="#fff" strokeWidth={2} />
          </div>
          <span className="text-[14px] font-bold text-slate-100">BankGuard</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile drawer backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full z-50 w-72 bg-slate-950 border-r border-white/[0.06] transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="absolute top-3 right-3">
          {/* Close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white border-none bg-transparent cursor-pointer"
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        </div>
        <SidebarContent
          user={user}
          navItems={navItems}
          onNav={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 flex-col bg-slate-950 border-r border-white/[0.06] z-40">
        <SidebarContent
          user={user}
          navItems={navItems}
          onNav={undefined}
          onLogout={handleLogout}
        />
      </aside>
    </>
  );
}
