import PageGuide from "@/components/PageGuide";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SoilPhotoAnalyzer from "@/components/vision/SoilPhotoAnalyzer";
import CropGrowthDiary from "@/components/vision/CropGrowthDiary";
import PestRadarWidget from "@/components/vision/PestRadarWidget";

export default function VisionPage() {
  return (
    <AgriPageBackground variant="crops">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h1 className="font-display font-bold text-3xl md:text-5xl text-foreground">
            🔍 Kisaan Dristikon
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            AI-powered visual intelligence for your farm
          </p>
        </motion.div>

        <div className="space-y-8">
          <SoilPhotoAnalyzer />
          <CropGrowthDiary />
          <PestRadarWidget />
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
