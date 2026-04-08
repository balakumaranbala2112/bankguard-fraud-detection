import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { ShieldCheck, Loader2, Zap, MessageSquare, Brain } from "lucide-react";

const FEATURES = [
  { Icon: Brain, label: "ML-powered risk scoring" },
  { Icon: MessageSquare, label: "OTP verification via SMS" },
  { Icon: Zap, label: "Real-time fraud alerts" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .login-root {
          min-height: 100vh; display: flex;
          font-family: 'DM Sans', sans-serif; background: #f1f5f9;
        }

        /* Left panel */
        .login-left {
          display: none;
          width: 440px; flex-shrink: 0;
          background: #0f172a;
          flex-direction: column; justify-content: space-between;
          padding: 48px 44px; position: relative; overflow: hidden;
        }
        @media (min-width: 1024px) { .login-left { display: flex; } }

        .login-left-grid {
          position: absolute; inset: 0; opacity: 0.04;
          background-image: linear-gradient(#fff 1px,transparent 1px), linear-gradient(90deg,#fff 1px,transparent 1px);
          background-size: 36px 36px; pointer-events: none;
        }
        .login-left-orb {
          position: absolute; top: -80px; left: -80px;
          width: 320px; height: 320px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-brand { display: flex; align-items: center; gap: 10px; position: relative; z-index: 1; }
        .login-brand-icon {
          width: 38px; height: 38px; border-radius: 10px; background: #2563eb;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .login-brand-name { font-size: 16px; font-weight: 700; color: #f8fafc; }

        .login-hero { position: relative; z-index: 1; }
        .login-hero h1 { font-size: 2rem; font-weight: 700; color: #f8fafc; line-height: 1.25; margin: 0 0 14px; }
        .login-hero p  { font-size: 14px; color: #64748b; line-height: 1.65; margin: 0; }

        .login-features { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 14px; }
        .login-feature  { display: flex; align-items: center; gap: 12px; }
        .login-feature-icon {
          width: 34px; height: 34px; border-radius: 9px; background: rgba(37,99,235,0.15);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .login-feature span { font-size: 13px; color: #94a3b8; font-weight: 500; }

        /* Right panel */
        .login-right {
          flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px 20px;
        }
        .login-box { width: 100%; max-width: 400px; }

        /* Mobile brand */
        .login-mobile-brand {
          display: flex; align-items: center; gap: 9px; margin-bottom: 32px;
        }
        .login-mobile-brand-icon {
          width: 34px; height: 34px; border-radius: 9px; background: #2563eb;
          display: flex; align-items: center; justify-content: center;
        }
        .login-mobile-brand-name { font-size: 15px; font-weight: 700; color: #0f172a; }
        @media (min-width: 1024px) { .login-mobile-brand { display: none; } }

        .login-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .login-sub   { font-size: 13px; color: #64748b; margin: 0 0 28px; }

        /* Form */
        .login-field { margin-bottom: 18px; }
        .login-label {
          display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: #475569; margin-bottom: 7px;
        }
        .login-input {
          width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0f172a; background: #f8fafc;
          outline: none; transition: border-color 0.15s, background 0.15s;
        }
        .login-input:focus { border-color: #2563eb; background: #fff; }
        .login-input::placeholder { color: #94a3b8; }

        .login-btn {
          width: 100%; padding: 12px; border-radius: 11px; border: none; cursor: pointer;
          background: #2563eb; color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 3px rgba(37,99,235,0.3); margin-top: 8px;
        }
        .login-btn:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .login-footer { margin-top: 20px; text-align: center; font-size: 13px; color: #64748b; }
        .login-footer a { color: #2563eb; font-weight: 600; text-decoration: none; }
        .login-footer a:hover { text-decoration: underline; }

        .login-demo {
          margin-top: 24px; padding: 14px 16px; border-radius: 11px;
          background: #eff6ff; border: 1.5px solid #bfdbfe;
        }
        .login-demo-title { font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
        .login-demo p { font-family: 'DM Mono', monospace; font-size: 12px; color: #2563eb; margin: 2px 0; }

        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div className="login-root">
        {/* ── Left ── */}
        <div className="login-left">
          <div className="login-left-grid" />
          <div className="login-left-orb" />

          <div className="login-brand">
            <div className="login-brand-icon">
              <ShieldCheck size={20} color="#fff" strokeWidth={2} />
            </div>
            <span className="login-brand-name">FraudShield</span>
          </div>

          <div className="login-hero">
            <h1>
              Intelligent
              <br />
              Fraud Detection
              <br />
              for Modern Banking
            </h1>
            <p>
              Real-time XGBoost-powered fraud analysis protecting every
              transaction you make.
            </p>
          </div>

          <div className="login-features">
            {FEATURES.map(({ Icon, label }) => (
              <div key={label} className="login-feature">
                <div className="login-feature-icon">
                  <Icon size={16} color="#60a5fa" strokeWidth={2} />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right ── */}
        <div className="login-right">
          <motion.div
            className="login-box"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="login-mobile-brand">
              <div className="login-mobile-brand-icon">
                <ShieldCheck size={18} color="#fff" strokeWidth={2} />
              </div>
              <span className="login-mobile-brand-name">FraudShield</span>
            </div>

            <h2 className="login-title">Sign in</h2>
            <p className="login-sub">
              Enter your credentials to access your account
            </p>

            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-label">Email address</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="login-input"
                  autoComplete="email"
                />
              </div>
              <div className="login-field">
                <label className="login-label">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="login-input"
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" disabled={loading} className="login-btn">
                {loading ? (
                  <>
                    <Loader2
                      size={15}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="login-footer">
              Don't have an account? <Link to="/register">Create one</Link>
            </p>

            <div className="login-demo">
              <p className="login-demo-title">Demo credentials</p>
              <p>demo@fraudshield.com</p>
              <p>demo1234</p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
