import { motion } from "framer-motion";
import { ArrowRight, Leaf, Cloud, TrendingUp, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AnimatedCounter from "@/components/AnimatedCounter";
import DynamicHeroBackground from "@/components/home/DynamicHeroBackground";

const stats = [
  { label: "Farmers Helped", value: "1,50,000+", icon: Leaf },
  { label: "Crops Analyzed", value: "85+", icon: TrendingUp },
  { label: "Languages", value: "13+", icon: Mic },
  { label: "Districts Covered", value: "200+", icon: Cloud },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-krishi-soil">
      {/* Live animated background — cycles through aurora, mycelium, spores, chlorophyll, helix */}
      <div className="absolute inset-0">
        <DynamicHeroBackground />
      </div>

      {/* Floating decorative elements */}
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
            <span className="krishi-badge bg-krishi-gold/20 text-krishi-wheat border border-krishi-gold/30 mb-6">
              <Leaf className="h-3.5 w-3.5" />
              SIH 2025 — Problem Statement #25030
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-krishi-wheat leading-tight mb-6"
          >
            AI-Powered Crop
            <br />
            <span className="text-gradient-gold">Recommendations</span>
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
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="glass-card bg-card/10 backdrop-blur-md border-krishi-wheat/10 p-4 md:p-6 text-center group"
              whileHover={{ scale: 1.05, y: -4 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <s.icon className="h-6 w-6 text-krishi-gold mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <AnimatedCounter
                value={s.value}
                className="stat-counter text-krishi-wheat text-2xl md:text-3xl"
              />
              <div className="text-krishi-wheat/60 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
