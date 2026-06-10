import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Sun,
  CloudRain,
  Snowflake,
  Wind,
  Leaf,
  Wheat,
  Flower2,
  Loader2,
  RefreshCw,
  Compass,
  X,
  Send,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { useActiveProfile } from "@/hooks/useActiveProfile";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

// ─────────────────────────────────────────────────────────────────────────────
// MONTH MODEL
// ─────────────────────────────────────────────────────────────────────────────
type Season = "kharif" | "rabi" | "zaid" | "transition";

interface MonthDef {
  idx: number;            // 0..11 (Jan..Dec)
  short: string;          // "Jan"
  full: string;           // "January"
  hindi: string;          // "जनवरी"
  season: Season;
  emoji: string;
  primaryCrops: string;   // hint
  weatherIcon: "sun" | "rain" | "snow" | "wind";
  tempC: [number, number]; // avg low/high (north India typical)
  rainMm: number;
}

const MONTHS: MonthDef[] = [
  { idx: 0,  short: "Jan", full: "January",   hindi: "जनवरी",  season: "rabi",       emoji: "❄️", primaryCrops: "Wheat, Mustard",   weatherIcon: "snow", tempC: [7, 20],  rainMm: 20 },
  { idx: 1,  short: "Feb", full: "February",  hindi: "फरवरी",  season: "rabi",       emoji: "🌾", primaryCrops: "Wheat, Gram",      weatherIcon: "wind", tempC: [10, 24], rainMm: 22 },
  { idx: 2,  short: "Mar", full: "March",     hindi: "मार्च",   season: "rabi",       emoji: "🌼", primaryCrops: "Harvest Wheat",   weatherIcon: "sun",  tempC: [15, 30], rainMm: 15 },
  { idx: 3,  short: "Apr", full: "April",     hindi: "अप्रैल",  season: "zaid",       emoji: "🌻", primaryCrops: "Moong, Watermelon",weatherIcon: "sun",  tempC: [22, 38], rainMm: 12 },
  { idx: 4,  short: "May", full: "May",       hindi: "मई",     season: "zaid",       emoji: "☀️", primaryCrops: "Fodder, Vegetables",weatherIcon: "sun",  tempC: [26, 42], rainMm: 18 },
  { idx: 5,  short: "Jun", full: "June",      hindi: "जून",    season: "transition", emoji: "🌧️", primaryCrops: "Prep Kharif",     weatherIcon: "rain", tempC: [27, 39], rainMm: 90 },
  { idx: 6,  short: "Jul", full: "July",      hindi: "जुलाई",   season: "kharif",     emoji: "🌱", primaryCrops: "Rice, Cotton",    weatherIcon: "rain", tempC: [26, 33], rainMm: 220 },
  { idx: 7,  short: "Aug", full: "August",    hindi: "अगस्त",  season: "kharif",     emoji: "☔", primaryCrops: "Maize, Soybean",  weatherIcon: "rain", tempC: [25, 32], rainMm: 240 },
  { idx: 8,  short: "Sep", full: "September", hindi: "सितंबर",  season: "kharif",     emoji: "🌾", primaryCrops: "Bajra, Jowar",    weatherIcon: "rain", tempC: [24, 33], rainMm: 150 },
  { idx: 9,  short: "Oct", full: "October",   hindi: "अक्टूबर", season: "transition", emoji: "🍂", primaryCrops: "Harvest Kharif",  weatherIcon: "sun",  tempC: [20, 32], rainMm: 40 },
  { idx: 10, short: "Nov", full: "November",  hindi: "नवंबर",  season: "rabi",       emoji: "🌿", primaryCrops: "Sow Wheat, Peas", weatherIcon: "wind", tempC: [13, 28], rainMm: 10 },
  { idx: 11, short: "Dec", full: "December",  hindi: "दिसंबर", season: "rabi",       emoji: "🌬️", primaryCrops: "Mustard, Barley", weatherIcon: "snow", tempC: [8, 22],  rainMm: 12 },
];

const SEASON_COLOR: Record<Season, { fill: string; stroke: string; label: string }> = {
  kharif:     { fill: "hsla(142, 60%, 45%, 0.22)", stroke: "hsl(142, 55%, 35%)", label: "Kharif" },
  rabi:       { fill: "hsla(38, 90%, 60%, 0.22)",  stroke: "hsl(38, 85%, 45%)",  label: "Rabi"   },
  zaid:       { fill: "hsla(0, 75%, 60%, 0.18)",   stroke: "hsl(15, 70%, 50%)",  label: "Zaid"   },
  transition: { fill: "hsla(200, 70%, 55%, 0.18)", stroke: "hsl(200, 65%, 45%)", label: "Transition" },
};

