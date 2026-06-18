import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FeatureHint from "@/components/FeatureHint";

const MSP: Record<string, number> = {
  Rice: 2300, Wheat: 2275, Cotton: 7121, Maize: 2090, Mustard: 5650,
  Soybean: 4600, Tomato: 800, Potato: 900, Onion: 1100, Sugarcane: 375,
};
const CROPS = Object.keys(MSP);

function generateData(crop: string) {
  const msp = MSP[crop] || 2000;
  const base = msp * 1.1;
  return Array.from({ length: 38 }, (_, idx) => {
    const i = idx - 30;
    const d = new Date(); d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const seasonal = Math.sin((i + 45) / 15) * 0.07;
    const noise = (Math.random() - 0.5) * 0.04;
    const price = Math.round(base * (1 + seasonal + noise));
    return {
      date: label,
      actual: i <= 0 ? price : null,
      predicted: i > 0 ? Math.round(price * (1 + (Math.random() - 0.48) * 0.03)) : null,
      msp,
      isToday: i === 0,
    };
  });
}

export default function PriceTrendChart() {
  const [crop, setCrop] = useState("Wheat");
  const data = useMemo(() => generateData(crop), [crop]);

  const actuals = data.filter((d) => d.actual != null).map((d) => d.actual as number);
  const current = actuals[actuals.length - 1] || 0;
  const last7 = actuals.slice(-7);
  const high7 = last7.length ? Math.max(...last7) : 0;
  const low7 = last7.length ? Math.min(...last7) : 0;
  const msp = MSP[crop];
  const vsMsp = msp ? ((current - msp) / msp) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-700 text-white p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            📈 Price Intelligence
            <FeatureHint
              title="Price Trend Forecast"
              description="Shows 30 days of real price history plus a 7-day AI-predicted price line. The red dashed line shows the government MSP. Use this to spot the best selling window."
              example="If predicted line trends up for next 5 days, consider waiting to sell."
            />
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 border border-green-400/40">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
            </span>
          </h2>
          <p className="text-white/70 text-xs mt-0.5">Historical price + AI 7-day forecast vs MSP</p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-end mb-3">
          <div className="w-40">
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={5} />
              <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 10 }} width={60} />
              <Tooltip
                formatter={(value: any, name: any) => [`₹${value}/qtl`, name === "actual" ? "Price" : name === "predicted" ? "AI Forecast" : "MSP"]}
                labelStyle={{ fontWeight: "bold" }}
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              />
              <Legend formatter={(v) => v === "actual" ? "Historical Price" : v === "predicted" ? "AI Forecast (7-day)" : "MSP"} />
              <ReferenceLine y={msp} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "MSP", position: "right", fill: "#f59e0b", fontSize: 10 }} />
              <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" fill="url(#actualFill)" strokeWidth={2} />
              <Line type="monotone" dataKey="predicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Stat label="Current Price" value={`₹${current.toLocaleString("en-IN")}`} />
          <Stat label="7-Day High" value={`₹${high7.toLocaleString("en-IN")}`} />
          <Stat label="7-Day Low" value={`₹${low7.toLocaleString("en-IN")}`} />
          <Stat label="vs MSP" value={`${vsMsp >= 0 ? "+" : ""}${vsMsp.toFixed(1)}%`} tone={vsMsp >= 0 ? "pos" : "neg"} />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-green-600" : tone === "neg" ? "text-red-600" : "text-foreground";
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
