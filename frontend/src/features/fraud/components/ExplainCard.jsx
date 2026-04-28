// src/features/fraud/components/ExplainCard.jsx
// FEATURE 1: SHAP Explainability — shows AI reasoning for flagged transactions

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, TrendingUp, TrendingDown, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { API_BASE, ENDPOINTS } from "@/shared/constants";

function getAuthToken() {
  return localStorage.getItem("fs_token");
}

export default function ExplainCard({ features, flag }) {
  const [explanations, setExplanations] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [expanded, setExpanded]         = useState(true);

  // Only show for RED or AMBER flags
  const shouldShow = flag === "RED" || flag === "AMBER";

  useEffect(() => {
    if (!shouldShow || !features) return;

    setLoading(true);
    setError(null);

    const token = getAuthToken();

    fetch(`${API_BASE}${ENDPOINTS.ML_EXPLAIN}`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify(features),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setExplanations(data.explanations || []);
        else setError("Could not load explanation");
      })
      .catch(() => setError("Explanation service unavailable"))
      .finally(() => setLoading(false));
  }, [shouldShow, features]);

  if (!shouldShow) return null;

  const accentColor = flag === "RED" ? "#dc2626" : "#d97706";
  const bgColor     = flag === "RED" ? "#fef2f2" : "#fffbeb";
  const borderColor = flag === "RED" ? "#fecaca" : "#fde68a";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 14 }}
      className="mt-4 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer bg-transparent border-none text-left"
        style={{ fontFamily: "inherit" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: accentColor + "20" }}
          >
            <Brain size={15} style={{ color: accentColor }} strokeWidth={2} />
          </div>
          <span className="text-[13px] font-bold" style={{ color: accentColor }}>
            Why was this flagged?
          </span>
        </div>
        {expanded
          ? <ChevronUp size={15} style={{ color: accentColor }} />
          : <ChevronDown size={15} style={{ color: accentColor }} />
        }
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4">
              {loading && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={14} style={{ color: accentColor }} className="animate-spin" />
                  <span className="text-[12px]" style={{ color: accentColor }}>
                    Analysing transaction…
                  </span>
                </div>
              )}

              {error && (
                <p className="text-[12px] text-slate-400 py-1">{error}</p>
              )}

              {!loading && !error && explanations.length > 0 && (
                <div className="flex flex-col gap-2">
                  {explanations.map((exp, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="flex items-start gap-2.5"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background: exp.direction === "increased_risk"
                            ? accentColor + "20"
                            : "#dcfce7",
                        }}
                      >
                        {exp.direction === "increased_risk"
                          ? <TrendingUp  size={11} style={{ color: accentColor }} strokeWidth={2.5} />
                          : <TrendingDown size={11} style={{ color: "#16a34a" }} strokeWidth={2.5} />
                        }
                      </div>
                      <p className="text-[12.5px] text-slate-700 leading-snug m-0">
                        {exp.reason}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {!loading && !error && explanations.length === 0 && (
                <p className="text-[12px] text-slate-400 py-1">
                  Multiple behavioral signals contributed to the risk assessment.
                </p>
              )}

              <p className="text-[10.5px] text-slate-400 mt-3 m-0 leading-relaxed">
                Powered by XGBoost feature analysis. These are the top factors that influenced the fraud score.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
