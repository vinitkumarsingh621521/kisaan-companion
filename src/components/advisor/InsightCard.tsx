import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  title: string;
  icon: string;
  accent: "sky" | "emerald" | "amber" | "violet" | "rose" | "cyan";
  delay?: number;
  children: ReactNode;
}

const ACCENTS: Record<Props["accent"], string> = {
  sky: "from-sky-500/15 to-blue-500/5 border-sky-500/20",
  emerald: "from-emerald-500/15 to-teal-500/5 border-emerald-500/20",
  amber: "from-amber-500/15 to-orange-500/5 border-amber-500/20",
  violet: "from-violet-500/15 to-fuchsia-500/5 border-violet-500/20",
  rose: "from-rose-500/15 to-pink-500/5 border-rose-500/20",
  cyan: "from-cyan-500/15 to-sky-500/5 border-cyan-500/20",
};

export default function InsightCard({ title, icon, accent, delay = 0, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`rounded-2xl border bg-gradient-to-br ${ACCENTS[accent]} backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
      </div>
      <div className="text-sm text-foreground/90 space-y-1">{children}</div>
    </motion.div>
  );
}
