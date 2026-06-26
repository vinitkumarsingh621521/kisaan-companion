import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Star, Plus, Loader2, Trash2, Wand2, X, Send, Moon, Sun,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useActiveProfile } from "@/hooks/useActiveProfile";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;
const STORAGE_KEY = "km.aakash.v1";

// ───────────────────────────────────────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────────────────────────────────────
type StarKind = "action" | "observation" | "worry" | "win" | "oracle";

interface SkyStar {
  id: string;
  x: number;          // 0..1 normalized
  y: number;          // 0..1 normalized
  text: string;
  kind: StarKind;
  size: number;       // 1..3
  createdAt: number;
}

interface Constellation {
  name: string;
  starIds: string[];
  insight: string;
}

interface SkyState {
  stars: SkyStar[];
  constellations: Constellation[];
  oracle: { text: string; advice: string } | null;
  lastReadingAt: number | null;
}

const KIND_COLOR: Record<StarKind, string> = {
  action:      "hsl(155, 70%, 65%)",
  observation: "hsl(210, 80%, 72%)",
  worry:       "hsl(0, 75%, 70%)",
  win:         "hsl(45, 95%, 65%)",
  oracle:      "hsl(38, 100%, 60%)",
};

const KIND_LABEL: Record<StarKind, string> = {
  action: "Action", observation: "Observation", worry: "Worry", win: "Win", oracle: "Oracle",
};

const EMPTY_STATE: SkyState = { stars: [], constellations: [], oracle: null, lastReadingAt: null };

// ───────────────────────────────────────────────────────────────────────────────
// STORAGE
// ───────────────────────────────────────────────────────────────────────────────
function loadState(): SkyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_STATE, ...parsed };
  } catch { return EMPTY_STATE; }
}
function saveState(s: SkyState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ───────────────────────────────────────────────────────────────────────────────
// AI
// ───────────────────────────────────────────────────────────────────────────────
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
    data.result ||
    data.response ||
    data.choices?.[0]?.message?.content ||
    (Array.isArray(data.content) ? data.content.find((c: { type?: string; text?: string }) => c.type === "text")?.text : "") ||
    ""
  );
}

function tryParseJson<T = any>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function classifyStar(text: string): Promise<StarKind> {
  try {
    const out = await callAi(
      `Classify this farmer journal note into exactly ONE of: action, observation, worry, win.
Note: "${text}"
Reply with ONLY the single word.`
    );
    const t = out.trim().toLowerCase();
    if (t.includes("action")) return "action";
    if (t.includes("worry")) return "worry";
    if (t.includes("win")) return "win";
    return "observation";
  } catch {
    const t = text.toLowerCase();
    if (/(sow|plant|spray|irrigat|harvest|appl|buy|sell)/.test(t)) return "action";
    if (/(worry|fear|loss|drought|pest|disease|damage|fail)/.test(t)) return "worry";
    if (/(good|great|profit|win|success|bumper|sold)/.test(t)) return "win";
    return "observation";
  }
}

