import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout, Droplets, Sun, Wheat, Truck, IndianRupee,
  Loader2, RefreshCw, AlertTriangle, TrendingUp, Sparkles,
  ChevronLeft, ChevronRight, Play, Pause, Share2, Calendar,
  ShieldCheck, Flame, Download,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { toast } from "sonner";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

// ─── DOMAIN ──────────────────────────────────────────────────────────────────
const CROPS = [
  { id: "rice",    name: "Rice",    emoji: "🌾", hindi: "धान" },
  { id: "wheat",   name: "Wheat",   emoji: "🌾", hindi: "गेहूं" },
  { id: "cotton",  name: "Cotton",  emoji: "🌸", hindi: "कपास" },
  { id: "sugarcane", name: "Sugarcane", emoji: "🎋", hindi: "गन्ना" },
  { id: "maize",   name: "Maize",   emoji: "🌽", hindi: "मक्का" },
  { id: "tomato",  name: "Tomato",  emoji: "🍅", hindi: "टमाटर" },
  { id: "onion",   name: "Onion",   emoji: "🧅", hindi: "प्याज" },
  { id: "potato",  name: "Potato",  emoji: "🥔", hindi: "आलू" },
  { id: "mustard", name: "Mustard", emoji: "🌼", hindi: "सरसों" },
  { id: "soybean", name: "Soybean", emoji: "🫘", hindi: "सोयाबीन" },
];

const STAGES = [
  { id: "seed",    title: "Seed Selection",   icon: Sprout,  hue: 140, weekLabel: "Week 0" },
  { id: "prep",    title: "Soil Preparation", icon: Droplets,hue: 30,  weekLabel: "Week 1-2" },
  { id: "sow",     title: "Sowing",           icon: Sprout,  hue: 100, weekLabel: "Week 2-3" },
  { id: "grow",    title: "Growth & Care",    icon: Sun,     hue: 50,  weekLabel: "Mid Season" },
  { id: "harvest", title: "Harvest",          icon: Wheat,   hue: 38,  weekLabel: "End Season" },
  { id: "market",  title: "Sell at Mandi",    icon: Truck,   hue: 200, weekLabel: "Post-Harvest" },
] as const;

type StageId = typeof STAGES[number]["id"];

