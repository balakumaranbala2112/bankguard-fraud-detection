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
    `w-full px-4 py-3 rounded-2xl text-sm text-slate-800 placeholder-slate-300 outline-none border-2 transition-all duration-150 bg-white
     ${focused === f ? "border-indigo-400 shadow-sm shadow-indigo-100" : err(f) ? "border-rose-300 bg-rose-50/40" : "border-slate-200 hover:border-slate-300"}`;

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
      <div className="hidden lg:flex flex-col justify-between w-[42%] flex-shrink-0 bg-indigo-600 px-14 py-12 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute rounded-full pointer-events-none -top-20 -right-20 w-72 h-72 bg-indigo-500/40" />
        <div className="absolute w-64 h-64 rounded-full pointer-events-none -bottom-16 -left-16 bg-indigo-700/50" />
        <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none top-1/2 left-1/2 w-96 h-96 bg-indigo-500/20" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center border w-9 h-9 rounded-xl bg-white/20 border-white/30">
            <ShieldCheck size={17} color="#fff" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            FraudShield
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-indigo-200">
              Get started for free
            </p>
            <h1 className="text-[2.4rem] font-bold text-white leading-[1.2] tracking-tight">
              Join the future
              <br />
              of <span className="text-indigo-200">secure banking</span>
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-indigo-100/80">
            Create your account and get peace of mind with every transaction you
            make.
          </p>

          <div className="pt-1 space-y-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div className="flex items-center justify-center flex-shrink-0 w-5 h-5 rounded-full bg-white/20">
                  <CheckCircle2 size={12} color="#fff" strokeWidth={2.5} />
                </div>
                <p className="text-sm text-indigo-100">{b}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-indigo-300/60">
          Trusted by 50,000+ users worldwide
        </p>
      </div>

      {/* ── Right: form ── */}
      <div className="flex items-center justify-center flex-1 px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-xl">
              <ShieldCheck size={15} color="#fff" strokeWidth={2} />
            </div>
            <span className="text-sm font-bold text-slate-800">
              FraudShield
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
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
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
              className="flex items-center justify-center w-full gap-2 py-3 mt-1 text-sm font-semibold text-white transition-all bg-indigo-600 shadow-sm group rounded-2xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-indigo-200"
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
            className="flex items-center justify-center w-full py-3 text-sm font-semibold transition-all border-2 rounded-2xl border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600"
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
