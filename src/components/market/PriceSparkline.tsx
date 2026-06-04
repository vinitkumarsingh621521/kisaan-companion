import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Point { day: string; price: number; date: string }

const MANDI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mandi-prices`;

function parseDate(s: string): Date {
  // Agmarknet "DD/MM/YYYY"
  const [d, m, y] = s.split("/").map((x) => parseInt(x, 10));
  if (d && m && y) return new Date(y, m - 1, d);
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? new Date(0) : dt;
}

const fmt = (dt: Date) =>
  `${String(dt.getDate()).padStart(2, "0")} ${dt.toLocaleString("en-US", { month: "short" })}`;

export default function PriceSparkline({ crop, base }: { crop: string; base: number }) {
  const [data, setData] = useState<Point[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setErr(false);
    (async () => {
      try {
        const r = await fetch(`${MANDI_URL}?crop=${encodeURIComponent(crop)}&limit=30`, {
          headers: { Authorization: `Bearer ${await edgeToken()}` },
        });
        if (!r.ok) throw new Error("fetch");
        const json = await r.json();
        const recs: any[] = json.records || [];
        const pts: Point[] = recs
          .map((rec) => ({
            date: rec.arrival_date || rec.Arrival_Date || "",
            price: parseFloat(rec.modal_price || rec.Modal_Price || "0"),
          }))
          .filter((p) => p.price > 0 && p.date)
          .map((p) => ({ ...p, _d: parseDate(p.date) } as any))
          .sort((a: any, b: any) => a._d - b._d)
          .slice(-7)
          .map((p: any) => ({ day: fmt(p._d), price: p.price, date: p.date }));
        if (!alive) return;
        if (!pts.length) { setErr(true); return; }
        setData(pts);
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => { alive = false; };
  }, [crop]);

  if (data === null && !err) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="w-20 h-10" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-20 h-10 flex items-center justify-center text-muted-foreground text-xs">—</div>
        <div className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">No data</div>
      </div>
    );
  }

  const first = data[0].price;
  const last = data[data.length - 1].price;
  const stroke =
    last > first * 1.005 ? "hsl(142, 70%, 40%)" :
    last < first * 0.995 ? "hsl(0, 75%, 55%)" :
    "hsl(var(--muted-foreground))";

  const peak = data.reduce((a, b) => (b.price > a.price ? b : a), data[0]);
  const range = `${data[0].day} – ${data[data.length - 1].day}`;

  return (
    <div className="flex items-center gap-3" title={`Range: ${range}`}>
      <div className="w-20 h-10 flex-shrink-0">
        <ResponsiveContainer>
          <LineChart data={data}>
            <Line type="monotone" dataKey="price" stroke={stroke} strokeWidth={1.8} dot={false} isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] flex items-center gap-1 px-2 py-1 rounded-full bg-krishi-gold-light text-krishi-gold font-medium">
        <Calendar className="h-3 w-3" /> Peak {peak.day}
      </div>
    </div>
  );
}
