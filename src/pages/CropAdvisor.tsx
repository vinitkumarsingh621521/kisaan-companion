import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/dashboard/AIChatWidget";
import CropRecommendationCard from "@/components/dashboard/CropRecommendationCard";
import SoilHealthCard from "@/components/dashboard/SoilHealthCard";
import MultiImageDiseaseScanner from "@/components/cropAdvisor/MultiImageDiseaseScanner";
import CropCompatibilityMatrix from "@/components/cropAdvisor/CropCompatibilityMatrix";
import DiseaseHeroScanner from "@/components/cropAdvisor/DiseaseHeroScanner";
import { motion } from "framer-motion";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

// Tiny wheat-stalk pattern (white @ 4% opacity), base64-encoded SVG
const WHEAT_PATTERN =
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g fill="none" stroke="white" stroke-opacity="0.04" stroke-width="1" stroke-linecap="round"><path d="M20 5 L20 35"/><path d="M20 10 Q 16 12 14 15"/><path d="M20 10 Q 24 12 26 15"/><path d="M20 16 Q 16 18 14 21"/><path d="M20 16 Q 24 18 26 21"/><path d="M20 22 Q 16 24 14 27"/><path d="M20 22 Q 24 24 26 27"/><path d="M20 28 Q 17 30 16 32"/><path d="M20 28 Q 23 30 24 32"/></g></svg>`);

export default function CropAdvisor() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();

  return (
    <div className="min-h-screen relative overflow-hidden agri-bg">
      <style>{`
        @keyframes drift {
          0% { background-position: 0% 0%, 0% 0%; }
          100% { background-position: 100% 100%, 400px 400px; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(15px); }
        }
        .agri-bg {
          background-color: #0d2b1a;
          background-image:
            radial-gradient(ellipse at center, #0d2b1a 0%, #112b1b 40%, #1a0f05 100%),
            url('${WHEAT_PATTERN}');
          background-size: 100% 100%, 80px 80px;
          background-repeat: no-repeat, repeat;
          animation: drift 30s ease-in-out infinite alternate;
        }
        .agri-blob {
          animation: float 12s ease-in-out infinite;
        }
        .agri-blob.b2 { animation-duration: 16s; animation-delay: -4s; }
        .agri-blob.b3 { animation-duration: 20s; animation-delay: -8s; }
      `}</style>

      {/* Aurora blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="agri-blob absolute top-[8%] left-[-4%] w-96 h-96 rounded-full blur-3xl"
             style={{ backgroundColor: "#16a34a", opacity: 0.2 }} />
        <div className="agri-blob b2 absolute top-[10%] right-[-6%] w-96 h-96 rounded-full blur-3xl"
             style={{ backgroundColor: "#ca8a04", opacity: 0.15 }} />
        <div className="agri-blob b3 absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl"
             style={{ backgroundColor: "#10b981", opacity: 0.18 }} />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="pt-20 pb-12 px-4">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                🌾 AI Crop Advisor {active?.full_name ? <span className="text-base font-normal text-muted-foreground">— for {active.full_name}</span> : null}
              </h1>
              <p className="text-muted-foreground mt-1">
                {ctx ? `Personalized for your ${ctx.climate?.zone || "region"} farm in ${ctx.location?.state || "India"}.` : "Real AI-powered disease detection & crop recommendations"}
              </p>
            </motion.div>

            {/* Row 1: AI Chat + Crop Recommendations + Soil Health */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5"><AIChatWidget /></div>
              <div className="lg:col-span-4"><CropRecommendationCard /></div>
              <div className="lg:col-span-3"><SoilHealthCard /></div>
            </div>

            {/* Row 2: Disease Scanner hero (full width) */}
            <div className="mt-5">
              <DiseaseHeroScanner />
            </div>

            {/* Phase 2 mounts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
              <MultiImageDiseaseScanner />
              <CropCompatibilityMatrix />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
