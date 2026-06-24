import { Sparkles } from "lucide-react";

const ITEMS = [
  "🌾 AI Crop Advisory",
  "💧 Soil Health Maps",
  "🛰️ Satellite NDVI",
  "📈 Live Mandi Prices",
  "🌦️ Hyper-local Weather",
  "🪪 Govt Scheme Match",
  "🎙️ Voice in 13 Languages",
  "🧪 Disease Photo Scan",
  "📊 Yield Forecasts",
  "🤝 1.5L+ Farmer Network",
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-gradient-to-r from-background via-primary/5 to-background py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
      <div className="marquee gap-8 text-sm font-medium text-muted-foreground">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-2 whitespace-nowrap">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
