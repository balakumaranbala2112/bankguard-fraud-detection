import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .reg-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 32px 20px; background: #f1f5f9;
          font-family: 'DM Sans', sans-serif;
        }
        .reg-box { width: 100%; max-width: 440px; }

        .reg-brand { display: flex; align-items: center; gap: 9px; margin-bottom: 28px; }
        .reg-brand-icon {
          width: 34px; height: 34px; border-radius: 9px; background: #2563eb;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .reg-brand-name { font-size: 15px; font-weight: 700; color: #0f172a; }

        .reg-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; }

        .reg-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .reg-sub   { font-size: 13px; color: #64748b; margin: 0 0 24px; }

        .reg-field { margin-bottom: 18px; }
        .reg-label {
          display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: #475569; margin-bottom: 7px;
        }
        .reg-input {
          width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #0f172a; background: #f8fafc;
          outline: none; transition: border-color 0.15s, background 0.15s;
        }
        .reg-input:focus { border-color: #2563eb; background: #fff; }
        .reg-input::placeholder { color: #94a3b8; }
        .reg-hint { font-size: 11px; color: #94a3b8; margin: 5px 0 0; }

        .reg-btn {
          width: 100%; padding: 12px; border-radius: 11px; border: none; cursor: pointer;
          background: #2563eb; color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 3px rgba(37,99,235,0.3); margin-top: 8px;
        }
        .reg-btn:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .reg-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .reg-footer { margin-top: 18px; text-align: center; font-size: 13px; color: #64748b; }
        .reg-footer a { color: #2563eb; font-weight: 600; text-decoration: none; }
        .reg-footer a:hover { text-decoration: underline; }

        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div className="reg-root">
        <motion.div
          className="reg-box"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="reg-brand">
            <div className="reg-brand-icon">
              <ShieldCheck size={18} color="#fff" strokeWidth={2} />
            </div>
            <span className="reg-brand-name">FraudShield</span>
          </div>

          <div className="reg-card">
            <h2 className="reg-title">Create account</h2>
            <p className="reg-sub">
              Join FraudShield for protected transactions
            </p>

            <form onSubmit={handleSubmit}>
              <div className="reg-field">
                <label className="reg-label">Full name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Balakumaran K"
                  className="reg-input"
                />
              </div>

              <div className="reg-field">
                <label className="reg-label">Email address</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="reg-input"
                />
              </div>

              <div className="reg-field">
                <label className="reg-label">Phone number</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="reg-input"
                />
                <p className="reg-hint">
                  Used for OTP fraud verification via SMS
                </p>
              </div>

              <div className="reg-field">
                <label className="reg-label">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="reg-input"
                />
              </div>

              <button type="submit" disabled={loading} className="reg-btn">
                {loading ? (
                  <>
                    <Loader2
                      size={15}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p className="reg-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
