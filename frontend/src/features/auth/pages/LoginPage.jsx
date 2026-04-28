import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import api from "@/shared/services/api";
import { ENDPOINTS } from "@/shared/constants";

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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
function IconPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
function IconRefresh({ spin }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={spin ? "animate-spin" : ""}>
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

// ─── Shared PIN box component ─────────────────────────────────────────────────
function PinBoxes({ count, digits, onChange, onKeyDown, inputRefs, disabled, shake, hasError, type = "password" }) {
  return (
    <motion.div
      className="flex gap-3 justify-center"
      animate={shake ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type={type}
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          disabled={disabled}
          className={[
            "text-center font-bold rounded-2xl border outline-none transition-all duration-150 bg-white/5 backdrop-blur-md",
            count === 4 ? "w-14 h-16 text-2xl" : "w-11 h-14 text-xl",
            hasError
              ? "border-red-400/50 bg-red-900/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              : digits[i]
                ? "border-primary-400 text-primary-300 shadow-[0_0_15px_rgba(58,135,255,0.2)]"
                : "border-white/10 text-white hover:border-white/20",
            !hasError && "focus:border-primary-400 focus:shadow-[0_0_15px_rgba(58,135,255,0.3)]",
            disabled ? "opacity-50 cursor-not-allowed" : "",
          ].filter(Boolean).join(" ")}
        />
      ))}
    </motion.div>
  );
}

