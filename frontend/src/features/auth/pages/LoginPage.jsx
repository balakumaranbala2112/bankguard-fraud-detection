import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  ShieldCheck,
  Loader2,
  Brain,
  MessageSquare,
  Zap,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    Icon: Brain,
    label: "ML-powered risk scoring",
    desc: "XGBoost analyses every transaction",
  },
  {
    Icon: MessageSquare,
    label: "OTP verification via SMS",
    desc: "Instant codes sent to your phone",
  },
  {
    Icon: Zap,
    label: "Real-time fraud alerts",
    desc: "Notified within milliseconds",
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [focused, setFocused] = useState(null);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password)
      return toast.error("Please fill all fields");
    const result = await login(form.email, form.password);
    if (result.success) {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else toast.error(result.error);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[460px] flex-shrink-0 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* diagonal accent lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <line x1="0" y1="0" x2="460" y2="100%" stroke="white" strokeWidth="1" />
          <line x1="100" y1="0" x2="560" y2="100%" stroke="white" strokeWidth="1" />
          <line x1="-100" y1="0" x2="360" y2="100%" stroke="white" strokeWidth="1" />
          <line x1="0" y1="0" x2="460" y2="50%" stroke="white" strokeWidth="0.5" />
          <rect x="12" y="12" width="calc(100% - 24px)" height="calc(100% - 24px)" rx="6" fill="none" stroke="white" strokeWidth="0.6" />
        </svg>

        {/* orbs */}
        <div className="absolute rounded-full pointer-events-none -top-28 -left-28 w-96 h-96 bg-blue-600/20 blur-3xl" />
        <div className="absolute rounded-full pointer-events-none -bottom-24 -right-24 w-80 h-80 bg-indigo-500/15 blur-3xl" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0 bg-blue-600 w-9 h-9 rounded-xl shadow-lg shadow-blue-900/40">
            <ShieldCheck size={18} color="#fff" strokeWidth={2} />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            BankGuard
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-3">
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-blue-400">
            Secure by default
          </p>
          <h1 className="text-[2.6rem] font-bold leading-[1.15] tracking-tight text-white">
            Intelligent
            <br />
            Fraud Detection
            <br />
            <span className="text-blue-400">for Modern Banking</span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
            Real-time XGBoost-powered fraud analysis protecting every
            transaction you make.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 flex flex-col gap-3">
          {FEATURES.map(({ Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-400/10">
                <Icon size={15} color="#93c5fd" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex items-center justify-center flex-1 px-5 py-10 relative bg-slate-50">
        {/* subtle grid on right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* faint center glow to lift form */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(255,255,255,0.9)_0%,transparent_100%)]" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <ShieldCheck size={16} color="#fff" strokeWidth={2} />
            </div>
            <span className="font-bold text-slate-800">BankGuard</span>
          </div>

          <h2 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">
            Sign in
          </h2>
          <p className="mb-8 text-sm text-slate-500">
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400">
                Email address
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-all bg-white text-slate-900 placeholder-slate-300
                  ${focused === "email"
                    ? "border-blue-500 shadow-sm shadow-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                  }`}
              />
            </div>

            <div>
              <label className="block mb-2 text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400">
                Password
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-all bg-white text-slate-900 placeholder-slate-300
                  ${focused === "password"
                    ? "border-blue-500 shadow-sm shadow-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                  }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-blue-200 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in{" "}
                  <ArrowRight
                    size={15}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-600 hover:underline"
            >
              Create one
            </Link>
          </p>

          {/* Demo creds */}
          <div className="p-4 mt-8 rounded-xl bg-blue-50 border border-blue-100">
            <p className="mb-2 text-[10px] font-bold tracking-[0.1em] text-blue-600 uppercase">
              Demo credentials
            </p>
            <p className="font-mono text-xs text-blue-500">
              demo@BankGuard.com
            </p>
            <p className="font-mono text-xs text-blue-500">demo1234</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}