import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sprout, Cloud, BarChart3, MessageSquare, Map, Shield,
  Smartphone, Award, FileText, Satellite, Bot, Zap, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Sprout, title: "Smart Crop Advisor", desc: "AI recommends best crops based on soil, weather & market data", color: "bg-krishi-green-light text-krishi-green", link: "/crop-advisor" },
  { icon: Cloud, title: "Weather Intelligence", desc: "Hyper-local forecasts within 1km radius with alert system", color: "bg-krishi-sky-light text-krishi-sky", link: "/dashboard" },
  { icon: BarChart3, title: "Market Price Trends", desc: "Live mandi prices with predictions for 20+ crops", color: "bg-krishi-gold-light text-krishi-gold", link: "/market" },
  { icon: MessageSquare, title: "Multilingual AI Chat", desc: "Ask questions in 13+ Indian languages via voice or text", color: "bg-accent text-accent-foreground", link: "/crop-advisor" },
  { icon: Map, title: "Field Mapper", desc: "GPS-based farm mapping with crop zone planning. Sketch your farm and compute acreage instantly.", color: "bg-krishi-green-light text-krishi-green", link: "/tools/field-mapper" },
  { icon: Shield, title: "Disease Detection", desc: "Upload plant photos for instant AI disease diagnosis with treatment recommendations and YouTube video guides.", color: "bg-destructive/10 text-destructive", link: "/crop-advisor" },
  { icon: Smartphone, title: "Works Offline", desc: "Full functionality in low-connectivity rural areas. PWA-ready, syncs when connection returns.", color: "bg-muted text-muted-foreground", link: "/tools/offline" },
  { icon: Award, title: "Gamification", desc: "Earn badges & XP for sustainable farming. Climb the leaderboard.", color: "bg-krishi-gold-light text-krishi-gold", link: "/tools/achievements" },
  { icon: FileText, title: "Smart Reports", desc: "Auto-generate downloadable PDF farm reports for loans, insurance, and subsidy applications.", color: "bg-krishi-sky-light text-krishi-sky", link: "/tools/reports" },
  { icon: Satellite, title: "Satellite View", desc: "Live satellite imagery of your district with NDVI overlay and 5-year evolution tracking.", color: "bg-accent text-accent-foreground", link: "/tools/satellite" },
  { icon: Bot, title: "IoT Integration", desc: "Connect soil sensors for real-time NPK, pH, and moisture data. Live mock feed included.", color: "bg-krishi-green-light text-krishi-green", link: "/tools/iot" },
  { icon: Zap, title: "Govt Schemes", desc: "Auto-match eligible subsidies based on your profile", color: "bg-krishi-gold-light text-krishi-gold", link: "/schemes" },
];

export default function FeaturesGrid() {
  const navigate = useNavigate();
  const [selectedFeature, setSelectedFeature] = useState<typeof features[0] | null>(null);

  const handleClick = (f: typeof features[0]) => {
    if (f.link) {
      navigate(f.link);
    } else {
      setSelectedFeature(f);
    }
  };

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="krishi-badge bg-primary/10 text-primary mb-4">50+ Premium Features</span>
          <h2 className="section-title text-foreground">
            Everything a Farmer Needs,{" "}
            <span className="text-gradient-primary">In One Place</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
            From soil analysis to market intelligence — powered by AI, designed for simplicity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5 cursor-pointer"
              onClick={() => handleClick(f)}
              whileHover={{ scale: 1.03, rotateY: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center mb-3`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{f.desc}</p>
              {f.link && (
                <span className="text-xs text-primary font-medium mt-2 inline-block">Explore →</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Info Modal for features without links */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={() => setSelectedFeature(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${selectedFeature.color} flex items-center justify-center`}>
                  <selectedFeature.icon className="h-6 w-6" />
                </div>
                <button onClick={() => setSelectedFeature(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-2">{selectedFeature.title}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">{selectedFeature.desc}</p>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
                <p className="text-sm text-primary font-medium">🚀 Coming Soon</p>
                <p className="text-xs text-muted-foreground mt-1">This feature is under active development and will be available in the next update.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSelectedFeature(null)}>
                Got it
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
