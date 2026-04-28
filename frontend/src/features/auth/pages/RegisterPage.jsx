import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function IconSpinner() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Premium feature icons
function IconBrain() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>; }
function IconSmartphone() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>; }
function IconLock() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IconBarChart() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>; }


// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i}
          className="transition-all duration-300 rounded-full"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background: i <= current ? "#5e87ff" : "rgba(255,255,255,0.15)",
          }}
        />
      ))}
      <span className="ml-2 text-xs text-slate-400 font-medium">{current + 1} of {total}</span>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, icon, error, hint, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-2">
        <span className="text-slate-500">{icon}</span>
        {label}
      </label>
      {children}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-xs text-red-400">{error}</motion.p>
      )}
      {!error && hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

// ─── STEP 1: Name + Phone + Email ─────────────────────────────────────────────
function Step1({ form, setForm, onNext }) {
  const [focused, setFocused] = useState(null);
  const [touched, setTouched] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = "Full name is required";
    if (!form.phone) errs.phone = "Phone number is required";
    else if (!/^\+[1-9]\d{9,14}$/.test(form.phone)) errs.phone = "Use format: +91XXXXXXXXXX";
    if (!form.email) errs.email = "Email address is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email address";
    return errs;
  };

  const errs = Object.fromEntries(
    Object.entries(validate()).filter(([k]) => touched[k])
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ name: true, phone: true, email: true });
    if (Object.keys(validate()).length) return;
    onNext();
  };

  const inputCls = (field) => [
    "w-full px-4 py-3 rounded-2xl border text-sm text-white placeholder-slate-400 outline-none transition-all bg-white/5 backdrop-blur-md",
    focused === field ? "border-primary-400 shadow-[0_0_15px_rgba(58,135,255,0.2)]"
      : errs[field] ? "border-red-400/50 bg-red-900/20"
        : "border-white/10 hover:border-white/20 hover:bg-white/10",
  ].join(" ");

  return (
    <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>

      <StepDots current={0} total={3} />
      <h2 className="text-3xl font-display font-bold tracking-tight text-white mb-1">Your details</h2>
      <p className="text-[15px] text-slate-300 mb-7">Tell us who you are to get started</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" error={errs.name}
          icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}>
          <input type="text" autoFocus autoComplete="name"
            placeholder="Balakumaran K"
            value={form.name || ""}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            onFocus={() => setFocused("name")}
            onBlur={() => { setFocused(null); setTouched((p) => ({ ...p, name: true })); }}
            className={inputCls("name")} />
        </Field>

        <Field label="Phone number" error={errs.phone}
          hint="International format — e.g. +91XXXXXXXXXX"
          icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>}>
          <input type="tel" autoComplete="tel"
            placeholder="+91 98765 43210"
            value={form.phone || ""}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            onFocus={() => setFocused("phone")}
            onBlur={() => { setFocused(null); setTouched((p) => ({ ...p, phone: true })); }}
            className={inputCls("phone")} />
        </Field>

        <Field label="Email address" error={errs.email}
          icon={<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}>
          <input type="email" autoComplete="email"
            placeholder="you@example.com"
            value={form.email || ""}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            onFocus={() => setFocused("email")}
            onBlur={() => { setFocused(null); setTouched((p) => ({ ...p, email: true })); }}
            className={inputCls("email")} />
        </Field>

        <button type="submit"
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-semibold text-white transition-all mt-2 hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 4px 20px rgba(30,53,245,0.4)" }}>
          Continue <IconArrowRight />
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

