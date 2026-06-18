import PageGuide from "@/components/PageGuide";
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
import { useTranslation } from "react-i18next";

export default function CropAdvisor() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const { t } = useTranslation();

  return (
    <AgriPageBackground variant="crops">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <PageGuide
            pageId="crop-advisor"
            title="Crop Advisor"
            subtitle="AI disease scanner and crop compatibility checker"
            description="Upload a photo of your crop and AI instantly identifies diseases with treatment protocol. The Compatibility Matrix checks if two crops can grow together on the same field. All results include specific product names, doses, and timing."
            gradient="from-green-900 to-lime-800"
            aiContext="Crop Advisor: AI disease scanner, crop compatibility matrix, and multi-image batch scanning."
            features={[
              { icon: "🔬", title: "Disease Scanner", desc: "Photo → AI identifies disease, severity, and treatment" },
              { icon: "💊", title: "Treatment Protocol", desc: "Specific spray products with dose and timing" },
              { icon: "🔄", title: "Batch Scanner", desc: "Upload multiple photos at once for comparison" },
              { icon: "⚖️", title: "Compatibility Matrix", desc: "Check if two crops can grow together on your field" },
              { icon: "📸", title: "Camera Mode", desc: "Scan crops directly with your phone camera" },
              { icon: "📋", title: "History", desc: "View and revisit all your previous scan results" },
            ]}
          />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white drop-shadow-lg">
              🌾 {t("cropAdvisor.title")} {active?.full_name ? <span className="text-base font-normal text-white/70">— {active.full_name}</span> : null}
            </h1>
            <p className="text-white/70 mt-1">
              {ctx ? `${t("cropAdvisor.subtitle")} · ${ctx.climate?.zone || "region"} · ${ctx.location?.state || "India"}` : t("cropAdvisor.subtitle")}
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
