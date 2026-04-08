import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency, maskAccount } from "@/shared/utils";
import {
  Copy,
  Check,
  LogOut,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";

// Safe formatDate function to prevent invalid time errors
function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { user, refreshProfile, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  // Refresh profile on mount
  useEffect(() => {
    refreshProfile();
  }, []);

  // Copy account number to clipboard
  const copyAccount = () => {
    if (!user?.accountNumber) return;
    navigator.clipboard.writeText(user.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Account number copied!");
  };

  if (!user) return <p className="pf-loading">Loading profile...</p>;

  const details = [
    { Icon: User, label: "Full Name", value: user.name || "-" },
    { Icon: Mail, label: "Email", value: user.email || "-" },
    { Icon: Phone, label: "Phone", value: user.phone || "-" },
    {
      Icon: MapPin,
      label: "Usual Location",
      value: user.usualLocation || "Chennai",
    },
    {
      Icon: Calendar,
      label: "Member Since",
      value: formatDate(user.createdAt),
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .pf-root { font-family: 'DM Sans', sans-serif; max-width: 600px; color: #0f172a; padding-bottom: 60px; }
        .pf-title { font-size: clamp(1.2rem, 2.5vw, 1.5rem); font-weight: 700; color: #0f172a; margin: 0 0 24px; }
        .pf-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 16px; overflow: hidden; }
        .pf-avatar-card { padding: 24px; display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .pf-avatar { width: 60px; height: 60px; border-radius: 16px; background: linear-gradient(135deg, #2563eb, #1d4ed8); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .pf-avatar-name { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 3px; }
        .pf-avatar-email, .pf-avatar-phone { font-size: 13px; color: #64748b; margin: 0 0 2px; }
        .pf-role-pill { margin-left: auto; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .pf-role-admin { background: #eff6ff; color: #1d4ed8; }
        .pf-role-user { background: #f0fdf4; color: #16a34a; }
        .pf-balance-card { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%); border-radius: 16px; padding: 24px; margin-bottom: 16px; color: #fff; position: relative; overflow: hidden; }
        .pf-balance-card::after { content: ''; position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.07); pointer-events: none; }
        .pf-balance-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin: 0 0 8px; }
        .pf-balance-amount { font-family: 'DM Mono', monospace; font-size: clamp(1.8rem, 4vw, 2.4rem); font-weight: 500; margin: 0 0 18px; line-height: 1; }
        .pf-acct-row { display: flex; align-items: center; gap: 10px; }
        .pf-acct-num { font-family: 'DM Mono', monospace; font-size: 13px; color: rgba(255,255,255,0.8); }
        .pf-copy-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 7px; background: rgba(255,255,255,0.15); border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.9); transition: background 0.15s; }
        .pf-copy-btn:hover { background: rgba(255,255,255,0.25); }
        .pf-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; padding: 16px 20px 0; margin: 0; }
        .pf-detail-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 20px; border-bottom: 1px solid #f8fafc; }
        .pf-detail-row:last-child { border-bottom: none; }
        .pf-detail-left { display: flex; align-items: center; gap: 10px; }
        .pf-detail-icon { color: #94a3b8; flex-shrink: 0; }
        .pf-detail-label { font-size: 13px; color: #64748b; font-weight: 500; }
        .pf-detail-val { font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; }
        .pf-logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 11px; border: 1.5px solid #fecaca; background: #fff; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #dc2626; transition: background 0.15s, border-color 0.15s; }
        .pf-logout-btn:hover { background: #fef2f2; border-color: #f87171; }
        .pf-loading { text-align: center; margin-top: 50px; font-size: 14px; color: #64748b; }
      `}</style>

      <div className="pf-root">
        <h1 className="pf-title">Profile</h1>

        {/* Avatar */}
        <motion.div
          className="pf-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pf-avatar-card">
            <div className="pf-avatar">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="pf-avatar-name">{user.name || "-"}</p>
              <p className="pf-avatar-email">{user.email || "-"}</p>
              <p className="pf-avatar-phone">{user.phone || "-"}</p>
            </div>
            <span
              className={`pf-role-pill ${user.role === "admin" ? "pf-role-admin" : "pf-role-user"}`}
            >
              {user.role || "user"}
            </span>
          </div>
        </motion.div>

        {/* Balance */}
        <motion.div
          className="pf-balance-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="pf-balance-label">Available Balance</p>
          <p className="pf-balance-amount">
            {formatCurrency(user.balance || 0)}
          </p>
          <div className="pf-acct-row">
            <CreditCard size={14} color="rgba(255,255,255,0.5)" />
            <span className="pf-acct-num">
              {user.accountNumber || "XXXX-XXXX"}
            </span>
            <button className="pf-copy-btn" onClick={copyAccount}>
              {copied ? (
                <>
                  <Check size={12} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          className="pf-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="pf-section-title">Account Details</p>
          {details.map(({ Icon, label, value }) => (
            <div key={label} className="pf-detail-row">
              <div className="pf-detail-left">
                <Icon size={15} className="pf-detail-icon" strokeWidth={2} />
                <span className="pf-detail-label">{label}</span>
              </div>
              <span className="pf-detail-val">{value}</span>
            </div>
          ))}
        </motion.div>

        {/* Sign out */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            className="pf-logout-btn"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
          >
            <LogOut size={15} strokeWidth={2} />
            Sign out of FraudShield
          </button>
        </motion.div>
      </div>
    </>
  );
}
