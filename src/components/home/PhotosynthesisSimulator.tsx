import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sun, Droplet, Wind, Thermometer, Sprout } from "lucide-react";
import { Slider } from "@/components/ui/slider";

// Simplified photosynthesis: each factor contributes if in optimal range
function gauss(x: number, peak: number, width: number) {
  return Math.exp(-Math.pow((x - peak) / width, 2));
}

export default function PhotosynthesisSimulator() {
  const [light, setLight] = useState(70); // % of full sun
  const [water, setWater] = useState(60); // % soil moisture
  const [co2, setCo2] = useState(420); // ppm
  const [temp, setTemp] = useState(26); // °C

  const rate = useMemo(() => {
    const fLight = gauss(light, 80, 40);          // peaks at 80%
    const fWater = gauss(water, 65, 30);          // peaks at 65% moisture
    const fCo2 = Math.min(1, (co2 - 200) / 600);  // saturates ~800ppm
    const fTemp = gauss(temp, 26, 8);             // C3 plants peak ~26°C
    return Math.max(0, Math.min(1, fLight * fWater * Math.max(0, fCo2) * fTemp));
  }, [light, water, co2, temp]);

  const ratePct = Math.round(rate * 100);
  // Plant size grows with rate
  const plantHeight = 30 + rate * 130;
  const leafScale = 0.4 + rate * 0.7;
  const grade =
    ratePct >= 80 ? { label: "🌟 Optimal photosynthesis", color: "text-primary", bg: "bg-primary/10" }
    : ratePct >= 50 ? { label: "🌿 Healthy growth", color: "text-krishi-sky", bg: "bg-krishi-sky/10" }
    : ratePct >= 25 ? { label: "⚠️ Stressed plant", color: "text-krishi-gold", bg: "bg-krishi-gold-light" }
    : { label: "🥀 Wilting — adjust factors", color: "text-destructive", bg: "bg-destructive/10" };

  const o2 = Math.round(rate * 1200); // mg O₂/m²/hr (illustrative)
  const glucose = (rate * 1.6).toFixed(2); // g/m²/hr

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="krishi-badge bg-krishi-sky/10 text-krishi-sky mb-3">
            <Sprout className="h-3 w-3" /> Photosynthesis Simulator
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            See the science of <span className="text-primary">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Adjust sunlight, water, CO₂ and temperature. Watch a virtual C3 plant grow or wilt — and the live oxygen + glucose production update in real time.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Plant */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-6 flex flex-col items-center justify-end relative overflow-hidden min-h-[320px]"
            style={{
              background: `linear-gradient(to bottom,
                hsl(200 ${50 + light * 0.4}% ${60 + light * 0.2}%) 0%,
                hsl(${30 + light * 0.5} 70% ${70 + light * 0.15}%) 70%,
                hsl(30 40% 30%) 100%)`,
            }}
          >
            {/* Sun */}
            <motion.div
              animate={{ scale: 1 + light / 200, opacity: 0.4 + light / 200 }}
              className="absolute top-4 right-4 w-16 h-16 rounded-full bg-yellow-300 blur-xl"
            />
            <motion.div animate={{ scale: 1 + light / 250 }} className="absolute top-6 right-6">
              <Sun className="h-8 w-8 text-yellow-100" />
            </motion.div>

            {/* CO2 particles */}
            {[...Array(Math.round(co2 / 100))].slice(0, 6).map((_, i) => (
              <motion.span
                key={i}
                initial={{ x: -20, y: 0, opacity: 0 }}
                animate={{ x: [0, 60, 120], y: [0, -10, -20], opacity: [0, 0.6, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                className="absolute text-[10px] font-mono text-white/70"
                style={{ top: `${20 + i * 10}%`, left: `${10 + i * 5}%` }}
              >
                CO₂
              </motion.span>
            ))}

            {/* O2 emanating */}
            {rate > 0.3 && [...Array(4)].map((_, i) => (
              <motion.span
                key={`o-${i}`}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -100, opacity: [0, 0.8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
                className="absolute bottom-32 text-[10px] font-mono text-white font-bold"
                style={{ left: `${40 + i * 5}%` }}
              >
                O₂
              </motion.span>
            ))}

            {/* Plant SVG */}
            <svg width="120" height={plantHeight} viewBox={`0 0 120 ${plantHeight}`} className="z-10 transition-all duration-500">
              {/* Stem */}
              <motion.line
                x1="60" y1={plantHeight} x2="60" y2={plantHeight - plantHeight * 0.85}
                stroke="hsl(120 50% 30%)" strokeWidth="4" strokeLinecap="round"
                animate={{ rotate: rate < 0.3 ? 8 : 0 }}
                style={{ transformOrigin: `60px ${plantHeight}px` }}
              />
              {/* Leaves */}
              {[0.3, 0.55, 0.8].map((h, i) => (
                <motion.g key={i} animate={{ rotate: rate < 0.3 ? -20 : 0 }} style={{ transformOrigin: `60px ${plantHeight - plantHeight * h}px` }}>
                  <ellipse
                    cx={60 - 15 * leafScale} cy={plantHeight - plantHeight * h}
                    rx={20 * leafScale} ry={8 * leafScale}
                    fill={`hsl(${100 + rate * 30} ${40 + rate * 40}% ${rate < 0.3 ? 35 : 45}%)`}
                    transform={`rotate(-25 ${60 - 15 * leafScale} ${plantHeight - plantHeight * h})`}
                  />
                  <ellipse
                    cx={60 + 15 * leafScale} cy={plantHeight - plantHeight * h}
                    rx={20 * leafScale} ry={8 * leafScale}
                    fill={`hsl(${100 + rate * 30} ${40 + rate * 40}% ${rate < 0.3 ? 35 : 45}%)`}
                    transform={`rotate(25 ${60 + 15 * leafScale} ${plantHeight - plantHeight * h})`}
                  />
                </motion.g>
              ))}
              {/* Soil */}
              <ellipse cx="60" cy={plantHeight} rx="50" ry="6" fill="hsl(30 40% 20%)" />
            </svg>

            <div className={`absolute top-4 left-4 px-2.5 py-1 rounded-full text-[11px] font-semibold ${grade.bg} ${grade.color} backdrop-blur`}>
              {grade.label}
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 space-y-5"
          >
            <h3 className="font-display font-semibold text-foreground">Environmental Factors</h3>
            {[
              { label: "Sunlight", value: light, set: setLight, min: 0, max: 100, unit: "%", icon: Sun },
              { label: "Soil moisture", value: water, set: setWater, min: 0, max: 100, unit: "%", icon: Droplet },
              { label: "CO₂", value: co2, set: setCo2, min: 200, max: 1000, unit: "ppm", icon: Wind },
              { label: "Temperature", value: temp, set: setTemp, min: 0, max: 45, unit: "°C", icon: Thermometer },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="font-medium text-foreground flex items-center gap-1.5"><s.icon className="h-3.5 w-3.5" /> {s.label}</span>
                  <span className="font-mono font-bold text-primary">{s.value}<span className="text-xs text-muted-foreground font-normal">{s.unit}</span></span>
                </div>
                <Slider value={[s.value]} min={s.min} max={s.max} step={1} onValueChange={(v) => s.set(v[0])} />
              </div>
            ))}
          </motion.div>

          {/* Output */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="font-display font-semibold text-foreground">Live Output</h3>
            <div>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="text-muted-foreground">Photosynthesis rate</span>
                <span className="font-mono font-bold text-2xl text-primary">{ratePct}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-krishi-gold via-krishi-sky to-primary"
                  animate={{ width: `${ratePct}%` }}
                  transition={{ type: "spring", stiffness: 200 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">O₂ produced</p>
                <p className="font-mono font-bold text-primary text-lg">{o2}</p>
                <p className="text-[9px] text-muted-foreground">mg/m²/hr</p>
              </div>
              <div className="p-3 rounded-lg bg-krishi-gold-light border border-krishi-gold/30 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Glucose</p>
                <p className="font-mono font-bold text-krishi-gold text-lg">{glucose}</p>
                <p className="text-[9px] text-muted-foreground">g/m²/hr</p>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground pt-2 border-t border-border italic leading-relaxed">
              Model uses Gaussian response curves for light, water, temperature and Michaelis–Menten saturation for CO₂ — typical of C3 crops like rice and wheat.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
