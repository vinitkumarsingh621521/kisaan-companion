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
