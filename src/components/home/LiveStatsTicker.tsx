import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Users, Leaf } from "lucide-react";

const SEED_STATS = [
  { icon: TrendingUp, text: "1,287 farmers earned ₹12k extra this month using AI advice", color: "text-primary" },
  { icon: Leaf, text: "84,210 hectares mapped across 23 states with our field tool", color: "text-krishi-gold" },
  { icon: Users, text: "Every 6 minutes, a new farmer joins KrishiMitra", color: "text-krishi-sky" },
  { icon: Sparkles, text: "AI Crop Advisor now answers in 13 languages — including Maithili", color: "text-primary" },
  { icon: TrendingUp, text: "Average disease scan saves ₹3,800 per acre in pesticide costs", color: "text-krishi-gold" },
  { icon: Leaf, text: "Organic farmers using our planner cut chemical use by 41%", color: "text-primary" },
];

export default function LiveStatsTicker() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % SEED_STATS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const cur = SEED_STATS[idx];
  const Icon = cur.icon;

  return (
    <section className="py-8 bg-gradient-to-r from-primary/5 via-krishi-gold/5 to-krishi-sky/5 border-y border-border/40 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-3 min-h-[40px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-3 text-sm md:text-base text-foreground font-medium"
            >
              <Icon className={`h-5 w-5 ${cur.color} animate-pulse`} />
              <span>{cur.text}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {SEED_STATS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
