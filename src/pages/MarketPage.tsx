import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import MultiMandiCompare from "@/components/market/MultiMandiCompare";
import PriceSparkline from "@/components/market/PriceSparkline";
import Breadcrumbs from "@/components/Breadcrumbs";
import FreightArbitrageCalc from "@/components/market/FreightArbitrageCalc";
import { motion } from "framer-motion";
import { MapPin, Navigation, Truck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

const STATE_MANDIS: Record<string, { name: string; baseDist: number }[]> = {
  "Punjab": [{ name: "Karnal APMC", baseDist: 8 }, { name: "Ludhiana Mandi", baseDist: 22 }, { name: "Amritsar Mandi", baseDist: 55 }],
  "Haryana": [{ name: "Karnal APMC", baseDist: 5 }, { name: "Hisar Mandi", baseDist: 30 }, { name: "Sirsa APMC", baseDist: 60 }],
  "Uttar Pradesh": [{ name: "Lucknow Mandi", baseDist: 12 }, { name: "Kanpur APMC", baseDist: 45 }, { name: "Varanasi Mandi", baseDist: 80 }],
  "Bihar": [{ name: "Patna Mandi", baseDist: 10 }, { name: "Gaya APMC", baseDist: 50 }, { name: "Muzaffarpur Mandi", baseDist: 65 }],
  "West Bengal": [{ name: "Kolkata Mandi", baseDist: 15 }, { name: "Burdwan APMC", baseDist: 60 }, { name: "Siliguri Mandi", baseDist: 110 }],
  "Maharashtra": [{ name: "Pune APMC", baseDist: 12 }, { name: "Nashik Mandi", baseDist: 45 }, { name: "Nagpur APMC", baseDist: 90 }],
  "Gujarat": [{ name: "Ahmedabad APMC", baseDist: 10 }, { name: "Rajkot Mandi", baseDist: 60 }, { name: "Surat Mandi", baseDist: 80 }],
  "Rajasthan": [{ name: "Jaipur Mandi", baseDist: 18 }, { name: "Jodhpur APMC", baseDist: 70 }, { name: "Kota Mandi", baseDist: 100 }],
  "Madhya Pradesh": [{ name: "Indore APMC", baseDist: 15 }, { name: "Bhopal Mandi", baseDist: 55 }, { name: "Ujjain Mandi", baseDist: 80 }],
  "Karnataka": [{ name: "Bengaluru APMC", baseDist: 10 }, { name: "Hubli Mandi", baseDist: 80 }, { name: "Mysuru Mandi", baseDist: 50 }],
  "Tamil Nadu": [{ name: "Chennai Koyambedu", baseDist: 15 }, { name: "Coimbatore Mandi", baseDist: 70 }, { name: "Madurai Mandi", baseDist: 100 }],
  "Telangana": [{ name: "Hyderabad Bowenpally", baseDist: 12 }, { name: "Warangal APMC", baseDist: 60 }, { name: "Karimnagar Mandi", baseDist: 90 }],
  "Andhra Pradesh": [{ name: "Vijayawada Mandi", baseDist: 12 }, { name: "Guntur Mirchi Yard", baseDist: 35 }, { name: "Visakhapatnam Mandi", baseDist: 80 }],
  "Jharkhand": [{ name: "Ranchi Mandi", baseDist: 5 }, { name: "Jamshedpur Market", baseDist: 45 }, { name: "Dhanbad APMC", baseDist: 68 }, { name: "Bokaro Mandi", baseDist: 52 }],
  "Odisha": [{ name: "Bhubaneswar Mandi", baseDist: 18 }, { name: "Cuttack APMC", baseDist: 35 }, { name: "Sambalpur Mandi", baseDist: 90 }],
  "Himachal Pradesh": [{ name: "Solan Sabzi Mandi", baseDist: 10 }, { name: "Shimla APMC (Dhalli)", baseDist: 18 }, { name: "Parala Apple Mandi (Theog)", baseDist: 30 }, { name: "Bhuntar Mandi (Kullu)", baseDist: 75 }, { name: "Mandi APMC", baseDist: 90 }],
  "Uttarakhand": [{ name: "Dehradun Mandi", baseDist: 12 }, { name: "Haridwar APMC", baseDist: 35 }, { name: "Haldwani Mandi", baseDist: 70 }],
  "Kerala": [{ name: "Ernakulam Market", baseDist: 14 }, { name: "Thiruvananthapuram Mandi", baseDist: 60 }, { name: "Kozhikode Mandi", baseDist: 85 }],
  "Chhattisgarh": [{ name: "Raipur APMC", baseDist: 10 }, { name: "Bilaspur Mandi", baseDist: 60 }, { name: "Durg Mandi", baseDist: 35 }],
  "Assam": [{ name: "Guwahati Mandi", baseDist: 10 }, { name: "Jorhat APMC", baseDist: 70 }, { name: "Tezpur Mandi", baseDist: 50 }],
  "Goa": [{ name: "Mapusa Market", baseDist: 8 }, { name: "Margao Mandi", baseDist: 30 }],
  "Tripura": [{ name: "Agartala Mandi", baseDist: 10 }, { name: "Udaipur Market", baseDist: 50 }],
  "Manipur": [{ name: "Imphal Khwairamband", baseDist: 8 }, { name: "Bishnupur Mandi", baseDist: 30 }],
  "Meghalaya": [{ name: "Iewduh Bara Bazar (Shillong)", baseDist: 10 }, { name: "Tura Mandi", baseDist: 80 }],
  "Nagaland": [{ name: "Kohima Bazar", baseDist: 10 }, { name: "Dimapur Mandi", baseDist: 70 }],
  "Mizoram": [{ name: "Bara Bazar (Aizawl)", baseDist: 8 }],
  "Arunachal Pradesh": [{ name: "Itanagar Mandi", baseDist: 12 }, { name: "Naharlagun Market", baseDist: 20 }],
  "Sikkim": [{ name: "Gangtok Lal Bazar", baseDist: 10 }, { name: "Singtam Mandi", baseDist: 30 }],
  "Jammu and Kashmir": [{ name: "Narwal Mandi (Jammu)", baseDist: 12 }, { name: "Parimpora Mandi (Srinagar)", baseDist: 80 }],
  "Ladakh": [{ name: "Leh Vegetable Market", baseDist: 8 }],
};

export default function MarketPage() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const state = ctx?.location.state || active?.farmer_details?.state || "";
  const baseKm = parseFloat(active?.farmer_details?.nearest_mandi_km || "0") || 0;
  const district = ctx?.location.district || active?.farmer_details?.district || "";
  const mandis = STATE_MANDIS[state] || [
    { name: district ? `${district} APMC` : "Local APMC", baseDist: Math.max(5, baseKm) },
    { name: state ? `${state} Wholesale Mandi` : "Regional Mandi", baseDist: Math.max(15, baseKm + 20) },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">📈 Market Intelligence</h1>
            <p className="text-muted-foreground mt-1">
              Live mandi prices for <span className="font-medium text-primary">{state}</span> · personalized to your crops
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <MarketPriceWidget />
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-krishi-gold" /> Nearest Mandis · {state}
              </h3>
              <div className="space-y-3">
                {mandis.map((m) => {
                  const dist = baseKm > 0 ? Math.max(2, m.baseDist + Math.round((baseKm - 5) * 0.3)) : m.baseDist;
                  const freight = Math.round(dist * 8);
                  return (
                    <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toast.success(`Opening directions to ${m.name}...`)}>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{m.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Truck className="h-3 w-3" /> Est. freight ₹{freight}/quintal
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3 flex-shrink-0">
                        <span className="krishi-badge bg-primary/10 text-primary text-xs">Open</span>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-3 w-3" />{dist} km
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl bg-muted/50 h-32 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
                <span>🗺️ Interactive Map</span>
                <Button size="sm" variant="outline" onClick={() => toast.info("GPS map coming soon!")}>
                  <MapPin className="h-4 w-4 mr-1" /> Enable Location
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 mb-5">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> 30-Day Price Trends · Best Day to Sell
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Wheat", "Rice", "Maize", "Soybean", "Cotton", "Mustard"].map((c, i) => (
                <div key={c} className="rounded-xl bg-muted/30 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground text-sm">{c}</div>
                    <div className="text-xs text-muted-foreground">₹{2000 + i * 350}/qt</div>
                  </div>
                  <PriceSparkline crop={c} base={2000 + i * 350} />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <FreightArbitrageCalc mandis={mandis} baseKm={baseKm} />
          </div>

          <MultiMandiCompare />
        </div>
      </main>
      <Footer />
    </div>
  );
}

