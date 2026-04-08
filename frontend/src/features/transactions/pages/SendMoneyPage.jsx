import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { transactionService } from "../services/transactionService";
import OTPModal from "../components/OTPModal";
import RiskBadge from "../components/RiskBadge";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/shared/utils";
import {
  Send,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  MapPin,
  UserPlus,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const STEP = {
  FORM: "FORM",
  RESULT: "RESULT",
  OTP: "OTP",
  PAYMENT: "PAYMENT",
  DONE: "DONE",
};

export default function SendMoneyPage() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(STEP.FORM);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    receiverAccountNumber: "",
    amount: "",
    note: "",
    isNewLocation: false,
    isNewBeneficiary: false,
  });
  const [result, setResult] = useState(null);
  const [txnId, setTxnId] = useState(null);
  const [finalTxn, setFinalTxn] = useState(null);

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
      const res = await transactionService.verifyOTP({
        transactionId: txnId,
        otp: code,
      });
      if (res.data.requiresPayment) {
        setResult((p) => ({ ...p, razorpayOrder: res.data.razorpayOrder }));
        setStep(STEP.PAYMENT);
        openRazorpay(res.data.razorpayOrder);
      } else {
        setFinalTxn(res.data.transaction);
        setStep(STEP.DONE);
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
      name: "FraudShield",
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
          await refreshProfile();
        } catch {
          toast.error("Payment verification failed");
        }
      },
      modal: {
        ondismiss: () => {
          toast.error("Payment cancelled — transfer not completed");
          setStep(STEP.RESULT);
        },
      },
      theme: { color: "#2563eb" },
    };
    new window.Razorpay(options).open();
  };

  const reset = () => {
    setStep(STEP.FORM);
    setForm({
      receiverAccountNumber: "",
      amount: "",
      note: "",
      isNewLocation: false,
      isNewBeneficiary: false,
    });
    setResult(null);
    setTxnId(null);
    setFinalTxn(null);
  };

  const riskLevel = result?.fraud_result?.risk_level;
  const riskScore = result?.fraud_result?.probability;

  const riskConfig = {
    HIGH: {
      bg: "#fef2f2",
      border: "#fecaca",
      icon: ShieldX,
      iconColor: "#dc2626",
      iconBg: "#fee2e2",
    },
    MEDIUM: {
      bg: "#fffbeb",
      border: "#fde68a",
      icon: ShieldAlert,
      iconColor: "#d97706",
      iconBg: "#fef3c7",
    },
    LOW: {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      icon: ShieldCheck,
      iconColor: "#16a34a",
      iconBg: "#dcfce7",
    },
  };
  const rc = riskConfig[riskLevel] || riskConfig.LOW;
  const RiskIcon = rc.icon;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .sm-root { font-family: 'DM Sans', sans-serif; max-width: 520px; margin: 0 auto; padding-bottom: 60px; }

        .sm-page-title   { font-size: clamp(1.2rem, 2.5vw, 1.5rem); font-weight: 700; color: #0f172a; margin: 0; }
        .sm-page-sub     { font-size: 13px; color: #64748b; margin: 4px 0 0; }

        /* Card */
        .sm-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; }

        /* Label + Input */
        .sm-label { display: block; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }
        .sm-input {
          width: 100%; padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0f172a; background: #f8fafc;
          outline: none; transition: border-color 0.15s, background 0.15s; box-sizing: border-box;
        }
        .sm-input:focus { border-color: #2563eb; background: #fff; }
        .sm-input::placeholder { color: #94a3b8; }
        .sm-input-mono { font-family: 'DM Mono', monospace; }
        .sm-input-prefix { position: relative; }
        .sm-input-prefix .sm-prefix { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #64748b; font-weight: 500; pointer-events: none; }
        .sm-input-prefix .sm-input  { padding-left: 26px; }

        /* Fraud context box */
        .sm-context-box { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px; }
        .sm-context-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin: 0 0 12px; }
        .sm-checkbox-row { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 0; }
        .sm-checkbox-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #2563eb; cursor: pointer; flex-shrink: 0; }
        .sm-checkbox-row span { font-size: 13px; color: #475569; font-weight: 500; }
        .sm-checkbox-icon { color: #94a3b8; flex-shrink: 0; }

        /* Buttons */
        .sm-btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px; border-radius: 11px;
          background: #2563eb; color: #fff; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          transition: background 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 3px rgba(37,99,235,0.25);
        }
        .sm-btn-primary:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .sm-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .sm-btn-outline {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          flex: 1; padding: 12px; border-radius: 11px;
          background: #fff; color: #475569; border: 1.5px solid #e2e8f0; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          transition: background 0.15s, border-color 0.15s;
        }
        .sm-btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }

        /* Risk banner */
        .sm-risk-banner { border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; border: 1.5px solid; }
        .sm-risk-icon-wrap { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
        .sm-risk-score { font-family: 'DM Mono', monospace; font-size: 11px; color: #94a3b8; margin: 6px 0 0; }

        /* Txn summary rows */
        .sm-summary { margin-bottom: 24px; }
        .sm-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
        .sm-summary-row:last-child { border-bottom: none; }
        .sm-summary-key { font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .sm-summary-val { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: #0f172a; }

        /* Done screen */
        .sm-done-icon { width: 68px; height: 68px; border-radius: 50%; background: #f0fdf4; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .sm-done-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
        .sm-done-sub   { font-size: 13px; color: #64748b; margin: 0 0 4px; }
        .sm-done-ref   { font-family: 'DM Mono', monospace; font-size: 11px; color: #94a3b8; margin: 0 0 28px; }

        .sm-field { margin-bottom: 20px; }
        .sm-avail { font-size: 11px; color: #94a3b8; margin: 5px 0 0; }
        .sm-avail span { color: #2563eb; font-family: 'DM Mono', monospace; }
        .sm-btn-row { display: flex; gap: 10px; }
      `}</style>

      <div className="sm-root">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="sm-page-title">Send Money</h1>
          <p className="sm-page-sub">
            Every transaction is analysed by our ML model in real time
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── FORM ── */}
          {step === STEP.FORM && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
            >
              <form onSubmit={handleSend} className="sm-card">
                <div className="sm-field">
                  <label className="sm-label">Receiver Account Number</label>
                  <input
                    name="receiverAccountNumber"
                    value={form.receiverAccountNumber}
                    onChange={handleChange}
                    placeholder="BG12345678"
                    className="sm-input sm-input-mono"
                  />
                </div>

                <div className="sm-field">
                  <label className="sm-label">Amount (₹)</label>
                  <div className="sm-input-prefix">
                    <span className="sm-prefix">₹</span>
                    <input
                      name="amount"
                      type="number"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="sm-input sm-input-mono"
                      min="1"
                    />
                  </div>
                  {user && (
                    <p className="sm-avail">
                      Available: <span>{formatCurrency(user.balance)}</span>
                    </p>
                  )}
                </div>

                <div className="sm-field">
                  <label className="sm-label">Note (optional)</label>
                  <input
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="Rent, dinner, etc."
                    className="sm-input"
                  />
                </div>

                <div className="sm-field">
                  <div className="sm-context-box">
                    <p className="sm-context-title">Fraud context</p>
                    <label className="sm-checkbox-row">
                      <input
                        type="checkbox"
                        name="isNewLocation"
                        checked={form.isNewLocation}
                        onChange={handleChange}
                      />
                      <MapPin size={14} className="sm-checkbox-icon" />
                      <span>Sending from a new location</span>
                    </label>
                    <label className="sm-checkbox-row">
                      <input
                        type="checkbox"
                        name="isNewBeneficiary"
                        checked={form.isNewBeneficiary}
                        onChange={handleChange}
                      />
                      <UserPlus size={14} className="sm-checkbox-icon" />
                      <span>This is a new beneficiary</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="sm-btn-primary"
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={15}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      Analysing transaction…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Analyse &amp; Send
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {step === STEP.RESULT && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="sm-card">
                <div
                  className="sm-risk-banner"
                  style={{ background: rc.bg, borderColor: rc.border }}
                >
                  <div
                    className="sm-risk-icon-wrap"
                    style={{ background: rc.iconBg }}
                  >
                    <RiskIcon size={24} color={rc.iconColor} strokeWidth={2} />
                  </div>
                  <RiskBadge level={riskLevel} />
                  <p
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      margin: "8px 0 0",
                    }}
                  >
                    {result.fraud_result?.message}
                  </p>
                  <p className="sm-risk-score">
                    Fraud score: {((riskScore || 0) * 100).toFixed(1)}%
                  </p>
                </div>

                <div className="sm-summary">
                  {[
                    ["Amount", formatCurrency(form.amount)],
                    ["To", form.receiverAccountNumber],
                    ["Status", result.transaction?.status || result.status],
                  ].map(([k, v]) => (
                    <div key={k} className="sm-summary-row">
                      <span className="sm-summary-key">{k}</span>
                      <span className="sm-summary-val">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="sm-btn-row">
                  {riskLevel === "MEDIUM" && (
                    <button
                      onClick={() => setStep(STEP.OTP)}
                      className="sm-btn-primary"
                      style={{ flex: 1 }}
                    >
                      Enter OTP
                    </button>
                  )}
                  {riskLevel === "LOW" && (
                    <button
                      onClick={handleLowRiskComplete}
                      disabled={loading}
                      className="sm-btn-primary"
                      style={{ flex: 1 }}
                    >
                      {loading ? (
                        <>
                          <Loader2
                            size={14}
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                          Processing…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          Complete Transfer
                        </>
                      )}
                    </button>
                  )}
                  <button onClick={reset} className="sm-btn-outline">
                    <ArrowLeft size={15} />
                    Back
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── DONE ── */}
          {step === STEP.DONE && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div
                className="sm-card"
                style={{
                  textAlign: "center",
                  paddingTop: 36,
                  paddingBottom: 36,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1, stiffness: 220 }}
                  className="sm-done-icon"
                >
                  <CheckCircle2 size={32} color="#16a34a" strokeWidth={1.8} />
                </motion.div>
                <h2 className="sm-done-title">Transfer Complete!</h2>
                <p className="sm-done-sub">
                  {formatCurrency(form.amount)} sent successfully
                </p>
                {finalTxn?._id && (
                  <p className="sm-done-ref">Ref: {finalTxn._id}</p>
                )}
                <button
                  onClick={reset}
                  className="sm-btn-primary"
                  style={{ maxWidth: 200, margin: "0 auto" }}
                >
                  <Send size={14} />
                  New Transfer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spinner keyframe */}
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

        <OTPModal
          open={step === STEP.OTP}
          onClose={() => setStep(STEP.RESULT)}
          onVerify={handleOTPVerify}
          phone={user?.phone}
          loading={loading}
        />
      </div>
    </>
  );
}
