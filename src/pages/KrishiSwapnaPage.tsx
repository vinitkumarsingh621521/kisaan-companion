import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sparkles, Send, Trash2, Download, Stars, Feather } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/* ============================================================
   KRISHI SWAPNA — "The Farmer's Dream Oracle"
   AI dream interpreter that reads symbols from a farmer's dream
   and returns an Omen (good/warning/neutral), a Crop Action,
   and a one-line Mantra. Backed by a starlit dreamscape canvas.
   ============================================================ */

type Mood = "auspicious" | "warning" | "neutral";
type Reading = {
  id: string;
  ts: number;
  dream: string;
  symbols: string[];
  omen: { mood: Mood; title: string; meaning: string };
  action: string;
  mantra: string;
};

const STORE_KEY = "km.swapna.scroll.v1";
const AI_URL = `https://wckqooblkicjsghmaovy.supabase.co/functions/v1/krishi-ai`;

const SEED_DREAMS = [
  "मैंने सपने में देखा कि मेरे खेत में सुनहरी गेहूँ की बालियाँ चाँद की रोशनी में चमक रही थीं।",
  "A black crow circled my mango tree three times and dropped a single feather.",
  "नदी सूख गई थी और मिट्टी फट रही थी, फिर अचानक हरी घास उग आई।",
  "I saw my grandfather ploughing the field with white bullocks under a red sun.",
];

const FALLBACK_READINGS: Omit<Reading, "id" | "ts" | "dream">[] = [
  {
    symbols: ["Golden grain", "Moonlight", "Abundance"],
    omen: { mood: "auspicious", title: "Lakshmi's Whisper", meaning: "Your soil remembers your devotion. A quiet prosperity is ripening underground." },
    action: "Within 7 days, top-dress with compost and irrigate at dawn — the moon-cycle favours grain fill.",
    mantra: "जो बीज श्रद्धा से बोया जाए, वह चाँद भी सींचता है।",
  },
  {
    symbols: ["Black crow", "Circling thrice", "Lone feather"],
    omen: { mood: "warning", title: "The Watcher's Sign", meaning: "An unseen pest or fungus is surveying your orchard. Act before the third dawn." },
    action: "Inspect mango canopies for hopper or anthracnose; spray neem oil 3% at dusk.",
    mantra: "जो चेतावनी सपना दे, उसे जागकर सुनो।",
  },
  {
    symbols: ["Cracked earth", "Dry river", "Sudden green"],
    omen: { mood: "neutral", title: "The Turning Wheel", meaning: "A drought of patience precedes your harvest. The land tests, then rewards." },
    action: "Mulch heavily this week; sow short-cycle moong on the bunds for nitrogen and morale.",
    mantra: "धरती रोती है, फिर हँसती है — किसान दोनों में स्थिर रहे।",
  },
  {
    symbols: ["Ancestor", "White bullocks", "Red sun"],
    omen: { mood: "auspicious", title: "Inherited Strength", meaning: "Old wisdom is walking your fields. Honour traditional intercropping this season." },
    action: "Plan a 3-crop rotation: legume → millet → mustard. Bless the seed before sowing.",
    mantra: "पूर्वजों की हथेली अब भी हल पकड़े है।",
  },
];

const MOOD_STYLES: Record<Mood, { ring: string; glow: string; text: string; chip: string }> = {
  auspicious: {
    ring: "ring-amber-300/60",
    glow: "shadow-[0_0_60px_-10px_hsla(45,100%,70%,0.6)]",
    text: "text-amber-200",
    chip: "bg-amber-400/15 text-amber-200 border-amber-300/30",
  },
  warning: {
    ring: "ring-rose-400/60",
    glow: "shadow-[0_0_60px_-10px_hsla(0,80%,70%,0.55)]",
    text: "text-rose-200",
    chip: "bg-rose-500/15 text-rose-200 border-rose-400/30",
  },
  neutral: {
    ring: "ring-sky-300/60",
    glow: "shadow-[0_0_60px_-10px_hsla(210,90%,75%,0.5)]",
    text: "text-sky-200",
    chip: "bg-sky-400/15 text-sky-200 border-sky-300/30",
  },
};

