import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Reading = { t: number; moisture: number; temp: number; ph: number; n: number };

const MAX_POINTS = 30;

export default function IoTLiveStream() {
  const [series, setSeries] = useState<Reading[]>([]);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    // Seed with 5 baseline points
    const now = Date.now();
    setSeries(Array.from({ length: 5 }, (_, i) => ({
      t: now - (5 - i) * 3000,
      moisture: 60 + Math.random() * 5,
      temp: 27 + Math.random() * 2,
      ph: 6.5 + (Math.random() - 0.5) * 0.2,
      n: 240 + Math.random() * 10,
    })));

    const id = setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1] || { moisture: 62, temp: 28, ph: 6.5, n: 240 };
        const next: Reading = {
          t: Date.now(),
          moisture: Math.max(20, Math.min(95, last.moisture + (Math.random() - 0.5) * 3)),
          temp: Math.max(15, Math.min(40, last.temp + (Math.random() - 0.5) * 0.6)),
          ph: Math.max(4, Math.min(9, last.ph + (Math.random() - 0.5) * 0.08)),
          n: Math.max(50, Math.min(400, last.n + (Math.random() - 0.5) * 6)),
        };
        // Threshold alerts
        if (next.moisture < 35) {
          toast.error(`💧 Moisture critically low (${next.moisture.toFixed(0)}%) — irrigate now`);
          setAlertCount((c) => c + 1);
        } else if (next.temp > 36) {
          toast.warning(`🌡️ Soil temperature high (${next.temp.toFixed(1)}°C) — provide shade`);
          setAlertCount((c) => c + 1);
        }
        const arr = [...prev, next];
        return arr.length > MAX_POINTS ? arr.slice(-MAX_POINTS) : arr;
      });
    }, 3000);

    return () => clearInterval(id);
  }, []);

  const chartData = useMemo(() =>
    series.map((s, i) => ({
      idx: i,
      Moisture: +s.moisture.toFixed(1),
      Temperature: +s.temp.toFixed(1),
      pH: +s.ph.toFixed(2),
      Nitrogen: Math.round(s.n / 4), // scale to fit
    })), [series]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary animate-pulse" /> Live Sensor Stream
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium ml-1">3s refresh</span>
        </h3>
        {alertCount > 0 && (
          <span className="krishi-badge bg-destructive/10 text-destructive text-[10px] flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {alertCount} alert{alertCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="moistG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(200, 75%, 55%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(200, 75%, 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tempG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="idx" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Area type="monotone" dataKey="Moisture" stroke="hsl(200, 75%, 55%)" fill="url(#moistG)" strokeWidth={2} />
            <Area type="monotone" dataKey="Temperature" stroke="hsl(0, 84%, 60%)" fill="url(#tempG)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 text-center">
        {series[series.length - 1] && (
          <>
            <div className="p-2 rounded-lg bg-krishi-sky/10">
              <p className="text-[10px] text-muted-foreground">Moisture</p>
              <p className="text-sm font-bold text-foreground">{series[series.length - 1].moisture.toFixed(0)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10">
              <p className="text-[10px] text-muted-foreground">Temp</p>
              <p className="text-sm font-bold text-foreground">{series[series.length - 1].temp.toFixed(1)}°C</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <p className="text-[10px] text-muted-foreground">pH</p>
              <p className="text-sm font-bold text-foreground">{series[series.length - 1].ph.toFixed(2)}</p>
            </div>
            <div className="p-2 rounded-lg bg-krishi-gold-light">
              <p className="text-[10px] text-muted-foreground">N (kg/ha)</p>
              <p className="text-sm font-bold text-foreground">{Math.round(series[series.length - 1].n)}</p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
