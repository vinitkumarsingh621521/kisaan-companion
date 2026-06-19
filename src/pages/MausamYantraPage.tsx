import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCw, Trash2, Wind, Droplets, Sun, Moon, Sprout, CloudLightning, Wheat, Mountain } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;
const STORAGE_KEY = "km.mausam.yantra.v1";

type Element = {
  key: string;
  label: string;
  hindi: string;
  color: string;
  ring: string;
  glow: string;
  Icon: typeof Sun;
};

const ELEMENTS: Element[] = [
  { key: "sun",     label: "Sun",     hindi: "Surya",  color: "#f59e0b", ring: "from-amber-400 to-orange-500",     glow: "#fbbf24", Icon: Sun },
  { key: "rain",    label: "Rain",    hindi: "Varsha", color: "#0ea5e9", ring: "from-sky-400 to-blue-600",         glow: "#38bdf8", Icon: Droplets },
  { key: "wind",    label: "Wind",    hindi: "Vayu",   color: "#14b8a6", ring: "from-teal-400 to-emerald-500",     glow: "#2dd4bf", Icon: Wind },
  { key: "soil",    label: "Soil",    hindi: "Mitti",  color: "#a16207", ring: "from-yellow-700 to-amber-900",     glow: "#ca8a04", Icon: Mountain },
  { key: "seed",    label: "Seed",    hindi: "Beej",   color: "#65a30d", ring: "from-lime-400 to-green-600",       glow: "#84cc16", Icon: Sprout },
  { key: "moon",    label: "Moon",    hindi: "Chandra",color: "#94a3b8", ring: "from-slate-300 to-slate-500",      glow: "#cbd5e1", Icon: Moon },
  { key: "storm",   label: "Storm",   hindi: "Toofan", color: "#7c3aed", ring: "from-violet-500 to-purple-700",    glow: "#a78bfa", Icon: CloudLightning },
  { key: "harvest", label: "Harvest", hindi: "Fasal",  color: "#dc2626", ring: "from-rose-400 to-red-600",         glow: "#f87171", Icon: Wheat },
];

type Card = {
  id: string;
  ts: number;
  element: string;
  ritual: string;
  action: string;
  mantra: string;
};

function loadDeck(): Card[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveDeck(d: Card[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d.slice(0, 30))); } catch {}
}

async function callAi(prompt: string): Promise<string> {
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await edgeToken()}`,
    },
    body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) throw new Error("ai");
  const d = await r.json();
  return d.result || d.response || d.choices?.[0]?.message?.content || "";
}

function parseJson<T>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : cleaned); } catch { return null; }
}

const FALLBACKS: Record<string, Omit<Card, "id" | "ts" | "element">> = {
  sun:     { ritual: "Face the rising sun, hold a fistful of soil to your forehead.",                    action: "Inspect leaves for sun-scorch on south-facing rows; mulch base of seedlings before noon.",       mantra: "Light feeds the green — but only patient roots drink it." },
  rain:    { ritual: "Place a clay bowl in the open field. Listen for the first drop.",                  action: "Clear field drains today; bag spare urea — heavy rain in 48h is wasteful on bare ground.",      mantra: "The cloud is generous; only the prepared field is grateful." },
  wind:    { ritual: "Tie a thin cloth strip to your tallest stake. Read its dance.",                    action: "Spray pesticide only before 9 AM; afternoon wind will rob 40% of your dose.",                   mantra: "Wind carries voices — and your hard-earned chemicals." },
  soil:    { ritual: "Squeeze a moist handful. If it crumbles, the earth is breathing.",                 action: "Sprinkle 200g vermicompost in a 1-meter circle around your weakest plant. Watch for 7 days.",   mantra: "What you feed the soil, the soil whispers back in grain." },
  seed:    { ritual: "Hold three seeds in your palm. Name them: rain, root, return.",                    action: "Soak tomorrow's seeds in lukewarm water + a pinch of haldi for 6 hours. Germination jumps 20%.", mantra: "Every seed is a promise the earth never breaks." },
  moon:    { ritual: "Walk your boundary tonight; mark one quiet spot for tomorrow's prayer.",            action: "Transplant seedlings after sunset — moisture loss drops by half. Water lightly at dawn.",       mantra: "The moon pulls tides — and the sap inside young stems." },
  storm:   { ritual: "Place an iron nail at the four corners of your field. Stand still for one breath.", action: "Stake all plants taller than your knee today. Cover compost heap with old sacks.",              mantra: "The storm tests what you built — not what you wished for." },
  harvest: { ritual: "Cut one stalk by hand. Smell it. Thank it.",                                       action: "Check mandi rates at 6 AM and 5 PM for 3 days before selling; the spread is your profit.",      mantra: "The harvest is not the end — it is the question the next season asks." },
};

export default function MausamYantraPage() {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<Element | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [deck, setDeck] = useState<Card[]>(() => loadDeck());
  const [loadingCard, setLoadingCard] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Aurora canvas background
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0; let t = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      t += 0.004;
      ctx.fillStyle = "#0a0a1f";
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 4; i++) {
        const x = c.width * (0.2 + 0.2 * i) + Math.sin(t + i) * 80;
        const y = c.height * (0.3 + 0.15 * Math.cos(t * 1.3 + i));
        const r = 280 + Math.sin(t * 2 + i) * 60;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const hues = ["79,70,229", "236,72,153", "234,179,8", "16,185,129"];
        g.addColorStop(0, `rgba(${hues[i]},0.28)`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const sliceDeg = 360 / ELEMENTS.length;

  async function generateCard(el: Element) {
    setLoadingCard(true);
    try {
      const prompt = `You are a poetic Indian farming oracle. The wheel landed on element "${el.label}" (${el.hindi}).