// ─── Left brand panel ─────────────────────────────────────────────────────────
function BrandPanel() {
  const stats = [
    { value: "99.7%", label: "Fraud detection accuracy" },
    { value: "<50ms", label: "Real-time scoring latency" },
    { value: "10+", label: "Attack patterns detected" },
  ];

  return (
    <div className="hidden lg:flex w-[480px] flex-shrink-0 relative flex-col justify-between">
      <div className="relative z-10 p-12 flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 0 30px rgba(30,53,245,0.6)" }}>
            <IconShield />
          </div>
          <div>
            <span className="text-white text-2xl font-display font-extrabold tracking-tight">BankGuard</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{boxShadow: "0 0 10px #34d399"}} />
              <span className="text-emerald-400 text-[10px] font-semibold tracking-widest uppercase">Live Protection</span>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="mt-auto mb-8">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 text-primary-300">
            Powered by XGBoost ML
          </p>
          <h1 className="text-[3.5rem] font-display font-extrabold leading-[1.05] tracking-tight text-white mb-6">
            Intelligent<br />
            Fraud<br />
            <span className="text-primary-400">Detection.</span>
          </h1>
          <p className="text-lg leading-relaxed max-w-[320px] text-slate-300">
            Every transaction scored in real-time. Suspicious activity stopped before it reaches your account.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {stats.map(({ value, label }, i) => (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.3 }} key={label} className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xl font-bold text-white mb-1">{value}</div>
              <div className="text-[10px] leading-tight text-slate-400">{label}</div>
            </motion.div>
          ))}
        </div>

        {/* Feature list */}
        <div className="space-y-2">
          {[
            "XGBoost ML scores every transaction",
            "OTP challenge on suspicious activity",
            "Device fingerprinting & 2FA",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary-400 shadow-[0_0_8px_rgba(58,135,255,0.8)]" />
              <span className="text-xs text-slate-300">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STEP: Phone ──────────────────────────────────────────────────────────────
function StepPhone({ form, setForm, onNext }) {
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const phone = form.phone?.trim();
    if (!phone) return toast.error("Enter your phone number");
    if (!/^\+[1-9]\d{9,14}$/.test(phone))
      return toast.error("Use international format: +91XXXXXXXXXX");
    onNext();
  };

  return (
    <motion.div key="phone" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>

      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold tracking-tight text-white mb-1.5">Welcome back</h2>
        <p className="text-slate-300 text-[15px]">Enter your phone number to sign in</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <IconPhone />
            </span>
            <input
              type="tel" autoFocus autoComplete="tel"
              value={form.phone || ""}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="+91 98765 43210"
              className={[
                "w-full pl-9 pr-4 py-3 rounded-2xl border text-sm text-white placeholder-slate-500 outline-none transition-all bg-white/5 backdrop-blur-md",
                focused ? "border-primary-400 shadow-[0_0_15px_rgba(58,135,255,0.2)]"
                  : "border-white/10 hover:border-white/20 hover:bg-white/10",
              ].join(" ")}
            />
          </div>
        </div>

        <button type="submit"
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 4px 24px rgba(30,53,245,0.4)" }}>
          Continue <IconArrowRight />
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-slate-400">
        New to BankGuard?{" "}
        <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
          Create account
        </Link>
      </p>

    </motion.div>
  );
}

// ─── STEP: PIN ────────────────────────────────────────────────────────────────
function StepPin({ phone, isReturning, onBack, onSuccess }) {
  const { login, loading } = useAuth();
  const [digits, setDigits] = useState(Array(4).fill(""));
  const [shake, setShake] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => { setTimeout(() => inputRefs.current[0]?.focus(), 150); }, []);

  const [pinError, setPinError] = useState("");

  const handleDigit = useCallback((idx, val) => {
    if (!/^\d?$/.test(val)) return;

    if (pinError) {
      setPinError("");
      if (val !== "") {
        const next = Array(4).fill("");
        next[0] = val;
        setDigits(next);
        inputRefs.current[1]?.focus();
        return;
      }
    }

    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 3) inputRefs.current[idx + 1]?.focus();
    else if (val && idx === 3) {
      const pin = next.join("");
      if (pin.length === 4) submitLogin(pin, next);
    }
  }, [digits, pinError]);

  const handleKeyDown = useCallback((idx, e) => {
    if (pinError) setPinError("");
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits]; next[idx - 1] = "";
      setDigits(next); inputRefs.current[idx - 1]?.focus();
    }
  }, [digits, pinError]);

  const submitLogin = async (pinStr, currentDigits) => {
    const pin = pinStr || (currentDigits || digits).join("");
    if (pin.length < 4) {
      setPinError("Enter your 4-digit Login PIN");
      return;
    }
    const result = await login(phone, pin);
    if (!result.success) {
      setShake(true);
      setPinError(result.error);
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
        inputRefs.current[0]?.select();
      }, 420);
      return;
    }
    result.requires2FA
      ? onSuccess({ requires2FA: true, userId: result.userId })
      : onSuccess({ requires2FA: false });
  };

  return (
    <motion.div key="pin" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>

      {!isReturning && (
        <button onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors mb-7 bg-transparent border-none p-0 cursor-pointer">
          <IconArrowLeft /> Back
        </button>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-white"
          style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 0 20px rgba(30,53,245,0.4)" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-white">
          {isReturning ? "Welcome back!" : "Enter your PIN"}
        </h2>
        <p className="text-sm text-slate-300 mt-1 font-medium">{phone}</p>
      </div>

      <p className="text-center text-xs text-slate-400 mb-5 flex items-center justify-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        4-digit login PIN
      </p>

      <form onSubmit={(e) => { e.preventDefault(); submitLogin(); }} className="space-y-6">
        <PinBoxes count={4} digits={digits} onChange={handleDigit}
          onKeyDown={handleKeyDown} inputRefs={inputRefs}
          disabled={loading} shake={shake} hasError={!!pinError} />

        {pinError && (
          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm font-medium text-red-400 mt-2">
            {pinError}
          </motion.p>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <IconSpinner /> Verifying…
          </div>
        )}
      </form>

      {isReturning && (
        <div className="mt-8 text-center">
          <button onClick={onBack}
            className="text-sm text-primary-400 font-semibold hover:text-primary-300 transition-colors bg-transparent border-none cursor-pointer">
            Use a different account
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── STEP: OTP ────────────────────────────────────────────────────────────────
function StepOTP({ userId, onBack }) {
  const { verifyLoginOtp, loading } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [sending, setSending] = useState(true);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef([]);

  const sendOtp = useCallback(async () => {
    setSending(true);
    try {
      await api.post(ENDPOINTS.SEND_LOGIN_OTP, { userId });
      toast.success("OTP sent to your phone");
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send OTP — tap Resend");
    } finally {
      setSending(false);
      setCountdown(30);
    }
  }, [userId]);

  useEffect(() => { sendOtp(); }, []);

  useEffect(() => {
    if (sending || countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c <= 1 ? 0 : c - 1), 1000);
    return () => clearInterval(t);
  }, [sending, countdown]);

  const handleDigit = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits]; next[idx] = val; setDigits(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    else if (val && idx === 5 && next.every(Boolean)) handleVerify(next.join(""));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits]; next[idx - 1] = "";
      setDigits(next); inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const next = Array(6).fill("").map((_, i) => pasted[i] || "");
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      if (pasted.length === 6) setTimeout(() => handleVerify(pasted), 80);
    }
    e.preventDefault();
  };

  const handleVerify = async (otpStr) => {
    const otp = otpStr || digits.join("");
    if (otp.length < 6) return toast.error("Enter the full 6-digit code");
    const result = await verifyLoginOtp(userId, otp);
    if (result.success) {
      toast.success("Verified! Welcome back.");
      navigate("/dashboard");
    } else {
      toast.error(result.error);
      setDigits(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 60);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setDigits(Array(6).fill(""));
    try {
      await api.post(ENDPOINTS.SEND_LOGIN_OTP, { userId });
      toast.success("New OTP sent");
      setCountdown(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed — try again");
    } finally { setResending(false); }
  };

  return (
    <motion.div key="otp" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>

      <button onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors mb-7 bg-transparent border-none p-0 cursor-pointer">
        <IconArrowLeft /> Back to sign in
      </button>

      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white"
        style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 0 20px rgba(30,53,245,0.4)" }}>
        {sending
          ? <IconSpinner />
          : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          )}
      </div>

      <h2 className="text-3xl font-display font-bold tracking-tight text-white mb-1">Verify your device</h2>
      <p className="text-[15px] text-slate-300 mb-8 leading-relaxed">
        {sending ? "Sending a 6-digit code to your phone…"
          : "Enter the 6-digit code sent to your registered number."}
      </p>

      <div className={`space-y-5 transition-opacity ${sending ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text" inputMode="numeric" maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={sending || loading}
              className={[
                "w-11 h-14 text-center text-xl font-bold rounded-2xl border outline-none transition-all bg-white/5 backdrop-blur-md",
                d ? "border-primary-400 text-primary-300 shadow-[0_0_15px_rgba(58,135,255,0.2)]"
                  : "border-white/10 text-white hover:border-white/20",
                "focus:border-primary-400 focus:shadow-[0_0_15px_rgba(58,135,255,0.3)]",
              ].join(" ")}
            />
          ))}
        </div>

        <button
          onClick={() => handleVerify()}
          disabled={loading || digits.join("").length < 6}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1e35f5 0%, #3a5bff 100%)", boxShadow: "0 4px 20px rgba(30,53,245,0.3)" }}>
          {loading ? <><IconSpinner /> Verifying…</> : <>Verify &amp; Sign in <IconArrowRight /></>}
        </button>
      </div>

      <div className="flex items-center justify-center mt-5 gap-2">
        <button
          onClick={handleResend}
          disabled={resending || sending || countdown > 0}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-400 transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <IconRefresh spin={resending} />
          {resending ? "Sending…" : countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
        </button>
      </div>

      <div className="mt-8 rounded-2xl p-3.5 text-center bg-white/5 border border-white/10 backdrop-blur-sm">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          This device will be remembered after verification. 2FA is only required on new devices.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: "" });
  const [step, setStep] = useState("PHONE");
  const [userIdForOtp, setUserIdForOtp] = useState(null);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem("bg_last_phone");
    if (savedPhone) {
      setForm({ phone: savedPhone });
      setIsReturning(true);
      setStep("PIN");
    }
  }, []);

  const handlePinSuccess = (result) => {
    if (result.requires2FA) {
      setUserIdForOtp(result.userId);
      setStep("OTP");
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem("bg_last_phone");
    setForm({ phone: "" });
    setIsReturning(false);
    setStep("PHONE");
  };

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
          <div className="w-full max-w-[400px] relative z-20">
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
                {step === "PHONE" && (
                  <StepPhone key="phone" form={form} setForm={setForm} onNext={() => setStep("PIN")} />
                )}
                {step === "PIN" && (
                  <StepPin key="pin" phone={form.phone} isReturning={isReturning}
                    onBack={handleSwitchAccount} onSuccess={handlePinSuccess} />
                )}
                {step === "OTP" && (
                  <StepOTP key="otp" userId={userIdForOtp} onBack={() => setStep("PIN")} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}