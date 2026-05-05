import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import { Bot, Wifi, Droplets, Thermometer, Beaker, AlertCircle, CheckCircle2, Sun, Wind, Gauge, Activity, Zap, Sparkles, MapPin, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import IoTLiveStream from "@/components/iot/IoTLiveStream";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

// Optimal ranges per crop — used to personalise sensor thresholds
const CROP_OPTIMA: Record<string, { temp: [number, number]; moisture: [number, number]; ph: [number, number]; n: [number, number]; p: [number, number]; k: [number, number] }> = {
  Rice:       { temp: [22, 32], moisture: [70, 90], ph: [5.5, 7.0], n: [240, 320], p: [25, 50], k: [180, 240] },
  Wheat:      { temp: [15, 25], moisture: [50, 70], ph: [6.0, 7.5], n: [200, 280], p: [30, 55], k: [160, 220] },
  Maize:      { temp: [21, 30], moisture: [55, 75], ph: [5.8, 7.0], n: [240, 320], p: [30, 55], k: [180, 240] },
  Cotton:     { temp: [21, 35], moisture: [50, 70], ph: [6.0, 8.0], n: [200, 280], p: [30, 50], k: [180, 240] },
  Vegetables: { temp: [18, 28], moisture: [60, 80], ph: [6.0, 7.5], n: [180, 260], p: [40, 70], k: [200, 280] },
  Sugarcane:  { temp: [22, 32], moisture: [65, 85], ph: [6.5, 7.5], n: [280, 360], p: [40, 70], k: [220, 300] },
  Pulses:     { temp: [18, 30], moisture: [45, 65], ph: [6.0, 7.5], n: [40,  80],  p: [40, 70], k: [180, 240] },
};

type Zone = "field-a" | "field-b" | "field-c";

export default function IoTPage() {
  const { active } = useActiveProfile();
  const [connected, setConnected] = useState(false);
  const [zone, setZone] = useState<Zone>("field-a");
  const [readings, setReadings] = useState({ temp: 28, moisture: 62, ph: 6.5, n: 240, p: 42, k: 200, ec: 1.4, light: 48000, wind: 6 });
  const [waterSavedL, setWaterSavedL] = useState(0);

  // Resolve farmer's primary crop & per-crop optima
  const cropsRaw = active?.farmer_details?.current_crops;
  const crops: string[] = Array.isArray(cropsRaw) ? cropsRaw
    : typeof cropsRaw === "string" ? cropsRaw.split(",").map((s: string) => s.trim()).filter(Boolean)
    : ["Rice"];
  const primary = crops[0] || "Rice";
  const optima = CROP_OPTIMA[primary] || CROP_OPTIMA.Rice;
  const district = active?.farmer_details?.district || "your farm";
  const totalAcres = parseFloat(active?.farmer_details?.total_land || active?.farm_size || "5") || 5;

  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      setReadings((r) => ({
        temp: +(r.temp + (Math.random() - 0.5) * 0.5).toFixed(1),
        moisture: Math.max(20, Math.min(95, +(r.moisture + (Math.random() - 0.5) * 2).toFixed(1))),
        ph: +(r.ph + (Math.random() - 0.5) * 0.05).toFixed(2),
        n: Math.max(50, Math.min(400, +(r.n + (Math.random() - 0.5) * 4).toFixed(0))),
        p: Math.max(10, Math.min(80, +(r.p + (Math.random() - 0.5) * 1.5).toFixed(0))),
        k: Math.max(50, Math.min(350, +(r.k + (Math.random() - 0.5) * 4).toFixed(0))),
        ec: +(r.ec + (Math.random() - 0.5) * 0.05).toFixed(2),
        light: Math.max(5000, Math.min(120000, +(r.light + (Math.random() - 0.5) * 4000).toFixed(0))),
        wind: +(Math.max(0, r.wind + (Math.random() - 0.5) * 1)).toFixed(1),
      }));
      setWaterSavedL((s) => s + 0.8); // running tally vs flood-irrigation baseline
    }, 2000);
    return () => clearInterval(id);
  }, [connected]);

  const connect = () => {
    toast.success("🔌 Connecting to KrishiSensor v2…");
    setTimeout(() => { setConnected(true); toast.success(`✓ 3 nodes online across ${totalAcres} acres`); }, 800);
  };

  // Build personalised sensor table
  const sensors = useMemo(() => [
    { key: "temp",     label: "Soil Temperature", val: readings.temp,     unit: "°C",     icon: Thermometer, color: "text-destructive",       opt: optima.temp,     scale: [0, 50] as [number,number] },
    { key: "moisture", label: "Soil Moisture",    val: readings.moisture, unit: "%",      icon: Droplets,    color: "text-krishi-sky",        opt: optima.moisture, scale: [0, 100] },
    { key: "ph",       label: "Soil pH",          val: readings.ph,       unit: "",       icon: Beaker,      color: "text-primary",           opt: optima.ph,       scale: [3, 10] },
    { key: "ec",       label: "Salinity (EC)",    val: readings.ec,       unit: "dS/m",   icon: Zap,         color: "text-amber-500",         opt: [0, 2] as [number,number],  scale: [0, 4] },
    { key: "n",        label: "Nitrogen (N)",     val: readings.n,        unit: "kg/ha",  icon: Beaker,      color: "text-krishi-gold",       opt: optima.n,        scale: [0, 400] },
    { key: "p",        label: "Phosphorus (P)",   val: readings.p,        unit: "kg/ha",  icon: Beaker,      color: "text-krishi-gold",       opt: optima.p,        scale: [0, 100] },
    { key: "k",        label: "Potassium (K)",    val: readings.k,        unit: "kg/ha",  icon: Beaker,      color: "text-krishi-gold",       opt: optima.k,        scale: [0, 400] },
    { key: "light",    label: "Solar Radiation",  val: readings.light,    unit: "lux",    icon: Sun,         color: "text-amber-500",         opt: [25000, 100000] as [number,number], scale: [0, 120000] },
    { key: "wind",     label: "Wind Speed",       val: readings.wind,     unit: "km/h",   icon: Wind,        color: "text-krishi-sky",        opt: [0, 15] as [number,number], scale: [0, 30] },
  ].map((s) => ({ ...s, ok: s.val >= s.opt[0] && s.val <= s.opt[1] })), [readings, optima]);

  const issues = sensors.filter((s) => !s.ok);

  // AI-flavoured recommendations
  const recommendations = useMemo(() => {
    const recs: { icon: any; title: string; body: string; severity: "info"|"warn"|"crit" }[] = [];
    if (readings.moisture < optima.moisture[0]) {
      const deficit = optima.moisture[0] - readings.moisture;
      const litres = Math.round(deficit * 200 * totalAcres);
      recs.push({ icon: Droplets, title: "Irrigate within 24 h", severity: "crit",
        body: `Moisture ${readings.moisture.toFixed(0)}% is ${deficit.toFixed(0)} pp below ${primary} optimum (${optima.moisture[0]}%). Apply ~${litres.toLocaleString("en-IN")} L across ${totalAcres} acres.` });
    } else if (readings.moisture > optima.moisture[1]) {
      recs.push({ icon: Droplets, title: "Skip next irrigation", severity: "warn",
        body: `Moisture ${readings.moisture.toFixed(0)}% above ${primary} optimum. Risk of root-rot — open drains.` });
    }
    if (readings.temp > optima.temp[1]) {
      recs.push({ icon: Thermometer, title: "Heat-stress alert", severity: "crit",
        body: `Soil ${readings.temp}°C exceeds ${primary} ceiling (${optima.temp[1]}°C). Mulch with paddy straw 4 t/ac + irrigate before 9 AM.` });
    }
    if (readings.ph < optima.ph[0]) {
      const lime = ((optima.ph[0] - readings.ph) * 1.2 * totalAcres).toFixed(1);
      recs.push({ icon: Beaker, title: "Apply agricultural lime", severity: "warn",
        body: `pH ${readings.ph.toFixed(2)} is acidic for ${primary}. Apply ${lime} t lime over ${totalAcres} acres before next sowing.` });
    } else if (readings.ph > optima.ph[1]) {
      recs.push({ icon: Beaker, title: "Apply gypsum", severity: "warn",
        body: `pH ${readings.ph.toFixed(2)} alkaline for ${primary}. ${(0.5*totalAcres).toFixed(1)} t gypsum + green-manure dhaincha.` });
    }
    if (readings.n < optima.n[0]) {
      const urea = Math.round((optima.n[0] - readings.n) * 2.17 / 100 * totalAcres);
      recs.push({ icon: Beaker, title: "N top-dressing required", severity: "warn",
        body: `N ${readings.n} kg/ha below ${primary} need. Side-dress ${urea} kg urea / acre × ${totalAcres} ac.` });
    }
    if (readings.ec > 2) {
      recs.push({ icon: Zap, title: "Salinity rising", severity: "warn",
        body: `EC ${readings.ec} dS/m — leach with 75 mm clean water + apply gypsum.` });
    }
    if (readings.wind > 18) {
      recs.push({ icon: Wind, title: "Postpone spraying", severity: "info",
        body: `Wind ${readings.wind} km/h causes drift. Spray after sundown when wind drops.` });
    }
    if (recs.length === 0) recs.push({ icon: CheckCircle2, title: "All systems nominal", severity: "info",
      body: `Every reading is within ${primary} optimum. Keep monitoring — KrishiAI will alert you on any deviation.` });
    return recs;
  }, [readings, optima, primary, totalAcres]);

  // Irrigation cost & savings (drip vs flood baseline)
  const dailyDripL = useMemo(() => {
    const cwr = primary === "Sugarcane" ? 6 : primary === "Rice" ? 5 : 3.5; // mm/day equivalent
    return Math.round(cwr * 4047 * totalAcres * 0.9 / 1000); // kL/day
  }, [primary, totalAcres]);
  const dailyFloodL = Math.round(dailyDripL / 0.45);
  const annualSavingsRupees = Math.round((dailyFloodL - dailyDripL) * 1000 * 200 * 0.05); // approx ₹0.05/L water+power

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <Breadcrumbs />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary" /> IoT Sensor Hub
            </h1>
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-1.5 flex-wrap">
              <MapPin className="h-3.5 w-3.5" /> {district} · {totalAcres} acres · primary crop:
              <span className="font-medium text-foreground">{primary}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">thresholds tuned for {primary}</span>
            </p>
          </motion.div>

          {!connected ? (
            <div className="glass-card p-8 text-center">
              <Wifi className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display font-semibold text-foreground text-lg mb-2">No sensors connected</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Start with our demo sensor or pair your KrishiSensor / SenseGrow / Fasal device. <br/>
                We'll auto-calibrate alert thresholds for <strong className="text-foreground">{primary}</strong>.
              </p>
              <Button onClick={connect} className="gradient-primary border-0 text-primary-foreground">
                <Wifi className="h-4 w-4 mr-2" /> Connect Demo Sensor
              </Button>
              <p className="text-[10px] text-muted-foreground mt-4 italic">Supported: KrishiSensor v2, SenseGrow Pro, Fasal Sense, Cropwise IoT, custom Arduino over MQTT</p>
            </div>
          ) : (
            <>
              {/* Top status bar */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-primary font-medium">3 nodes live</span>
                  <span className="text-muted-foreground text-xs">· MQTT topic <code>krishi/{active?.id?.slice(0,6) || "demo"}/{zone}</code> · refresh 2 s</span>
                </div>
                <div className="flex items-center gap-2">
                  {(["field-a","field-b","field-c"] as Zone[]).map((z) => (
                    <button
                      key={z}
                      onClick={() => setZone(z)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${zone === z ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                    >
                      {z.replace("-"," ").toUpperCase()}
                    </button>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setConnected(false)}>Disconnect</Button>
                </div>
              </div>

              <IoTLiveStream />

              {/* Personalised sensor grid with progress arcs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {sensors.map((s) => {
                  const span = s.scale[1] - s.scale[0];
                  const pct = Math.max(0, Math.min(100, ((s.val - s.scale[0]) / span) * 100));
                  const optStart = ((s.opt[0] - s.scale[0]) / span) * 100;
                  const optEnd = ((s.opt[1] - s.scale[0]) / span) * 100;
                  return (
                    <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <s.icon className={`h-4 w-4 ${s.color}`} />
                          <span className="text-xs font-medium text-foreground">{s.label}</span>
                        </div>
                        {s.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-display font-bold text-foreground tabular-nums">{typeof s.val === "number" ? s.val.toLocaleString("en-IN") : s.val}</span>
                        <span className="text-[10px] text-muted-foreground">{s.unit}</span>
                      </div>
                      {/* Range bar with optimum band */}
                      <div className="relative mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="absolute inset-y-0 bg-primary/15" style={{ left: `${optStart}%`, width: `${optEnd - optStart}%` }} />
                        <div className={`absolute inset-y-0 left-0 ${s.ok ? "bg-primary" : "bg-destructive"}`} style={{ width: `${pct}%`, opacity: 0.85 }} />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                        <span>{s.scale[0]}</span>
                        <span>opt {s.opt[0]}–{s.opt[1]}</span>
                        <span>{s.scale[1]}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* AI recommendation engine + water savings dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
                <div className="lg:col-span-2 glass-card p-4">
                  <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" /> AI Recommendations for {primary}
                    <span className="text-[10px] text-muted-foreground">· evaluated every 2 s</span>
                  </h3>
                  <div className="space-y-2">
                    {recommendations.map((r, i) => {
                      const tone = r.severity === "crit" ? "bg-destructive/10 border-destructive/30 text-destructive"
                                : r.severity === "warn" ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                                : "bg-primary/10 border-primary/30 text-primary";
                      return (
                        <div key={i} className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${tone}`}>
                          <r.icon className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold">{r.title}</div>
                            <div className="text-foreground/80 mt-0.5">{r.body}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                    <Gauge className="h-4 w-4 text-primary" /> Water Saved
                  </h3>
                  <div className="h-32 -mx-2">
                    <ResponsiveContainer>
                      <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "saved", value: Math.min(100, (waterSavedL / 50) * 100), fill: "hsl(var(--primary))" }]} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--muted))" }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center -mt-20 mb-2">
                    <div className="text-2xl font-display font-bold text-primary tabular-nums">{waterSavedL.toFixed(1)} L</div>
                    <div className="text-[10px] text-muted-foreground">since session start</div>
                  </div>
                  <div className="space-y-1 text-[11px] mt-12">
                    <Row label="Drip estimate" value={`${dailyDripL.toLocaleString("en-IN")} kL/day`} />
                    <Row label="Flood baseline" value={`${dailyFloodL.toLocaleString("en-IN")} kL/day`} />
                    <Row label="Annual savings" value={`₹${annualSavingsRupees.toLocaleString("en-IN")}`} highlight />
                  </div>
                </div>
              </div>

              {/* Sensor placement diagram */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 glass-card p-4">
                  <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-primary" /> Sensor Network Topology — {zone.toUpperCase().replace("-"," ")}
                  </h3>
                  <SensorTopology connected={connected} />
                  <p className="text-[10.5px] text-muted-foreground mt-2 italic">
                    Place soil probes at root depth (15 cm for veg, 30 cm for cereals).
                    Wireless hub LoRa-WAN reaches up to 5 km line-of-sight.
                  </p>
                </div>

                <div className="glass-card p-4">
                  <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-primary" /> Calibration
                  </h3>
                  <div className="space-y-3 text-xs">
                    <CalRow label="pH offset" min={-1} max={1} step={0.1} default={0} unit="" />
                    <CalRow label="Moisture offset" min={-10} max={10} step={1} default={0} unit="%" />
                    <CalRow label="Temp offset" min={-3} max={3} step={0.1} default={0} unit="°C" />
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => toast.success("Calibration saved to device")}>
                      Sync to KrishiSensor
                    </Button>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border text-[10.5px] text-muted-foreground space-y-1">
                    <p>📡 Battery: 87% · solar trickle 80 mA</p>
                    <p>🔗 Uplink: LoRa 868 MHz · RSSI −86 dBm</p>
                    <p>🌐 Cloud: MQTT QoS 1 · last sync 2 s ago</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function CalRow({ label, min, max, step, default: def, unit }: { label: string; min: number; max: number; step: number; default: number; unit: string }) {
  const [v, setV] = useState(def);
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">{v.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <Slider value={[v]} onValueChange={([x]) => setV(x)} min={min} max={max} step={step} />
    </div>
  );
}

// SVG topology of 3 sensors → hub → cloud
function SensorTopology({ connected }: { connected: boolean }) {
  const dotClass = "fill-primary";
  return (
    <svg viewBox="0 0 600 200" className="w-full h-44">
      <defs>
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary)/0.15)" />
          <stop offset="100%" stopColor="hsl(var(--primary)/0.05)" />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="560" height="160" rx="14" fill="url(#field)" stroke="hsl(var(--border))" />
      {/* sensors */}
      {[
        { x: 90, y: 70, label: "N" },
        { x: 220, y: 130, label: "Moist" },
        { x: 350, y: 60, label: "pH" },
        { x: 470, y: 120, label: "Temp" },
      ].map((s) => (
        <g key={s.label}>
          <line x1={s.x} y1={s.y} x2={300} y2={100} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 3" opacity={connected ? 0.5 : 0.2}>
            {connected && <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />}
          </line>
          <circle cx={s.x} cy={s.y} r="9" className={dotClass}>
            {connected && <animate attributeName="r" values="9;12;9" dur="2s" repeatCount="indefinite" />}
          </circle>
          <text x={s.x} y={s.y - 14} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">{s.label}</text>
        </g>
      ))}
      {/* hub */}
      <g>
        <circle cx={300} cy={100} r="18" fill="hsl(var(--primary))" />
        <text x={300} y={104} textAnchor="middle" fontSize="10" fill="hsl(var(--primary-foreground))" fontWeight="bold">HUB</text>
      </g>
      {/* cloud arrow */}
      <line x1={318} y1={100} x2={560} y2={40} stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="5 4" opacity={connected ? 0.7 : 0.3}>
        {connected && <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.4s" repeatCount="indefinite" />}
      </line>
      <text x={550} y={32} textAnchor="end" fontSize="11" fill="hsl(var(--foreground))" fontWeight="bold">☁ Lovable Cloud</text>
    </svg>
  );
}
