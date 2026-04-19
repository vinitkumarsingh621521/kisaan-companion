import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind, Sun, CloudRain, Thermometer, MapPin, Sparkles } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";

interface ForecastDay { day: string; emoji: string; temp_high: number; temp_low: number; rain_pct: number; note?: string }
interface WeatherBrief {
  location_label: string;
  monsoon_stage: string;
  sowing_window: "open" | "caution" | "closed";
  today_tip: string;
  forecast: ForecastDay[];
}

const ICON_FOR = (emoji: string) => {
  if (emoji.includes("☀️") || emoji.includes("🌞")) return Sun;
  if (emoji.includes("🌧") || emoji.includes("⛈")) return CloudRain;
  return Cloud;
};

export default function WeatherWidget() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [brief, setBrief] = useState<WeatherBrief | null>(null);
  const [loading, setLoading] = useState(false);

  const location =
    active?.farm_location ||
    [active?.farmer_details?.district, active?.farmer_details?.state].filter(Boolean).join(", ") ||
    "India";
  const crops = ctx?.crops.current || [];

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: "weather_brief", location, crops, profileContext: ctx }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        try {
          const raw = data.result || "{}";
          const cleaned = raw.replace(/```json\s*|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.forecast) setBrief(parsed);
        } catch (e) { console.warn("weather parse fail", e); }
      })
      .catch(e => console.error("weather fail", e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [location, JSON.stringify(crops), active?.id]);

  if (loading || !brief) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-16 w-full mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const today = brief.forecast?.[0];
  const swColor = brief.sowing_window === "open" ? "bg-primary/10 text-primary" :
                  brief.sowing_window === "caution" ? "bg-krishi-gold-light text-krishi-gold" :
                  "bg-destructive/10 text-destructive";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" /> {brief.location_label || location}
        </h3>
        <span className="krishi-badge bg-krishi-sky-light text-krishi-sky text-[10px]">AI Live</span>
      </div>

      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2 flex-wrap">
        <span className="krishi-badge bg-muted text-foreground text-[10px]">{brief.monsoon_stage}</span>
        <span className={`krishi-badge text-[10px] ${swColor}`}>Sowing: {brief.sowing_window}</span>
      </div>

      {today && (
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{today.emoji}</span>
          <div>
            <div className="text-3xl font-display font-bold text-foreground">{today.temp_high}°<span className="text-base text-muted-foreground">/{today.temp_low}°</span></div>
            <div className="text-muted-foreground text-sm">{today.note || "Today"}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Droplets className="h-4 w-4 text-krishi-sky mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Rain</div>
          <div className="font-semibold text-sm text-foreground">{today?.rain_pct ?? 0}%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Wind className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Wind</div>
          <div className="font-semibold text-sm text-foreground">12 km/h</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Thermometer className="h-4 w-4 text-destructive mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">UV</div>
          <div className="font-semibold text-sm text-foreground">High</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {brief.forecast.map((d, i) => {
          const Icon = ICON_FOR(d.emoji);
          return (
            <div key={i} className={`flex-1 min-w-[60px] rounded-lg p-2.5 text-center ${i === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
              <div className="text-xs text-muted-foreground mb-1">{d.day}</div>
              <Icon className={`h-5 w-5 mx-auto mb-1 ${i === 0 ? "text-krishi-gold" : "text-muted-foreground"}`} />
              <div className="font-semibold text-sm text-foreground">{d.temp_high}°</div>
              <div className="text-xs text-krishi-sky">{d.rain_pct}%</div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-krishi-gold/5 border border-primary/15">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">What to do today</div>
            <p className="text-xs text-foreground">{brief.today_tip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