// ─── STEP 2: Set Login PIN ────────────────────────────────────────────────────
function Step2({ form, setForm, onNext, onBack }) {
  const [digits, setDigits] = useState(Array(4).fill(""));
  const [confirm, setConfirm] = useState(Array(4).fill(""));
  const [phase, setPhase] = useState("set"); // "set" | "confirm"
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);
  const confirmRefs = useRef([]);

  useEffect(() => {
    setTimeout(() => (phase === "set" ? inputRefs : confirmRefs).current[0]?.focus(), 120);
  }, [phase]);

  const handleDigit = (idx, val, isConfirm = false) => {
    if (!/^\d?$/.test(val)) return;
    const arr = isConfirm ? [...confirm] : [...digits];
    arr[idx] = val;
    isConfirm ? setConfirm(arr) : setDigits(arr);
    const refs = isConfirm ? confirmRefs : inputRefs;
    if (val && idx < 3) refs.current[idx + 1]?.focus();
    else if (val && idx === 3 && arr.every(Boolean)) {
      if (!isConfirm) {
        setPhase("confirm");
      } else {
        const pin = digits.join("");
        const cPin = arr.join("");
        if (pin !== cPin) {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setConfirm(Array(4).fill(""));
            setTimeout(() => confirmRefs.current[0]?.focus(), 60);
          }, 420);
          toast.error("PINs don't match — try again");
          return;
        }
        setForm((p) => ({ ...p, pin }));
        onNext();
      }
    }
  };

  const handleKeyDown = (idx, e, isConfirm = false) => {
    if (e.key === "Backspace") {
      const arr = isConfirm ? [...confirm] : [...digits];
      const refs = isConfirm ? confirmRefs : inputRefs;
      if (!arr[idx] && idx > 0) {
        arr[idx - 1] = "";
        isConfirm ? setConfirm(arr) : setDigits(arr);
        refs.current[idx - 1]?.focus();
      }
    }
  };

  const pinStr = digits.join("");

  return (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22 }}>

      <button onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors mb-0 bg-transparent border-none p-0 cursor-pointer">
        <IconArrowLeft /> Back
      </button>

      <StepDots current={1} total={3} />
      <h2 className="text-3xl font-display font-bold tracking-tight text-white mb-1">
        {phase === "set" ? "Create your PIN" : "Confirm your PIN"}
      </h2>
      <p className="text-sm text-slate-300 mb-8">
        {phase === "set"
          ? "Choose a 4-digit login PIN. You'll use this to sign in."
          : "Enter your PIN again to confirm it."}
      </p>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {phase === "set" ? (
            <motion.div key="set" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              <div className="flex gap-3 justify-center">
                {Array.from({ length: 4 }).map((_, i) => (
                  <input key={i} ref={(el) => (inputRefs.current[i] = el)}
                    type="password" inputMode="numeric" maxLength={1}
                    value={digits[i] || ""}
                    onChange={(e) => handleDigit(i, e.target.value, false)}
                    onKeyDown={(e) => handleKeyDown(i, e, false)}
                    className={[
                      "w-14 h-16 text-center text-2xl font-bold rounded-2xl border outline-none transition-all bg-white/5 backdrop-blur-md",
                      digits[i] ? "border-primary-400 text-primary-300 shadow-[0_0_15px_rgba(58,135,255,0.2)]"
                        : "border-white/10 text-white hover:border-white/20 hover:bg-white/10",
                      "focus:border-primary-400 focus:shadow-[0_0_15px_rgba(58,135,255,0.3)]",
                    ].join(" ")} />
                ))}
              </div>
              {pinStr.length === 4 && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setPhase("confirm")}
                  className="w-full mt-6 flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-semibold text-white hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 4px 20px rgba(30,53,245,0.4)" }}>
                  Confirm PIN <IconArrowRight />
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
              <motion.div className="flex gap-3 justify-center"
                animate={shake ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <input key={i} ref={(el) => (confirmRefs.current[i] = el)}
                    type="password" inputMode="numeric" maxLength={1}
                    value={confirm[i] || ""}
                    onChange={(e) => handleDigit(i, e.target.value, true)}
                    onKeyDown={(e) => handleKeyDown(i, e, true)}
                    className={[
                      "w-14 h-16 text-center text-2xl font-bold rounded-2xl border outline-none transition-all bg-white/5 backdrop-blur-md",
                      confirm[i] ? "border-primary-400 text-primary-300 shadow-[0_0_15px_rgba(58,135,255,0.2)]"
                        : "border-white/10 text-white hover:border-white/20 hover:bg-white/10",
                      "focus:border-primary-400 focus:shadow-[0_0_15px_rgba(58,135,255,0.3)]",
                    ].join(" ")} />
                ))}
              </motion.div>
              <button onClick={() => { setPhase("set"); setConfirm(Array(4).fill("")); }}
                className="mt-4 text-xs text-slate-400 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer w-full text-center">
                ← Change PIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-sm mt-8">
          <div className="flex items-start gap-2.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5e87ff" strokeWidth="2.5" strokeLinecap="round" className="mt-0.5 flex-shrink-0">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Your PIN is hashed with bcrypt and never stored in plain text. Don't share it with anyone.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── STEP 3: Review & Create ──────────────────────────────────────────────────