interface StageData {
  summary: string;
  tip: string;
  cost: number;      // ₹ per acre
  risk: "low" | "medium" | "high";
  duration: string;
}
interface Journey {
  crop: string;
  state: string;
  acres: number;
  stages: Record<StageId, StageData>;
  expectedYield: string;
  expectedRevenue: number; // ₹ per acre
  netProfit: number;       // ₹ per acre
  riskScore: number;       // 0-100
  luckyDay: string;
  oneLineWisdom: string;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function safeLS<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function setLS(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

async function callAi(prompt: string): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await edgeToken()}`,
    },
    body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
  });
  if (!resp.ok) throw new Error("AI failed");
  const data = await resp.json();
  return (
    data.result || data.response || data.choices?.[0]?.message?.content ||
    (Array.isArray(data.content) ? data.content.find((c: any) => c.type === "text")?.text : "") || ""
  );
}

function extractJson(s: string): any | null {
  try {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch { return null; }
}

function fallbackJourney(crop: string, state: string, acres: number): Journey {
  const baseCost = 18000;
  const baseRev = 42000;
  return {
    crop, state, acres,
    stages: {
      seed:    { summary: `Pick certified high-yield ${crop} seeds suited for ${state || "your region"}.`, tip: "Buy from registered dealers; check germination rate >85%.", cost: 2500, risk: "low", duration: "3-5 days" },
      prep:    { summary: "Deep plough, level the field, add organic compost.", tip: "Test soil pH; ideal 6.0-7.5 for most crops.", cost: 3500, risk: "low", duration: "10-14 days" },
      sow:     { summary: "Sow at recommended spacing and depth.", tip: "Sow after first good rain or with assured irrigation.", cost: 2000, risk: "medium", duration: "5-7 days" },
      grow:    { summary: "Regular irrigation, pest scouting, fertiliser splits.", tip: "Use weekly pest traps; apply nitrogen in 2-3 splits.", cost: 7000, risk: "medium", duration: "60-120 days" },
      harvest: { summary: "Harvest at optimum moisture; dry properly.", tip: "Avoid harvesting wet — risk of fungus and price cut.", cost: 2000, risk: "low", duration: "5-10 days" },
      market:  { summary: "Sell directly at mandi or via FPO for better price.", tip: "Check eNAM rates; compare 3 mandis before selling.", cost: 1000, risk: "medium", duration: "1-2 weeks" },
    },
    expectedYield: `18-22 quintal / acre`,
    expectedRevenue: baseRev,
    netProfit: baseRev - baseCost,
    riskScore: 42,
    luckyDay: "Next Tuesday — auspicious for sowing as per traditional calendar.",
    oneLineWisdom: `${crop} grown with patience in ${state || "your soil"} pays back in gold.`,
  };
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function Hero({ onJump }: { onJump: () => void }) {
  return (
    <section className="relative overflow-hidden pt-24 pb-12 px-4">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-blue-500/10" />
        <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-amber-400/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/60 backdrop-blur border border-border/50 mb-6 text-xs font-medium"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          New • AI-Powered Crop Journey Planner
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tight mb-4"
        >
          <span className="bg-gradient-to-r from-emerald-600 via-amber-600 to-orange-600 bg-clip-text text-transparent">
            Beej se Bazaar
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
        >
          Plan your crop's complete journey — from a single seed to mandi profits.
          AI builds your personal 6-stage roadmap with costs, risks, and timing.
        </motion.p>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          onClick={onJump}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-600 to-amber-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
        >
          <Play className="w-4 h-4 fill-current" /> Plan My Journey
        </motion.button>
      </div>
    </section>
  );
}

// ─── STAGE CARD ──────────────────────────────────────────────────────────────
function StageCard({ stage, data, index, active }: { stage: typeof STAGES[number]; data: StageData; index: number; active: boolean }) {
  const Icon = stage.icon;
  const riskColor =
    data.risk === "low" ? "text-emerald-600 bg-emerald-500/10" :
    data.risk === "medium" ? "text-amber-600 bg-amber-500/10" :
    "text-rose-600 bg-rose-500/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`relative min-w-[280px] md:min-w-[320px] snap-start rounded-2xl border bg-card/80 backdrop-blur p-5 transition-all
        ${active ? "shadow-2xl ring-2 ring-offset-2 ring-offset-background" : "shadow-md"}`}
      style={active ? { borderColor: `hsl(${stage.hue}, 60%, 50%)`, ['--tw-ring-color' as any]: `hsl(${stage.hue}, 60%, 50%)` } : {}}
    >
      <div
        className="absolute -top-3 -left-3 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: `linear-gradient(135deg, hsl(${stage.hue}, 70%, 55%), hsl(${stage.hue + 20}, 65%, 45%))` }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="absolute top-3 right-3 text-xs font-mono text-muted-foreground">
        {String(index + 1).padStart(2, "0")} / 06
      </div>
      <div className="mt-6 mb-1 text-xs text-muted-foreground uppercase tracking-wider">{stage.weekLabel}</div>
      <h3 className="text-lg font-bold mb-2">{stage.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{data.summary}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="italic">{data.tip}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-1 text-sm font-semibold">
          <IndianRupee className="w-3.5 h-3.5" />
          {data.cost.toLocaleString("en-IN")}
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColor}`}>
          {data.risk} risk
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {data.duration}
        </div>
      </div>
    </motion.div>
  );
}

