import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { transactionService } from "../services/transactionService";
import OTPModal from "../components/OTPModal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/shared/utils";
import ExplainCard from "@/features/fraud/components/ExplainCard"; // F1: SHAP
import { API_BASE, ENDPOINTS } from "@/shared/constants";             // F8: Receipt
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
  Scan,
  FileText,
  MapPin,
  ChevronDown,
  FlaskConical,
  Download,
  Navigation,
  Landmark,
  Building2,
  Factory,
  Building,
  Pencil,
  Lock,
  X,
} from "lucide-react";

const STEP = { FORM: "FORM", RESULT: "RESULT", OTP: "OTP", PAYMENT: "PAYMENT", DONE: "DONE" };

// ─────────────────────────────────────────────────────────────────────────────
// Transaction PIN Modal — 6 digit, full-screen overlay
// Called before every send.  Resolves with the 6-digit string.
// ─────────────────────────────────────────────────────────────────────────────
function TransactionPinModal({ onConfirm, onCancel }) {
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first box after mount animation
    setTimeout(() => inputRefs.current[0]?.focus(), 180);
  }, []);

  const handleDigit = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);

    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    } else if (val && idx === 5) {
      // Last digit entered — auto-submit
      const pin = next.join("");
      if (pin.length === 6) {
        setSubmitting(true);
        // Small delay so user sees the last box fill
        setTimeout(() => onConfirm(pin), 180);
      }
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setDigits(Array(6).fill(""));
      setSubmitting(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }, 500);
  };

  // Expose shake so parent can call it on wrong PIN
  useEffect(() => {
    window.__txnPinShake = triggerShake;
    return () => { delete window.__txnPinShake; };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Sheet */}
      <motion.div
        className="relative z-10 w-full max-w-sm mx-4 mb-0 sm:mb-0 bg-white rounded-t-[32px] sm:rounded-[28px] shadow-2xl p-8 pb-10"
        initial={{ y: 80, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 80, scale: 0.97, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        {/* Drag handle (mobile) */}
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-6 sm:hidden" />

        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 border-none cursor-pointer"
        >
          <X size={15} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-5">
          <Lock size={24} color="#2563eb" strokeWidth={1.8} />
        </div>

        <h2 className="text-center text-[20px] font-extrabold text-slate-900 mb-1 tracking-tight">
          Transaction PIN
        </h2>
        <p className="text-center text-[13px] text-slate-500 mb-7">
          Enter your 6-digit Transaction PIN to authorise this transfer
        </p>

        {/* 6 digit boxes */}
        <motion.div
          className="flex gap-3 justify-center mb-2"
          animate={shake ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
          transition={{ duration: 0.42 }}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={submitting}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all bg-white text-slate-900
                ${d ? "border-blue-500 bg-blue-50 shadow-inner" : "border-slate-200"}
                focus:border-blue-500 focus:shadow-sm focus:shadow-blue-100
                disabled:opacity-60 disabled:cursor-not-allowed`}
            />
          ))}
        </motion.div>

        {submitting && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Verifying…
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-5 leading-relaxed">
          <ShieldCheck size={11} className="inline mr-1 text-blue-400" />
          PIN never stored in plaintext. Secured with bcrypt.
        </p>
      </motion.div>
    </motion.div>
  );
}

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
  // Transaction PIN modal state
  const [showTxnPinModal, setShowTxnPinModal] = useState(false);
  const txnPinResolveRef = useRef(null); // holds the resolve() of a pending Promise
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
    category: "TRANSFER",
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
  const CATEGORIES = ["TRANSFER","FOOD","RENT","SHOPPING","UTILITIES","EDUCATION","MEDICAL","OTHER"];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };
  
  // F21: QR Scanner logic (mocked to just ask for account number if video APIs not supported easily, or simple prompt for now to avoid media permissions complexity in simple lab)
  const handleQR = () => {
    const acc = prompt("Scan QR Code or enter account number manually:");
    if (acc) setForm(prev => ({ ...prev, receiverAccountNumber: acc }));
  };

  // ── Ask for Transaction PIN (if user has set one) ─────────────────────
  // Returns the 6-digit PIN string, or null if cancelled.
  const askTransactionPin = () =>
    new Promise((resolve) => {
      txnPinResolveRef.current = resolve;
      setShowTxnPinModal(true);
    });

  const handlePinConfirm = (pin) => {
    setShowTxnPinModal(false);
    if (txnPinResolveRef.current) {
      txnPinResolveRef.current(pin);
      txnPinResolveRef.current = null;
    }
  };

  const handlePinCancel = () => {
    setShowTxnPinModal(false);
    if (txnPinResolveRef.current) {
      txnPinResolveRef.current(null);
      txnPinResolveRef.current = null;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.receiverAccountNumber || !form.amount)
      return toast.error("Account number and amount are required");
    if (Number(form.amount) <= 0) return toast.error("Enter a valid amount");

    setLoading(true);
    try {
      const payload = {
        receiverAccountNumber: form.receiverAccountNumber,
        amount: Number(form.amount),
        note: form.note,
        isNewBeneficiary: form.isNewBeneficiary,
        category: form.category,
        hour: new Date().getHours(),
        location: effectiveLocation,
      };

      const res = await transactionService.sendMoney(payload);
      setResult(res.data);
      const resolvedTxnId = res.data.transaction?._id;
      setTxnId(resolvedTxnId);

      if (res.data.status === "TOPUP_REQUIRED") {
        setStep(STEP.PAYMENT);
        openRazorpay(res.data.razorpayOrder, resolvedTxnId);
      } else {
        setStep(STEP.RESULT);
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Transaction failed";
      // If PIN was wrong, shake the modal (if it were still open — here we already closed it,
      // so just show toast and let user re-initiate)
      toast.error(errMsg);
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
    if (result?.transaction?.status === "PIN_PENDING") {
      const enteredPin = await askTransactionPin();
      if (!enteredPin) return; // User cancelled modal

      setLoading(true);
      try {
        const res = await transactionService.confirmTransaction({
          transactionId: txnId,
          transactionPin: enteredPin,
        });
        setFinalTxn(res.data.transaction);
        setStep(STEP.DONE);
        playGPaySound();
        await refreshProfile();
      } catch (err) {
        const errMsg = err.response?.data?.error || "PIN verification failed";
        if (window.__txnPinShake) window.__txnPinShake();
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    } else {
      // Direct completion (no PIN set)
      setFinalTxn(result.transaction);
      setStep(STEP.DONE);
      playGPaySound();
      await refreshProfile();
    }
  };

  // txnIdOverride is used when called from handleSend (TOPUP_REQUIRED path) because
  // the setTxnId() state update is async and the closure would read the old null value.
  const openRazorpay = (order, txnIdOverride) => {
    if (!order?.orderId) {
      toast.error("Payment order unavailable — transfer still completed");
      setStep(STEP.DONE);
      refreshProfile();
      return;
    }
    const effectiveTxnId = txnIdOverride ?? txnId;
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "BankGuard",
      description: "Secure Bank Transfer",
      order_id: order.orderId,
      handler: async (response) => {
        try {
          // verifyPayment now completes the full transfer and returns
          // the APPROVED transaction — use that for the Done screen.
          const payRes = await transactionService.verifyPayment({
            transactionId: effectiveTxnId,
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          setFinalTxn(payRes.data.transaction ?? result?.transaction);
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
    setForm({ receiverAccountNumber: "", amount: "", note: "", isNewBeneficiary: false, category: "TRANSFER" });
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

      {/* ── Transaction PIN Modal ── */}
      <AnimatePresence>
        {showTxnPinModal && (
          <TransactionPinModal
            key="txn-pin-modal"
            onConfirm={handlePinConfirm}
            onCancel={handlePinCancel}
          />
        )}
      </AnimatePresence>

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
                      <button type="button" onClick={handleQR} className="h-9 w-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border-none cursor-pointer">
                        <Scan size={18} />
                      </button>
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

                  {/* Transaction PIN notice (optional — shown only when user has set one) */}
                  {user?.hasTransactionPin && (
                    <div className="flex items-center gap-2 mb-[20px] px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <Lock size={13} className="text-amber-500 shrink-0" />
                      <p className="text-[11px] text-amber-700 font-medium">
                        Transaction PIN will be required to confirm this transfer
                      </p>
                    </div>
                  )}



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

                {/* ── Location + Demo Override ── */}
                <div className="px-6 pb-4">
                  {/* Location bar */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-medium">
                      {locationLoading ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-blue-400" />
                          <span className="text-slate-400">Detecting location…</span>
                        </>
                      ) : overrideCity ? (
                        <>
                          <MapPin size={12} className="text-violet-500 shrink-0" />
                          <span className="text-violet-700 font-semibold">{overrideCity}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-500 ml-1">simulated</span>
                        </>
                      ) : detectedCity ? (
                        <>
                          <MapPin size={12} className="text-blue-500 shrink-0" />
                          <span className="text-slate-600 font-semibold">{detectedCity}</span>
                          <span className="text-[10px] font-medium text-slate-400 ml-1">live</span>
                        </>
                      ) : (
                        <>
                          <MapPin size={12} className="text-slate-300 shrink-0" />
                          <span className="text-slate-400">Location unavailable</span>
                        </>
                      )}
                    </div>
                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => setShowDemoControls((v) => !v)}
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-all select-none ${
                        showDemoControls
                          ? "bg-slate-100 border-slate-200 text-slate-700 shadow-sm"
                          : "bg-transparent border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      }`}
                    >
                      <FlaskConical size={10} />
                      Simulate
                    </button>
                  </div>

                  {/* Collapsible panel */}
                  <AnimatePresence>
                    {showDemoControls && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -4 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                          {/* Header */}
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-slate-500">
                              <FlaskConical size={11} strokeWidth={2.5} />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-700 leading-tight">Location Simulator</p>
                              <p className="text-[9px] text-slate-500 leading-tight">Override ML engine input</p>
                            </div>
                          </div>

                          {/* City grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                            {[
                              { label: "Real GPS", value: "detected", Icon: Navigation },
                              { label: "Madurai",   value: "Madurai",   Icon: Landmark },
                              { label: "Chennai",    value: "Chennai",    Icon: Building2 },
                              { label: "Coimbatore",value: "Coimbatore",Icon: Factory },
                              { label: "Trichy",  value: "Trichy",  Icon: Building },
                              { label: "Custom…",  value: "custom",   Icon: Pencil },
                            ].map(({ label, value, Icon }) => {
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
                                      setShowDemoControls(false);
                                    } else if (value === "custom") {
                                      setOverrideCity("");
                                    } else {
                                      setOverrideCity(value);
                                      setCustomCity("");
                                      setShowDemoControls(false);
                                    }
                                  }}
                                  className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg border text-center transition-all ${
                                    active
                                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                                  }`}
                                >
                                  <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                                  <span className="text-[9px] font-bold leading-tight mt-0.5 truncate w-full px-1">{label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom city input */}
                          {overrideMode === "custom" && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              <input
                                type="text"
                                placeholder="Type any city name (e.g. Chennai)…"
                                value={customCity}
                                onChange={(e) => {
                                  setCustomCity(e.target.value);
                                  setOverrideCity(e.target.value.trim());
                                }}
                                className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] mb-1"
                              />
                            </motion.div>
                          )}

                          {/* Active city note */}
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
                            <MapPin size={10} className="text-slate-400 shrink-0" />
                            <span className="text-[9px] text-slate-500">
                              Sending as: <span className="font-bold text-slate-700">{effectiveLocation || "No location"}</span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                    { label: "Amount",   value: formatCurrency(form.amount) },
                    { label: "To",       value: form.receiverAccountNumber  },
                    { label: "Location", value: effectiveLocation || "—"    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center px-4 py-3 border-b border-slate-100 last:border-0">
                      <span className="text-[12px] text-slate-400 font-medium">{label}</span>
                      <span className="text-[13px] font-semibold text-slate-800 font-mono">{value}</span>
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
                      {loading
                        ? <><Loader2 size={15} className="animate-spin" /> Processing…</>
                        : <><CheckCircle2 size={15} /> Complete Transfer</>}
                    </button>
                  )}
                  <button onClick={reset} className="flex items-center justify-center gap-2 px-6 p-[13px] rounded-xl bg-white text-slate-600 border-[1.5px] border-slate-200 font-sans text-[14px] font-semibold transition-colors hover:bg-slate-50">
                    <ArrowLeft size={15} /> Back
                  </button>
                </div>

                {/* FEATURE 1: SHAP Explanation Card */}
                <ExplainCard
                  flag={result?.fraud_result?.flag}
                  features={{
                    amount:                  result?.fraud_result?.features?.amount                  ?? Number(form.amount),
                    amount_to_avg_ratio:     result?.fraud_result?.features?.amount_to_avg_ratio     ?? 1,
                    amount_to_max_ratio:     result?.fraud_result?.features?.amount_to_max_ratio     ?? 1,
                    amount_to_balance_ratio: result?.fraud_result?.features?.amount_to_balance_ratio ?? 0,
                    velocity_2min:           result?.fraud_result?.features?.velocity_2min           ?? 0,
                    velocity_1hr:            result?.fraud_result?.features?.velocity_1hr            ?? 0,
                    is_known_beneficiary:    result?.fraud_result?.features?.is_known_beneficiary    ?? 1,
                    is_new_location:         result?.fraud_result?.features?.is_new_location         ?? 0,
                    transaction_hour:        result?.fraud_result?.features?.transaction_hour        ?? new Date().getHours(),
                    days_since_last_txn:     result?.fraud_result?.features?.days_since_last_txn     ?? 0,
                    balance_drain:           result?.fraud_result?.features?.balance_drain           ?? 0,
                    exceeds_balance:         result?.fraud_result?.features?.exceeds_balance         ?? 0,
                  }}
                />
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
                className="flex items-center justify-center gap-2 w-full p-[14px] rounded-[14px] bg-blue-600 text-white font-bold text-[15px] border-none cursor-pointer transition-colors shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:bg-blue-700 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Send size={15} /> Make another transfer
              </motion.button>

              {/* FEATURE 8: Download Receipt */}
              {finalTxn?._id && (
                <motion.a
                  href={`${API_BASE}${ENDPOINTS.RECEIPT}/${finalTxn._id}/receipt`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center justify-center gap-2 w-full p-[12px] rounded-[14px] bg-slate-50 text-slate-600 border border-slate-200 font-bold text-[14px] cursor-pointer transition-colors hover:bg-slate-100 no-underline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={() => {
                    const token = localStorage.getItem("fs_token");
                    // For PDF download we open in new tab — auth handled via token in URL query for simplicity
                    // The backend uses Bearer token from header so we use fetch approach
                    fetch(`${API_BASE}${ENDPOINTS.RECEIPT}/${finalTxn._id}/receipt`, {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then((r) => r.blob())
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `receipt-${finalTxn._id}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      })
                      .catch(() => toast.error("Could not download receipt"));
                    return false; // prevent default link navigation
                  }}
                >
                  <Download size={14} /> Download Receipt
                </motion.a>
              )}
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
