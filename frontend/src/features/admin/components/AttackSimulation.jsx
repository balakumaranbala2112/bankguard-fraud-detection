import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Crosshair, Zap, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from "../services/adminService";

export default function AttackSimulation({ users }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    type: "ACCOUNT_TAKEOVER",
    amount: "50000"
  });

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!form.userId) return toast.error("Please select a target user");
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
        return toast.error("Please enter a valid amount");
    }

    setLoading(true);
    try {
      const res = await adminService.simulateAttack(form);
      if (res.data.success) {
        toast.success("Attack simulated! SMS Dispatched.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const scenarios = [
    { value: "ACCOUNT_TAKEOVER", label: "Account Takeover", desc: "Simulates a login from a foreign IP attempting a high-value transfer." },
    { value: "RAPID_SUCCESSION_FRAUD", label: "Rapid Succession", desc: "Simulates card or account sweeping with high-velocity transactions." },
    { value: "LARGE_AMOUNT_FRAUD", label: "Extreme Large Amount", desc: "Simulates a transaction far exceeding the user's historical patterns." }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      
      <div className="bg-gradient-to-r from-red-500 to-red-700 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg border border-red-800">
        <div className="relative z-10 flex gap-4 items-center">
            <div className="bg-white/20 p-3 rounded-full shrink-0">
                <ShieldAlert size={32} className="text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-bold m-0 mb-1">Attack Simulation Lab</h2>
                <p className="text-red-100 m-0 text-sm opacity-90 max-w-xl leading-relaxed">
                    Execute strictly controlled fraud scenarios to test the ML detection pipeline, socket feeds, and SMS delivery systems in real-time. Do not run this on real customers.
                </p>
            </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Zap size={140} />
        </div>
      </div>

      <motion.div 
        className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm"
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      >
        <form onSubmit={handleSimulate} className="space-y-8">
            
            {/* Target Selection */}
            <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                    1. Select Target User
                </label>
                <div className="relative">
                    <select 
                        name="userId" 
                        value={form.userId} 
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-red-500 focus:ring-0 outline-none transition-all appearance-none text-slate-700 font-medium text-[15px]"
                    >
                        <option value="" disabled>Choose a vulnerable target...</option>
                        {users.map(u => (
                            <option key={u._id} value={u._id}>{u.name} — {u.email} ({u.accountNumber})</option>
                        ))}
                    </select>
                    <Crosshair className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1.5L6 6.5L11 1.5" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Attack Type */}
            <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                    2. Select Attack Scenario
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {scenarios.map(s => (
                        <div 
                            key={s.value}
                            onClick={() => setForm(p => ({ ...p, type: s.value }))}
                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                                form.type === s.value 
                                ? "border-red-500 bg-red-50/50" 
                                : "border-slate-200 hover:border-red-200 bg-white"
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`font-bold text-[15px] ${form.type === s.value ? "text-red-700" : "text-slate-900"}`}>
                                    {s.label}
                                </span>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    form.type === s.value ? "border-red-500" : "border-slate-300"
                                }`}>
                                    {form.type === s.value && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed m-0">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
                    3. Define Fraud Amount
                </label>
                <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rs.</span>
                    <input 
                        type="number"
                        name="amount"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="Enter amount..."
                        className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-red-500 focus:ring-0 outline-none transition-all text-slate-700 font-bold text-[16px]"
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <button 
                    type="submit" 
                    disabled={loading || !form.userId}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-[16px] py-4 rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                    {loading ? (
                        <><Loader2 className="animate-spin" size={20} /> Executing Exploit...</>
                    ) : (
                        <><Zap size={20} /> Launch Simulated Attack</>
                    )}
                </button>
            </div>
            
        </form>
      </motion.div>
    </div>
  );
}
