import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mistake = {
  area: string;
  severity: "low" | "medium" | "high" | "critical";
  what_you_did: string;
  why_wrong: string;
  correct_action: string;
  potential_loss_inr: number;
};
type Audit = {
  overall_grade: "A" | "B" | "C" | "D" | "F";
  risk_score: number;
  summary: string;
  mistakes: Mistake[];
};

const sevColor = (s: string) =>
  s === "critical" ? "text-destructive bg-destructive/10 border-destructive/30"
  : s === "high" ? "text-destructive bg-destructive/5 border-destructive/20"
  : s === "medium" ? "text-krishi-gold bg-krishi-gold-light border-krishi-gold/30"
  : "text-krishi-sky bg-krishi-sky/10 border-krishi-sky/30";

const gradeColor = (g: string) =>
  g === "A" ? "text-primary bg-primary/10"
  : g === "B" ? "text-krishi-sky bg-krishi-sky/10"
  : g === "C" ? "text-krishi-gold bg-krishi-gold-light"
  : "text-destructive bg-destructive/10";

export default function MistakeDetectorWidget() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const fd: any = active?.farmer_details || {};
      const { data, error } = await supabase.functions.invoke("krishi-ai", {
        body: {
          action: "mistake_check",
          profileContext: ctx,
          farmData: {
            crops: fd.current_crops || active?.farm_size,
            soil: active?.soil_type,
            soil_ph: fd.soil_ph,
            npk: { n: fd.nitrogen, p: fd.phosphorus, k: fd.potassium },
            fertilizer_type: fd.farming_type,
            fertilizer_quantity: fd.fertilizer_used,
            pesticide_quantity: fd.pesticide_used,
            irrigation: fd.irrigation_type,
            water_source: fd.water_source,
            seed_source: fd.seed_source,
            previous_crop: fd.previous_crop,
            state: fd.state,
            district: fd.district,
          },
        },
      });
      if (error) throw error;
      const raw = (data as any)?.result;
      const parsed: Audit = typeof raw === "string" ? JSON.parse(raw) : raw;
      setAudit(parsed);
      const total = parsed.mistakes.reduce((s, m) => s + (m.potential_loss_inr || 0), 0);
      toast.success(`Grade ${parsed.overall_grade} · ₹${total.toLocaleString()} potential savings found`);
    } catch (e: any) {
      toast.error(e?.message || "Audit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-krishi-gold" /> Mistake Detector
        </h3>
        {audit && (
          <span className={`krishi-badge text-[10px] font-bold ${gradeColor(audit.overall_grade)}`}>
            Grade {audit.overall_grade}
          </span>
        )}
      </div>

      {!audit && (
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          AI auditor checks your fertilizer, pesticide, irrigation, soil-pH and rotation for over-use, mismatches and losses.
        </p>
      )}

      <AnimatePresence>
        {audit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mb-3">
            <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-foreground">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground">Risk score</span>
                <span className="font-bold">{audit.risk_score}/100</span>
              </div>
              <p className="text-[11px] leading-snug italic">{audit.summary}</p>
            </div>

            {audit.mistakes.length === 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 text-primary text-xs">
                <CheckCircle2 className="h-4 w-4" /> No major mistakes found. Shabaash!
              </div>
            )}

            {audit.mistakes.slice(0, 4).map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`p-2.5 rounded-lg border ${sevColor(m.severity)}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{m.area}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-background/50 font-bold">{m.severity}</span>
                </div>
                <p className="text-[11px] font-semibold text-foreground leading-snug mb-0.5">⚠️ {m.what_you_did}</p>
                <p className="text-[10.5px] text-muted-foreground leading-snug mb-1">{m.why_wrong}</p>
                <p className="text-[10.5px] text-foreground leading-snug mb-1.5"><CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5 text-primary" />{m.correct_action}</p>
                {m.potential_loss_inr > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                    <IndianRupee className="h-2.5 w-2.5" />{m.potential_loss_inr.toLocaleString()} at risk
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={runAudit} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        {audit ? "Re-run audit" : "Run mistake audit"}
      </Button>
    </motion.div>
  );
}