// ─── PROFIT PANEL ────────────────────────────────────────────────────────────
function ProfitPanel({ j }: { j: Journey }) {
  const totalCost = useMemo(
    () => Object.values(j.stages).reduce((s, x) => s + x.cost, 0),
    [j]
  );
  const totalCostAll = totalCost * j.acres;
  const totalRevAll = j.expectedRevenue * j.acres;
  const totalProfitAll = j.netProfit * j.acres;
  const margin = totalRevAll > 0 ? Math.round((totalProfitAll / totalRevAll) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.5 }}
      className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-emerald-500/10 via-card to-amber-500/10 border border-border/50 backdrop-blur shadow-xl"
    >
      <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider text-muted-foreground">
        <TrendingUp className="w-3.5 h-3.5" /> Profit Forecast • {j.acres} acre{j.acres > 1 ? "s" : ""}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold mb-6">The Numbers</h2>

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <Metric label="Investment" value={totalCostAll} tint="rose" />
        <Metric label="Revenue"    value={totalRevAll}  tint="amber" />
        <Metric label="Net Profit" value={totalProfitAll} tint="emerald" highlight />
      </div>

      <div className="rounded-xl bg-background/60 p-4 mb-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground">Profit Margin</span>
          <span className="font-bold text-emerald-600">{margin}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
            transition={{ duration: 1, ease: "easeOut" }} viewport={{ once: true }}
            className="h-full bg-gradient-to-r from-emerald-500 to-amber-500"
          />
        </div>
      </div>

      <div className="rounded-xl bg-background/60 p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Risk Score
          </span>
          <span className={`font-bold ${j.riskScore < 33 ? "text-emerald-600" : j.riskScore < 66 ? "text-amber-600" : "text-rose-600"}`}>
            {j.riskScore} / 100
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }} whileInView={{ width: `${j.riskScore}%` }}
            transition={{ duration: 1, ease: "easeOut" }} viewport={{ once: true }}
            className={`h-full ${j.riskScore < 33 ? "bg-emerald-500" : j.riskScore < 66 ? "bg-amber-500" : "bg-rose-500"}`}
          />
        </div>
      </div>

      <div className="mt-5 text-xs text-muted-foreground">
        Yield estimate: <span className="font-semibold text-foreground">{j.expectedYield}</span>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, tint, highlight }: { label: string; value: number; tint: "rose" | "emerald" | "amber"; highlight?: boolean }) {
  const tintClass = { rose: "text-rose-600", emerald: "text-emerald-600", amber: "text-amber-600" }[tint];
  return (
    <div className={`rounded-xl p-3 md:p-4 ${highlight ? "bg-background/80 ring-2 ring-emerald-500/30" : "bg-background/50"}`}>
      <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg md:text-2xl font-bold flex items-center ${tintClass}`}>
        <IndianRupee className="w-4 h-4 md:w-5 md:h-5" />
        <span className="tabular-nums">{value.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
function StageSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {STAGES.map((_, i) => (
        <div key={i} className="min-w-[280px] rounded-2xl border bg-card/50 p-5 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-muted mb-4" />
          <div className="h-3 w-20 bg-muted rounded mb-2" />
          <div className="h-5 w-32 bg-muted rounded mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-3/4 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function BeejSeBazaarPage() {
  const { active } = useActiveProfile();
  const stateName =
    (active?.farmer_details as any)?.state ||
    active?.farm_location ||
    "India";
  const initialCrop = (active?.farmer_details as any)?.current_crops?.split(",")[0]?.trim()?.toLowerCase() || "rice";
  const matched = CROPS.find(c => initialCrop.includes(c.id)) || CROPS[0];

  const [crop, setCrop] = useState(matched.id);
  const [acres, setAcres] = useState<number>(1);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const journeySectionRef = useRef<HTMLDivElement>(null);

  const cropDef = CROPS.find(c => c.id === crop)!;

  const cacheKey = `km.bsb.v1.${crop}.${stateName}.${acres}`;

  async function generateJourney(force = false) {
    setError(null);
    if (!force) {
      const cached = safeLS<Journey | null>(cacheKey, null);
      if (cached) { setJourney(cached); return; }
    }
    setLoading(true);
    try {
      const prompt = `You are an expert Indian agriculture advisor. Build a 6-stage crop journey for:
Crop: ${cropDef.name}
State: ${stateName}
Land: ${acres} acre(s)

Return ONLY a JSON object with this exact shape (no markdown, no commentary):
{
  "expectedYield": "string like '18-22 quintal/acre'",
  "expectedRevenue": number (₹ per acre, realistic Indian mandi 2026),
  "netProfit": number (₹ per acre, revenue minus all stage costs),
  "riskScore": number 0-100,
  "luckyDay": "1-line auspicious sowing/selling tip with day name",
  "oneLineWisdom": "short poetic farmer wisdom 1 line",
  "stages": {
    "seed":    { "summary": "2 sentences", "tip": "1 sharp tip", "cost": number(₹/acre), "risk": "low|medium|high", "duration": "string" },
    "prep":    { ... },
    "sow":     { ... },
    "grow":    { ... },
    "harvest": { ... },
    "market":  { ... }
  }
}
Use real ${cropDef.name} agronomy for ${stateName}. Costs must sum reasonably under revenue.`;
      const raw = await callAi(prompt);
      const parsed = extractJson(raw);
      if (!parsed || !parsed.stages) throw new Error("bad AI response");
      const built: Journey = {
        crop: cropDef.name, state: stateName, acres,
        stages: parsed.stages,
        expectedYield: parsed.expectedYield || "—",
        expectedRevenue: Number(parsed.expectedRevenue) || 40000,
        netProfit: Number(parsed.netProfit) || 20000,
        riskScore: Math.max(0, Math.min(100, Number(parsed.riskScore) || 40)),
        luckyDay: parsed.luckyDay || "Plan with the next new moon for best results.",
        oneLineWisdom: parsed.oneLineWisdom || `${cropDef.name} rewards the patient farmer.`,
      };
      setJourney(built);
      setLS(cacheKey, built);
    } catch (e) {
      const fb = fallbackJourney(cropDef.name, stateName, acres);
      setJourney(fb);
      setError("Showing offline estimate. Tap refresh for AI insights.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { generateJourney(false); /* eslint-disable-next-line */ }, [crop, acres, stateName]);

  // Autoplay carousel
  useEffect(() => {
    if (!autoplay || !journey) return;
    const id = setInterval(() => {
      setActiveStage(s => (s + 1) % STAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [autoplay, journey]);

  // Scroll active card into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-stage="${activeStage}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeStage]);

  function share() {
    if (!journey) return;
    const text = `🌱 My ${journey.crop} journey on ${journey.acres} acre(s) in ${journey.state}:
💰 Expected profit: ₹${(journey.netProfit * journey.acres).toLocaleString("en-IN")}
📊 Risk: ${journey.riskScore}/100
✨ ${journey.oneLineWisdom}
Planned with KrishiMate — Beej se Bazaar 🚜`;
    if (navigator.share) {
      navigator.share({ title: "My Crop Journey", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      toast.success("Journey copied to clipboard!");
    }
  }

  return (
    <AgriPageBackground variant="crops">
      <div className="min-h-screen flex flex-col relative">
        <Navbar />
        <main className="flex-1">
        <Hero onJump={() => journeySectionRef.current?.scrollIntoView({ behavior: "smooth" })} />

        {/* CONTROLS */}
        <section ref={journeySectionRef} className="px-4 pb-8">
          <div className="max-w-6xl mx-auto rounded-3xl bg-card/80 backdrop-blur border border-border/50 p-5 md:p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-5 items-start md:items-end">
              <div className="flex-1 w-full">
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Choose your crop
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                  {CROPS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCrop(c.id)}
                      className={`snap-start shrink-0 px-3 py-2 rounded-xl border text-sm font-medium transition-all flex items-center gap-1.5
                        ${crop === c.id
                          ? "bg-gradient-to-br from-emerald-500 to-amber-500 text-white border-transparent shadow-lg scale-105"
                          : "bg-background/60 border-border hover:border-emerald-400/50"}`}
                    >
                      <span className="text-lg leading-none">{c.emoji}</span>
                      <span>{c.name}</span>
                      <span className="text-xs opacity-70">{c.hindi}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-48">
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Land (acres)
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-1">
                  <button onClick={() => setAcres(a => Math.max(0.5, +(a - 0.5).toFixed(1)))}
                    className="w-8 h-8 rounded-lg hover:bg-muted">−</button>
                  <input
                    type="number" step="0.5" min="0.5" value={acres}
                    onChange={e => setAcres(Math.max(0.5, Number(e.target.value) || 0.5))}
                    className="flex-1 text-center bg-transparent outline-none font-bold"
                  />
                  <button onClick={() => setAcres(a => +(a + 0.5).toFixed(1))}
                    className="w-8 h-8 rounded-lg hover:bg-muted">+</button>
                </div>
              </div>
              <button
                onClick={() => generateJourney(true)}
                disabled={loading}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Regenerate
              </button>
            </div>
            {error && (
              <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}
          </div>
        </section>

        {/* JOURNEY TIMELINE */}
        <section className="px-4 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Your 6-Stage Journey</div>
                <h2 className="text-2xl md:text-3xl font-bold">{cropDef.emoji} {cropDef.name} • {stateName}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoplay(a => !a)}
                  className="w-10 h-10 rounded-full border border-border bg-background/60 backdrop-blur flex items-center justify-center hover:bg-muted"
                  aria-label={autoplay ? "Pause" : "Play"}
                >
                  {autoplay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setActiveStage(s => Math.max(0, s - 1))}
                  className="w-10 h-10 rounded-full border border-border bg-background/60 backdrop-blur flex items-center justify-center hover:bg-muted"
                ><ChevronLeft className="w-4 h-4" /></button>
                <button
                  onClick={() => setActiveStage(s => Math.min(STAGES.length - 1, s + 1))}
                  className="w-10 h-10 rounded-full border border-border bg-background/60 backdrop-blur flex items-center justify-center hover:bg-muted"
                ><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            {/* progress dots */}
            <div className="flex items-center gap-2 mb-5">
              {STAGES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStage(i)}
                  className={`h-1.5 rounded-full transition-all ${i === activeStage ? "w-10 bg-foreground" : "w-5 bg-muted hover:bg-muted-foreground/30"}`}
                  aria-label={`Go to ${s.title}`}
                />
              ))}
            </div>

            {loading && !journey ? (
              <StageSkeleton />
            ) : journey ? (
              <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-6 pt-4 px-1 -mx-1 scroll-smooth"
                style={{ scrollbarWidth: "thin" }}
              >
                {STAGES.map((s, i) => (
                  <div key={s.id} data-stage={i}>
                    <StageCard stage={s} data={journey.stages[s.id]} index={i} active={i === activeStage} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select a crop to begin your journey.
              </div>
            )}
          </div>
        </section>

        {/* PROFIT + WISDOM */}
        {journey && (
          <section className="px-4 pb-12">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
              <ProfitPanel j={journey} />

              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
                  className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/20 backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                    <Flame className="w-3.5 h-3.5" /> Lucky Day
                  </div>
                  <p className="text-lg leading-relaxed">{journey.luckyDay}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                  className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/20 backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
                    <Sparkles className="w-3.5 h-3.5" /> Wisdom from the Soil
                  </div>
                  <p className="text-lg italic leading-relaxed">"{journey.oneLineWisdom}"</p>
                </motion.div>

                <div className="flex gap-3">
                  <button
                    onClick={share}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background font-semibold hover:opacity-90"
                  >
                    <Share2 className="w-4 h-4" /> Share Plan
                  </button>
                  <button
                    onClick={() => generateJourney(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-background/60 backdrop-blur font-semibold hover:bg-muted"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        </main>
        <Footer />
      </div>
    </AgriPageBackground>
  );
}
