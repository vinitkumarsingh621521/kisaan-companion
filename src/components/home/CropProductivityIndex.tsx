import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, MapPin, Wheat } from "lucide-react";

// Simplified state-level crop productivity (tonnes/hectare, illustrative averages)
const STATES = [
  { name: "Punjab", code: "PB", crops: { Wheat: 5.2, Rice: 4.0, Cotton: 0.7 }, gva: 31, color: "from-primary to-krishi-sky" },
  { name: "Haryana", code: "HR", crops: { Wheat: 4.6, Rice: 3.4, Bajra: 2.1 }, gva: 28, color: "from-primary to-krishi-gold" },
  { name: "Uttar Pradesh", code: "UP", crops: { Wheat: 3.5, Rice: 2.6, Sugarcane: 78 }, gva: 22, color: "from-krishi-sky to-primary" },
  { name: "West Bengal", code: "WB", crops: { Rice: 2.9, Jute: 2.7, Potato: 28 }, gva: 19, color: "from-krishi-sky to-krishi-gold" },
  { name: "Andhra Pradesh", code: "AP", crops: { Rice: 3.4, Cotton: 0.6, Chilli: 3.2 }, gva: 30, color: "from-krishi-gold to-primary" },
  { name: "Maharashtra", code: "MH", crops: { Cotton: 0.4, Sugarcane: 82, Soybean: 1.1 }, gva: 12, color: "from-krishi-gold to-destructive" },
  { name: "Karnataka", code: "KA", crops: { Ragi: 1.7, Coffee: 0.9, Sugarcane: 86 }, gva: 14, color: "from-primary to-krishi-gold" },
  { name: "Tamil Nadu", code: "TN", crops: { Rice: 3.6, Sugarcane: 105, Banana: 65 }, gva: 13, color: "from-krishi-gold to-krishi-sky" },
  { name: "Madhya Pradesh", code: "MP", crops: { Soybean: 1.0, Wheat: 3.1, Gram: 1.2 }, gva: 38, color: "from-primary to-krishi-sky" },
  { name: "Gujarat", code: "GJ", crops: { Cotton: 0.6, Groundnut: 1.9, Castor: 1.8 }, gva: 17, color: "from-krishi-gold to-primary" },
  { name: "Rajasthan", code: "RJ", crops: { Bajra: 1.0, Mustard: 1.4, Wheat: 3.4 }, gva: 27, color: "from-krishi-gold to-destructive" },
  { name: "Bihar", code: "BR", crops: { Rice: 2.5, Wheat: 2.9, Maize: 4.1 }, gva: 21, color: "from-krishi-sky to-primary" },
];

export default function CropProductivityIndex() {
  const [selected, setSelected] = useState(STATES[0]);

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="krishi-badge bg-krishi-gold-light text-krishi-gold mb-3">
            <TrendingUp className="h-3 w-3" /> India Crop Productivity Index
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            12 states. <span className="text-primary">36+ crops.</span> Hover to compare.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Click any state card to see its top crops with yield in tonnes per hectare and agriculture's share of state GVA.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Grid of state cards */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {STATES.map((s, i) => {
              const isActive = s.code === selected.code;
              return (
                <motion.button
                  key={s.code}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  onClick={() => setSelected(s)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left overflow-hidden ${
                    isActive ? "border-primary shadow-lg" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`absolute inset-0 opacity-${isActive ? "20" : "10"} bg-gradient-to-br ${s.color}`} />
                  <div className="relative">
                    <div className="text-[10px] font-mono text-muted-foreground">{s.code}</div>
                    <div className="font-display font-semibold text-foreground text-sm leading-tight">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{s.gva}% agri GVA</div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Detail panel */}
          <motion.div
            key={selected.code}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 relative overflow-hidden"
          >
            <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10 bg-gradient-to-br ${selected.color} blur-2xl`} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground">{selected.code}</span>
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-1">{selected.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Agriculture contributes <span className="font-bold text-primary">{selected.gva}%</span> of state GVA
              </p>

              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Wheat className="h-3 w-3" /> Top Crops · Yield (t/ha)
              </h4>
              <div className="space-y-3">
                {Object.entries(selected.crops).map(([crop, yld], i) => {
                  const max = Math.max(...Object.values(selected.crops));
                  const pct = (yld / max) * 100;
                  return (
                    <div key={crop}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{crop}</span>
                        <span className="font-mono font-bold text-primary">{yld} <span className="text-muted-foreground font-normal text-[10px]">t/ha</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                          className={`h-full bg-gradient-to-r ${selected.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-muted-foreground italic mt-4 pt-3 border-t border-border">
                Data: indicative state-wise averages aligned with Ministry of Agriculture & Farmers' Welfare reports.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