function Step3({ form, onBack }) {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleCreate = async () => {
    const result = await register({ name: form.name, phone: form.phone, email: form.email, pin: form.pin });
    if (result.success) {
      toast.success("Account created! Welcome to BankGuard.");
      navigate("/dashboard");
    } else {
      toast.error(result.error || "Registration failed — try again");
    }
  };

  const rows = [
    { label: "Full name", value: form.name },
    { label: "Phone", value: form.phone },
    { label: "Email", value: form.email },
    { label: "Login PIN", value: "••••" },
    { label: "Starting balance", value: "₹50,000" },
  ];

  const perks = [
    "ML fraud detection on every transaction",
    "Real-time OTP alerts via SMS",
    "Device-based 2FA protection",
    "Instant transaction receipts",
  ];

  return (
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22 }}>

      <button onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer">
        <IconArrowLeft /> Back
      </button>

      <StepDots current={2} total={3} />
      <h2 className="text-3xl font-display font-bold tracking-tight text-white mb-1">Almost there</h2>
      <p className="text-[15px] text-slate-300 mb-6">Review your details before creating your account</p>

      {/* Summary card */}
      <div className="rounded-2xl overflow-hidden mb-5 bg-white/5 border border-white/10 backdrop-blur-md">
        {rows.map(({ label, value }, i) => (
          <div key={label} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? "bg-transparent" : "bg-white/5"}`}>
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-sm font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>

      {/* Perks */}
      <div className="rounded-2xl p-4 mb-5 bg-white/5 border border-white/10 backdrop-blur-md">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase mb-3 text-primary-400">
          What you get
        </p>
        <div className="space-y-2">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-white bg-primary-600 shadow-[0_0_10px_rgba(58,91,255,0.4)]">
                <IconCheck />
              </span>
              <span className="text-xs text-slate-300">{p}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 4px 24px rgba(30,53,245,0.4)" }}>
        {loading ? <><IconSpinner /> Creating account…</> : <>Create my account <IconArrowRight /></>}
      </button>

      <p className="mt-4 text-[10px] text-center text-slate-400 leading-relaxed">
        By creating an account you agree to BankGuard's terms of service and privacy policy.
      </p>
    </motion.div>
  );
}

// ─── Brand panel (same as login, reused) ────────────────────────────────────
function BrandPanel() {
  return (
    <div className="hidden lg:flex w-[480px] flex-shrink-0 relative flex-col justify-between">
      <div className="relative z-10 p-12 flex flex-col h-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 0 30px rgba(30,53,245,0.6)" }}>
            <IconShield />
          </div>
          <div>
            <span className="text-white text-2xl font-display font-extrabold tracking-tight">BankGuard</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{boxShadow: "0 0 10px #34d399"}} />
              <span className="text-emerald-400 text-[10px] font-semibold tracking-widest uppercase">Secure Signup</span>
            </div>
          </div>
        </div>

        <div className="mt-auto mb-8">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 text-primary-300">
            Join thousands of users
          </p>
          <h1 className="text-[3.5rem] font-display font-extrabold leading-[1.05] tracking-tight text-white mb-6">
            Your money,<br />
            always<br />
            <span className="text-primary-400">protected.</span>
          </h1>
          <p className="text-lg leading-relaxed max-w-[320px] text-slate-300">
            Create a secure account in under 60 seconds. Our ML engine starts protecting you from your very first transaction.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { icon: <IconBrain />, text: "XGBoost fraud scoring on every payment" },
            { icon: <IconSmartphone />, text: "SMS OTP for suspicious activity" },
            { icon: <IconLock />, text: "Device fingerprinting & 2FA" },
            { icon: <IconBarChart />, text: "Full transaction analytics & history" },
          ].map(({ icon, text }, i) => (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 + 0.3 }} key={text} className="flex items-center gap-4 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-primary-400 flex items-center justify-center">{icon}</span>
              <span className="text-[13px] text-slate-200 font-medium tracking-wide">{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", email: "", pin: "" });

  return (
    <div className="flex min-h-screen font-sans relative text-white bg-slate-950 overflow-hidden">
      {/* Immersive Premium Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-slate-950/20 mix-blend-multiply z-10" />
        <img src="/premium_bg.png" alt="" className="w-full h-full object-cover opacity-70" />
      </div>

      <div className="relative z-10 flex w-full">
        <BrandPanel />

        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 relative">
          <div className="w-full max-w-[420px] relative z-20">
            {/* Mobile logo */}
            <div className="flex items-center gap-2.5 mb-10 lg:hidden">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 0 20px rgba(30,53,245,0.5)" }}>
                <IconShield />
              </div>
              <span className="font-bold text-white tracking-tight">BankGuard</span>
            </div>

            {/* Glassmorphic Card */}
            <div className="rounded-3xl bg-white/10 backdrop-blur-xl p-8 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] relative overflow-hidden">
              {/* Subtle inner glow */}
              <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <Step1 key="s1" form={form} setForm={setForm} onNext={() => setStep(1)} />
                )}
                {step === 1 && (
                  <Step2 key="s2" form={form} setForm={setForm}
                    onNext={() => setStep(2)} onBack={() => setStep(0)} />
                )}
                {step === 2 && (
                  <Step3 key="s3" form={form} onBack={() => setStep(1)} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}