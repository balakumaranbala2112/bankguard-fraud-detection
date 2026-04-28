import { useEffect, useState } from "react";
import { adminService } from "../services/adminService";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AttackTrends() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getTrends()
      .then(res => setData(res.data.trends || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!data || data.length === 0) return <div className="p-8 text-center text-slate-500">No trend data available</div>;

  // Extract all unique attack types used across all weeks except 'week'
  const keys = new Set();
  data.forEach((d) => {
    Object.keys(d).forEach((k) => {
      if (k !== "week") keys.add(k);
    });
  });
  const attackTypes = Array.from(keys);

  const colors = ["#dc2626", "#ea580c", "#d97706", "#65a30d", "#0891b2", "#8b5cf6", "#be185d"];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-800 mb-6">Attack Trends (Weekly)</h3>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dx={-10} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", fontSize: "12px" }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
            {attackTypes.map((type, i) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