/* ----- Canvas: drifting nebula + parallax stars + falling petals ----- */
function Dreamscape() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    type Star = { x: number; y: number; z: number; r: number; tw: number };
    type Petal = { x: number; y: number; vx: number; vy: number; r: number; a: number; va: number; hue: number };
    const stars: Star[] = [];
    const petals: Petal[] = [];

    const resize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 220; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.8 + 0.2, r: Math.random() * 1.3 + 0.2, tw: Math.random() * Math.PI * 2 });
    }
    for (let i = 0; i < 30; i++) {
      petals.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 12, vy: 18 + Math.random() * 22,
        r: 4 + Math.random() * 6, a: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 1.4,
        hue: 280 + Math.random() * 80,
      });
    }

    let t0 = performance.now();
    const draw = (t: number) => {
      const dt = Math.min(0.05, (t - t0) / 1000); t0 = t;

      // nebula
      const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 10, w * 0.5, h * 0.5, Math.max(w, h));
      g.addColorStop(0, "hsla(260, 60%, 18%, 1)");
      g.addColorStop(0.45, "hsla(230, 55%, 9%, 1)");
      g.addColorStop(1, "hsla(220, 60%, 4%, 1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // soft aurora bands
      for (let i = 0; i < 3; i++) {
        const y = h * (0.25 + i * 0.25) + Math.sin(t / 2200 + i) * 30;
        const grad = ctx.createLinearGradient(0, y - 60, 0, y + 60);
        grad.addColorStop(0, "hsla(280,80%,55%,0)");
        grad.addColorStop(0.5, `hsla(${260 + i * 30},80%,60%,0.08)`);
        grad.addColorStop(1, "hsla(200,80%,55%,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y - 60, w, 120);
      }

      // stars
      for (const s of stars) {
        s.tw += dt * (1 + s.z);
        const a = 0.5 + 0.5 * Math.sin(s.tw);
        ctx.fillStyle = `hsla(${210 + s.z * 40}, 90%, ${75 + s.z * 15}%, ${a * s.z})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
      }

      // petals
      for (const p of petals) {
        p.x += p.vx * dt + Math.sin(t / 900 + p.a) * 0.6;
        p.y += p.vy * dt;
        p.a += p.va * dt;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        if (p.x < -20) p.x = w + 10; if (p.x > w + 20) p.x = -10;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        const pg = ctx.createLinearGradient(-p.r, 0, p.r, 0);
        pg.addColorStop(0, `hsla(${p.hue}, 90%, 75%, 0.0)`);
        pg.addColorStop(0.5, `hsla(${p.hue}, 90%, 75%, 0.85)`);
        pg.addColorStop(1, `hsla(${p.hue + 30}, 90%, 70%, 0.0)`);
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ----- AI bridge ----- */
async function interpret(dream: string): Promise<Omit<Reading, "id" | "ts" | "dream"> | null> {
  try {
    const prompt = `You are a poetic Indian dream-oracle for farmers. Interpret this dream in agricultural terms.
Dream: """${dream}"""
Return ONLY JSON: {
  "symbols": [3 short symbol phrases],
  "omen": { "mood": "auspicious" | "warning" | "neutral", "title": "2-4 word evocative title", "meaning": "1-2 sentence interpretation tying the dream to soil, crop, water, or season" },
  "action": "one specific actionable farming step for the next 7 days",
  "mantra": "one short Hindi or Hinglish line, max 14 words"
}`;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ message: prompt, language: "en" }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text: string = j.response || j.reply || j.message || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (!parsed.symbols || !parsed.omen) return null;
    return parsed;
  } catch { return null; }
}

export default function KrishiSwapnaPage() {
  const [dream, setDream] = useState("");
  const [busy, setBusy] = useState(false);
  const [scroll, setScroll] = useState<Reading[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { return []; }
  });
  const [current, setCurrent] = useState<Reading | null>(scroll[0] || null);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(scroll.slice(0, 24))); }, [scroll]);

  const phase = useMemo(() => {
    const d = new Date();
    const n = (d.getDate() + d.getMonth() * 30) % 8;
    return ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"][n];
  }, []);

  const submit = async () => {
    const text = dream.trim();
    if (!text || busy) return;
    setBusy(true);
    const result = await interpret(text);
    const fb = FALLBACK_READINGS[Math.floor(Math.random() * FALLBACK_READINGS.length)];
    const r: Reading = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      dream: text,
      symbols: result?.symbols || fb.symbols,
      omen: result?.omen || fb.omen,
      action: result?.action || fb.action,
      mantra: result?.mantra || fb.mantra,
    };
    setScroll((s) => [r, ...s].slice(0, 24));
    setCurrent(r);
    setDream("");
    setBusy(false);
  };

  const clearAll = () => { setScroll([]); setCurrent(null); };

  const downloadScroll = () => {
    if (!current) return;
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, "#0b0a1f"); g.addColorStop(1, "#1a0f2e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 180; i++) ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
    ctx.fillStyle = "#fef3c7"; ctx.font = "600 36px serif"; ctx.fillText("॥ कृषि स्वप्न ॥", 60, 110);
    ctx.fillStyle = "#a78bfa"; ctx.font = "20px serif"; ctx.fillText("The Farmer's Dream Oracle", 60, 145);
    ctx.fillStyle = "#fff"; ctx.font = "600 56px serif";
    wrap(ctx, current.omen.title, 60, 240, 960, 64);
    ctx.fillStyle = "#cbd5e1"; ctx.font = "26px serif"; wrap(ctx, current.omen.meaning, 60, 360, 960, 38);
    ctx.fillStyle = "#fcd34d"; ctx.font = "italic 28px serif"; wrap(ctx, "❝ " + current.mantra + " ❞", 60, 980, 960, 42);
    ctx.fillStyle = "#94a3b8"; ctx.font = "20px serif"; ctx.fillText("krishimitra · dream scroll", 60, 1290);
    const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "swapna-scroll.png"; a.click();
  };

  return (
    <div className="min-h-screen bg-[#07061a] text-white">
      <Navbar />
      <div className="relative min-h-[calc(100vh-64px)] overflow-hidden">
        <Dreamscape />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#07061a]/80 pointer-events-none" />

        <div className="relative container mx-auto px-4 py-10 lg:py-14">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-xs tracking-widest text-amber-200/90 mb-4">
              <Moon className="w-3.5 h-3.5" /> {phase.toUpperCase()} · NIGHT ORACLE
            </div>
            <h1 className="font-serif text-4xl md:text-6xl tracking-tight">
              <span className="bg-gradient-to-r from-amber-200 via-violet-200 to-sky-200 bg-clip-text text-transparent">कृषि स्वप्न</span>
            </h1>
            <p className="mt-3 text-violet-200/70 max-w-xl mx-auto">
              Whisper your dream to the night. The oracle reads its symbols and returns an omen for your soil.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Composer */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                <div className="flex items-center gap-2 text-violet-200 mb-3">
                  <Feather className="w-4 h-4" /> <span className="text-sm uppercase tracking-widest">Tell the night</span>
                </div>
                <Textarea
                  value={dream}
                  onChange={(e) => setDream(e.target.value)}
                  placeholder="मैंने सपने में देखा कि..."
                  className="min-h-[140px] bg-black/30 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-300/40"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {SEED_DREAMS.map((s, i) => (
                    <button key={i} onClick={() => setDream(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-violet-100/80 transition">
                      ✦ seed {i + 1}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={submit} disabled={busy || !dream.trim()} className="flex-1 bg-gradient-to-r from-amber-400 to-violet-500 hover:opacity-90 text-black font-semibold">
                    {busy ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {busy ? "Reading the stars…" : "Divine"}
                  </Button>
                  {scroll.length > 0 && (
                    <Button variant="outline" onClick={clearAll} className="border-white/15 bg-white/5 hover:bg-white/10 text-white">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Scroll */}
              {scroll.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2 text-violet-200 text-sm uppercase tracking-widest"><Stars className="w-4 h-4" /> Dream Scroll</div>
                    <span className="text-[11px] text-white/40">{scroll.length}</span>
                  </div>
                  <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                    {scroll.map((r) => (
                      <button key={r.id} onClick={() => setCurrent(r)} className={`w-full text-left p-3 rounded-xl border transition ${current?.id === r.id ? "border-amber-300/40 bg-amber-300/5" : "border-white/10 bg-black/20 hover:bg-white/5"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${MOOD_STYLES[r.omen.mood].chip}`}>{r.omen.mood}</span>
                          <span className="text-[10px] text-white/40">{new Date(r.ts).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm font-medium text-white/90 truncate">{r.omen.title}</div>
                        <div className="text-[11px] text-white/50 line-clamp-1">{r.dream}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Reading */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {current ? (
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 30, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] backdrop-blur-xl p-8 md:p-10 ring-1 ${MOOD_STYLES[current.omen.mood].ring} ${MOOD_STYLES[current.omen.mood].glow}`}
                  >
                    <div className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] px-3 py-1 rounded-full border ${MOOD_STYLES[current.omen.mood].chip}`}>
                      <Sparkles className="w-3 h-3" /> {current.omen.mood} omen
                    </div>
                    <h2 className={`mt-4 font-serif text-3xl md:text-5xl leading-tight ${MOOD_STYLES[current.omen.mood].text}`}>
                      {current.omen.title}
                    </h2>
                    <p className="mt-4 text-white/80 text-lg leading-relaxed font-serif">
                      {current.omen.meaning}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {current.symbols.map((s, i) => (
                        <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-violet-100/90">✦ {s}</span>
                      ))}
                    </div>

                    <div className="mt-8 grid md:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-black/30 border border-white/10">
                        <div className="text-[10px] uppercase tracking-widest text-emerald-300/80 mb-2">7-Day Action</div>
                        <p className="text-white/90 leading-relaxed">{current.action}</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-400/10 to-violet-500/10 border border-amber-300/20">
                        <div className="text-[10px] uppercase tracking-widest text-amber-200/90 mb-2">Mantra</div>
                        <p className="font-serif italic text-lg text-amber-100 leading-relaxed">❝ {current.mantra} ❞</p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-xs text-white/40">
                      <span>Dream: "{current.dream.slice(0, 80)}{current.dream.length > 80 ? "…" : ""}"</span>
                      <Button size="sm" variant="ghost" onClick={downloadScroll} className="text-amber-200 hover:text-amber-100 hover:bg-white/5">
                        <Download className="w-3.5 h-3.5 mr-1" /> Save Scroll
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] backdrop-blur-md p-16 text-center">
                    <Moon className="w-12 h-12 mx-auto text-violet-300/60 mb-4" />
                    <p className="font-serif text-2xl text-white/80">The night is listening…</p>
                    <p className="text-violet-200/60 mt-2">Whisper your dream on the left to receive your first omen.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" "); let line = "";
  for (const w of words) {
    const t = line + w + " ";
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w + " "; y += lh; }
    else line = t;
  }
  ctx.fillText(line, x, y);
}
