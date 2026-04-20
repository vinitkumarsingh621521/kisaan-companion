import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CloudRain, TrendingUp, TrendingDown, Sprout, Zap } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";

interface Pulse {
  icon: JSX.Element;
  text: string;
  tone: "primary" | "gold" | "sky" | "destructive";
}

export default function FarmPulseTicker() {
  const { ctx } = usePersonalization();
  const [idx, setIdx] = useState(0);

  const pulses = useMemo<Pulse[]>(() => {
    const out: Pulse[] = [];
    if (!ctx) return out;

    if (ctx.weather) {
      const t = ctx.weather.current_temp;
      const rain = ctx.weather.today_rain_pct;
      out.push({
        icon: <CloudRain className="h-3.5 w-3.5" />,
        text: `${t}°C now in ${ctx.location.district || ctx.location.state || "your area"} · ${rain}% rain today`,
        tone: rain > 50 ? "sky" : "primary",
      });
      const tomorrow = ctx.weather.forecast?.[1];
      if (tomorrow && tomorrow.rain_pct > 60) {
        out.push({
          icon: <CloudRain className="h-3.5 w-3.5" />,
          text: `Heavy rain expected ${tomorrow.day} (${tomorrow.rain_pct}%) — protect harvested crops`,
          tone: "sky",
        });
      }
    }

    if (ctx.crops.current?.length) {
      out.push({
        icon: <Sprout className="h-3.5 w-3.5" />,
        text: `${ctx.climate.monsoon_stage} · ${ctx.crops.current.slice(0, 2).join(" + ")} growth window active`,
        tone: "primary",
      });
    }

    if (ctx.scores.farm_health) {
      const score = ctx.scores.farm_health;
      out.push({
        icon: score >= 70 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />,
        text: `Farm health pulse: ${score}/100 ${score >= 70 ? "— strong" : "— room to grow"}`,
        tone: score >= 70 ? "primary" : "gold",
      });
    }

    if (ctx.schemes_matched?.length) {
      out.push({
        icon: <Zap className="h-3.5 w-3.5" />,
        text: `${ctx.schemes_matched.length} govt schemes match your profile — claim before deadlines`,
        tone: "gold",
      });
    }

    if (ctx.nearest_mandi?.distance_km && ctx.nearest_mandi.distance_km !== "unknown") {
      out.push({
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        text: `Nearest mandi ${ctx.nearest_mandi.name} • ~${ctx.nearest_mandi.distance_km} km away`,
        tone: "primary",
      });
    }

    return out;
  }, [ctx]);

  useEffect(() => {
    if (pulses.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % pulses.length), 4000);
    return () => clearInterval(t);
  }, [pulses.length]);

  if (pulses.length === 0) return null;
  const cur = pulses[idx];
  const toneClass =
    cur.tone === "primary" ? "text-primary"
    : cur.tone === "gold" ? "text-krishi-gold"
    : cur.tone === "sky" ? "text-krishi-sky"
    : "text-destructive";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-r from-primary/5 via-card to-krishi-gold/5 px-4 py-2.5 mb-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Activity className={`h-4 w-4 ${toneClass}`} />
          <span className={`absolute inset-0 rounded-full ${cur.tone === "primary" ? "bg-primary" : cur.tone === "gold" ? "bg-krishi-gold" : "bg-krishi-sky"} opacity-30 animate-ping`} />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hidden sm:inline">
          Live Farm Pulse
        </span>
        <div className="flex-1 min-w-0 h-5 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 flex items-center gap-2 text-sm"
            >
              <span className={toneClass}>{cur.icon}</span>
              <span className="text-foreground truncate">{cur.text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex gap-1">
          {pulses.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 w-1.5 rounded-full transition-all ${i === idx ? "bg-primary w-4" : "bg-muted-foreground/30"}`}
              aria-label={`Pulse ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
