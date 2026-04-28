import { useEffect, useState } from "react";
import { adminService } from "../services/adminService";
import { Loader2 } from "lucide-react";

export default function FraudHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getHeatmap()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!data) return <div className="p-8 text-center text-slate-500">Failed to load heatmap</div>;

  // data.matrix is total transactions, data.fraudMatrix is fraud transactions
  // We want to color intensity based on fraud intensity
  let maxFraud = 1;
  data.fraudMatrix.forEach(day => {
    day.forEach(val => {
      if (val > maxFraud) maxFraud = val;
    });
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Fraud Heatmap (Day vs Hour)</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row (Hours) */}
          <div className="flex mb-1 ml-10">
            {hours.map(h => (
              <div key={h} className="flex-1 text-center text-[10px] text-slate-400 font-mono">
                {h}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-1">
            {data.days.map((day, dIdx) => (
              <div key={day} className="flex items-center">
                <div className="w-10 text-[11px] font-semibold text-slate-500">{day}</div>
                <div className="flex flex-1 gap-1">
                  {hours.map(hIdx => {
                    const fraudCount = data.fraudMatrix[dIdx][hIdx];
                    const totalCount = data.matrix[dIdx][hIdx];
                    // Intensity calculation
                    const intensity = fraudCount / maxFraud; 
                    // Base red is 0, 100%, 50%; Lightness varies from 95% down to 45% based on intensity
                    const lightness = 95 - (intensity * 50); 
                    const backgroundColor = fraudCount > 0 ? `hsl(0, 100%, ${lightness}%)` : "#f8fafc";
                    const tooltipText = `Total: ${totalCount}\nFraud: ${fraudCount}`;

                    return (
                      <div
                        key={hIdx}
                        title={tooltipText}
                        className="flex-1 aspect-square rounded-sm cursor-help transition-colors hover:ring-1 hover:ring-black/20"
                        style={{ backgroundColor }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-400 justify-end">
        <span>Less risk</span>
        <div className="w-24 h-2 rounded bg-gradient-to-r from-slate-50 to-red-600" />
        <span>More risk</span>
      </div>
    </div>
  );
}
