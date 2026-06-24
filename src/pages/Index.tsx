import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";
import LiveStatsTicker from "@/components/home/LiveStatsTicker";
import SoilScienceLab from "@/components/home/SoilScienceLab";
import PhotosynthesisSimulator from "@/components/home/PhotosynthesisSimulator";
import CropProductivityIndex from "@/components/home/CropProductivityIndex";
import Marquee from "@/components/fx/Marquee";
import { motion } from "framer-motion";
import { Leaf, Users, Globe, ShieldCheck } from "lucide-react";

const ACCENTS = [
  "from-emerald-500/20 via-emerald-500/5 to-transparent",
  "from-amber-500/20 via-amber-500/5 to-transparent",
  "from-sky-500/20 via-sky-500/5 to-transparent",
  "from-violet-500/20 via-violet-500/5 to-transparent",
];

const highlights = [
  { icon: Leaf, title: "Sustainable Farming", desc: "Carbon footprint tracking & eco-friendly recommendations" },
  { icon: Users, title: "Community Driven", desc: "Connect with 1.5L+ farmers across 200+ districts" },
  { icon: Globe, title: "13+ Languages", desc: "Voice & text support in Hindi, Bengali, Tamil & more" },
  { icon: ShieldCheck, title: "Government Backed", desc: "Aligned with PM-KISAN, PMFBY & Soil Health schemes" },
];

export default function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <Marquee />
      <LiveStatsTicker />

      {/* Highlights — neon biophilic cards */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-mesh opacity-30 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-10">
            <span className="krishi-badge bg-primary/10 text-primary border border-primary/20 mb-4">
              <Leaf className="h-3.5 w-3.5" /> Why KrishiMateHub
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Built for the <span className="text-holo">future of farming</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {highlights.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="lift-glow group relative p-6 rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${ACCENTS[i % 4]} opacity-70`} />
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    <h.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1.5 text-lg">{h.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <FeaturesGrid />
      <SoilScienceLab />
      <PhotosynthesisSimulator />
      <CropProductivityIndex />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
