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
      <div className="hidden lg:flex w-[480px] flex-shrink-0 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* orbs */}
        <div className="absolute rounded-full pointer-events-none -top-24 -left-24 w-80 h-80 bg-blue-600/20 blur-3xl" />
        <div className="absolute rounded-full pointer-events-none -bottom-20 -right-20 w-72 h-72 bg-indigo-500/10 blur-3xl" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0 bg-blue-600 w-9 h-9 rounded-xl">
            <ShieldCheck size={18} color="#fff" strokeWidth={2} />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            FraudShield
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <h1 className="mb-4 text-4xl font-bold leading-snug text-white">
            Intelligent
            <br />
            Fraud Detection
            <br />
            <span className="text-blue-400">for Modern Banking</span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Real-time XGBoost-powered fraud analysis protecting every
            transaction you make.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 flex flex-col gap-3">
          {FEATURES.map(({ Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-3 p-3 border rounded-xl bg-white/5 border-white/8"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={15} color="#93c5fd" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex items-center justify-center flex-1 px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <ShieldCheck size={16} color="#fff" strokeWidth={2} />
            </div>
            <span className="font-bold text-slate-800">FraudShield</span>
          </div>

          <h2 className="mb-1 text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mb-8 text-sm text-slate-500">
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-xs font-bold tracking-widest uppercase text-slate-500">
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
                className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-all bg-white text-slate-900 placeholder-slate-400
                  ${focused === "email" ? "border-blue-500" : "border-slate-200 hover:border-slate-300"}`}
              />
            </div>

            <div>
              <label className="block mb-2 text-xs font-bold tracking-widest uppercase text-slate-500">
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
                className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-all bg-white text-slate-900 placeholder-slate-400
                  ${focused === "password" ? "border-blue-500" : "border-slate-200 hover:border-slate-300"}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mt-2"
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
          <div className="p-4 mt-8 border border-blue-100 rounded-xl bg-blue-50">
            <p className="mb-2 text-xs font-bold tracking-wide text-blue-700 uppercase">
              Demo credentials
            </p>
            <p className="font-mono text-xs text-blue-600">
              demo@fraudshield.com
            </p>
            <p className="font-mono text-xs text-blue-600">demo1234</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
