import { motion } from "framer-motion";
import { AlertTriangle, Cloud, Sun, Snowflake, Droplets } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";

type Tip = { icon: any; title: string; tip: string; tone: string };

// Northern / Central / Eastern India calendar (default)
const NORTH_TIPS: Record<number, Tip> = {
  0: { icon: Snowflake, title: "Rabi peak — irrigate wheat", tip: "Watch for late-season frost on potato and mustard. Light irrigation prevents lodging.", tone: "bg-krishi-sky-light text-krishi-sky" },
  1: { icon: Sun, title: "Rabi maturing — disease watch", tip: "Yellow rust in wheat is common now. Spray Propiconazole 25% EC @ 1ml/L if spotted.", tone: "bg-krishi-gold-light text-krishi-gold" },
  2: { icon: Sun, title: "Harvest season + Zaid prep", tip: "Harvest rabi early in the day. Prepare beds for Zaid moong, watermelon, vegetables.", tone: "bg-krishi-gold-light text-krishi-gold" },
  3: { icon: Sun, title: "Zaid sowing window", tip: "Cucurbits, summer pulses and fodder maize do well. Mulch heavily to retain moisture.", tone: "bg-primary/10 text-primary" },
  4: { icon: Sun, title: "Pre-monsoon prep", tip: "Repair bunds, deepen ponds, get seed in hand. Heat stress on cattle — provide shade & water.", tone: "bg-destructive/10 text-destructive" },
  5: { icon: Cloud, title: "Monsoon onset — kharif sowing!", tip: "Don't sow paddy nursery before 50mm cumulative rain. Apply FYM 10 t/acre.", tone: "bg-krishi-sky-light text-krishi-sky" },
  6: { icon: Droplets, title: "Active monsoon — kharif transplanting", tip: "Transplant paddy at 21-25 days. Watch for stem borer & blast disease.", tone: "bg-krishi-sky-light text-krishi-sky" },
  7: { icon: Droplets, title: "Mid-monsoon — pest pressure", tip: "Brown plant hopper in rice; pod borer in pulses. Use yellow sticky traps + neem oil.", tone: "bg-krishi-gold-light text-krishi-gold" },
  8: { icon: Cloud, title: "Late monsoon — top dress", tip: "Apply 2nd dose of urea in paddy. Drain excess water for grain filling.", tone: "bg-krishi-sky-light text-krishi-sky" },
  9: { icon: Sun, title: "Kharif harvest + Rabi prep", tip: "Harvest paddy at 80% golden. Plough under stubble — don't burn it!", tone: "bg-krishi-gold-light text-krishi-gold" },
  10: { icon: Snowflake, title: "Rabi sowing peak", tip: "Wheat: HD-3086 / DBW-187. Mustard: Pusa Bold. Sow with 5cm row spacing.", tone: "bg-krishi-sky-light text-krishi-sky" },
  11: { icon: Snowflake, title: "Cold wave watch", tip: "Light irrigation protects wheat and gram from frost. Cover veg nurseries with polythene.", tone: "bg-krishi-sky-light text-krishi-sky" },
};

// Southern / Peninsular India — SW monsoon arrives ~3-4 weeks earlier (late May/early June),
// NE monsoon dominant Oct-Dec, no harsh winter, two paddy crops common.
const SOUTH_TIPS: Record<number, Tip> = {
  0: { icon: Sun, title: "Samba paddy maturing", tip: "Harvest samba/thaladi paddy by mid-month. Begin land prep for summer (kuruvai) crop.", tone: "bg-krishi-gold-light text-krishi-gold" },
  1: { icon: Sun, title: "Summer crop sowing", tip: "Sow groundnut, sesame, summer pulses. Mulch coconut & banana basins against heat.", tone: "bg-primary/10 text-primary" },
  2: { icon: Sun, title: "Heat stress begins", tip: "Irrigate coconut/arecanut every 4-5 days. Whitewash mango trunks to prevent sunscald.", tone: "bg-destructive/10 text-destructive" },
  3: { icon: Sun, title: "Pre-monsoon showers", tip: "Mango harvest peak. Prep nurseries for kharif paddy — SW monsoon ~3 weeks away.", tone: "bg-krishi-gold-light text-krishi-gold" },
  4: { icon: Cloud, title: "SW monsoon onset — Kerala", tip: "Kerala/coastal Karnataka monsoon hits ~1st June. Sow kharif paddy nursery & ginger now.", tone: "bg-krishi-sky-light text-krishi-sky" },
  5: { icon: Droplets, title: "Active SW monsoon", tip: "Transplant kharif paddy. Plant tapioca, turmeric, banana suckers. Watch for leaf rot.", tone: "bg-krishi-sky-light text-krishi-sky" },
  6: { icon: Droplets, title: "Peak rains — pest pressure", tip: "BPH and blast in paddy; bud-rot in coconut. Apply Trichoderma + drain stagnant water.", tone: "bg-krishi-gold-light text-krishi-gold" },
  7: { icon: Cloud, title: "Monsoon break — top dress", tip: "2nd urea split in paddy. Stake tomato & chilli. Pollinate cardamom plantations.", tone: "bg-krishi-sky-light text-krishi-sky" },
  8: { icon: Cloud, title: "SW monsoon withdraws", tip: "Drain fields for grain filling. Prep beds for rabi vegetables & pulses.", tone: "bg-krishi-sky-light text-krishi-sky" },
  9: { icon: Droplets, title: "NE monsoon onset — TN/AP", tip: "Tamil Nadu's main rainy season starts. Sow samba paddy, ragi, horsegram, cotton.", tone: "bg-krishi-sky-light text-krishi-sky" },
  10: { icon: Droplets, title: "NE monsoon active", tip: "Cyclone watch on east coast. Stake banana, harvest groundnut before heavy rain.", tone: "bg-krishi-sky-light text-krishi-sky" },
  11: { icon: Cloud, title: "Late NE monsoon + rabi", tip: "Sow pulses (blackgram, greengram) on residual moisture. Spray for thrips in chilli.", tone: "bg-krishi-gold-light text-krishi-gold" },
};

const SOUTH_STATES = new Set([
  "Kerala", "Karnataka", "Tamil Nadu", "Andhra Pradesh", "Telangana",
  "Puducherry", "Goa", "Lakshadweep", "Andaman and Nicobar Islands",
]);

export default function SeasonalAlertBanner() {
  const { ctx } = usePersonalization();
  const month = new Date().getMonth();
  const state = ctx?.location.state || "your region";
  const zone = SOUTH_STATES.has(state) ? "South India" : "North/Central India";
  const tips = zone === "South India" ? SOUTH_TIPS : NORTH_TIPS;
  const tip = tips[month];
  const Icon = tip.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 border-l-4 border-primary"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${tip.tone} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-krishi-gold" />
            <span className="text-sm font-display font-semibold text-foreground">
              Seasonal Alert · {state}
            </span>
            <span className="krishi-badge bg-primary/10 text-primary text-[10px]">
              {zone}
            </span>
            <span className="krishi-badge bg-muted text-muted-foreground text-[10px]">
              {ctx?.climate.monsoon_stage || "Current month"}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{tip.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{tip.tip}</p>
        </div>
      </div>
    </motion.div>
  );
}
