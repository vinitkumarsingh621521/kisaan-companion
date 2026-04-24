import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";
import LiveStatsTicker from "@/components/home/LiveStatsTicker";
import LanguageHeroSwitcher from "@/components/LanguageHeroSwitcher";
import { motion } from "framer-motion";
import { Leaf, Users, Globe, ShieldCheck } from "lucide-react";

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
      <LiveStatsTicker />

      {/* Highlights */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="flex items-start gap-4 p-5 rounded-xl hover:bg-muted/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <h.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{h.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{h.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <FeaturesGrid />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