async function readSky(stars: SkyStar[], farmer: string, location: string, crop: string) {
  const list = stars.map((s, i) => `${i + 1}. [${s.kind}] ${s.text}`).join("\n");
  const prompt = `You are a poetic-yet-practical Indian farming oracle reading a "sky" of journal stars.
Farmer: ${farmer || "the farmer"} • Location: ${location || "India"} • Crop: ${crop || "mixed"}

The farmer's stars (each is a journal entry):
${list}

Group related stars into 1-3 "constellations" with mythic Hindi-inspired names.
Then predict ONE next step as the "Oracle Star" — a glowing future moment.

Reply ONLY with valid JSON in this shape:
{
  "constellations": [
    { "name": "Megh-Mala (Cloud Garland)", "starIndexes": [1,3,5], "insight": "two-sentence insight tying these together" }
  ],
  "oracle": { "text": "short poetic prophecy (1 line)", "advice": "concrete action to take this week (1-2 sentences)" }
}`;
  const raw = await callAi(prompt);
  const parsed = tryParseJson<{ constellations: any[]; oracle: any }>(raw);
  if (!parsed) throw new Error("AI returned unreadable sky");
  const cons: Constellation[] = (parsed.constellations || []).slice(0, 3).map((c: any) => ({
    name: String(c.name || "Constellation").slice(0, 60),
    insight: String(c.insight || ""),
    starIds: (c.starIndexes || []).map((n: number) => stars[n - 1]?.id).filter(Boolean),
  }));
  return {
    constellations: cons,
    oracle: parsed.oracle ? {
      text: String(parsed.oracle.text || ""),
      advice: String(parsed.oracle.advice || ""),
    } : null,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// CANVAS SKY
// ───────────────────────────────────────────────────────────────────────────────
function SkyCanvas({
  state, hoveredId, onAddAt, onSelect,
}: {
  state: SkyState;
  hoveredId: string | null;
  onAddAt: (x: number, y: number) => void;
  onSelect: (id: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 480 });

  // Twinkle background
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size.w * dpr; cv.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const twinkles = Array.from({ length: 140 }, () => ({
      x: Math.random() * size.w,
      y: Math.random() * size.h,
      r: Math.random() * 1.1 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
    }));
    type Shooter = { x: number; y: number; vx: number; vy: number; life: number; max: number };
    const shooters: Shooter[] = [];
    const spawnShooter = () => {
      shooters.push({
        x: Math.random() * size.w * 0.6,
        y: Math.random() * size.h * 0.4,
        vx: 180 + Math.random() * 140,
        vy: 80 + Math.random() * 80,
        life: 0,
        max: 1.0 + Math.random() * 0.6,
      });
    };
    let nextShoot = 1.5 + Math.random() * 3;
    let raf = 0;
    let t0 = performance.now();
    let last = t0;
    const draw = (t: number) => {
      const dt = (t - t0) / 1000;
      const frameDt = (t - last) / 1000; last = t;
      // gradient nebula
      const g = ctx.createRadialGradient(size.w * 0.7, size.h * 0.2, 20, size.w / 2, size.h / 2, Math.max(size.w, size.h));
      g.addColorStop(0, "hsla(260, 50%, 18%, 1)");
      g.addColorStop(0.5, "hsla(230, 60%, 8%, 1)");
      g.addColorStop(1, "hsla(220, 70%, 4%, 1)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, size.w, size.h);
      // soft glow patches
      ctx.globalCompositeOperation = "lighter";
      const p1 = ctx.createRadialGradient(size.w * 0.2, size.h * 0.8, 0, size.w * 0.2, size.h * 0.8, 220);
      p1.addColorStop(0, "hsla(280, 80%, 50%, 0.18)"); p1.addColorStop(1, "transparent");
      ctx.fillStyle = p1; ctx.fillRect(0, 0, size.w, size.h);
      const p2 = ctx.createRadialGradient(size.w * 0.8, size.h * 0.6, 0, size.w * 0.8, size.h * 0.6, 240);
      p2.addColorStop(0, "hsla(190, 90%, 50%, 0.15)"); p2.addColorStop(1, "transparent");
      ctx.fillStyle = p2; ctx.fillRect(0, 0, size.w, size.h);
      // twinkles
      for (const s of twinkles) {
        const a = 0.35 + 0.45 * Math.sin(dt * s.speed + s.phase);
        ctx.fillStyle = `hsla(40, 100%, 90%, ${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      // shooting stars
      nextShoot -= frameDt;
      if (nextShoot <= 0) { spawnShooter(); nextShoot = 2 + Math.random() * 4; }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.life += frameDt;
        sh.x += sh.vx * frameDt; sh.y += sh.vy * frameDt;
        const k = 1 - sh.life / sh.max;
        if (k <= 0 || sh.x > size.w + 50 || sh.y > size.h + 50) { shooters.splice(i, 1); continue; }
        const tailX = sh.x - sh.vx * 0.25;
        const tailY = sh.y - sh.vy * 0.25;
        const grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
        grad.addColorStop(0, "hsla(45, 100%, 90%, 0)");
        grad.addColorStop(1, `hsla(45, 100%, 90%, ${0.9 * k})`);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(sh.x, sh.y); ctx.stroke();
        ctx.fillStyle = `hsla(45, 100%, 95%, ${k})`;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size.w, size.h]);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSize({ w: Math.max(320, r.width), h: Math.max(360, Math.min(640, r.width * 0.6)) });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Build constellation line set
  const lines = useMemo(() => {
    const map = new Map(state.stars.map(s => [s.id, s]));
    return state.constellations.flatMap(c => {
      const pts = c.starIds.map(id => map.get(id)).filter(Boolean) as SkyStar[];
      const segs: { a: SkyStar; b: SkyStar; name: string }[] = [];
      for (let i = 0; i < pts.length - 1; i++) segs.push({ a: pts[i], b: pts[i + 1], name: c.name });
      return segs;
    });
  }, [state.constellations, state.stars]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-star]")) return; // ignore clicks on existing stars
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onAddAt(x, y);
  };

  // oracle star: pinned bottom-right unless none
  const oracleStar = state.oracle ? { x: 0.85, y: 0.18 } : null;

  return (
    <div
      ref={wrapRef}
      onClick={handleClick}
      className="relative w-full rounded-2xl overflow-hidden border border-white/10 cursor-crosshair select-none"
      style={{ height: size.h }}
      aria-label="Krishi Aakash interactive sky — tap anywhere to add a star"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* constellation lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${size.w} ${size.h}`}>
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.a.x * size.w} y1={l.a.y * size.h}
            x2={l.b.x * size.w} y2={l.b.y * size.h}
            stroke="hsla(45, 100%, 75%, 0.45)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}
      </svg>
      {/* user stars */}
      {state.stars.map(s => {
        const isHover = hoveredId === s.id;
        const r = 6 + s.size * 2;
        return (
          <button
            key={s.id}
            data-star
            onClick={(e) => { e.stopPropagation(); onSelect(s.id); }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}
            aria-label={s.text}
          >
            <span
              className="block rounded-full transition-all"
              style={{
                width: r * 2, height: r * 2,
                background: `radial-gradient(circle, ${KIND_COLOR[s.kind]} 0%, transparent 70%)`,
                boxShadow: `0 0 ${isHover ? 24 : 12}px ${KIND_COLOR[s.kind]}`,
                transform: isHover ? "scale(1.3)" : "scale(1)",
              }}
            />
            <span
              className="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 rounded text-[10px] whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition"
              style={{ background: "rgba(0,0,0,0.7)", color: "white", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {s.text.slice(0, 40)}{s.text.length > 40 ? "…" : ""}
            </span>
          </button>
        );
      })}
      {/* oracle star */}
      {oracleStar && (
        <motion.div
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${oracleStar.x * 100}%`, top: `${oracleStar.y * 100}%` }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          <span
            className="block rounded-full"
            style={{
              width: 30, height: 30,
              background: `radial-gradient(circle, ${KIND_COLOR.oracle} 0%, transparent 75%)`,
              boxShadow: `0 0 32px ${KIND_COLOR.oracle}`,
            }}
          />
          <span className="absolute left-1/2 top-full -translate-x-1/2 mt-2 text-[10px] tracking-widest font-display"
                style={{ color: KIND_COLOR.oracle, textShadow: "0 0 6px rgba(0,0,0,0.7)" }}>
            ORACLE
          </span>
        </motion.div>
      )}
      {/* helper text bottom */}
      <div className="absolute left-3 bottom-3 text-[11px] text-white/60 pointer-events-none flex items-center gap-1.5">
        <Plus className="h-3 w-3" /> Tap the sky to drop a star
      </div>
      <div className="absolute right-3 bottom-3 text-[11px] text-white/60 pointer-events-none">
        {state.stars.length} stars
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ───────────────────────────────────────────────────────────────────────────────
export default function KrishiAakashPage() {
  const { active } = useActiveProfile();
  const farmer = active?.full_name || "Kisan";
  const details = (active?.farmer_details || {}) as Record<string, any>;
  const location = [details.village, details.district, details.state].filter(Boolean).join(", ") || "India";
  const crop = (Array.isArray(details.current_crops) ? details.current_crops[0] : details.current_crops) || "mixed";

  const [state, setState] = useState<SkyState>(() => loadState());
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [oracleOpen, setOracleOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askQ, setAskQ] = useState("");
  const [askA, setAskA] = useState("");
  const [askLoading, setAskLoading] = useState(false);

  useEffect(() => { saveState(state); }, [state]);

  const handleAddAt = useCallback((x: number, y: number) => {
    setPending({ x, y });
    setPendingText("");
  }, []);

  const confirmAdd = async () => {
    if (!pending || !pendingText.trim()) { setPending(null); return; }
    const tempId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const star: SkyStar = {
      id: tempId, x: pending.x, y: pending.y, text: pendingText.trim(),
      kind: "observation", size: 1 + Math.random() * 1.5, createdAt: Date.now(),
    };
    setState(s => ({ ...s, stars: [...s.stars, star] }));
    setPending(null); setPendingText("");
    // async classify
    const kind = await classifyStar(star.text);
    setState(s => ({ ...s, stars: s.stars.map(x => x.id === tempId ? { ...x, kind } : x) }));
  };

  const removeStar = (id: string) => {
    setState(s => ({
      ...s,
      stars: s.stars.filter(x => x.id !== id),
      constellations: s.constellations
        .map(c => ({ ...c, starIds: c.starIds.filter(sid => sid !== id) }))
        .filter(c => c.starIds.length >= 2),
    }));
    setSelectedId(null);
  };

  const readSkyNow = async () => {
    if (state.stars.length < 3) return;
    setReadingLoading(true);
    try {
      const r = await readSky(state.stars, farmer, location, crop);
      setState(s => ({ ...s, constellations: r.constellations, oracle: r.oracle, lastReadingAt: Date.now() }));
      setOracleOpen(true);
    } catch {
      // fallback: simple proximity grouping
      const sorted = [...state.stars].sort((a, b) => a.createdAt - b.createdAt);
      const c: Constellation = {
        name: "Akash-Patha (The Sky Path)",
        starIds: sorted.slice(-Math.min(5, sorted.length)).map(s => s.id),
        insight: "Your recent moments form a path. Look for the pattern — repeated worries point to risks to address; repeated wins point to leverage.",
      };
      setState(s => ({
        ...s,
        constellations: [c],
        oracle: {
          text: "A still pond reflects the clearest sky.",
          advice: "Spend 10 minutes tomorrow morning walking your field with no phone. Log what you notice as new stars.",
        },
        lastReadingAt: Date.now(),
      }));
      setOracleOpen(true);
    } finally { setReadingLoading(false); }
  };

  const askOracle = async () => {
    if (!askQ.trim()) return;
    setAskLoading(true); setAskA("");
    const ctxStars = state.stars.slice(-12).map(s => `[${s.kind}] ${s.text}`).join("\n");
    try {
      const out = await callAi(
        `You are Krishi Aakash, a poetic farming oracle for ${farmer} in ${location} (crop: ${crop}).
Recent journal stars:
${ctxStars || "(none yet)"}

Question: "${askQ.trim()}"

Reply in 3-5 short sentences — first a poetic line, then concrete farming advice. No markdown.`
      );
      setAskA(out || "The sky is quiet tonight. Try again with a clearer question.");
    } catch {
      setAskA("The connection to the sky is dim. Trust your observation: walk the field, check soil moisture, and note what changed in the last 24 hours.");
    } finally { setAskLoading(false); }
  };

  const clearAll = () => {
    if (!confirm("Clear the entire sky? This cannot be undone.")) return;
    setState(EMPTY_STATE);
  };

  const selected = state.stars.find(s => s.id === selectedId) || null;

  // count by kind
  const counts = useMemo(() => {
    const c: Record<StarKind, number> = { action: 0, observation: 0, worry: 0, win: 0, oracle: 0 };
    state.stars.forEach(s => { c[s.kind]++; });
    return c;
  }, [state.stars]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 md:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" /> New · AI Sky Journal
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Krishi <span className="bg-gradient-to-r from-amber-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">Aakash</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl mx-auto">
            Your farm's night sky. Drop a star for every action, observation, worry, or win — let the AI weave
            them into constellations and reveal your next move.
          </p>
        </motion.header>

        {/* Sky */}
        <SkyCanvas
          state={state}
          hoveredId={selectedId}
          onAddAt={handleAddAt}
          onSelect={(id) => setSelectedId(id)}
        />

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(KIND_LABEL) as StarKind[]).filter(k => k !== "oracle").map(k => (
              <Badge key={k} variant="secondary" className="gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
                {KIND_LABEL[k]} · {counts[k]}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAskOpen(true)} className="gap-1.5">
              <Moon className="h-4 w-4" /> Ask the Sky
            </Button>
            <Button
              size="sm"
              onClick={readSkyNow}
              disabled={state.stars.length < 3 || readingLoading}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:opacity-90 text-white"
            >
              {readingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Read the Sky
            </Button>
            {state.stars.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {state.stars.length < 3 && (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Add at least 3 stars to unlock an AI sky reading.
          </p>
        )}

        {/* Oracle & constellations summary */}
        {(state.oracle || state.constellations.length > 0) && (
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {state.oracle && (
              <Card className="md:col-span-1 p-5 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-sky-500/10 border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                  <Sun className="h-4 w-4" /> <span className="text-xs font-medium tracking-wider uppercase">Oracle Star</span>
                </div>
                <p className="font-display text-lg italic">"{state.oracle.text}"</p>
                <p className="text-sm text-muted-foreground mt-3">{state.oracle.advice}</p>
              </Card>
            )}
            {state.constellations.map((c, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{c.insight}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-2">{c.starIds.length} stars</p>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state guide */}
        {state.stars.length === 0 && (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { k: "action" as StarKind, ex: "Sprayed neem on tomato rows" },
              { k: "observation" as StarKind, ex: "Yellow leaves on south plot" },
              { k: "worry" as StarKind, ex: "Rain forecast may delay sowing" },
              { k: "win" as StarKind, ex: "Sold mustard at ₹6,200/qtl" },
            ].map(({ k, ex }) => (
              <div key={k} className="p-3 rounded-xl border bg-card/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
                  <span className="text-xs font-medium uppercase tracking-wider">{KIND_LABEL[k]}</span>
                </div>
                <p className="text-sm text-muted-foreground">e.g. "{ex}"</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add-star sheet */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
            onClick={() => setPending(null)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card border rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Add a Star
                </h3>
                <button onClick={() => setPending(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                autoFocus
                value={pendingText}
                onChange={(e) => setPendingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmAdd(); }
                  if (e.key === "Escape") setPending(null);
                }}
                placeholder="What happened today? An action, observation, worry, or win…"
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
                <Button onClick={confirmAdd} disabled={!pendingText.trim()} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Drop Star
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">AI will auto-color this star based on its meaning.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected star inspector */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)] bg-card border rounded-xl p-3 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <span className="inline-block w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: KIND_COLOR[selected.kind] }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{KIND_LABEL[selected.kind]}</p>
                <p className="text-sm">{selected.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => removeStar(selected.id)} className="text-destructive h-7 w-7">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} className="h-7 w-7">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ask the Sky modal */}
      <AnimatePresence>
        {askOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setAskOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <Moon className="h-5 w-5 text-purple-400" /> Ask the Sky
                </h3>
                <button onClick={() => setAskOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                value={askQ}
                onChange={(e) => setAskQ(e.target.value)}
                placeholder="Should I delay sowing? Why are my leaves yellowing? What price to expect next month?"
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end mt-3">
                <Button onClick={askOracle} disabled={!askQ.trim() || askLoading} className="gap-1.5">
                  {askLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Consult
                </Button>
              </div>
              {askA && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-sky-500/10 border border-purple-500/20"
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{askA}</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Oracle reveal */}
      <AnimatePresence>
        {oracleOpen && state.oracle && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setOracleOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-br from-amber-950/90 via-purple-950/90 to-sky-950/90 border border-amber-500/40 rounded-2xl p-8 text-center text-white shadow-2xl"
            >
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="mx-auto w-16 h-16 rounded-full mb-4"
                style={{
                  background: `radial-gradient(circle, ${KIND_COLOR.oracle} 0%, transparent 70%)`,
                  boxShadow: `0 0 40px ${KIND_COLOR.oracle}`,
                }}
              />
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300">Oracle Star</p>
              <p className="font-display text-2xl italic mt-3">"{state.oracle.text}"</p>
              <div className="mt-5 p-4 rounded-xl bg-white/5 border border-white/10 text-left">
                <p className="text-xs uppercase tracking-wider text-amber-300 mb-1">This Week's Move</p>
                <p className="text-sm text-white/90">{state.oracle.advice}</p>
              </div>
              <Button onClick={() => setOracleOpen(false)} className="mt-5 bg-white/10 hover:bg-white/20 text-white border border-white/20">
                Return to Sky
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
