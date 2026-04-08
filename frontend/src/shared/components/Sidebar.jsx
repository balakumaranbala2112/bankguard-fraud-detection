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
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: SendHorizontal, label: "Send Money", to: "/send" },
  { icon: ClockArrowUp, label: "History", to: "/history" },
  { icon: TriangleAlert, label: "Alerts", to: "/alerts" },
  { icon: UserRound, label: "Profile", to: "/profile" },
];

const ADMIN_NAV = { icon: Star, label: "Admin", to: "/admin" };

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const navItems = isAdmin ? [...NAV, ADMIN_NAV] : NAV;
  const initials = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .sidebar {
          position: fixed; top: 0; left: 0; height: 100%; z-index: 40;
          width: var(--sidebar-w, 240px);
          background: #0f172a;
          display: flex; flex-direction: column;
          font-family: 'DM Sans', sans-serif;
          border-right: 1px solid rgba(255,255,255,0.06);
        }

        /* Logo */
        .sb-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 20px 20px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .sb-logo-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: #2563eb;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sb-logo-name {
          font-size: 14px; font-weight: 700; color: #f8fafc; margin: 0; line-height: 1.2;
        }
        .sb-logo-sub {
          font-size: 11px; color: #475569; margin: 0;
        }

        /* Balance */
        .sb-balance {
          margin: 14px 14px 0;
          padding: 14px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
        }
        .sb-balance-label {
          font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          color: #475569; margin: 0 0 6px;
        }
        .sb-balance-amount {
          font-family: 'DM Mono', monospace; font-size: 18px; font-weight: 500;
          color: #f8fafc; margin: 0 0 4px; line-height: 1;
        }
        .sb-balance-acct {
          font-family: 'DM Mono', monospace; font-size: 11px; color: #334155; margin: 0;
        }

        /* Nav */
        .sb-nav { flex: 1; padding: 12px 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }

        .sb-link {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 9px;
          font-size: 13px; font-weight: 500; color: #64748b;
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
          position: relative;
        }
        .sb-link:hover { background: rgba(255,255,255,0.05); color: #cbd5e1; }
        .sb-link.active { background: #1e3a8a; color: #eff6ff; }
        .sb-link.active .sb-link-icon { color: #93c5fd; }

        .sb-link-icon { flex-shrink: 0; color: inherit; transition: color 0.12s; }

        /* User footer */
        .sb-footer {
          padding: 12px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .sb-user {
          display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
          padding: 8px 10px; border-radius: 9px;
        }
        .sb-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #1e3a8a; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sb-avatar span { font-size: 12px; font-weight: 700; color: #93c5fd; }
        .sb-user-name  { font-size: 13px; font-weight: 600; color: #e2e8f0; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-user-email { font-size: 11px; color: #475569; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .sb-logout {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 9px 12px; border-radius: 9px;
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: #475569; transition: background 0.12s, color 0.12s;
        }
        .sb-logout:hover { background: rgba(239,68,68,0.08); color: #f87171; }
      `}</style>

      <aside className="sidebar">
        {/* ── Logo ── */}
        <div className="sb-logo">
          <div className="sb-logo-icon">
            <ShieldCheck size={18} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <p className="sb-logo-name">FraudShield</p>
            <p className="sb-logo-sub">Banking Platform</p>
          </div>
        </div>

        {/* ── Balance ── */}
        {user && (
          <div className="sb-balance">
            <p className="sb-balance-label">Available balance</p>
            <p className="sb-balance-amount">
              {formatCurrency(user.balance || 0)}
            </p>
            <p className="sb-balance-acct">{user.accountNumber || "—"}</p>
          </div>
        )}

        {/* ── Nav ── */}
        <nav className="sb-nav">
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sb-link${isActive ? " active" : ""}`
              }
            >
              <Icon size={16} strokeWidth={2} className="sb-link-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ── User + Logout ── */}
        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-avatar">
              <span>{initials}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="sb-user-name">{user?.name || "User"}</p>
              <p className="sb-user-email">{user?.email || ""}</p>
            </div>
          </div>
          <button className="sb-logout" onClick={handleLogout}>
            <LogOut size={15} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
