import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";

// Build a 30-day sparkline + best-day-to-sell from mock seeded data
function buildSpark(crop: string, base: number) {
  let h = 0;
  for (let i = 0; i < crop.length; i++) h = (h * 31 + crop.charCodeAt(i)) >>> 0;
  return Array.from({ length: 30 }, (_, i) => {
    const wave = Math.sin((i / 30) * Math.PI * 1.5) * 0.06;
    const noise = (((h >> i) & 0x7) - 3) * 0.008;
    return { day: i, price: Math.round(base * (1 + wave + noise)) };
  });
}

export default function PriceSparkline({ crop, base }: { crop: string; base: number }) {
  const data = useMemo(() => buildSpark(crop, base), [crop, base]);
  // Best day to sell = day with highest price in next 7 (last 7 of series)
  const recent = data.slice(-7);
  const peak = recent.reduce((a, b) => (b.price > a.price ? b : a), recent[0]);
  const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][peak.day % 7];

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 h-10 flex-shrink-0">
        <ResponsiveContainer>
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-full bg-krishi-gold-light text-krishi-gold font-medium">
        <Calendar className="h-3 w-3" /> Sell {dayLabel}
      </div>
    </div>
  );
}
