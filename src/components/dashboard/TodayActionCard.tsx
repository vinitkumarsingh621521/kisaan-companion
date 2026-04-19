import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, CloudRain, TrendingUp, Calendar, Volume2 } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Button } from "@/components/ui/button";

export default function TodayActionCard() {
  const { ctx } = usePersonalization();

  const actions = useMemo(() => {
    if (!ctx) return [];
    const out: { icon: any; color: string; text: string }[] = [];
    const today = ctx.weather?.forecast?.[0];

    if (today?.rain_pct && today.rain_pct > 60) {
      out.push({ icon: CloudRain, color: "text-krishi-sky", text: `${today.rain_pct}% rain expected — postpone spraying & check drainage.` });
    } else if (today?.temp_high && today.temp_high > 36) {
      out.push({ icon: CloudRain, color: "text-destructive", text: `Heat alert (${today.temp_high}°C) — irrigate early morning, mulch around plants.` });
    } else {
      out.push({ icon: Sparkles, color: "text-primary", text: "Stable weather — great day for weeding, fertilizer, or transplanting." });
    }

    if (ctx.crops.current.length > 0) {
      out.push({
        icon: TrendingUp,
        color: "text-krishi-gold",
        text: `Check today's mandi rate for ${ctx.crops.current.slice(0, 2).join(" & ")} before selling.`,
      });
    }

    if (ctx.schemes_matched.length > 0) {
      out.push({
        icon: Calendar,
        color: "text-primary",
        text: `${ctx.schemes_matched.length} govt scheme${ctx.schemes_matched.length > 1 ? "s" : ""} match your profile — apply or renew this month.`,
      });
    }
    return out.slice(0, 3);
  }, [ctx]);

  const speak = () => {
    if (!actions.length || !("speechSynthesis" in window)) return;
    const text = `Hello ${ctx?.farmer_name || "farmer"}. Today's plan: ${actions.map(a => a.text).join(". ")}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  };

  if (!ctx || !actions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-krishi-gold/5 to-krishi-sky/5 border border-primary/20 mb-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Today's Action Plan
        </h3>
        <Button size="sm" variant="ghost" onClick={speak} className="gap-1.5 text-xs">
          <Volume2 className="h-4 w-4" /> Listen
        </Button>
      </div>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <a.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${a.color}`} />
            <span className="text-foreground">{a.text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
