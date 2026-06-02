import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import SoilHealthCard from "@/components/dashboard/SoilHealthCard";
import CropRecommendationCard from "@/components/dashboard/CropRecommendationCard";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import AIChatWidget from "@/components/dashboard/AIChatWidget";
import FarmProfileCard from "@/components/dashboard/FarmProfileCard";
import GovtSchemesCard from "@/components/dashboard/GovtSchemesCard";
import QuickActions from "@/components/dashboard/QuickActions";
import CropCalendarWidget from "@/components/dashboard/CropCalendarWidget";
import FarmHealthScore from "@/components/dashboard/FarmHealthScore";
import SeasonalAlertBanner from "@/components/dashboard/SeasonalAlertBanner";
import ProfileCompletionBanner from "@/components/dashboard/ProfileCompletionBanner";
import TodayActionCard from "@/components/dashboard/TodayActionCard";
import CropSuitabilityWarning from "@/components/dashboard/CropSuitabilityWarning";
import FarmPulseTicker from "@/components/dashboard/FarmPulseTicker";
import YieldForecastChart from "@/components/dashboard/YieldForecastChart";
import CarbonFootprintWidget from "@/components/dashboard/CarbonFootprintWidget";
import MistakeDetectorWidget from "@/components/dashboard/MistakeDetectorWidget";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useTranslation } from "react-i18next";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "🌙 Good Night";
  if (h < 12) return "🌅 Good Morning";
  if (h < 17) return "☀️ Good Afternoon";
  if (h < 21) return "🌇 Good Evening";
  return "🌙 Good Night";
}

export default function Dashboard() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const { t } = useTranslation();

  const userName = active?.full_name || "Farmer";
  const season = ctx?.climate.current_season || "Kharif";
  const location =
    active?.farm_location ||
    [active?.farmer_details?.district, active?.farmer_details?.state].filter(Boolean).join(", ") ||
    "your farm";

  return (
    <AgriPageBackground variant="dashboard">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("dashboard.overviewFor")}{" "}
              <span className="text-primary font-medium">{season} {new Date().getFullYear()}</span>
              {" — "}
              <span className="font-medium">{location}</span>
            </p>
          </motion.div>

          <FarmPulseTicker />

          <ProfileCompletionBanner />

          <CropSuitabilityWarning />

          <TodayActionCard />

          <div className="mb-5">
            <SeasonalAlertBanner />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-3 space-y-5">
              <FarmProfileCard />
              <FarmHealthScore />
              <QuickActions />
              <GovtSchemesCard />
            </div>
            <div className="lg:col-span-5 space-y-5">
              <CropRecommendationCard />
              <YieldForecastChart crops={[{ name: ctx?.crops?.current?.[0] || ctx?.crops?.suitable?.[0] || "Rice", yield: "4.2" }]} />
              <CropCalendarWidget />
              <MarketPriceWidget />
            </div>
            <div className="lg:col-span-4 space-y-5" id="weather">
              <WeatherWidget />
              <SoilHealthCard />
              <CarbonFootprintWidget />
              <MistakeDetectorWidget />
              <AIChatWidget />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
