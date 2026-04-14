import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { transactionService } from "../services/transactionService";
import OTPModal from "../components/OTPModal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/shared/utils";
import {
  Send,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  UserPlus,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Clock,
  ScanLine,
  FileText,
  MapPin,
  ChevronDown,
  FlaskConical,
} from "lucide-react";

const STEP = { FORM: "FORM", RESULT: "RESULT", OTP: "OTP", PAYMENT: "PAYMENT", DONE: "DONE" };

// ── Avatar colour palette ────────────────────────────────────────
const AVATAR_COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#16a34a", "#d97706", "#db2777"];
const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ── Mask account: show only last 2 chars ────────────────────────
const maskAcc = (acc) =>
  acc ? "•".repeat(Math.max(0, acc.length - 2)) + acc.slice(-2) : "";

// ── GPay-style success chime via Web Audio API ───────────────────
function playGPaySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 587.3, start: 0, dur: 0.18 },
      { freq: 783.9, start: 0.16, dur: 0.18 },
      { freq: 987.8, start: 0.30, dur: 0.32 },
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* audio not available — silently skip */ }
}

export default function SendMoneyPage() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(STEP.FORM);
  const [loading, setLoading] = useState(false);
  // detectedCity: city name resolved from browser geolocation (empty string = unavailable)
  const [detectedCity, setDetectedCity] = useState(null); // null = still loading
  const [locationLoading, setLocationLoading] = useState(true);

  // ── Demo override (for testing / demo only) ────────────────────
  // overrideCity = "" means "use real detected city"
  const [overrideCity, setOverrideCity] = useState("");
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [overrideMode, setOverrideMode] = useState("detected"); // "detected" | preset name | "custom"

  // The city actually sent to the backend
  const effectiveLocation = overrideCity || detectedCity || "";

  const [form, setForm] = useState({
    receiverAccountNumber: "",
    amount: "",
    note: "",
    isNewBeneficiary: false,
  });
  const [result, setResult] = useState(null);
  const [txnId, setTxnId] = useState(null);
  const [finalTxn, setFinalTxn] = useState(null);

  // ── Recent recipients ──────────────────────────────────────────
  const [recentRecipients, setRecentRecipients] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const accInputRef = useRef(null);

  useEffect(() => {
    transactionService.getRecentRecipients()
      .then((res) => setRecentRecipients(res.data?.recipients || []))
      .catch(() => { });
  }, []);

  // ── Auto geolocation on mount ──────────────────────────────────
  // NOTE: navigator.geolocation requires a secure context (HTTPS or localhost)
  useEffect(() => {
    if (!navigator.geolocation) {
      setDetectedCity("");
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            { headers: { "User-Agent": "BankGuard/1.0" } }
          );
          const data = await res.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.county ||
            "";
          setDetectedCity(city);
        } catch {
          // Nominatim failed — fall back gracefully
          setDetectedCity("");
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        // User denied permission or geolocation failed
        setDetectedCity("");
        setLocationLoading(false);
      },
      { timeout: 8000 }
    );
  }, []);

  // Filter: empty query → show all recents; typed query → filter by name or acc
  const filteredRecipients = recentRecipients.filter((r) => {
    const q = form.receiverAccountNumber.trim().toLowerCase();
    if (!q) return true;
    return (
      r.accountNumber.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q)
    );
  });

  // Show dropdown when focused AND there's something to show
  const shouldShowDropdown = isFocused && (filteredRecipients.length > 0 || form.receiverAccountNumber.trim().length > 0);

  // ── Handlers ───────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.receiverAccountNumber || !form.amount)
      return toast.error("Account number and amount are required");
    if (Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    setLoading(true);
    try {
      const res = await transactionService.sendMoney({
        ...form,
        amount: Number(form.amount),
        hour: new Date().getHours(),
        // effectiveLocation = demo override city (if set) or the real geolocation result.
        // isNewLocation is omitted — the backend auto-detects it by comparing location vs usualLocation.
        location: effectiveLocation,
      });
      setResult(res.data);
      setTxnId(res.data.transaction?._id);
      setStep(STEP.RESULT);
    } catch (err) {
      toast.error(err.response?.data?.error || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (code) => {
    setLoading(true);
    try {
      const res = await transactionService.verifyOTP({ transactionId: txnId, otp: code });
      if (res.data.requiresPayment) {
        setResult((p) => ({ ...p, razorpayOrder: res.data.razorpayOrder }));
        setStep(STEP.PAYMENT);
        openRazorpay(res.data.razorpayOrder);
      } else {
        setFinalTxn(res.data.transaction);
        setStep(STEP.DONE);
        playGPaySound();
        await refreshProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLowRiskComplete = async () => {
    setLoading(true);
    try {
      setFinalTxn(result.transaction);
      setStep(STEP.DONE);
      playGPaySound();
      await refreshProfile();
    } catch {
      toast.error("Something went wrong — please refresh");
    } finally {
      setLoading(false);
    }
  };

  const openRazorpay = (order) => {
    if (!order?.orderId) {
      toast.error("Payment order unavailable — transfer still completed");
      setStep(STEP.DONE);
      refreshProfile();
      return;
    }
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "BankGuard",
      description: "Secure Bank Transfer",
      order_id: order.orderId,
      handler: async (response) => {
        try {
          await transactionService.verifyPayment({
            transactionId: txnId,
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          setFinalTxn(result.transaction);
          setStep(STEP.DONE);
          playGPaySound();
          await refreshProfile();
        } catch { toast.error("Payment verification failed"); }
      },
      modal: { ondismiss: () => { toast.error("Payment cancelled"); setStep(STEP.RESULT); } },
      theme: { color: "#2563eb" },
    };
    new window.Razorpay(options).open();
  };

  const reset = () => {
    setStep(STEP.FORM);
    setForm({ receiverAccountNumber: "", amount: "", note: "", isNewBeneficiary: false });
    setResult(null); setTxnId(null); setFinalTxn(null);
    // Reset demo override
    setOverrideCity(""); setOverrideMode("detected"); setCustomCity(""); setShowDemoControls(false);
  };

  const riskLevel = result?.fraud_result?.risk_level;
  const riskScore = result?.fraud_result?.confidence;
  const riskConfig = {
    HIGH: { bg: "#fef2f2", border: "#fecaca", icon: ShieldX, iconColor: "#dc2626", iconBg: "#fee2e2", label: "High Risk" },
    MEDIUM: { bg: "#fffbeb", border: "#fde68a", icon: ShieldAlert, iconColor: "#d97706", iconBg: "#fef3c7", label: "Medium Risk" },
    LOW: { bg: "#f0fdf4", border: "#bbf7d0", icon: ShieldCheck, iconColor: "#16a34a", iconBg: "#dcfce7", label: "Low Risk" },
  };
  const rc = riskConfig[riskLevel] || riskConfig.LOW;
  const RiskIcon = rc.icon;

  // ── Determine if a recipient is selected from recents ──────────
  const selectedRecipient = recentRecipients.find(
    (r) => r.accountNumber === form.receiverAccountNumber
  );

  return (
    <div className="font-sans max-w-[480px] mx-auto pb-20">
      {/* ── Step header ── */}
      <div className="mb-[22px]">
        {step === STEP.FORM && (
          <>
            <h1 className="text-[clamp(1.3rem,3vw,1.6rem)] font-extrabold text-slate-900 mb-1 tracking-[-0.02em]">Send Money</h1>
            <p className="text-[13px] text-slate-500 m-0">ML fraud analysis runs on every transfer</p>
          </>
        )}
        {step === STEP.RESULT && (
          <>
            <h1 className="text-[clamp(1.3rem,3vw,1.6rem)] font-extrabold text-slate-900 mb-1 tracking-[-0.02em]">Risk Analysis</h1>
            <p className="text-[13px] text-slate-500 m-0">Review the fraud check before proceeding</p>
          </>
        )}
        {step === STEP.DONE && (
          <h1 className="text-[clamp(1.3rem,3vw,1.6rem)] font-extrabold text-slate-900 mb-1 tracking-[-0.02em]">Done!</h1>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ────────── FORM ────────── */}
        {step === STEP.FORM && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
          >
            <form onSubmit={handleSend}>
              <div className="bg-white border border-slate-200 rounded-[20px] shadow-[0_2px_16px_rgba(15,23,42,0.06)] overflow-visible">
                <div className="p-6">

                  {/* ── Receiver ── */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">Send To</p>
                  <div className="relative mb-[20px]">
                    <div
                      className={`flex items-center gap-3 p-3 px-4 border-2 rounded-xl cursor-text transition-all duration-200 ${isFocused || form.receiverAccountNumber ? "border-blue-600 bg-white" : "border-slate-200 bg-slate-50"
                        } ${isFocused ? "shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" : ""}`}
                      onClick={() => accInputRef.current?.focus()}
                    >
                      <div
                        className={`w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center text-[15px] font-bold transition-colors duration-200 ${selectedRecipient ? "text-white" : "text-slate-400 bg-slate-200"}`}
                        style={selectedRecipient ? { background: avatarColor(selectedRecipient.name) } : {}}
                      >
                        {selectedRecipient
                          ? selectedRecipient.name[0].toUpperCase()
                          : <ScanLine size={16} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        {selectedRecipient && (
                          <p className="text-[13px] font-bold text-slate-900 mb-[1px]">{selectedRecipient.name}</p>
                        )}
                        <input
                          ref={accInputRef}
                          name="receiverAccountNumber"
                          value={form.receiverAccountNumber}
                          onChange={handleChange}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setTimeout(() => setIsFocused(false), 160)}
                          placeholder={selectedRecipient ? "" : "Account number or name"}
                          className="w-full border-none bg-transparent outline-none font-mono text-[14px] text-slate-900 p-0 placeholder:font-sans placeholder:text-[14px] placeholder:font-medium placeholder:text-slate-400"
                          autoComplete="off"
                          spellCheck="false"
                        />
                      </div>
                    </div>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {shouldShowDropdown && (
                        <motion.div
                          className="absolute top-[calc(100%+8px)] left-0 right-0 z-[60] bg-white border-[1.5px] border-slate-200 rounded-[16px] shadow-[0_12px_40px_rgba(15,23,42,0.15)] overflow-hidden"
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.14 }}
                        >
                          {filteredRecipients.length > 0 && (
                            <div className="flex items-center gap-[6px] py-2.5 px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                              <Clock size={11} />
                              Recent
                            </div>
                          )}
                          {filteredRecipients.map((r, i) => (
                            <div
                              key={r.accountNumber}
                              className={`flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors border-t border-slate-100 hover:bg-blue-50 ${i === 0 ? 'border-none' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault(); // prevent blur firing before mousedown
                                setForm((p) => ({ ...p, receiverAccountNumber: r.accountNumber }));
                                setIsFocused(false);
                              }}
                            >
                              <div
                                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[15px] font-bold text-white"
                                style={{ background: avatarColor(r.name) }}
                              >
                                {r.name[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-slate-900 mb-[2px]">{r.name}</p>
                                <p className="font-mono text-[11px] text-slate-400 m-0">{maskAcc(r.accountNumber)}</p>
                              </div>
                            </div>
                          ))}

                          {filteredRecipients.length === 0 && form.receiverAccountNumber.trim().length > 0 && (
                            <div
                              className="flex items-center gap-3 py-2.5 px-4 cursor-pointer transition-colors border-t border-slate-100 hover:bg-blue-50"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setIsFocused(false);
                              }}
                            >
                              <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[15px] font-bold text-white bg-slate-300">
                                <UserPlus size={15} />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-slate-900 mb-[2px]">New Recipient</p>
                                <p className="font-mono text-[11px] text-slate-400">{form.receiverAccountNumber}</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Amount ── */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">Amount</p>
                  <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50 border-2 border-indigo-100 rounded-[16px] p-5 text-center mb-[20px] transition-colors focus-within:border-blue-600">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[28px] font-bold text-slate-500 mt-1">₹</span>
                      <input
                        name="amount"
                        type="number"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="0"
                        className="border-none bg-transparent outline-none text-[42px] font-extrabold text-slate-900 w-full text-center tracking-[-0.02em] font-sans placeholder:text-indigo-200"
                        min="1"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {/* ── Note ── */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">Note</p>
                  <div className="flex items-center gap-2.5 p-3 px-4 border-2 border-slate-200 rounded-xl bg-slate-50 transition-colors focus-within:border-blue-600 focus-within:bg-white mb-[20px]">
                    <FileText size={15} className="text-slate-400 shrink-0" />
                    <input
                      name="note"
                      value={form.note}
                      onChange={handleChange}
                      placeholder="Rent, dinner, groceries… (optional)"
                      className="flex-1 border-none bg-transparent outline-none font-sans text-[14px] text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* ── Location indicator ── */}
                <div className="px-6 pb-1">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium">
                    {locationLoading ? (
                      <>
                        <Loader2 size={12} className="animate-spin text-blue-400" />
                        <span className="text-slate-400">Detecting location…</span>
                      </>
                    ) : overrideCity ? (
                      <>
                        <MapPin size={12} className="text-amber-500 shrink-0" />
                        <span className="text-amber-600">
                          Location (overridden):{" "}
                          <span className="font-semibold">{overrideCity}</span>
                        </span>
                      </>
                    ) : detectedCity ? (
                      <>
                        <MapPin size={12} className="text-blue-500 shrink-0" />
                        <span className="text-slate-500">
                          Detected location:{" "}
                          <span className="text-slate-700 font-semibold">{detectedCity}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <MapPin size={12} className="text-slate-300 shrink-0" />
                        <span className="text-slate-400">Location unavailable</span>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Demo Override (dev/demo tool) ── */}
                <div className="px-6 pb-3">
                  {/* Toggle link */}
                  <button
                    type="button"
                    onClick={() => setShowDemoControls((v) => !v)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-600 transition-colors mt-1 select-none"
                  >
                    <FlaskConical size={11} />
                    <span>{showDemoControls ? "Hide demo controls" : "Show demo controls"}</span>
                    <ChevronDown
                      size={11}
                      className={`transition-transform duration-200 ${showDemoControls ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Collapsible panel */}
                  {showDemoControls && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      {/* Header badge */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-[10px] font-bold uppercase tracking-widest">
                          <FlaskConical size={9} /> For Demo Only
                        </span>
                        <span className="text-[10px] text-amber-600/70">Override the location sent to the fraud engine</span>
                      </div>

                      {/* Preset city chips */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {[
                          { label: "↩ Detected", value: "detected" },
                          { label: "Mumbai",    value: "Mumbai" },
                          { label: "Delhi",     value: "Delhi" },
                          { label: "Bengaluru", value: "Bengaluru" },
                          { label: "Kolkata",   value: "Kolkata" },
                          { label: "Custom…",   value: "custom" },
                        ].map(({ label, value }) => {
                          const active = overrideMode === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setOverrideMode(value);
                                if (value === "detected") {
                                  setOverrideCity("");
                                  setCustomCity("");
                                } else if (value === "custom") {
                                  setOverrideCity(""); // will be set via text input
                                } else {
                                  setOverrideCity(value);
                                  setCustomCity("");
                                }
                              }}
                              className={`px-2.5 py-[4px] rounded-full text-[11px] font-semibold border transition-all ${
                                active
                                  ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                  : "bg-white border-amber-300 text-amber-700 hover:bg-amber-100"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom city text input */}
                      {overrideMode === "custom" && (
                        <input
                          type="text"
                          placeholder="Type any city name…"
                          value={customCity}
                          onChange={(e) => {
                            setCustomCity(e.target.value);
                            setOverrideCity(e.target.value.trim());
                          }}
                          className="w-full text-[12px] px-3 py-2 rounded-lg border border-amber-300 bg-white text-amber-900 placeholder:text-amber-300 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-300"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="px-6 pb-6 pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full p-[15px] rounded-xl bg-gradient-to-br from-blue-700 to-blue-600 text-white font-sans text-[15px] font-bold transition-all shadow-[0_4px_16px_rgba(37,99,235,0.35)] tracking-[-0.01em] hover:opacity-90 hover:shadow-[0_6px_24px_rgba(37,99,235,0.4)] disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Analyse &amp; Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* ────────── RESULT ────────── */}
        {step === STEP.RESULT && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="bg-white border border-slate-200 rounded-[20px] shadow-[0_2px_16px_rgba(15,23,42,0.06)] overflow-visible">
              <div className="p-6">
                {/* Risk hero */}
                <div
                  className="rounded-[16px] p-6 text-center mb-5 border-2"
                  style={{ background: rc.bg, borderColor: rc.border }}
                >
                  <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mx-auto mb-3.5" style={{ background: rc.iconBg }}>
                    <RiskIcon size={26} color={rc.iconColor} strokeWidth={2} />
                  </div>
                  <p className="text-[18px] font-extrabold mb-1.5 tracking-[-0.02em]" style={{ color: rc.iconColor }}>{rc.label}</p>
                  <p className="text-[13px] text-slate-500 mb-2.5 leading-relaxed">{result.fraud_result?.message}</p>
                  <span
                    className="inline-block px-2.5 py-[3px] rounded-[20px] font-mono text-[11px] font-semibold bg-black/5"
                    style={{ background: rc.iconBg, color: rc.iconColor }}
                  >
                    Fraud score: {riskScore !== undefined && riskScore !== null ? riskScore.toFixed(1) : "0.0"}%
                  </span>
                </div>

                {/* Summary */}
                <div className="bg-slate-50 rounded-[14px] overflow-hidden mb-5">
                  {[
                    ["Amount", formatCurrency(form.amount)],
                    ["To", form.receiverAccountNumber],
                    ["Status", result.transaction?.status || result.status],
                  ].map(([k, v], i) => (
                    <div key={k} className={`flex justify-between items-center py-3 px-4 border-b border-slate-100 ${i === 2 ? 'border-0' : ''}`}>
                      <span className="text-[12px] text-slate-400 font-semibold uppercase tracking-[0.06em]">{k}</span>
                      <span className="font-mono text-[13px] font-medium text-slate-900">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-[10px]">
                  {riskLevel === "HIGH" && (
                    <button
                      onClick={() => setStep(STEP.OTP)}
                      className="flex items-center justify-center gap-2 flex-1 p-[13px] rounded-xl bg-gradient-to-br from-red-700 to-red-600 text-white font-sans text-[14px] font-bold shadow-[0_3px_12px_rgba(220,38,38,0.3)] hover:opacity-90"
                    >
                      <ShieldX size={15} /> Verify with OTP
                    </button>
                  )}
                  {riskLevel === "MEDIUM" && (
                    <button
                      onClick={() => setStep(STEP.OTP)}
                      className="flex items-center justify-center gap-2 flex-1 p-[13px] rounded-xl bg-gradient-to-br from-amber-700 to-amber-600 text-white font-sans text-[14px] font-bold shadow-[0_3px_12px_rgba(217,119,6,0.3)] hover:opacity-90"
                    >
                      <ShieldAlert size={15} /> Enter OTP
                    </button>
                  )}
                  {riskLevel === "LOW" && (
                    <button
                      onClick={handleLowRiskComplete}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 flex-1 p-[15px] rounded-xl bg-gradient-to-br from-blue-700 to-blue-600 text-white font-sans text-[15px] font-bold transition-all shadow-[0_4px_16px_rgba(37,99,235,0.35)] tracking-[-0.01em] hover:opacity-90 hover:shadow-[0_6px_24px_rgba(37,99,235,0.4)] disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {loading ? (
                        <><Loader2 size={15} className="animate-spin" /> Processing…</>
                      ) : (
                        <><CheckCircle2 size={15} /> Complete Transfer</>
                      )}
                    </button>
                  )}
                  <button onClick={reset} className="flex items-center justify-center gap-2 px-6 p-[13px] rounded-xl bg-white text-slate-600 border-[1.5px] border-slate-200 font-sans text-[14px] font-semibold transition-colors hover:bg-slate-50">
                    <ArrowLeft size={15} /> Back
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ────────── DONE ────────── */}
        {step === STEP.DONE && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="bg-white rounded-[20px] py-8 px-6 text-center relative shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-dashed border-slate-300">
              <motion.div
                className="w-[72px] h-[72px] rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5 shadow-[0_0_0_8px_rgba(37,99,235,0.1)] relative"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.1, stiffness: 220, damping: 15 }}
              >
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30 * Math.PI) / 180 + Math.random() * 0.5;
                  const dist = 40 + Math.random() * 50;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: 0, y: 0, scale: 0 }}
                      animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: [0, 1, 0], opacity: [1, 1, 0] }}
                      transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                      style={{
                        position: 'absolute', width: i % 2 === 0 ? 6 : 8, height: i % 2 === 0 ? 6 : 8,
                        borderRadius: '50%', background: i % 3 === 0 ? '#60a5fa' : '#3b82f6',
                        top: '50%', left: '50%', marginTop: -4, marginLeft: -4, zIndex: 0
                      }}
                    />
                  );
                })}
                <CheckCircle2 size={34} color="#2563eb" strokeWidth={2.5} style={{ position: 'relative', zIndex: 10 }} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <p className="text-[36px] font-extrabold text-slate-900 mb-1 tracking-[-0.02em]">{formatCurrency(form.amount)}</p>
                <div className="text-[13px] text-blue-600 font-bold uppercase tracking-[0.08em] mb-6 inline-flex items-center gap-1">
                  <CheckCircle2 size={13} strokeWidth={3} /> Transfer Successful
                </div>
              </motion.div>

              <motion.div
                className="bg-slate-50 rounded-[14px] p-4 text-left mb-6 border border-slate-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex justify-between border-b border-dashed border-slate-200 py-2">
                  <span className="text-[12px] text-slate-500 font-medium">To Account</span>
                  <span className="text-[13px] text-slate-900 font-semibold font-mono">{form.receiverAccountNumber}</span>
                </div>
                {finalTxn?._id && (
                  <div className="flex justify-between border-b border-dashed border-slate-200 py-2">
                    <span className="text-[12px] text-slate-500 font-medium">Reference ID</span>
                    <span className="text-[13px] text-slate-900 font-semibold font-mono">{finalTxn._id.slice(-8).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-[12px] text-slate-500 font-medium">Date &amp; Time</span>
                  <span className="text-[13px] text-slate-900 font-semibold font-mono">{new Date().toLocaleString('en-IN', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </motion.div>

              <motion.button
                onClick={reset}
                className="flex items-center justify-center gap-2 w-full p-[14px] rounded-[14px] bg-blue-600 text-white font-bold text-[15px] border-none cursor-pointer transition-colors shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:bg-blue-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Send size={15} /> Make another transfer
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <OTPModal
        open={step === STEP.OTP}
        onClose={() => setStep(STEP.RESULT)}
        onVerify={handleOTPVerify}
        phone={user?.phone}
        loading={loading}
      />
    </div>
  );
}
