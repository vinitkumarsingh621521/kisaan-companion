import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import { Satellite, Layers, Calendar } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const layers = ["True Color", "NDVI (Vegetation Index)", "Soil Moisture", "Temperature"];
const ndviData = [
  { month: "Jan", val: 0.32 }, { month: "Feb", val: 0.38 }, { month: "Mar", val: 0.45 },
  { month: "Apr", val: 0.52 }, { month: "May", val: 0.61 }, { month: "Jun", val: 0.72 },
  { month: "Jul", val: 0.78 }, { month: "Aug", val: 0.81 }, { month: "Sep", val: 0.74 },
  { month: "Oct", val: 0.58 }, { month: "Nov", val: 0.42 }, { month: "Dec", val: 0.35 },
];

export default function SatellitePage() {
  const { active } = useActiveProfile();
  const [layer, setLayer] = useState(layers[1]);
  const district = active?.farmer_details?.district || "your district";
  const state = active?.farmer_details?.state || "India";

  // OpenStreetMap iframe centered on India
  const coords = active?.farmer_details?.gps_coords?.split(",").map((s: string) => parseFloat(s.trim())) || [23.5, 80];
  const [lat, lon] = coords.length === 2 && !isNaN(coords[0]) ? coords : [23.5, 80];
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.05}%2C${lat - 0.05}%2C${lon + 0.05}%2C${lat + 0.05}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <Breadcrumbs />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Satellite className="h-7 w-7 text-primary" /> Satellite View
            </h1>
            <p className="text-muted-foreground mt-1">Live satellite imagery of {district}, {state} with vegetation health overlays</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-card p-3">
              <div className="flex flex-wrap gap-2 mb-3">
                {layers.map(l => (
                  <button key={l} onClick={() => setLayer(l)} className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 ${layer === l ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                    <Layers className="h-3 w-3" /> {l}
                  </button>
                ))}
              </div>
              <div className="aspect-video rounded-xl overflow-hidden border border-border relative">
                <iframe src={mapUrl} className="w-full h-full" title="Satellite map" />
                {layer === "NDVI (Vegetation Index)" && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-krishi-gold/20 to-destructive/30 pointer-events-none mix-blend-multiply" />
                )}
                {layer === "Soil Moisture" && <div className="absolute inset-0 bg-gradient-to-br from-krishi-sky/30 to-krishi-earth/30 pointer-events-none mix-blend-multiply" />}
                {layer === "Temperature" && <div className="absolute inset-0 bg-gradient-to-br from-krishi-sky/30 to-destructive/30 pointer-events-none mix-blend-multiply" />}
                <div className="absolute top-2 left-2 bg-card/90 backdrop-blur px-2 py-1 rounded text-xs">
                  📍 {lat.toFixed(3)}, {lon.toFixed(3)} · {layer}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">Map by OpenStreetMap. Add GPS coordinates in your profile for precise centering. NDVI/moisture overlays are illustrative — full Sentinel-2 / Bhuvan integration in Pro tier.</p>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-4">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" /> NDVI Trend (12 mo)</h3>
                <div className="space-y-1">
                  {ndviData.map(d => (
                    <div key={d.month} className="flex items-center gap-2 text-xs">
                      <span className="w-8 text-muted-foreground">{d.month}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-krishi-gold to-primary" style={{ width: `${d.val * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{d.val.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">Higher NDVI = healthier crops. Peak: monsoon months.</p>
              </div>

              <div className="glass-card p-4 text-xs text-muted-foreground space-y-2">
                <p>🛰️ Powered by OpenStreetMap + simulated Sentinel-2 NDVI</p>
                <p>📅 5-year evolution coming soon — track land-use changes</p>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open("https://bhuvan.nrsc.gov.in/", "_blank")}>Open Bhuvan Portal</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
