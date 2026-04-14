import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/shared/utils";
import {
  Copy, Check, LogOut, User, Mail, Phone,
  MapPin, Calendar, CreditCard, AlertTriangle,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function maskAccountUI(accNo) {
  if (!accNo) return "XXXXXXXXXX";
  return "•".repeat(Math.max(0, accNo.length - 2)) + accNo.slice(-2);
}

export default function ProfilePage() {
  const { user, refreshProfile, logout } = useAuth();
  const [copied, setCopied]               = useState(false);
  const [showLogout, setShowLogout]       = useState(false);

  useEffect(() => { refreshProfile(); }, []);

  const copyAccount = () => {
    if (!user?.accountNumber) return;
    navigator.clipboard.writeText(user.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Account number copied!");
  };

  if (!user) return <p className="text-center mt-12 text-sm text-slate-500">Loading profile…</p>;

  const details = [
    { Icon: User,     label: "Full Name",       value: user.name || "-" },
    { Icon: Mail,     label: "Email",            value: user.email || "-" },
    { Icon: Phone,    label: "Phone",            value: user.phone || "-" },
    { Icon: MapPin,   label: "Usual Location",   value: user.usualLocation || "Not set yet" },
    { Icon: Calendar, label: "Member Since",     value: formatDate(user.createdAt) },
  ];

  return (
    <>
      <div className="max-w-xl pb-16 font-sans text-slate-900">
        <h1 className="text-[clamp(1.2rem,2.5vw,1.5rem)] font-bold text-slate-900 m-0 mb-6">Profile</h1>

        {/* Avatar card */}
        <motion.div
          className="bg-white border border-slate-200 rounded-2xl mb-4 overflow-hidden"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 p-6 flex-wrap">
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-[22px] font-bold text-white shrink-0">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-slate-900 m-0 mb-0.5">{user.name || "-"}</p>
              <p className="text-[13px] text-slate-500 m-0 mb-0.5">{user.email || "-"}</p>
              <p className="text-[13px] text-slate-500 m-0">{user.phone || "-"}</p>
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide
              ${user.role === "admin" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
              {user.role || "user"}
            </span>
          </div>
        </motion.div>

        {/* Balance card */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-6 mb-4 text-white"
          style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%)" }}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        >
          <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full bg-white/[0.07] pointer-events-none" />
          <p className="text-[10px] tracking-[0.1em] uppercase text-white/55 m-0 mb-2">Available Balance</p>
          <p className="font-mono text-[clamp(1.8rem,4vw,2.4rem)] font-medium m-0 mb-5 leading-none">
            {formatCurrency(user.balance || 0)}
          </p>
          <div className="flex items-center gap-2.5">
            <CreditCard size={14} color="rgba(255,255,255,0.5)" />
            <span className="font-mono text-[13px] text-white/80 tracking-wide">
              {maskAccountUI(user.accountNumber)}
            </span>
            <button
              onClick={copyAccount}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 border-none cursor-pointer text-[12px] font-semibold text-white/90 transition-colors"
            >
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          className="bg-white border border-slate-200 rounded-2xl mb-4 overflow-hidden"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-slate-400 px-5 pt-4 m-0">
            Account Details
          </p>
          {details.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2.5">
                <Icon size={15} className="text-slate-400 shrink-0" strokeWidth={2} />
                <span className="text-[13px] text-slate-500 font-medium">{label}</span>
              </div>
              <span className="text-[13px] text-slate-900 font-semibold text-right break-all">{value}</span>
            </div>
          ))}
        </motion.div>

        {/* Sign out button */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <button
            onClick={() => setShowLogout(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-[1.5px] border-red-200 bg-white hover:bg-red-50 hover:border-red-300 text-red-600 text-[14px] font-semibold cursor-pointer transition-colors"
          >
            <LogOut size={15} strokeWidth={2} />
            Sign out of BankGuard
          </button>
        </motion.div>
      </div>

      {/* Logout confirmation modal */}
      <AnimatePresence>
        {showLogout && (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-5 bg-slate-900/45 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowLogout(false)}
          >
            <motion.div
              className="bg-white rounded-[20px] p-8 max-w-sm w-full text-center shadow-2xl"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[60px] h-[60px] rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={26} color="#dc2626" strokeWidth={2} />
              </div>
              <h2 className="text-[18px] font-bold text-slate-900 m-0 mb-2">Sign out?</h2>
              <p className="text-[14px] text-slate-500 m-0 mb-6 leading-relaxed">
                You'll be redirected to the login page. Note your account details before leaving.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowLogout(false)}
                  className="flex-1 py-3 rounded-xl border-[1.5px] border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-[14px] font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { logout(); window.location.href = "/login"; }}
                  className="flex-1 py-3 rounded-xl border-none bg-red-600 hover:bg-red-700 text-white text-[14px] font-semibold cursor-pointer transition-colors"
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
