import PageGuide from "@/components/PageGuide";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SoilPhotoAnalyzer from "@/components/vision/SoilPhotoAnalyzer";
import CropGrowthDiary from "@/components/vision/CropGrowthDiary";
import PestRadarWidget from "@/components/vision/PestRadarWidget";
import SmartScanner from "@/components/vision/SmartScanner";

export default function VisionPage() {
  return (
    <AgriPageBackground variant="crops">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <PageGuide
          pageId="vision"
          title="Kisaan Dristikon — Farm Vision"
          subtitle="AI visual intelligence for your farm"
          description="Take a photo of your soil or crops and AI instantly analyses it. The Soil Scanner estimates pH, fertility, and gives amendment recommendations from a soil photo. The Crop Diary tracks growth stages over time. The Pest Radar warns you about upcoming disease threats in your area."
          gradient="from-amber-900 to-yellow-700"
          aiContext="Farm Vision page: Soil photo analyzer, Crop Growth Diary, and Pest Early Warning Radar."
          features={[
            { icon: "🌍", title: "Soil Scanner", desc: "Upload soil photo → AI estimates pH, organic matter, fertility" },
            { icon: "📅", title: "Crop Diary", desc: "Photo journal of crop growth with AI-analysed stages and health score" },
            { icon: "🚨", title: "Pest Radar", desc: "AI pest alerts + community disease reports from nearby districts" },
            { icon: "📄", title: "PDF Export", desc: "Download your soil analysis as a professional report" },
            { icon: "📷", title: "Camera Support", desc: "Use your phone camera directly — no file upload needed" },
            { icon: "📱", title: "WhatsApp Share", desc: "Share soil analysis results with your agronomist or family" },
          ]}
        />
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
          <SmartScanner />
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
