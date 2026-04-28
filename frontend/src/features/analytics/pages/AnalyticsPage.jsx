import { useEffect, useState } from "react";
import { analyticsService } from "../services/analyticsService";
import { PageLoader } from "@/shared/components/Loader";
import { formatCurrency } from "@/shared/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, Activity, Target } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getSpending()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <div className="p-8 text-center text-slate-500">Failed to load analytics</div>;

  // Process monthly data (combine sent & received)
  const monthlyMap = new Map();
  data.monthly.forEach(d => {
    const key = `${MONTHS[d._id.month - 1]} ${d._id.year}`;
    monthlyMap.set(key, { name: key, sent: d.sent, received: 0 });
  });
  data.received.forEach(d => {
    const key = `${MONTHS[d._id.month - 1]} ${d._id.year}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { name: key, sent: 0, received: 0 });
    monthlyMap.get(key).received = d.received;
  });
  const monthlyData = Array.from(monthlyMap.values());

  // Process Day of Week (0-6)
  const byDayData = DAYS.map((name, idx) => {
    // backend $dayOfWeek returns 1 for Sun, 7 for Sat
    const found = data.byDay.find(d => d._id === idx + 1);
    return { name, amount: found ? found.total : 0, count: found ? found.count : 0 };
  });

  // Process Hour of day
  const byHourData = Array.from({ length: 24 }, (_, i) => {
    const found = data.byHour.find(d => d._id === i);
    return { name: `${i}:00`, amount: found ? found.total : 0 };
  });

  return (
    <div className="font-sans text-slate-900 pb-10">
      <div className="mb-6">
        <h1 className="text-[clamp(1.2rem,2.5vw,1.5rem)] font-bold text-slate-900 m-0">Spending Analytics</h1>
        <p className="text-[13px] text-slate-500 mt-1 m-0">Insights based on your approved transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-[14px] p-5">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-blue-50 flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-blue-600" />
          </div>
          <p className="font-mono text-[26px] font-semibold text-slate-900 m-0 leading-none">
            {formatCurrency(data.totals.totalSent)}
          </p>
          <p className="text-[12px] font-semibold text-slate-500 m-0 mt-1.5 uppercase tracking-[0.06em]">Total Sent</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[14px] p-5">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-emerald-50 flex items-center justify-center mb-3">
            <Activity size={18} className="text-emerald-600" />
          </div>
          <p className="font-mono text-[26px] font-semibold text-slate-900 m-0 leading-none">
            {data.totals.count}
          </p>
          <p className="text-[12px] font-semibold text-slate-500 m-0 mt-1.5 uppercase tracking-[0.06em]">Transactions</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[14px] p-5">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-violet-50 flex items-center justify-center mb-3">
            <Target size={18} className="text-violet-600" />
          </div>
          <p className="font-mono text-[26px] font-semibold text-slate-900 m-0 leading-none">
            {formatCurrency(data.totals.avgAmount)}
          </p>
          <p className="text-[12px] font-semibold text-slate-500 m-0 mt-1.5 uppercase tracking-[0.06em]">Avg per Txn</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Flow */}
        <div className="bg-white border border-slate-200 rounded-[14px] p-5">
          <h3 className="text-[13px] font-bold text-slate-900 mb-4 uppercase tracking-[0.05em]">Monthly Cash Flow</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="sent" name="Sent" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="received" name="Received" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of Week */}
        <div className="bg-white border border-slate-200 rounded-[14px] p-5">
          <h3 className="text-[13px] font-bold text-slate-900 mb-4 uppercase tracking-[0.05em]">Volume by Day</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDayData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="amount" name="Sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Flow */}
        <div className="bg-white border border-slate-200 rounded-[14px] p-5 lg:col-span-2">
          <h3 className="text-[13px] font-bold text-slate-900 mb-4 uppercase tracking-[0.05em]">Spending by Hour</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHourData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }} cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
