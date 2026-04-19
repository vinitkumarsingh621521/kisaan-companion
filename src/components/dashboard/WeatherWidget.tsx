import { Cloud, Droplets, Wind, Sun, CloudRain, Thermometer, MapPin, Sparkles } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";

const ICON_FOR = (emoji: string) => {
  if (emoji.includes("☀️") || emoji.includes("🌞") || emoji.includes("🌤")) return Sun;
  if (emoji.includes("🌧") || emoji.includes("⛈") || emoji.includes("🌦")) return CloudRain;
  return Cloud;
};

export default function WeatherWidget() {
  const { active } = useActiveProfile();
  const { ctx, loading } = usePersonalization();
  const [tab, setTab] = useState<"today" | "week">("today");

  const location =
    active?.farm_location ||
    [active?.farmer_details?.district, active?.farmer_details?.state].filter(Boolean).join(", ") ||
    "India";

  const weather = ctx?.weather;

  const advice = useMemo(() => {
    if (!weather) return "Set your district in profile to get hyper-local weather.";
    const today = weather.forecast?.[0];
    if (!today) return "Stay safe and plan irrigation based on soil moisture.";
    if (today.rain_pct > 70) return "Heavy rain likely — postpone spraying & harvesting. Inspect drainage channels.";
    if (today.rain_pct > 40) return "Showers possible — keep covers ready. Good day for transplanting.";
    if (today.temp_high > 38) return "Heat alert — irrigate before 9 AM or after 5 PM. Mulch to reduce evaporation.";
    if (today.wind_kph > 25) return "Strong wind — avoid pesticide spraying today.";
    return "Stable weather — ideal for field work, weeding, or fertilizer application.";
  }, [weather]);

  if (loading || !weather) {
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

  const today = weather.forecast?.[0];
  const sowingWindow: "open" | "caution" | "closed" =
    !today ? "open" :
    today.rain_pct > 70 ? "closed" :
    today.rain_pct > 40 ? "caution" : "open";
  const swColor = sowingWindow === "open" ? "bg-primary/10 text-primary" :
                  sowingWindow === "caution" ? "bg-krishi-gold-light text-krishi-gold" :
                  "bg-destructive/10 text-destructive";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" /> {location}
        </h3>
        <span className="krishi-badge bg-krishi-sky-light text-krishi-sky text-[10px]">{weather.source} · Live</span>
      </div>

      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2 flex-wrap">
        <span className="krishi-badge bg-muted text-foreground text-[10px]">{ctx?.climate.monsoon_stage}</span>
        <span className={`krishi-badge text-[10px] ${swColor}`}>Sowing: {sowingWindow}</span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 p-1 bg-muted/40 rounded-lg w-fit">
        {(["today", "week"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "week" ? "7-day" : "Today"}
          </button>
        ))}
      </div>

      {tab === "today" && today && (
        <>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{today.emoji}</span>
            <div>
              <div className="text-3xl font-display font-bold text-foreground">
                {weather.current_temp}°
                <span className="text-base text-muted-foreground"> / {today.temp_low}° – {today.temp_high}°</span>
              </div>
              <div className="text-muted-foreground text-sm">Feels live · updated just now</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Droplets className="h-4 w-4 text-krishi-sky mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Rain</div>
              <div className="font-semibold text-sm text-foreground">{weather.today_rain_pct}%</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Wind className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Wind</div>
              <div className="font-semibold text-sm text-foreground">{weather.current_wind} km/h</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Thermometer className="h-4 w-4 text-destructive mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">Humidity</div>
              <div className="font-semibold text-sm text-foreground">{weather.current_humidity}%</div>
            </div>
          </div>
        </>
      )}

      {tab === "week" && (
        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          {weather.forecast.map((d, i) => {
            const Icon = ICON_FOR(d.emoji);
            return (
              <div key={i} className={`flex-1 min-w-[60px] rounded-lg p-2.5 text-center ${i === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
                <div className="text-xs text-muted-foreground mb-1">{d.day}</div>
                <Icon className={`h-5 w-5 mx-auto mb-1 ${i === 0 ? "text-krishi-gold" : "text-muted-foreground"}`} />
                <div className="font-semibold text-sm text-foreground">{d.temp_high}°</div>
                <div className="text-[10px] text-muted-foreground">{d.temp_low}°</div>
                <div className="text-xs text-krishi-sky">{d.rain_pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-krishi-gold/5 border border-primary/15">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">What to do today</div>
            <p className="text-xs text-foreground">{advice}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
