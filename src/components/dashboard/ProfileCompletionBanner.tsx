import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Button } from "@/components/ui/button";

export default function ProfileCompletionBanner() {
  const { completionPct, active } = useActiveProfile();
  const navigate = useNavigate();

  if (!active || completionPct >= 80) return null;

  const message =
    completionPct < 20 ? "Your profile is emptier than a farmer's wallet before harvest 😄 — let's fix that!" :
    completionPct < 50 ? "Halfway there! Add a few more details for sharper AI advice." :
    "Almost there — a few more fields unlock truly personalized recommendations.";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 mb-5 bg-gradient-to-r from-primary/5 to-krishi-gold/5 border border-primary/20"
    >
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-semibold text-foreground">Profile {completionPct}% complete</span>
              <span className="krishi-badge bg-primary/10 text-primary text-[10px]">Personalization Power</span>
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-40 h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <Button size="sm" className="gradient-primary border-0 text-primary-foreground" onClick={() => navigate("/profile")}>
            Complete <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
