import PageGuide from "@/components/PageGuide";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CropCompareEngine from "@/components/compare/CropCompareEngine";

export default function ComparePage() {
  return (
    <AgriPageBackground variant="crops">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <PageGuide
          pageId="compare"
          title="Fasal Compare — Crop Battle"
          subtitle="AI compares any 2 crops on 6 scientific dimensions"
          description="Can't decide what to grow this season? Select any 2 crops and AI compares them scientifically for YOUR specific farm — soil, water source, state, and season all considered. The radar chart shows scores on 6 dimensions. AI gives a verdict with confidence percentage."
          gradient="from-violet-900 to-purple-700"
          aiContext="Fasal Compare scientifically compares 2 crops on water efficiency, profitability, climate match, pest resistance, ease of growing, and market stability."
          features={[
            { icon: "🕸️", title: "Radar Chart", desc: "Visual comparison of both crops across 6 scientific dimensions" },
            { icon: "💰", title: "Financial Chart", desc: "Side-by-side income, investment, and profit comparison" },
            { icon: "🏆", title: "AI Verdict", desc: "Winner for YOUR farm with confidence % and reasoning" },
            { icon: "⚡", title: "Short vs Long Term", desc: "Which crop is better now vs for the next 3 seasons" },
            { icon: "💡", title: "Smart Mix", desc: "AI recommends the ideal % split between the two crops" },
            { icon: "📄", title: "PDF Report", desc: "Download complete comparison as a professional report" },
          ]}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-semibold mb-3">
            ⚖️ AI Scientific Crop Analysis
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent">
            Fasal Compare
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Can't decide what to grow? Let AI compare any 2 crops on 6 scientific dimensions and tell you which is better for YOUR farm.
          </p>
        </motion.div>
        <CropCompareEngine />
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
