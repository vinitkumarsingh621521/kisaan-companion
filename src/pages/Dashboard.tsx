import { useEffect, useState } from "react";
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
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "🌙 Good Night";
  if (h < 12) return "🌅 Good Morning";
  if (h < 17) return "☀️ Good Afternoon";
  if (h < 21) return "🌇 Good Evening";
  return "🌙 Good Night";
}

interface Profile {
  full_name: string | null;
  farm_location: string | null;
  farm_size: string | null;
  soil_type: string | null;
  preferred_language: string | null;
  farmer_details: Record<string, string> | null;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userName, setUserName] = useState("Farmer");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, farm_location, farm_size, soil_type, preferred_language, farmer_details")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        setUserName(data.full_name || user.email?.split("@")[0] || "Farmer");
      } else {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Farmer");
      }
    };
    loadProfile();
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's your farm overview for <span className="text-primary font-medium">
                {profile?.farmer_details?.preferred_season || "Kharif"} 2025
              </span>
              {profile?.farm_location && <span> — <span className="font-medium">{profile.farm_location}</span></span>}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-3 space-y-5">
              <FarmProfileCard profile={profile} />
              <QuickActions />
              <GovtSchemesCard />
            </div>
            <div className="lg:col-span-5 space-y-5">
              <CropRecommendationCard profile={profile} />
              <CropCalendarWidget />
              <MarketPriceWidget />
            </div>
            <div className="lg:col-span-4 space-y-5">
              <WeatherWidget location={profile?.farm_location} />
              <SoilHealthCard />
              <AIChatWidget />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
