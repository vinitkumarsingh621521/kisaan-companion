import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Beaker, Droplets, FlaskConical, Wheat } from "lucide-react";
import { Slider } from "@/components/ui/slider";

// Optimal NPK + pH ranges per crop (kg/ha N, P, K and pH)
const CROPS = [
  { name: "Rice 🌾", n: [100, 150], p: [40, 60], k: [40, 60], ph: [5.5, 7.0] },
  { name: "Wheat 🌾", n: [120, 150], p: [50, 70], k: [40, 60], ph: [6.0, 7.5] },
  { name: "Maize 🌽", n: [120, 180], p: [60, 80], k: [40, 60], ph: [5.8, 7.2] },
  { name: "Cotton 🌿", n: [80, 120], p: [40, 60], k: [40, 60], ph: [6.0, 7.5] },
  { name: "Sugarcane 🎋", n: [200, 280], p: [60, 80], k: [60, 80], ph: [6.0, 7.5] },
  { name: "Tomato 🍅", n: [100, 150], p: [50, 80], k: [80, 120], ph: [6.0, 6.8] },
  { name: "Potato 🥔", n: [120, 180], p: [60, 100], k: [100, 150], ph: [5.0, 6.5] },
  { name: "Soybean 🫘", n: [20, 40], p: [60, 80], k: [40, 60], ph: [6.0, 7.0] },
];

function score(value: number, [lo, hi]: number[]) {
  if (value >= lo && value <= hi) return 100;
  const mid = (lo + hi) / 2;
  const range = (hi - lo) / 2 || 1;
  const dev = Math.abs(value - mid);
  return Math.max(0, Math.round(100 - ((dev - range) / range) * 60));
}

export default function SoilScienceLab() {
  const [n, setN] = useState(120);
  const [p, setP] = useState(50);
  const [k, setK] = useState(50);
  const [ph, setPh] = useState(6.5);

  const ranked = useMemo(() => {
    return CROPS.map((c) => {
      const sN = score(n, c.n);
      const sP = score(p, c.p);
      const sK = score(k, c.k);
      const sPh = score(ph, c.ph);
      const total = Math.round((sN + sP + sK + sPh) / 4);
      return { ...c, sN, sP, sK, sPh, total };
    }).sort((a, b) => b.total - a.total);
  }, [n, p, k, ph]);

  const phLabel = ph < 6 ? "Acidic" : ph < 7.5 ? "Neutral" : "Alkaline";
  const phColor = ph < 6 ? "text-krishi-gold" : ph < 7.5 ? "text-primary" : "text-krishi-sky";

  return (
    <section className="py-20 bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="krishi-badge bg-primary/10 text-primary mb-3">
            <FlaskConical className="h-3 w-3" /> Live Soil Science Lab
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Tune your soil. Watch crops <span className="text-primary">re-rank in real time.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Drag the NPK and pH sliders. Our scientific suitability engine recalculates 8 major Indian crops instantly using ICAR-aligned optimum ranges.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Sliders */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 space-y-5"
          >
            <h3 className="font-display font-semibold flex items-center gap-2 text-foreground">
              <Beaker className="h-5 w-5 text-primary" /> Soil Composition
            </h3>

            {[
              { label: "Nitrogen (N)", value: n, set: setN, min: 0, max: 300, unit: "kg/ha", color: "bg-primary" },
              { label: "Phosphorus (P)", value: p, set: setP, min: 0, max: 150, unit: "kg/ha", color: "bg-krishi-sky" },
              { label: "Potassium (K)", value: k, set: setK, min: 0, max: 200, unit: "kg/ha", color: "bg-krishi-gold" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="font-medium text-foreground">{s.label}</span>
                  <span className="font-mono text-primary font-bold">{s.value} <span className="text-muted-foreground text-xs font-normal">{s.unit}</span></span>
                </div>
                <Slider value={[s.value]} min={s.min} max={s.max} step={1} onValueChange={(v) => s.set(v[0])} />
              </div>
            ))}

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium text-foreground flex items-center gap-1.5"><Droplets className="h-4 w-4" /> Soil pH</span>
                <span className="font-mono font-bold">
                  {ph.toFixed(1)} <span className={`text-xs font-semibold ${phColor}`}>· {phLabel}</span>
                </span>
              </div>
              <Slider value={[ph * 10]} min={30} max={95} step={1} onValueChange={(v) => setPh(v[0] / 10)} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>3.0 acidic</span><span>7.0 neutral</span><span>9.5 alkaline</span>
              </div>
            </div>
          </motion.div>

          {/* Crop ranking */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6"
          >
            <h3 className="font-display font-semibold flex items-center gap-2 text-foreground mb-4">
              <Wheat className="h-5 w-5 text-krishi-gold" /> Live Crop Suitability
            </h3>
            <div className="space-y-2.5">
              {ranked.map((c, i) => {
                const grade = c.total >= 90 ? "Excellent" : c.total >= 75 ? "Good" : c.total >= 50 ? "Fair" : "Poor";
                const gradeColor =
                  c.total >= 90 ? "text-primary" : c.total >= 75 ? "text-krishi-sky" : c.total >= 50 ? "text-krishi-gold" : "text-destructive";
                return (
                  <motion.div
                    key={c.name}
                    layout
                    transition={{ type: "spring", stiffness: 280, damping: 30 }}
                    className="relative"
                  >
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-semibold text-foreground">{i + 1}. {c.name}</span>
                      <span className={`font-bold ${gradeColor}`}>{c.total}% · {grade}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-krishi-sky to-krishi-gold"
                        initial={false}
                        animate={{ width: `${c.total}%` }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground italic mt-4 text-center">
              Suitability scored against ICAR-aligned optimum NPK/pH ranges per crop.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
