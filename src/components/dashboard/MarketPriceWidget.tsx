import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

const priceData = [
  { month: "Jan", rice: 2100, wheat: 2200, maize: 1800, soybean: 4200 },
  { month: "Feb", rice: 2150, wheat: 2180, maize: 1850, soybean: 4350 },
  { month: "Mar", rice: 2200, wheat: 2250, maize: 1900, soybean: 4500 },
  { month: "Apr", rice: 2180, wheat: 2300, maize: 1950, soybean: 4400 },
  { month: "May", rice: 2250, wheat: 2350, maize: 2000, soybean: 4650 },
  { month: "Jun", rice: 2300, wheat: 2280, maize: 2100, soybean: 4700 },
  { month: "Jul", rice: 2350, wheat: 2200, maize: 2050, soybean: 4800 },
];

const liveprices = [
  { crop: "Paddy", price: "₹2,350", change: "+4.2%", up: true, mandi: "Ranchi" },
  { crop: "Wheat", price: "₹2,200", change: "-2.1%", up: false, mandi: "Jamshedpur" },
  { crop: "Maize", price: "₹2,050", change: "+6.8%", up: true, mandi: "Dhanbad" },
  { crop: "Soybean", price: "₹4,800", change: "+1.5%", up: true, mandi: "Bokaro" },
];

const cropColors: Record<string, string> = {
  rice: "hsl(142, 55%, 35%)",
  wheat: "hsl(38, 85%, 55%)",
  maize: "hsl(200, 75%, 55%)",
  soybean: "hsl(25, 70%, 50%)",
};

type CropKey = "rice" | "wheat" | "maize" | "soybean";

export default function MarketPriceWidget() {
  const [activeCrops, setActiveCrops] = useState<CropKey[]>(["rice", "wheat", "maize"]);

  const toggleCrop = (crop: CropKey) => {
    setActiveCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Market Prices</h3>
        <span className="krishi-badge bg-primary/10 text-primary animate-pulse-slow">Live Mandi</span>
      </div>

      {/* Crop toggles */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {(["rice", "wheat", "maize", "soybean"] as CropKey[]).map((crop) => (
          <button
            key={crop}
            onClick={() => toggleCrop(crop)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium capitalize ${
              activeCrops.includes(crop)
                ? "border-transparent text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
            style={activeCrops.includes(crop) ? { backgroundColor: cropColors[crop] } : {}}
          >
            {crop}
          </button>
        ))}
      </div>

      <div className="h-52 mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={priceData}>
            <defs>
              {Object.entries(cropColors).map(([key, color]) => (
                <linearGradient key={key} id={`${key}Grad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
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
              formatter={(value: number, name: string) => [`₹${value}/qtl`, name.charAt(0).toUpperCase() + name.slice(1)]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {activeCrops.map((crop) => (
              <Area
                key={crop}
                type="monotone"
                dataKey={crop}
                stroke={cropColors[crop]}
                fill={`url(#${crop}Grad)`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {liveprices.map((p) => (
          <div key={p.crop} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all hover:scale-[1.01] cursor-pointer">
            <div>
              <div className="font-medium text-sm text-foreground">{p.crop}</div>
              <div className="text-xs text-muted-foreground">{p.mandi} Mandi</div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-sm text-foreground">{p.price}/qtl</div>
              <div className={`text-xs flex items-center gap-0.5 ${p.up ? "text-primary" : "text-destructive"}`}>
                {p.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {p.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
