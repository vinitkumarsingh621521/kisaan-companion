import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/dashboard/AIChatWidget";
import CropRecommendationCard from "@/components/dashboard/CropRecommendationCard";
import SoilHealthCard from "@/components/dashboard/SoilHealthCard";
import MultiImageDiseaseScanner from "@/components/cropAdvisor/MultiImageDiseaseScanner";
import CropCompatibilityMatrix from "@/components/cropAdvisor/CropCompatibilityMatrix";
import DiseaseHeroScanner from "@/components/cropAdvisor/DiseaseHeroScanner";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { motion } from "framer-motion";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

export default function CropAdvisor() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();

  return (
    <AgriPageBackground variant="crops">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white drop-shadow-lg">
              🌾 AI Crop Advisor {active?.full_name ? <span className="text-base font-normal text-white/70">— for {active.full_name}</span> : null}
            </h1>
            <p className="text-white/70 mt-1">
              {ctx ? `Personalized for your ${ctx.climate?.zone || "region"} farm in ${ctx.location?.state || "India"}.` : "Real AI-powered disease detection & crop recommendations"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5" id="ai-chat"><AIChatWidget /></div>
            <div className="lg:col-span-4"><CropRecommendationCard /></div>
            <div className="lg:col-span-3"><SoilHealthCard /></div>
          </div>

          <div className="mt-5">
            <DiseaseHeroScanner />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <MultiImageDiseaseScanner />
            <CropCompatibilityMatrix />
          </div>
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
