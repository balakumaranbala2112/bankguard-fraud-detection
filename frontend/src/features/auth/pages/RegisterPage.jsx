import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Lock,
} from "lucide-react";

const BENEFITS = [
  "ML fraud detection on every transaction",
  "Real-time transaction monitoring",
  "Instant SMS alerts & OTP verification",
  "24/7 account security",
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [focused, setFocused] = useState(null);
  const [touched, setTouched] = useState({});

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleBlur = (f) => {
    setTouched((p) => ({ ...p, [f]: true }));
    setFocused(null);
  };

  const err = (f) => {
    if (!touched[f]) return null;
    if (!form[f]) return "This field is required";
    if (f === "email" && !/^\S+@\S+\.\S+$/.test(form.email))
      return "Enter a valid email";
    if (f === "password" && form.password.length < 6) return "Min 6 characters";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true });
    if (!form.name || !form.email || !form.phone || !form.password)
      return toast.error("All fields are required");
    if (form.password.length < 6)
      return toast.error("Password must be at least 6 characters");
    const result = await register(form);
    if (result.success) {
      toast.success("Account created!");
      navigate("/dashboard");
    } else toast.error(result.error);
  };

  const inputCls = (f) =>
    `w-full px-4 py-2.5 rounded-xl text-sm text-slate-900 placeholder-slate-300 outline-none border-2 transition-all duration-150 bg-white
     ${focused === f
      ? "border-blue-500 shadow-sm shadow-blue-100"
      : err(f)
        ? "border-rose-300 bg-rose-50/60"
        : "border-slate-200 hover:border-slate-300"
    }`;

  const fields = [
    {
      name: "name",
      label: "Full name",
      Icon: User,
      type: "text",
      placeholder: "Balakumaran K",
    },
    {
      name: "email",
      label: "Email address",
      Icon: Mail,
      type: "email",
      placeholder: "you@example.com",
    },
    {
      name: "phone",
      label: "Phone number",
      Icon: Phone,
      type: "tel",
      placeholder: "+91 9876543210",
      hint: "Used for OTP fraud verification",
    },
    {
      name: "password",
      label: "Password",
      Icon: Lock,
      type: "password",
      placeholder: "Min 6 characters",
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[460px] flex-shrink-0 bg-slate-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* grid */}
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
          <line x1="120" y1="0" x2="580" y2="100%" stroke="white" strokeWidth="1" />
          <line x1="-120" y1="0" x2="340" y2="100%" stroke="white" strokeWidth="1" />
          <line x1="0" y1="30%" x2="460" y2="0" stroke="white" strokeWidth="0.5" />
          <line x1="0" y1="70%" x2="460" y2="40%" stroke="white" strokeWidth="0.5" />
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
        <div className="relative z-10 space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-blue-400">
              Get started for free
            </p>
            <h1 className="text-[2.4rem] font-bold text-white leading-[1.2] tracking-tight">
              Join the future
              <br />
              of <span className="text-blue-400">secure banking</span>
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-slate-400">
            Create your account and get peace of mind with every transaction you
            make.
          </p>

          <div className="pt-1 space-y-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div className="flex items-center justify-center flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/10">
                  <CheckCircle2 size={11} color="#93c5fd" strokeWidth={2.5} />
                </div>
                <p className="text-sm text-slate-400">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-600">
          Trusted by 50,000+ users worldwide
        </p>
      </div>

      {/* ── Right: form ── */}
      <div className="flex items-center justify-center flex-1 px-6 py-10 relative bg-slate-50">
        {/* subtle grid on right */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* center glow to lift form */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(255,255,255,0.9)_0%,transparent_100%)]" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-xl">
              <ShieldCheck size={16} color="#fff" strokeWidth={2} />
            </div>
            <span className="text-sm font-bold text-slate-800">
              BankGuard
            </span>
          </div>

          <div className="mb-7">
            <h2 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">
              Create account
            </h2>
            <p className="text-sm text-slate-400">
              Fill in the details below to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ name, label, Icon, type, placeholder, hint }) => (
              <div key={name}>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2">
                  <Icon size={11} strokeWidth={2.5} />
                  {label}
                </label>
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  onFocus={() => setFocused(name)}
                  onBlur={() => handleBlur(name)}
                  placeholder={placeholder}
                  className={inputCls(name)}
                />
                {err(name) ? (
                  <p className="text-xs text-rose-500 mt-1.5 ml-1">
                    {err(name)}
                  </p>
                ) : hint ? (
                  <p className="text-xs text-slate-400 mt-1.5 ml-1">{hint}</p>
                ) : null}
                {name === "password" && form.password.length >= 6 && (
                  <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1.5 ml-1">
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    Strong enough
                  </p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full gap-2 py-2.5 mt-2 text-sm font-semibold text-white transition-all bg-blue-600 shadow-md shadow-blue-200 group rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account{" "}
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-300">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center w-full py-3 text-sm font-semibold transition-all border-2 rounded-2xl border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600"
          >
            Sign in instead
          </Link>

          <p className="text-center text-[11px] text-slate-300 mt-5 leading-relaxed">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}