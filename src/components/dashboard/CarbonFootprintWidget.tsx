import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, TrendingDown, Sparkles, Loader2, IndianRupee, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type CarbonAction = {
  title: string;
  category: string;
  description: string;
  co2_saved_kg: number;
  cost_inr: number;
  payback_months: number;
  difficulty: "easy" | "medium" | "hard";
};
type CarbonPlan = {
  current_total_kg: number;
  target_total_kg: number;
  actions: CarbonAction[];
  motivation: string;
};

// Rough emission factors — kg CO2e per acre per season
const FERT_FACTORS: Record<string, number> = {
  Organic: 80,
  Mixed: 220,
  Chemical: 450,
};
const IRRIG_FACTORS: Record<string, number> = {
  Drip: 30,
  Sprinkler: 60,
  Flood: 180,
  Rainfed: 10,
};

function classify(co2: number) {
  if (co2 < 200) return { label: "Excellent", color: "text-primary", bg: "bg-primary/10", emoji: "🌱" };
  if (co2 < 400) return { label: "Good", color: "text-krishi-sky", bg: "bg-krishi-sky/10", emoji: "🌿" };
  if (co2 < 700) return { label: "Average", color: "text-krishi-gold", bg: "bg-krishi-gold-light", emoji: "⚠️" };
  return { label: "High", color: "text-destructive", bg: "bg-destructive/10", emoji: "🚨" };
}

export default function CarbonFootprintWidget() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [plan, setPlan] = useState<CarbonPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const { co2, breakdown, fertType, irrig } = useMemo(() => {
    const fd: any = active?.farmer_details || {};
    const acres = parseFloat(fd.total_land || active?.farm_size || "1") || 1;
    const fertType =
      typeof fd.farming_type === "string"
        ? fd.farming_type.includes("Organic") ? "Organic"
          : fd.farming_type.includes("Mixed") ? "Mixed" : "Chemical"
        : "Mixed";
    const irrig =
      typeof fd.irrigation_type === "string"
        ? fd.irrigation_type.includes("Drip") ? "Drip"
          : fd.irrigation_type.includes("Sprinkler") ? "Sprinkler"
          : fd.irrigation_type.includes("Flood") || fd.irrigation_type.includes("Canal") ? "Flood"
          : "Rainfed"
        : "Flood";
    const fertCO2 = (FERT_FACTORS[fertType] || 220) * acres;
    const irrigCO2 = (IRRIG_FACTORS[irrig] || 60) * acres;
    const transportCO2 = 50 * acres;
    return {
      co2: Math.round(fertCO2 + irrigCO2 + transportCO2),
      breakdown: [
        { label: `Fertilizer (${fertType})`, value: Math.round(fertCO2), color: "bg-destructive" },
        { label: `Irrigation (${irrig})`, value: Math.round(irrigCO2), color: "bg-krishi-sky" },
        { label: `Transport`, value: Math.round(transportCO2), color: "bg-krishi-gold" },
      ],
      fertType,
      irrig,
    };
  }, [active]);

  const cls = classify(co2);
  const total = breakdown.reduce((s, b) => s + b.value, 0);

  const askPlan = async () => {
    setLoadingPlan(true);
    try {
      const { data, error } = await supabase.functions.invoke("krishi-ai", {
        body: {
          action: "carbon_plan",
          profileContext: ctx,
          farmData: {
            current_total_kg: co2,
            fertilizer_type: fertType,
            irrigation_type: irrig,
            breakdown: breakdown.map((b) => ({ source: b.label, kg: b.value })),
            acres: parseFloat(active?.farm_size || "1") || 1,
            state: active?.farmer_details?.state,
            crops: active?.farmer_details?.current_crops,
          },
        },
      });
      if (error) throw error;
      const raw = (data as any)?.result;
      const parsed: CarbonPlan = typeof raw === "string" ? JSON.parse(raw) : raw;
      setPlan(parsed);
      toast.success(`AI plan ready — could cut ${Math.round(co2 - parsed.target_total_kg)} kg CO₂`);
    } catch (e: any) {
      toast.error(e?.message || "Could not get carbon plan");
    } finally {
      setLoadingPlan(false);
    }
  };

  const diffColor = (d: string) =>
    d === "easy" ? "text-primary bg-primary/10" : d === "medium" ? "text-krishi-gold bg-krishi-gold-light" : "text-destructive bg-destructive/10";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" /> Carbon Footprint
        </h3>
        <span className={`krishi-badge ${cls.bg} ${cls.color} text-[10px]`}>
          {cls.emoji} {cls.label}
        </span>
      </div>

      <div className="text-center py-3">
        <p className="text-3xl font-display font-bold text-foreground">
          {co2.toLocaleString()} <span className="text-base font-normal text-muted-foreground">kg CO₂</span>
        </p>
        <p className="text-xs text-muted-foreground">per season · all sources</p>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden mb-2">
        {breakdown.map((b) => (
          <div key={b.label} className={b.color} style={{ width: `${(b.value / total) * 100}%` }} title={`${b.label}: ${b.value} kg`} />
        ))}
      </div>
      <div className="space-y-1 mb-3">
        {breakdown.map((b) => (
          <div key={b.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${b.color}`} />
              <span className="text-muted-foreground">{b.label}</span>
            </span>
            <span className="font-medium text-foreground">{b.value} kg</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {plan && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 mb-3">
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-muted-foreground">AI target</span>
                <span className="font-bold text-primary">{Math.round(plan.target_total_kg).toLocaleString()} kg CO₂ <span className="text-[10px] text-muted-foreground">(↓{Math.round(((co2 - plan.target_total_kg) / Math.max(co2, 1)) * 100)}%)</span></span>
              </div>
              <p className="italic text-foreground/80 text-[11px]">💚 {plan.motivation}</p>
            </div>
            {plan.actions.slice(0, 4).map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="p-2.5 rounded-lg border border-border bg-background/60"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-foreground leading-tight">{i + 1}. {a.title}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${diffColor(a.difficulty)}`}>{a.difficulty}</span>
                </div>
                <p className="text-[10.5px] text-muted-foreground leading-snug mb-1.5">{a.description}</p>
                <div className="flex items-center gap-2.5 text-[10px]">
                  <span className="flex items-center gap-0.5 text-primary font-medium"><Zap className="h-2.5 w-2.5" />{Math.round(a.co2_saved_kg)} kg saved</span>
                  <span className="flex items-center gap-0.5 text-muted-foreground"><IndianRupee className="h-2.5 w-2.5" />{a.cost_inr.toLocaleString()}</span>
                  <span className="flex items-center gap-0.5 text-muted-foreground"><Clock className="h-2.5 w-2.5" />{a.payback_months}mo</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={askPlan} disabled={loadingPlan}>
        {loadingPlan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {plan ? "Refresh AI plan" : "Generate AI cut-emissions plan"}
      </Button>
    </motion.div>
  );
}