Return STRICT JSON only, no prose:
{ "ritual": "1 short sensory ritual (1 sentence) a farmer can do in 60 seconds tied to ${el.label}",
  "action": "1 practical, specific 24-hour farming task tied to ${el.label}, with a measurable detail (quantity, time, or %).",
  "mantra": "A 1-line poetic mantra in English, evocative, max 14 words." }`;
      const raw = await callAi(prompt);
      const parsed = parseJson<{ ritual: string; action: string; mantra: string }>(raw);
      const body = parsed && parsed.action ? parsed : FALLBACKS[el.key];
      const c: Card = { id: crypto.randomUUID(), ts: Date.now(), element: el.key, ...body };
      setCard(c);
      const next = [c, ...deck].slice(0, 30);
      setDeck(next); saveDeck(next);
    } catch {
      const fb = FALLBACKS[el.key];
      const c: Card = { id: crypto.randomUUID(), ts: Date.now(), element: el.key, ...fb };
      setCard(c);
      const next = [c, ...deck].slice(0, 30);
      setDeck(next); saveDeck(next);
      toast.error("Oracle offline — using ancestral wisdom.");
    } finally {
      setLoadingCard(false);
    }
  }

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setCard(null);
    setLanded(null);
    const targetIdx = Math.floor(Math.random() * ELEMENTS.length);
    const turns = 6 + Math.random() * 3;
    const finalAngle = angle + turns * 360 + (360 - targetIdx * sliceDeg - sliceDeg / 2);
    setAngle(finalAngle);
    setTimeout(() => {
      const el = ELEMENTS[targetIdx];
      setLanded(el);
      setSpinning(false);
      generateCard(el);
    }, 4200);
  }

  function clearDeck() {
    setDeck([]); saveDeck([]); setCard(null); setLanded(null);
    toast.success("Karma deck cleared.");
  }

  const elementByKey = useMemo(() => Object.fromEntries(ELEMENTS.map(e => [e.key, e])), []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a1f] text-white">
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />
      <div className="relative z-10">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs">
              <Sparkles className="h-3 w-3" /> Mausam Yantra — Oracle of the Eight Winds
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mt-3 bg-gradient-to-r from-amber-200 via-rose-200 to-sky-200 bg-clip-text text-transparent">
              Spin the Wheel. Receive Today's Sign.
            </h1>
            <p className="text-white/60 mt-2 text-sm">Each turn yields a ritual, a tactical action, and a mantra — saved to your Karma Deck.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* Wheel */}
            <div className="relative aspect-square max-w-[520px] mx-auto w-full">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
              </div>

              <motion.div
                ref={wheelRef}
                className="absolute inset-0 rounded-full shadow-[0_0_60px_rgba(168,85,247,0.35)]"
                animate={{ rotate: angle }}
                transition={{ duration: 4.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <defs>
                    {ELEMENTS.map((e, i) => (
                      <radialGradient key={e.key} id={`g-${e.key}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={e.glow} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={e.color} stopOpacity="1" />
                      </radialGradient>
                    ))}
                  </defs>
                  {ELEMENTS.map((e, i) => {
                    const start = (i * sliceDeg - 90) * (Math.PI / 180);
                    const end = ((i + 1) * sliceDeg - 90) * (Math.PI / 180);
                    const x1 = 100 + 96 * Math.cos(start);
                    const y1 = 100 + 96 * Math.sin(start);
                    const x2 = 100 + 96 * Math.cos(end);
                    const y2 = 100 + 96 * Math.sin(end);
                    const mid = (i * sliceDeg + sliceDeg / 2 - 90) * (Math.PI / 180);
                    const lx = 100 + 64 * Math.cos(mid);
                    const ly = 100 + 64 * Math.sin(mid);
                    return (
                      <g key={e.key}>
                        <path
                          d={`M100,100 L${x1},${y1} A96,96 0 0,1 ${x2},${y2} Z`}
                          fill={`url(#g-${e.key})`}
                          stroke="rgba(255,255,255,0.18)"
                          strokeWidth="0.6"
                        />
                        <text
                          x={lx} y={ly}
                          fill="white" fontSize="7" fontWeight="700"
                          textAnchor="middle" dominantBaseline="middle"
                          transform={`rotate(${i * sliceDeg + sliceDeg / 2}, ${lx}, ${ly})`}
                          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                        >
                          {e.hindi.toUpperCase()}
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="100" cy="100" r="18" fill="#0a0a1f" stroke="rgba(251,191,36,0.6)" strokeWidth="1" />
                  <circle cx="100" cy="100" r="6" fill="#fbbf24" />
                </svg>
              </motion.div>

              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <Button
                  size="lg"
                  onClick={spin}
                  disabled={spinning || loadingCard}
                  className="bg-gradient-to-r from-amber-400 to-rose-500 text-black font-bold shadow-[0_0_24px_rgba(251,191,36,0.5)] hover:shadow-[0_0_36px_rgba(251,191,36,0.8)]"
                >
                  <RotateCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
                  {spinning ? "Reading the winds..." : "Spin the Yantra"}
                </Button>
              </div>
            </div>

            {/* Card + Deck */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {loadingCard && (
                  <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="rounded-2xl p-6 bg-white/5 border border-white/10 backdrop-blur text-center">
                    <Sparkles className="h-6 w-6 mx-auto animate-pulse text-amber-300" />
                    <p className="mt-2 text-sm text-white/70">The oracle is listening...</p>
                  </motion.div>
                )}
                {card && !loadingCard && landed && (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl p-5 border backdrop-blur"
                    style={{
                      background: `linear-gradient(135deg, ${landed.color}22, rgba(255,255,255,0.04))`,
                      borderColor: `${landed.color}55`,
                      boxShadow: `0 0 40px ${landed.glow}33`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${landed.ring} flex items-center justify-center`}>
                        <landed.Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-white/60">{landed.label}</div>
                        <div className="text-lg font-bold">{landed.hindi}</div>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-1">Ritual · 60s</div>
                        <p className="text-white/90 leading-relaxed">{card.ritual}</p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-emerald-300 mb-1">Action · 24h</div>
                        <p className="text-white/90 leading-relaxed">{card.action}</p>
                      </div>
                      <div className="pt-2 border-t border-white/10 italic text-white/70">
                        “{card.mantra}”
                      </div>
                    </div>
                  </motion.div>
                )}
                {!card && !loadingCard && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-2xl p-6 bg-white/5 border border-white/10 backdrop-blur text-center">
                    <p className="text-sm text-white/60">Spin the yantra to receive today's sign.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Deck */}
              <div className="rounded-2xl p-4 bg-white/5 border border-white/10 backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs uppercase tracking-widest text-white/60">Karma Deck · {deck.length}</div>
                  {deck.length > 0 && (
                    <button onClick={clearDeck} className="text-xs text-white/50 hover:text-rose-300 flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> clear
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {deck.length === 0 && <p className="text-xs text-white/40">Your past signs will be collected here.</p>}
                  {deck.map((c) => {
                    const el = elementByKey[c.element];
                    if (!el) return null;
                    return (
                      <button
                        key={c.id}
                        onClick={() => { setCard(c); setLanded(el); }}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition"
                      >
                        <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${el.color}33`, color: el.glow }}>
                          <el.Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{el.hindi} · {new Date(c.ts).toLocaleDateString()}</div>
                          <div className="text-[11px] text-white/50 truncate">{c.action}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