const WEATHER_ICONS = { sun: Sun, rain: CloudRain, snow: Snowflake, wind: Wind };

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, rInner: number, rOuter: number, startDeg: number, endDeg: number) {
  const p1 = polarToCart(cx, cy, rOuter, startDeg);
  const p2 = polarToCart(cx, cy, rOuter, endDeg);
  const p3 = polarToCart(cx, cy, rInner, endDeg);
  const p4 = polarToCart(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

function safeLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}
function setLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

async function callAi(prompt: string): Promise<string> {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
  });
  if (!resp.ok) throw new Error("AI failed");
  const data = await resp.json();
  return (
    data.result ||
    data.response ||
    data.choices?.[0]?.message?.content ||
    (Array.isArray(data.content) ? data.content.find((c: any) => c.type === "text")?.text : "") ||
    ""
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC FALLBACK WISDOM
// ─────────────────────────────────────────────────────────────────────────────
function fallbackWisdom(m: MonthDef, state: string, crop: string) {
  return {
    sow: `${m.full}: focus on ${m.primaryCrops.toLowerCase()} suited for ${state || "your region"}.`,
    avoid: `Avoid heavy irrigation during ${m.weatherIcon === "rain" ? "monsoon spells" : "peak heat hours"}; check soil moisture first.`,
    market: `Mandi prices for ${crop || "staples"} typically ${m.season === "kharif" ? "soften post-harvest" : "firm up pre-sowing"} — plan storage accordingly.`,
    festival: `Watch local mandi calendars in ${m.full}; align selling with festive demand and government MSP announcements.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN MANDALA SVG
// ─────────────────────────────────────────────────────────────────────────────
interface MandalaProps {
  selected: number;
  onSelect: (idx: number) => void;
  hovered: number | null;
  onHover: (idx: number | null) => void;
  rotation: number;
}

function Mandala({ selected, onSelect, hovered, onHover, rotation }: MandalaProps) {
  const SIZE = 560;
  const C = SIZE / 2;
  const R_OUTER = 250;
  const R_SEASON = 215;
  const R_LABEL = 178;
  const R_TICK = 145;
  const R_INNER = 110;
  const STEP = 360 / 12;

  const now = new Date();
  const todayAngle = ((now.getMonth() + now.getDate() / 30) * STEP);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-auto max-w-[560px] mx-auto select-none"
      role="img"
      aria-label="Krishi Mandala - 12 month farming wheel"
    >
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="hsl(38, 90%, 65%)" stopOpacity="0.9" />
          <stop offset="60%"  stopColor="hsl(38, 85%, 55%)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(142, 55%, 35%)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ringBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(80, 30%, 99%)" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(80, 20%, 94%)" stopOpacity="1" />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="2" result="off" />
          <feComponentTransfer><feFuncA type="linear" slope="0.25" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background disc */}
      <circle cx={C} cy={C} r={R_OUTER + 15} fill="url(#ringBg)" stroke="hsl(142, 30%, 80%)" strokeWidth="1" />

      {/* Decorative dotted outer ring */}
      <circle cx={C} cy={C} r={R_OUTER + 8} fill="none" stroke="hsl(142, 40%, 55%)" strokeWidth="1" strokeDasharray="2 6" opacity="0.5" />

      {/* Season arcs */}
      <g filter="url(#softShadow)">
        {MONTHS.map((m, i) => {
          const start = i * STEP;
          const end = (i + 1) * STEP;
          const c = SEASON_COLOR[m.season];
          const isSel = selected === i;
          const isHov = hovered === i;
          return (
            <path
              key={`arc-${i}`}
              d={arcPath(C, C, R_LABEL + 5, R_SEASON, start, end)}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={isSel ? 2.5 : 1}
              opacity={isSel || isHov ? 1 : 0.85}
              style={{ transition: "all 0.25s ease", cursor: "pointer" }}
              onClick={() => onSelect(i)}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </g>

      {/* Month wedges (click targets) */}
      <g>
        {MONTHS.map((m, i) => {
          const mid = i * STEP + STEP / 2;
          const isSel = selected === i;
          const isHov = hovered === i;
          const lbl = polarToCart(C, C, R_LABEL, mid);
          const tick = polarToCart(C, C, R_TICK, mid);
          const tickEnd = polarToCart(C, C, R_TICK - 12, mid);
          return (
            <g
              key={`wedge-${i}`}
              onClick={() => onSelect(i)}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              style={{ cursor: "pointer" }}
            >
              {/* tick */}
              <line
                x1={tick.x} y1={tick.y} x2={tickEnd.x} y2={tickEnd.y}
                stroke={isSel ? "hsl(38, 85%, 45%)" : "hsl(142, 30%, 60%)"}
                strokeWidth={isSel ? 2.5 : 1.2}
              />
              {/* month dot */}
              <circle
                cx={lbl.x} cy={lbl.y}
                r={isSel ? 22 : isHov ? 19 : 16}
                fill={isSel ? "hsl(38, 85%, 55%)" : "hsl(0, 0%, 100%)"}
                stroke={SEASON_COLOR[m.season].stroke}
                strokeWidth={isSel ? 2.5 : 1.5}
                style={{ transition: "all 0.25s ease" }}
              />
              {/* month short label */}
              <text
                x={lbl.x} y={lbl.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight={isSel ? 700 : 600}
                fill={isSel ? "white" : "hsl(150, 30%, 18%)"}
                style={{ pointerEvents: "none", fontFamily: "var(--font-display, sans-serif)" }}
              >
                {m.short}
              </text>
            </g>
          );
        })}
      </g>

      {/* Inner decorative ring */}
      <circle cx={C} cy={C} r={R_INNER + 18} fill="none" stroke="hsl(142, 40%, 70%)" strokeWidth="1" opacity="0.4" />
      <circle cx={C} cy={C} r={R_INNER + 10} fill="none" stroke="hsl(38, 70%, 70%)" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.6" />

      {/* Today pointer */}
      <g style={{ transform: `rotate(${todayAngle + rotation}deg)`, transformOrigin: `${C}px ${C}px`, transition: "transform 0.6s ease" }}>
        <line x1={C} y1={C} x2={C} y2={C - R_TICK + 4} stroke="hsl(38, 85%, 45%)" strokeWidth="2" strokeLinecap="round" />
        <circle cx={C} cy={C - R_TICK + 4} r="6" fill="hsl(38, 85%, 55%)" stroke="white" strokeWidth="2" />
      </g>

      {/* Center glow */}
      <circle cx={C} cy={C} r={R_INNER} fill="url(#centerGlow)" />
      <circle cx={C} cy={C} r={R_INNER - 5} fill="hsl(0, 0%, 100%)" stroke="hsl(142, 40%, 70%)" strokeWidth="1" opacity="0.95" />

      {/* Center label */}
      <text x={C} y={C - 18} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(142, 40%, 35%)" letterSpacing="2">
        KRISHI
      </text>
      <text x={C} y={C + 4} textAnchor="middle" fontSize="22" fontWeight="800" fill="hsl(150, 30%, 15%)" style={{ fontFamily: "var(--font-display, sans-serif)" }}>
        MANDALA
      </text>
      <text x={C} y={C + 24} textAnchor="middle" fontSize="9" fill="hsl(150, 10%, 45%)" letterSpacing="1">
        कृषि चक्र
      </text>
      <text x={C} y={C + 44} textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(38, 85%, 40%)">
        {MONTHS[selected].full}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function KrishiMandalaPage() {
  const { active } = useActiveProfile();
  const details = (active?.farmer_details || {}) as Record<string, any>;
  const state: string = details.state || active?.farm_location || "India";
  const cropsArr = Array.isArray(details.current_crops) ? details.current_crops : [];
  const crop: string = cropsArr[0] || details.primary_crop || "your crops";

  const [selected, setSelected] = useState<number>(new Date().getMonth());
  const [hovered, setHovered] = useState<number | null>(null);
  const [wisdom, setWisdom] = useState<Record<number, { sow: string; avoid: string; market: string; festival: string }>>(() =>
    safeLS(`km.mandala.wisdom.${state}.${crop}`, {} as Record<number, any>)
  );
  const [loadingMonth, setLoadingMonth] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  // Ask the Mandala
  const [askOpen, setAskOpen] = useState(false);
  const [askQ, setAskQ] = useState("");
  const [askA, setAskA] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const askRef = useRef<HTMLTextAreaElement>(null);

  // Subtle rotation animation (decorative pointer drift)
  useEffect(() => {
    let raf = 0;
    let start = performance.now();
    const tick = (t: number) => {
      setRotation(Math.sin((t - start) / 4000) * 1.2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Persist wisdom cache
  useEffect(() => {
    setLS(`km.mandala.wisdom.${state}.${crop}`, wisdom);
  }, [wisdom, state, crop]);

  // Fetch wisdom for selected month (on demand)
  useEffect(() => {
    const m = MONTHS[selected];
    if (wisdom[selected]) return;
    let cancel = false;
    (async () => {
      setLoadingMonth(selected);
      try {
        const prompt = `You are a wise farming almanac for Indian agriculture. For the month of ${m.full} in ${state}, considering the ${m.season} season and a farmer growing ${crop}, give a JSON object with exactly these 4 keys, each value a single concise sentence under 22 words:
{
 "sow": "what to sow, transplant, or harvest this month",
 "avoid": "one key mistake or risk to avoid this month",
 "market": "mandi/price outlook for ${crop} this month",
 "festival": "any festival, fair, or government scheme window relevant this month"
}
Return ONLY the JSON, no markdown, no explanation.`;
        const raw = await callAi(prompt);
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : null;
        if (!cancel && parsed && parsed.sow) {
          setWisdom((w) => ({ ...w, [selected]: parsed }));
        } else if (!cancel) {
          setWisdom((w) => ({ ...w, [selected]: fallbackWisdom(m, state, crop) }));
        }
      } catch {
        if (!cancel) setWisdom((w) => ({ ...w, [selected]: fallbackWisdom(m, state, crop) }));
      } finally {
        if (!cancel) setLoadingMonth(null);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, state, crop]);

  const regenMonth = () => {
    setWisdom((w) => {
      const copy = { ...w };
      delete copy[selected];
      return copy;
    });
  };

  const askMandala = async () => {
    const q = askQ.trim();
    if (!q) return;
    setAskLoading(true);
    setAskA(null);
    try {
      const prompt = `You are the Krishi Mandala — a wise, poetic farming oracle for Indian farmers. The user farms in ${state}, primary crop ${crop}, current month ${MONTHS[new Date().getMonth()].full}. Answer this question in 2-3 short sentences, practical and warm. Mix gentle wisdom with concrete advice. Question: "${q}"`;
      const ans = await callAi(prompt);
      setAskA(ans.trim() || "The mandala is silent today — try again shortly.");
    } catch {
      setAskA("The mandala is resting. Please try again in a moment.");
    } finally {
      setAskLoading(false);
    }
  };

  const m = MONTHS[selected];
  const WI = WEATHER_ICONS[m.weatherIcon];
  const seasonInfo = SEASON_COLOR[m.season];
  const wis = wisdom[selected];

  const todayIdx = new Date().getMonth();

  // Season legend
  const seasons = useMemo(
    () => (["kharif", "rabi", "zaid", "transition"] as Season[]).map((s) => ({ s, ...SEASON_COLOR[s] })),
    []
  );

  return (
    <AgriPageBackground variant="crops">
      <Navbar />

      <main className="container mx-auto px-4 pt-8 pb-20 max-w-7xl">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-semibold mb-3">
            <Sparkles className="h-3 w-3" /> AI Almanac · New
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground tracking-tight">
            Krishi <span className="text-gradient-primary">Mandala</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            A living wheel of the farming year — tap any month to receive seasonal wisdom for{" "}
            <span className="font-semibold text-foreground">{crop}</span> in{" "}
            <span className="font-semibold text-foreground">{state}</span>.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* LEFT: Mandala wheel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3 glass-card p-4 md:p-6"
          >
            <Mandala
              selected={selected}
              onSelect={setSelected}
              hovered={hovered}
              onHover={setHovered}
              rotation={rotation}
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {seasons.map(({ s, fill, stroke, label }) => (
                <div key={s} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span
                    className="inline-block w-3 h-3 rounded-sm border"
                    style={{ background: fill, borderColor: stroke }}
                  />
                  {label}
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs font-medium text-secondary">
                <Compass className="h-3.5 w-3.5" /> Today: {MONTHS[todayIdx].full}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Selected month panel */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="glass-card p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-3xl">{m.emoji}</div>
                    <h2 className="text-2xl font-display font-bold text-foreground mt-1">{m.full}</h2>
                    <div className="text-sm text-muted-foreground">{m.hindi}</div>
                  </div>
                  <div
                    className="text-xs font-semibold px-2 py-1 rounded-full border"
                    style={{ background: seasonInfo.fill, borderColor: seasonInfo.stroke, color: seasonInfo.stroke }}
                  >
                    {seasonInfo.label}
                  </div>
                </div>

                {/* Vitals row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <WI className="h-4 w-4 mx-auto text-primary" />
                    <div className="text-[10px] text-muted-foreground mt-1">Weather</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <div className="text-sm font-bold text-foreground">{m.tempC[0]}–{m.tempC[1]}°</div>
                    <div className="text-[10px] text-muted-foreground">Temp</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <div className="text-sm font-bold text-foreground">{m.rainMm}mm</div>
                    <div className="text-[10px] text-muted-foreground">Rain</div>
                  </div>
                </div>

                {/* Wisdom cards */}
                {loadingMonth === selected && !wis ? (
                  <div className="space-y-2 py-4 flex flex-col items-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <div className="text-xs">Consulting the mandala…</div>
                  </div>
                ) : wis ? (
                  <div className="space-y-2">
                    <WisdomRow icon={Leaf}   color="text-primary"          label="Sow / Grow"  text={wis.sow} />
                    <WisdomRow icon={Wind}   color="text-destructive"      label="Avoid"       text={wis.avoid} />
                    <WisdomRow icon={Wheat}  color="text-secondary"        label="Mandi"       text={wis.market} />
                    <WisdomRow icon={Flower2} color="text-accent-foreground" label="Calendar"   text={wis.festival} />

                    <button
                      onClick={regenMonth}
                      className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2 rounded-lg border border-dashed border-border hover:border-primary/50"
                    >
                      <RefreshCw className="h-3 w-3" /> Re-spin this month
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-4 text-center">No wisdom yet.</div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Ask the mandala CTA */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => { setAskOpen(true); setTimeout(() => askRef.current?.focus(), 50); }}
              className="w-full glass-card p-4 flex items-center gap-3 text-left hover:scale-[1.01] transition-transform group"
            >
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center flex-shrink-0 group-hover:rotate-12 transition-transform">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-display font-semibold text-foreground text-sm">Ask the Mandala</div>
                <div className="text-xs text-muted-foreground">Pose any farming question — get poetic, practical wisdom.</div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Month strip */}
        <div className="mt-8 glass-card p-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {MONTHS.map((mm, i) => {
              const isSel = i === selected;
              const isToday = i === todayIdx;
              return (
                <button
                  key={mm.idx}
                  onClick={() => setSelected(i)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    isSel
                      ? "bg-primary text-primary-foreground border-primary scale-105"
                      : "bg-card hover:bg-muted border-border text-foreground"
                  }`}
                  style={!isSel ? { borderLeft: `3px solid ${SEASON_COLOR[mm.season].stroke}` } : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{mm.emoji}</span>
                    <span>{mm.short}</span>
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* ASK MANDALA MODAL */}
      <AnimatePresence>
        {askOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setAskOpen(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-card rounded-2xl shadow-elevated w-full max-w-lg border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between gradient-gold">
                <div className="flex items-center gap-2 text-white font-display font-bold">
                  <Sparkles className="h-4 w-4" /> Ask the Mandala
                </div>
                <button onClick={() => setAskOpen(false)} className="text-white/80 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <textarea
                  ref={askRef}
                  value={askQ}
                  onChange={(e) => setAskQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      askMandala();
                    }
                  }}
                  rows={3}
                  placeholder={`e.g. Should I delay sowing ${crop} this year?`}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />

                <button
                  onClick={askMandala}
                  disabled={askLoading || !askQ.trim()}
                  className="w-full gradient-primary text-primary-foreground rounded-lg py-2.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {askLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {askLoading ? "The mandala speaks…" : "Consult"}
                </button>

                <AnimatePresence>
                  {askA && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-accent/40 border border-primary/20 p-4 text-sm text-foreground leading-relaxed"
                    >
                      <div className="text-[10px] uppercase tracking-wide text-primary font-bold mb-1">✦ Mandala speaks</div>
                      {askA}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </AgriPageBackground>
  );
}

function WisdomRow({
  icon: Icon,
  color,
  label,
  text,
}: {
  icon: typeof Leaf;
  color: string;
  label: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-card/60 hover:bg-card transition-colors p-2.5 border border-border/60">
      <div className={`mt-0.5 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground leading-snug">{text}</div>
      </div>
    </div>
  );
}
