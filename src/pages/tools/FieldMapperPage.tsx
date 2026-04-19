import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Map, Pencil, Trash2, Save, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";

interface Zone { id: string; points: { x: number; y: number }[]; color: string; crop: string; areaPct: number }

const COLORS = ["#22c55e", "#eab308", "#3b82f6", "#ef4444", "#a855f7", "#f97316"];

export default function FieldMapperPage() {
  const { active } = useActiveProfile();
  const [zones, setZones] = useState<Zone[]>([]);
  const [drawing, setDrawing] = useState<{ x: number; y: number }[]>([]);
  const [selectedCrop, setSelectedCrop] = useState("Rice");
  const svgRef = useRef<SVGSVGElement>(null);
  const totalAcres = parseFloat(active?.farmer_details?.total_land || active?.farm_size || "5") || 5;

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDrawing(prev => [...prev, { x, y }]);
  };

  const finishZone = () => {
    if (drawing.length < 3) { toast.error("Need at least 3 points to make a zone"); return; }
    // shoelace area
    let area = 0;
    for (let i = 0; i < drawing.length; i++) {
      const j = (i + 1) % drawing.length;
      area += drawing[i].x * drawing[j].y - drawing[j].x * drawing[i].y;
    }
    const areaPct = Math.abs(area) / 2 / 100;
    setZones(prev => [...prev, { id: Date.now().toString(), points: drawing, color: COLORS[prev.length % COLORS.length], crop: selectedCrop, areaPct }]);
    setDrawing([]);
    toast.success(`✓ Zone added: ${selectedCrop} (~${(areaPct * totalAcres).toFixed(2)} acres)`);
  };

  const clearAll = () => { setZones([]); setDrawing([]); toast.info("All zones cleared"); };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Map className="h-7 w-7 text-primary" /> Field Mapper
            </h1>
            <p className="text-muted-foreground mt-1">Sketch your farm, paint crop zones, see acreage instantly. Total: <span className="font-medium text-foreground">{totalAcres} acres</span></p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-wrap gap-2">
                  {["Rice", "Wheat", "Maize", "Cotton", "Vegetables", "Fallow"].map(c => (
                    <button key={c} onClick={() => setSelectedCrop(c)} className={`text-xs px-3 py-1.5 rounded-full border ${selectedCrop === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>{c}</button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={finishZone} disabled={drawing.length < 3}><Save className="h-3.5 w-3.5 mr-1" /> Finish</Button>
                  <Button size="sm" variant="outline" onClick={clearAll}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="aspect-square bg-gradient-to-br from-krishi-green-light/30 to-krishi-gold-light/30 rounded-xl border border-border relative overflow-hidden">
                <svg ref={svgRef} viewBox="0 0 100 100" className="w-full h-full cursor-crosshair" onClick={onClick}>
                  {zones.map(z => (
                    <polygon key={z.id} points={z.points.map(p => `${p.x},${p.y}`).join(" ")} fill={z.color} fillOpacity="0.4" stroke={z.color} strokeWidth="0.5" />
                  ))}
                  {drawing.length > 0 && (
                    <>
                      <polyline points={drawing.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2,1" />
                      {drawing.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1" fill="hsl(var(--primary))" />)}
                    </>
                  )}
                </svg>
                <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-card/80 backdrop-blur px-2 py-1 rounded"><Pencil className="h-3 w-3 inline mr-1" /> Click to add points, then Finish</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-4">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><Sprout className="h-4 w-4 text-primary" /> Crop Zones</h3>
                {zones.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No zones yet. Sketch one on the map! 🎨</p>
                ) : (
                  <div className="space-y-2">
                    {zones.map(z => (
                      <div key={z.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ background: z.color }} />
                          <span className="font-medium">{z.crop}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{(z.areaPct * totalAcres).toFixed(2)} ac</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                      Total mapped: {(zones.reduce((s, z) => s + z.areaPct, 0) * totalAcres).toFixed(2)} of {totalAcres} acres
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-card p-4 text-xs text-muted-foreground space-y-2">
                <p>💡 <strong>Tip:</strong> Map each field section, then download as a PDF report from Smart Reports.</p>
                <p>📡 In the future this will sync with satellite NDVI for crop-health overlays.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
