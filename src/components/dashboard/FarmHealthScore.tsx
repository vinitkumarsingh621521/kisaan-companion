import { motion } from "framer-motion";
import { Activity, Sprout, Wallet, Cpu, Layers } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";
import AnimatedCounter from "@/components/AnimatedCounter";

export default function FarmHealthScore() {
  const { ctx, loading } = usePersonalization();

  if (loading || !ctx) {
    return (
      <div className="glass-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-32 w-32 mx-auto rounded-full" />
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    );
  }

  const { soil_health, diversification, tech_readiness, farm_health } = ctx.scores;
  const finance =
    ctx.financial.bucket === "high" ? 100 :
    ctx.financial.bucket === "upper-mid" ? 75 :
    ctx.financial.bucket === "mid" ? 50 :
    ctx.financial.bucket === "low-mid" ? 35 : 25;

  const status =
    farm_health >= 80 ? { label: "Excellent", color: "text-primary" } :
    farm_health >= 60 ? { label: "Good", color: "text-primary" } :
    farm_health >= 40 ? { label: "Fair", color: "text-krishi-gold" } :
    { label: "Needs Work", color: "text-destructive" };

  const circumference = 2 * Math.PI * 42;
  const dash = (farm_health / 100) * circumference;

  const sub = [
    { label: "Soil", value: soil_health, icon: Sprout, color: "text-krishi-green" },
    { label: "Crops", value: diversification, icon: Layers, color: "text-krishi-gold" },
    { label: "Tech", value: tech_readiness, icon: Cpu, color: "text-krishi-sky" },
    { label: "Finance", value: finance, icon: Wallet, color: "text-primary" },
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Farm Health Score
        </h3>
        <span className={`krishi-badge bg-primary/10 ${status.color}`}>{status.label}</span>
      </div>

      <div className="flex items-center justify-center mb-4">
        <div className="relative inline-flex items-center justify-center w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="9"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${dash} ${circumference}` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute text-center">
            <AnimatedCounter value={String(farm_health)} className="text-3xl font-display font-bold text-foreground" />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {sub.map((s) => (
          <div key={s.label} className="text-center bg-muted/40 rounded-lg p-2">
            <s.icon className={`h-4 w-4 mx-auto mb-0.5 ${s.color}`} />
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
            <div className="text-sm font-semibold text-foreground">{Math.round(s.value)}</div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 italic">
        Composite of soil, crop diversity, tech readiness & finance.
      </p>
    </div>
  );
}
