import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Leaf, Cloud, TrendingUp, Mic, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import AnimatedCounter from "@/components/AnimatedCounter";
import DynamicHeroBackground from "@/components/home/DynamicHeroBackground";

const stats = [
  { label: "Farmers Helped", value: "1,50,000+", icon: Leaf },
  { label: "Crops Analyzed", value: "85+", icon: TrendingUp },
  { label: "Languages", value: "13+", icon: Mic },
  { label: "Districts Covered", value: "200+", icon: Cloud },
];

const ROTATING = ["Recommendations", "Soil Insights", "Yield Forecasts", "Mandi Prices", "Disease Scans"];

export default function HeroSection() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ROTATING.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-krishi-soil">
      {/* Live animated background */}
      <div className="absolute inset-0">
        <DynamicHeroBackground />
      </div>

      {/* Aurora + grid mesh layers */}
      <div className="absolute inset-0 bg-aurora opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-grid-mesh opacity-40 pointer-events-none" />

      {/* Floating decorative orbs */}
      <motion.div
        className="absolute top-32 right-20 w-20 h-20 rounded-full bg-krishi-gold/10 blur-xl hidden lg:block"
        animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 right-40 w-32 h-32 rounded-full bg-primary/10 blur-2xl hidden lg:block"
        animate={{ y: [0, 15, 0], scale: [1, 0.9, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="krishi-badge bg-krishi-gold/20 text-krishi-wheat border border-krishi-gold/30 mb-6 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              SIH 2025 · Live AI · 13 Languages
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-krishi-wheat leading-[1.05] mb-6"
          >
            AI-Powered Crop
            <br />
            <span className="relative inline-block min-h-[1.1em]" style={{ minWidth: "8ch" }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING[idx]}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                  transition={{ duration: 0.5 }}
                  className="inline-block text-holo"
                >
                  {ROTATING[idx]}
                </motion.span>
              </AnimatePresence>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
                className="absolute -bottom-1 left-0 h-1 w-full origin-left bg-gradient-to-r from-krishi-gold via-krishi-wheat to-transparent rounded-full"
              />
            </span>
            <br />
            for Every Farmer
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-krishi-wheat/80 mb-8 max-w-xl leading-relaxed"
          >
            Science-guided, hyper-localized crop advice in your language. 
            Analyze soil, predict yields, track markets — all from your phone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <Link to="/dashboard">
              <Button size="lg" className="gradient-primary border-0 text-primary-foreground font-semibold text-base px-8 h-12 hover:scale-105 transition-transform">
                Open Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link to="/crop-advisor">
              <Button size="lg" variant="outline" className="border-krishi-wheat/30 text-krishi-wheat hover:bg-krishi-wheat/10 font-semibold text-base px-8 h-12 hover:scale-105 transition-transform">
                <Mic className="h-5 w-5 mr-2" />
                Ask AI Advisor
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats bar with animated counters */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map(({ label, value, icon: Icon }, i) => (
            <motion.div
              key={label}
              whileHover={{ scale: 1.04, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-krishi-wheat/15 shadow-xl shadow-black/20 hover:bg-white/10 hover:border-krishi-gold/40 transition-colors group overflow-hidden"
            >
              <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-krishi-gold/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-krishi-gold/30 to-krishi-gold/10 border border-krishi-gold/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5 text-krishi-gold" />
              </div>
              <div className="min-w-0 text-left">
                <AnimatedCounter
                  value={value}
                  className="block stat-counter text-krishi-wheat text-xl md:text-2xl leading-none"
                />
                <div className="text-krishi-wheat/60 text-xs md:text-sm mt-1 truncate">{label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
