import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Bell, BellOff } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";
import { toast } from "sonner";

// Stable seeded variation per crop so prices feel "live" but not random on every render
function seededPrice(crop: string, monthIdx: number, base: number): number {
  let h = 0;
  const s = `${crop}-${monthIdx}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const swing = (h % 200) - 100; // ±100
  return Math.max(800, Math.round(base + swing + monthIdx * (base * 0.012)));
}

const cropBase: Record<string, number> = {
  Rice: 2200, Paddy: 2200, Wheat: 2200, Maize: 1900, Soybean: 4400,
  Cotton: 6500, Sugarcane: 320, Mustard: 5500, Bajra: 2400, Pulses: 6800,
  Ragi: 3500, Jowar: 3000, Groundnut: 5800, Chickpea: 5400,
};
const palette = ["hsl(142, 55%, 35%)", "hsl(38, 85%, 55%)", "hsl(200, 75%, 55%)", "hsl(25, 70%, 50%)", "hsl(280, 60%, 55%)"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

const ALERT_KEY = "km.priceAlerts";

export default function MarketPriceWidget() {
  const { ctx } = usePersonalization();

  // Build crop list from user's profile, fallback to suitable, fallback to defaults
  const userCrops = useMemo(() => {
    const raw = (ctx?.crops.current || []).filter(Boolean);
    const norm = raw.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
    const list = norm.length > 0 ? norm : (ctx?.crops.suitable || ["Rice", "Wheat", "Maize"]).slice(0, 4);
    return list.slice(0, 5);
  }, [ctx?.crops.current, ctx?.crops.suitable]);

  const [activeCrops, setActiveCrops] = useState<string[]>(() => userCrops.slice(0, 3));
  // Re-sync when user crops change (proper effect, not useMemo-as-side-effect)
  useEffect(() => {
    if (userCrops.length && activeCrops.every(c => !userCrops.includes(c))) {
      setActiveCrops(userCrops.slice(0, 3));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCrops]);

  const cropColor = (c: string) => palette[userCrops.indexOf(c) % palette.length] || palette[0];

  const priceData = useMemo(() => months.map((m, i) => {
    const row: any = { month: m };
    userCrops.forEach(c => {
      const base = cropBase[c] || 2500;
      row[c] = seededPrice(c, i, base);
    });
    return row;
  }), [userCrops]);

  const livePrices = useMemo(() => {
    const last = priceData[priceData.length - 1] || {};
    const prev = priceData[priceData.length - 2] || {};
    return userCrops.map(c => {
      const cur = last[c] || 0;
      const old = prev[c] || cur;
      const pct = old ? ((cur - old) / old) * 100 : 0;
      return {
        crop: c,
        price: `₹${cur.toLocaleString("en-IN")}`,
        change: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
        up: pct >= 0,
        mandi: ctx?.nearest_mandi.name || "Local APMC",
      };
    });
  }, [priceData, userCrops, ctx?.nearest_mandi.name]);

  const toggleCrop = (crop: string) => {
    setActiveCrops((prev) => prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]);
  };

  const toggleAlert = (crop: string) => {
    const cur = JSON.parse(localStorage.getItem(ALERT_KEY) || "{}");
    if (cur[crop]) {
      delete cur[crop];
      toast.info(`Price alert removed for ${crop}`);
    } else {
      cur[crop] = { added: Date.now(), threshold: 5 };
      toast.success(`📢 Alert set: notify if ${crop} moves >5%`);
    }
    localStorage.setItem(ALERT_KEY, JSON.stringify(cur));
  };

  const alerts = JSON.parse(localStorage.getItem(ALERT_KEY) || "{}");

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-foreground">Market Prices</h3>
        <span className="krishi-badge bg-primary/10 text-primary animate-pulse-slow">Your Crops</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Prices for {ctx?.nearest_mandi.name || "your nearest mandi"}
      </p>

      <div className="flex gap-2 mb-3 flex-wrap">
        {userCrops.map((crop) => (
          <button
            key={crop}
            onClick={() => toggleCrop(crop)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium capitalize ${
              activeCrops.includes(crop)
                ? "border-transparent text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
            style={activeCrops.includes(crop) ? { backgroundColor: cropColor(crop) } : {}}
          >
            {crop}
          </button>
        ))}
      </div>

      <div className="h-52 mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={priceData}>
            <defs>
              {userCrops.map((c) => (
                <linearGradient key={c} id={`grad-${c}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cropColor(c)} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={cropColor(c)} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: 12,
                boxShadow: "var(--shadow-elevated)",
              }}
              formatter={(value: number, name: string) => [`₹${value}/qtl`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {activeCrops.map((c) => (
              <Area
                key={c}
                type="monotone"
                dataKey={c}
                stroke={cropColor(c)}
                fill={`url(#grad-${c})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {livePrices.map((p) => (
          <div key={p.crop} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all">
            <div>
              <div className="font-medium text-sm text-foreground">{p.crop}</div>
              <div className="text-xs text-muted-foreground">{p.mandi}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-semibold text-sm text-foreground">{p.price}/qtl</div>
                <div className={`text-xs flex items-center gap-0.5 justify-end ${p.up ? "text-primary" : "text-destructive"}`}>
                  {p.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {p.change}
                </div>
              </div>
              <button
                onClick={() => toggleAlert(p.crop)}
                title={alerts[p.crop] ? "Remove alert" : "Set price alert"}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                {alerts[p.crop]
                  ? <Bell className="h-4 w-4 text-krishi-gold fill-krishi-gold" />
                  : <BellOff className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
