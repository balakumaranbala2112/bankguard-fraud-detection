import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ShieldCheck, Loader2, X } from "lucide-react";

export default function OTPModal({ open, onClose, onVerify, phone, loading }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);

  useEffect(() => {
    if (open) {
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 150);
    }
  }, [open]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = () => {
    const code = otp.join("");
    if (code.length === 6) onVerify(code);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="w-full max-w-[400px] bg-white rounded-[24px] p-8 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 -mx-8 -my-8 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="flex items-center justify-center w-16 h-16 mb-6 text-blue-600 bg-blue-50 rounded-2xl shadow-sm border border-blue-100/50">
                <MessageSquare size={26} strokeWidth={2.5} />
              </div>

              <h3 className="mb-2 text-xl font-bold tracking-tight text-slate-900">
                Verification Needed
              </h3>
              <p className="mb-8 text-sm leading-relaxed text-slate-500">
                A 6-digit OTP has been sent to{" "}
                <strong className="font-semibold text-slate-800">{phone}</strong>{" "}
                to securely verify this transaction.
              </p>

              <div
                className="flex justify-center gap-2 mb-8"
                onPaste={handlePaste}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className={`w-11 h-14 text-center text-[22px] font-bold rounded-xl border-2 outline-none transition-all duration-200 font-mono
                      ${
                        digit
                          ? "border-blue-500 bg-white text-blue-700 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white"
                      }`}
                  />
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={otp.join("").length < 6 || loading}
                className="flex items-center justify-center w-full gap-2 py-3.5 mb-3 text-sm font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm group"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} className="group-hover:scale-110 transition-transform" />
                    Verify &amp; Transfer
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={loading}
                className="w-full py-2 text-[13px] font-semibold text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel Transfer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
