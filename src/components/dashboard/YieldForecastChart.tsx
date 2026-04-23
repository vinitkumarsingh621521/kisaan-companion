import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

interface Props {
  crops: { name: string; yield?: string }[];
}

// Build mock projected vs last-year monthly yield series
function buildSeries(cropName: string, projected: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let h = 0;
  for (let i = 0; i < cropName.length; i++) h = (h * 31 + cropName.charCodeAt(i)) >>> 0;
  return months.map((m, i) => {
    const seasonal = Math.sin((i / 12) * Math.PI * 2) * 0.3 + 1;
    const lastYear = +(projected * 0.85 * seasonal + ((h >> i) & 0x3) * 0.05).toFixed(2);
    const proj = +(projected * seasonal + ((h >> (i + 4)) & 0x3) * 0.04).toFixed(2);
    return { month: m, lastYear, projected: proj };
  });
}

export default function YieldForecastChart({ crops }: Props) {
  const data = useMemo(() => {
    if (!crops.length) return [];
    // Use top crop for the chart
    const top = crops[0];
    const num = parseFloat(top.yield || "4") || 4;
    return buildSeries(top.name, num);
  }, [crops]);

  if (!data.length) return null;
  const top = crops[0];

  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          {top.name} — Yield Forecast
        </div>
        <span className="text-[10px] text-muted-foreground">tons/ha · 12 mo</span>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={28} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
            <Line type="monotone" dataKey="lastYear" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} name="Last Year" strokeDasharray="4 3" />
            <Line type="monotone" dataKey="projected" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Projected" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
