import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import { motion } from "framer-motion";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const mandis = [
  { name: "Ranchi Mandi", dist: "2.5 km", crops: 32, status: "Open" },
  { name: "Jamshedpur Market", dist: "45 km", crops: 48, status: "Open" },
  { name: "Dhanbad APMC", dist: "68 km", crops: 25, status: "Closed" },
  { name: "Bokaro Mandi", dist: "52 km", crops: 30, status: "Open" },
];

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">📈 Market Intelligence</h1>
            <p className="text-muted-foreground mt-1">Live mandi prices, trends & nearest market locations</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <MarketPriceWidget />
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-krishi-gold" />
                Nearest Mandis
              </h3>
              <div className="space-y-3">
                {mandis.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (m.status === "Open") {
                        toast.success(`Opening directions to ${m.name}...`);
                      } else {
                        toast.error(`${m.name} is currently closed.`);
                      }
                    }}
                  >
                    <div>
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.crops} crops available</div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className={`krishi-badge text-xs ${m.status === "Open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {m.status}
                      </span>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {m.dist}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-muted/50 h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
                <span>🗺️ Interactive Map</span>
                <Button size="sm" variant="outline" onClick={() => toast.info("Map integration with GPS coming soon! You'll be able to see all mandis near you.")}>
                  <MapPin className="h-4 w-4 mr-1" /> Enable Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
