import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Link } from "react-router-dom";

export default function CropSuitabilityWarning() {
  const { ctx } = usePersonalization();
  if (!ctx) return null;

  const current = (ctx.crops.current || []).map((c) => c.toLowerCase().trim()).filter(Boolean);
  const suitable = (ctx.climate.majorCrops || []).map((c) => c.toLowerCase());
  if (current.length === 0) return null;

  const matched = current.filter((c) => suitable.some((s) => s.includes(c) || c.includes(s)));
  const mismatched = current.filter((c) => !matched.includes(c));
  const matchPct = Math.round((matched.length / current.length) * 100);

  // Budget warning: if low bucket but growing high-water/high-cost crop
  const expensiveCrops = ["sugarcane", "cotton", "banana", "ginger", "saffron"];
  const overBudget =
    (ctx.financial.bucket === "low" || ctx.financial.bucket === "low-mid") &&
    current.some((c) => expensiveCrops.some((e) => c.includes(e)));

  const allGood = mismatched.length === 0 && !overBudget;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 mb-5 ${
        allGood
          ? "bg-primary/5 border-primary/20"
          : "bg-destructive/5 border-destructive/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {allGood ? (
          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-sm text-foreground mb-1">
            {allGood
              ? `Your crop choices fit ${ctx.location.state || "your zone"} perfectly (${matchPct}% climate match)`
              : `Heads up — ${mismatched.length > 0 ? `${mismatched.length} of your crops may not suit ${ctx.climate.zone}` : "your budget vs crop mix needs review"}`}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {allGood ? (
              <>Climate zone <span className="font-medium text-foreground">{ctx.climate.zone}</span> · soils {ctx.climate.soils.join(", ")} · rainfall {ctx.climate.rainfall}. Keep going, kisaan! 🌾</>
            ) : (
              <>
                {mismatched.length > 0 && (
                  <>Crops to reconsider: <span className="font-medium text-destructive">{mismatched.join(", ")}</span>. Locally-proven picks for {ctx.climate.zone}: <span className="font-medium text-primary">{ctx.climate.majorCrops.slice(0, 4).join(", ")}</span>. </>
                )}
                {overBudget && (
                  <>Your income bucket (<span className="font-medium">{ctx.financial.bucket}</span>) suggests starting with lower-input crops before scaling up. </>
                )}
              </>
            )}
          </p>
          {!allGood && (
            <Link to="/crop-advisor" className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:underline">
              <Sparkles className="h-3 w-3" /> Get a tailored plan
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
