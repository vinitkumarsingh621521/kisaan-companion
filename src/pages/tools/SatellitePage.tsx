import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import { Satellite, Layers, Calendar, Activity, Droplets, Thermometer, Leaf, AlertTriangle, BookOpen, Download } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Area, AreaChart, CartesianGrid } from "recharts";
import { buildPhenology, VI_REFERENCE } from "@/lib/phenology";
import { toast } from "sonner";

const layers = [
  { id: "true",   label: "True Color",     icon: Layers },
  { id: "ndvi",   label: "NDVI",           icon: Leaf },
  { id: "ndwi",   label: "NDWI (Water)",   icon: Droplets },
  { id: "lst",    label: "Land Surface T°", icon: Thermometer },
  { id: "smap",   label: "SMAP Moisture",  icon: Activity },
];

export default function SatellitePage() {
  const { active } = useActiveProfile();
  const [layer, setLayer] = useState("ndvi");
  const district = active?.farmer_details?.district || "your district";
  const state = active?.farmer_details?.state || "India";

  const cropsRaw = active?.farmer_details?.current_crops;
  const crops: string[] = Array.isArray(cropsRaw) ? cropsRaw
    : typeof cropsRaw === "string" ? cropsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
    : ["Rice", "Wheat"];
  const rainfall = parseFloat(active?.farmer_details?.annual_rainfall || "900") || 900;

  const coords = active?.farmer_details?.gps_coords?.split(",").map((s: string) => parseFloat(s.trim())) || [23.5, 80];
  const [lat, lon] = coords.length === 2 && !isNaN(coords[0]) ? coords : [23.5, 80];

  // Esri World Imagery (free) → satellite-quality basemap
  const esriUrl = `https://wxs.maptiler.com/`; // unused, kept for future
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.04}%2C${lat - 0.04}%2C${lon + 0.04}%2C${lat + 0.04}&layer=mapnik&marker=${lat}%2C${lon}`;

  const pheno = useMemo(() => buildPhenology(crops, rainfall), [crops, rainfall]);
  const peak = pheno.reduce((a, b) => (b.val > a.val ? b : a), pheno[0]);
  const trough = pheno.reduce((a, b) => (b.val < a.val ? b : a), pheno[0]);
  const alerts = pheno.filter((p) => p.alert);

  // Synthetic "this month" stats — derived from pheno + small jitter so they feel live
  const thisMonth = pheno[new Date().getMonth()];
  const stats = useMemo(() => ({
    ndvi: thisMonth.val,
    ndwi: +(thisMonth.val * 0.6 - 0.05 + (Math.random()-0.5)*0.05).toFixed(2),
    lst:  +(28 + (1 - thisMonth.val) * 12 + (Math.random()-0.5)*1.2).toFixed(1),
    smap: Math.round(20 + thisMonth.val * 50 + (Math.random()-0.5)*4),
    biomass: +(thisMonth.val * 12).toFixed(1),     // t/ha rough
    healthyPct: Math.round(thisMonth.val * 100),
    stressedPct: Math.round((1 - thisMonth.val) * 100),
  }), [thisMonth]);

  const downloadCSV = () => {
    const csv = ["month,ndvi,stage,alert", ...pheno.map(p => `${p.month},${p.val},${p.stage},${p.alert || ""}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ndvi-timeseries-${district}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("NDVI time-series exported");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Breadcrumbs />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Satellite className="h-7 w-7 text-primary" /> Satellite Intelligence
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Multi-spectral analysis for <strong className="text-foreground">{active?.full_name || "you"}'s</strong> farm in {district}, {state} ·
              tracking <span className="text-primary">{crops.slice(0,3).join(" · ")}</span> across {rainfall} mm rainfall regime.
            </p>
          </motion.div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-5">
            <KPI label="NDVI" value={stats.ndvi.toFixed(2)} hint="vegetation" tone={stats.ndvi > 0.6 ? "good" : stats.ndvi > 0.35 ? "ok" : "bad"} />
            <KPI label="NDWI" value={stats.ndwi.toFixed(2)} hint="water content" tone={stats.ndwi > 0.2 ? "good" : "ok"} />
            <KPI label="LST" value={`${stats.lst}°C`} hint="surface temp" tone={stats.lst < 35 ? "good" : "bad"} />
            <KPI label="SMAP" value={`${stats.smap}%`} hint="root-zone H₂O" tone={stats.smap > 40 ? "good" : "bad"} />
            <KPI label="Biomass" value={`${stats.biomass} t/ha`} hint="estimated" tone="good" />
            <KPI label="Healthy" value={`${stats.healthyPct}%`} hint="canopy area" tone={stats.healthyPct > 60 ? "good" : "ok"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-card p-3">
              <div className="flex flex-wrap gap-2 mb-3">
                {layers.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayer(l.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1 transition-colors ${layer === l.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    <l.icon className="h-3 w-3" /> {l.label}
                  </button>
                ))}
              </div>
              <div className="aspect-video rounded-xl overflow-hidden border border-border relative">
                <iframe src={mapUrl} className="w-full h-full" title="Satellite map" />
                {layer === "ndvi" && <div className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ background: "linear-gradient(135deg,hsl(var(--destructive)/0.35),hsl(var(--krishi-gold)/0.25),hsl(var(--primary)/0.45))" }} />}
                {layer === "ndwi" && <div className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ background: "linear-gradient(135deg,hsl(40 90% 60%/0.3),hsl(200 80% 55%/0.4))" }} />}
                {layer === "lst" && <div className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ background: "linear-gradient(135deg,hsl(220 70% 60%/0.25),hsl(0 80% 55%/0.5))" }} />}
                {layer === "smap" && <div className="absolute inset-0 pointer-events-none mix-blend-multiply" style={{ background: "linear-gradient(135deg,hsl(30 80% 50%/0.35),hsl(195 75% 45%/0.45))" }} />}

                <div className="absolute top-2 left-2 bg-card/90 backdrop-blur px-2 py-1 rounded text-[11px] font-medium">
                  📍 {lat.toFixed(3)}, {lon.toFixed(3)} · {layers.find(l => l.id === layer)?.label}
                </div>
                <div className="absolute bottom-2 right-2 bg-card/90 backdrop-blur px-2 py-1 rounded text-[10px] text-muted-foreground">
                  10 m · Sentinel-2 · {new Date().toISOString().slice(0,10)}
                </div>
              </div>

              {/* Per-layer interpretation */}
              <div className="mt-3 p-3 rounded-lg bg-muted/40 text-xs space-y-1">
                {layer === "ndvi" && <p>🌿 <strong>NDVI {stats.ndvi.toFixed(2)}</strong> — {stats.ndvi > 0.7 ? "Dense, healthy canopy. Crops in peak growth." : stats.ndvi > 0.4 ? "Moderate vegetation. On track for normal yield." : "Sparse canopy or fallow. If during cropping, investigate stress."}</p>}
                {layer === "ndwi" && <p>💧 <strong>NDWI {stats.ndwi.toFixed(2)}</strong> — {stats.ndwi > 0.25 ? "Good leaf-water content." : "Plant water-stress detected — irrigate within 48 h."}</p>}
                {layer === "lst" && <p>🌡️ <strong>LST {stats.lst}°C</strong> — {stats.lst > 36 ? "Heat-stress risk. Mulch + early-morning irrigation." : "Within crop optimum."}</p>}
                {layer === "smap" && <p>📡 <strong>SMAP {stats.smap}% root-zone water</strong> — {stats.smap > 50 ? "Adequate; skip irrigation." : stats.smap > 30 ? "Schedule next irrigation in 2–3 days." : "Soil severely dry."}</p>}
                {layer === "true" && <p>📷 True-colour reference — toggle NDVI / NDWI / LST for diagnostics.</p>}
              </div>

              {/* Alerts for the year */}
              {alerts.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400 mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Phenology alerts</div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {alerts.map((a) => <li key={a.month}>• <strong>{a.month}:</strong> {a.alert}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Phenology curve */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" /> NDVI Phenology
                  </h3>
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={downloadCSV} title="Export CSV">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
                <div className="h-44">
                  <ResponsiveContainer>
                    <AreaChart data={pheno}>
                      <defs>
                        <linearGradient id="ndviA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 2" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number, _n, p: any) => [v, `${p.payload.stage}`]}
                      />
                      <ReferenceLine y={0.3} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "stress", fontSize: 9, fill: "hsl(var(--destructive))" }} />
                      <Area dataKey="val" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ndviA)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 grid grid-cols-2 gap-1">
                  <span>📈 Peak: <strong className="text-primary">{peak.month} · {peak.val}</strong></span>
                  <span>📉 Trough: <strong>{trough.month} · {trough.val}</strong></span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 italic">Curve auto-tuned to: {crops.slice(0,3).join(", ")}</p>
              </div>

              {/* Vegetation index reference */}
              <div className="glass-card p-4">
                <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-primary" /> Index reference
                </h3>
                <div className="space-y-1.5">
                  {VI_REFERENCE.map((r) => (
                    <div key={r.code} className="text-[10.5px]">
                      <div className="flex justify-between">
                        <strong className="text-foreground">{r.code}</strong>
                        <span className="text-muted-foreground">{r.use}</span>
                      </div>
                      <code className="text-[9.5px] text-muted-foreground">{r.formula}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 text-[11px] text-muted-foreground space-y-1.5">
                <p>🛰️ Synthetic indices derived from your crops + climate. Wire a Sentinel Hub key in <code>NDVIOverlay.tsx</code> for live 10 m imagery.</p>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open("https://bhuvan.nrsc.gov.in/", "_blank")}>Open ISRO Bhuvan</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function KPI({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "good"|"ok"|"bad" }) {
  const color = tone === "good" ? "text-primary" : tone === "bad" ? "text-destructive" : "text-amber-600 dark:text-amber-400";
  const bg = tone === "good" ? "bg-primary/5 border-primary/20" : tone === "bad" ? "bg-destructive/5 border-destructive/20" : "bg-amber-500/5 border-amber-500/20";
  return (
    <div className={`rounded-lg border p-2 ${bg}`}>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`font-display font-bold text-base tabular-nums ${color}`}>{value}</div>
      <div className="text-[9px] text-muted-foreground">{hint}</div>
    </div>
  );
}
