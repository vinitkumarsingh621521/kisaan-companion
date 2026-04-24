import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Leaf, TrendingDown, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [tip, setTip] = useState<string | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  const { co2, breakdown } = useMemo(() => {
    const fd: any = active?.farmer_details || {};
    const acres = parseFloat(fd.total_land || active?.farm_size || "1") || 1;
    const fertType =
      typeof fd.farming_type === "string"
        ? fd.farming_type.includes("Organic")
          ? "Organic"
          : fd.farming_type.includes("Mixed")
          ? "Mixed"
          : "Chemical"
        : "Mixed";
    const irrig =
      typeof fd.irrigation_type === "string"
        ? fd.irrigation_type.includes("Drip")
          ? "Drip"
          : fd.irrigation_type.includes("Sprinkler")
          ? "Sprinkler"
          : fd.irrigation_type.includes("Flood") || fd.irrigation_type.includes("Canal")
          ? "Flood"
          : "Rainfed"
        : "Flood";
    const fertCO2 = (FERT_FACTORS[fertType] || 220) * acres;
    const irrigCO2 = (IRRIG_FACTORS[irrig] || 60) * acres;
    const transportCO2 = 50 * acres; // mandi distance proxy
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

  const askTip = async () => {
    setLoadingTip(true);
    try {
      const { data } = await supabase.functions.invoke("daily-tip", {
        body: {
          language: "en",
          profile: { ...active, prompt_hint: `Carbon footprint ${co2} kg CO2/season. Suggest one specific cut.` },
        },
      });
      setTip((data as any)?.tip || "Switch one acre to drip irrigation to cut 150 kg CO2 next season.");
    } catch {
      setTip("Switch one acre to drip irrigation to cut 150 kg CO2 next season.");
    } finally {
      setLoadingTip(false);
    }
  };

  const total = breakdown.reduce((s, b) => s + b.value, 0);

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

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-2">
        {breakdown.map((b) => (
          <div
            key={b.label}
            className={b.color}
            style={{ width: `${(b.value / total) * 100}%` }}
            title={`${b.label}: ${b.value} kg`}
          />
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

      {tip && (
        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground mb-2">
          <Sparkles className="h-3 w-3 text-primary inline mr-1" /> {tip}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={askTip} disabled={loadingTip}>
        {loadingTip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingDown className="h-3.5 w-3.5" />}
        Get cut-emissions tip
      </Button>
    </motion.div>
  );
}
