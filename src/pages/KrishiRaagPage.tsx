import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Music, Sparkles, Download, Wind, Sun, Cloud, Moon, Flame, Droplets } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

// Indian raga scales (semitone offsets from tonic)
type Raga = { key: string; name: string; hindi: string; mood: string; scale: number[]; tempo: number; Icon: typeof Sun; hue: number };
const RAGAS: Raga[] = [
  { key: "bhairav",  name: "Dawn",   hindi: "Bhairav",   mood: "Reverence at sunrise — for sowing day",  scale: [0, 1, 4, 5, 7, 8, 11], tempo: 70,  Icon: Sun,      hue: 28  },
  { key: "yaman",    name: "Dusk",   hindi: "Yaman",     mood: "Soft evening — for tending & reflection", scale: [0, 2, 4, 6, 7, 9, 11], tempo: 64,  Icon: Moon,     hue: 260 },
  { key: "miyan",    name: "Rain",   hindi: "Miyan Malhar", mood: "Monsoon longing — for the first drop", scale: [0, 2, 3, 5, 7, 9, 10], tempo: 60,  Icon: Droplets, hue: 200 },
  { key: "deepak",   name: "Fire",   hindi: "Deepak",    mood: "Drought defiance — for stubborn fields",  scale: [0, 4, 5, 7, 9, 11],     tempo: 88,  Icon: Flame,    hue: 8   },
  { key: "megh",     name: "Cloud",  hindi: "Megh",      mood: "Gathering sky — for pre-harvest weeks",   scale: [0, 2, 5, 7, 10],        tempo: 56,  Icon: Cloud,    hue: 220 },
  { key: "vayu",     name: "Wind",   hindi: "Vayu Sangam", mood: "Open plains — for the long walk home",  scale: [0, 3, 5, 7, 10],        tempo: 76,  Icon: Wind,     hue: 160 },
];

const CROPS = ["Rice", "Wheat", "Cotton", "Sugarcane", "Maize", "Mustard", "Tomato", "Chilli", "Soybean", "Groundnut"];

type Anthem = { ragaKey: string; crop: string; lyrics: string[]; signature: string };

async function callAi(prompt: string): Promise<string> {
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

const FALLBACK_LYRICS: Record<string, string[]> = {
  bhairav: ["Suraj ne mitti ko chhua,", "beej ne saanson ko suna —", "kal jo bona hai, woh aaj likh.", "Khet sunta hai, tu likhta ja."],
  yaman:   ["Shaam ki hawa, paani ka geet,", "patta-patta lautega meet.", "Aaj ka shram, kal ka phool —", "thodi der ruk, sab kuch kabool."],
  miyan:   ["Pehli boond, mitti ka raag,", "kheton mein jaagta hai bhaag.", "Naali kholo, naam likho —", "baadal ki chitthi padho, padho."],
  deepak:  ["Suraj jhulsa, par main khada,", "har ek darar mein beej bada.", "Mulch bichha, jadon ko dhak —", "agan ke aage bhi hai sadak."],
  megh:    ["Aasman ke neeche khada main akela,", "fasal ki chitthi, mausam ka mela.", "Kaat ke rakh, taraazu seedha —", "mandi ka bhav, kisaan ki neenda."],
  vayu:    ["Hawa ne kaha, ja chal abhi,", "khet tera tujhe pukaar raha kabhi.", "Spray dawn pe, sham pe na —", "udte rasayan, jeb pe sazaa."],
};

const FALLBACK_SIG = "Where the wind reads your fields, the soil writes back in green.";

/* ---------------- WEB AUDIO ENGINE ---------------- */
class RaagEngine {
  ctx: AudioContext;
  master: GainNode;
  drone?: OscillatorNode[];
  droneGain?: GainNode;
  reverb?: ConvolverNode;
  playing = false;
  scheduler?: number;
  raga: Raga;
  rmsCb?: (v: number) => void;
  analyser?: AnalyserNode;
  rafId?: number;

  constructor(raga: Raga) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.25;
    this.master.connect(this.ctx.destination);
    this.raga = raga;
  }

  // simple impulse-response reverb
  private makeReverb(seconds = 2.4, decay = 2.6) {
    const rate = this.ctx.sampleRate;
    const length = rate * seconds;
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  setRMSCallback(cb: (v: number) => void) { this.rmsCb = cb; }

  start() {
    if (this.playing) return;
    this.playing = true;
    if (this.ctx.state === "suspended") this.ctx.resume();

    this.reverb = this.makeReverb();
    const revGain = this.ctx.createGain(); revGain.gain.value = 0.5;
    this.reverb.connect(revGain).connect(this.master);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.master.connect(this.analyser);

    // Tanpura drone — two octaves of tonic + fifth
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0;
    this.droneGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.5);
    this.droneGain.connect(this.master);
    this.droneGain.connect(this.reverb);

    const tonic = 146.83; // D3
    const freqs = [tonic, tonic * 1.5, tonic * 2, tonic * 3];
    this.drone = freqs.map((f) => {
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      // Slow detune for shimmer
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.15;
      lfoGain.gain.value = 1.6;
      lfo.connect(lfoGain).connect(o.detune);
      lfo.start();
      o.connect(this.droneGain!);
      o.start();
      return o;
    });

    // Melodic scheduler
    const beat = 60 / this.raga.tempo;
    let step = 0;
    const tonicHz = tonic * 2; // octave up for melody
    const scale = this.raga.scale;
    const tick = () => {
      if (!this.playing) return;
      const now = this.ctx.currentTime;
      // weighted random walk
      const useTonic = Math.random() < 0.18;
      const idx = useTonic ? 0 : scale[Math.floor(Math.random() * scale.length)];
      const oct = Math.random() < 0.2 ? 2 : 1;
      const freq = tonicHz * Math.pow(2, idx / 12) * oct;
      this.pluck(freq, now, beat * (Math.random() < 0.3 ? 1.5 : 1));
      step++;
      this.scheduler = window.setTimeout(tick, beat * 1000 * (Math.random() < 0.25 ? 1.5 : 1));
    };
    tick();

    // RMS loop
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    const loop = () => {
      if (!this.playing || !this.analyser) return;
      this.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / data.length);
      this.rmsCb?.(rms);
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  private pluck(freq: number, when: number, dur: number) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    const peak = 0.22;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 1.2);
    o.connect(g);
    g.connect(this.master);
    if (this.reverb) g.connect(this.reverb);
    o.start(when);
    o.stop(when + dur * 1.4);
    // gentle bell partial
    const o2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0, when);
    g2.gain.linearRampToValueAtTime(peak * 0.35, when + 0.015);
    g2.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o2.connect(g2);
    if (this.reverb) g2.connect(this.reverb);
    g2.connect(this.master);
    o2.start(when);
    o2.stop(when + dur * 1.2);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    if (this.scheduler) clearTimeout(this.scheduler);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const now = this.ctx.currentTime;
    if (this.droneGain) this.droneGain.gain.linearRampToValueAtTime(0, now + 1.2);
    this.drone?.forEach((o) => o.stop(now + 1.4));
    setTimeout(() => { this.ctx.close().catch(() => {}); }, 1600);
  }
}

/* ---------------- PAGE ---------------- */
export default function KrishiRaagPage() {
  const [raga, setRaga] = useState<Raga>(RAGAS[0]);
  const [crop, setCrop] = useState("Rice");
  const [playing, setPlaying] = useState(false);
  const [anthem, setAnthem] = useState<Anthem | null>(null);
  const [loading, setLoading] = useState(false);
  const [rms, setRms] = useState(0);
  const engineRef = useRef<RaagEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rmsRef = useRef(0);

  // Visualizer canvas
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    let t = 0;
    const particles = Array.from({ length: 110 }).map(() => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 2 + 0.5, s: Math.random() * 0.4 + 0.1,
    }));
    const draw = () => {
      t += 0.012;
      const w = c.width, h = c.height;
      const energy = rmsRef.current; // 0..~0.4
      // background
      ctx.fillStyle = "rgba(8,6,22,0.22)";
      ctx.fillRect(0, 0, w, h);
      // central pulsating mandala
      const cx = w / 2, cy = h / 2;
      const baseR = Math.min(w, h) * 0.18 + energy * Math.min(w, h) * 0.7;
      for (let k = 0; k < 5; k++) {
        const r = baseR * (1 + k * 0.18) + Math.sin(t * 1.3 + k) * 6 * dpr;
        const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
        grad.addColorStop(0, `hsla(${raga.hue}, 90%, 70%, ${0.18 - k * 0.03 + energy * 0.4})`);
        grad.addColorStop(1, `hsla(${(raga.hue + 40) % 360}, 80%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      }
      // petals
      const petals = 12;
      for (let i = 0; i < petals; i++) {
        const ang = (i / petals) * Math.PI * 2 + t * 0.4;
        const rr = baseR * (1.1 + 0.18 * Math.sin(t * 2 + i));
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        ctx.fillStyle = `hsla(${(raga.hue + i * 12) % 360}, 95%, 70%, ${0.5 + energy})`;
        ctx.beginPath(); ctx.arc(x, y, 2.5 * dpr + energy * 22 * dpr, 0, Math.PI * 2); ctx.fill();
      }
      // particles
      particles.forEach((p) => {
        p.y -= p.s * (0.0015 + energy * 0.01);
        if (p.y < 0) { p.y = 1; p.x = Math.random(); }
        ctx.fillStyle = `hsla(${(raga.hue + 30) % 360}, 90%, 80%, ${0.4 + energy})`;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r * dpr, 0, Math.PI * 2); ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [raga.hue]);

  // Stop on unmount / raga switch
  useEffect(() => () => { engineRef.current?.stop(); }, []);

  function togglePlay() {
    if (playing) {
      engineRef.current?.stop();
      engineRef.current = null;
      setPlaying(false);
      setRms(0); rmsRef.current = 0;
      return;
    }
    const e = new RaagEngine(raga);
    e.setRMSCallback((v) => { rmsRef.current = v; setRms(v); });
    e.start();
    engineRef.current = e;
    setPlaying(true);
  }

  function switchRaga(r: Raga) {
    if (r.key === raga.key) return;
    const wasPlaying = playing;
    engineRef.current?.stop();
    engineRef.current = null;
    setPlaying(false);
    setRaga(r);
    setAnthem(null);
    if (wasPlaying) {
      setTimeout(() => {
        const e = new RaagEngine(r);
        e.setRMSCallback((v) => { rmsRef.current = v; setRms(v); });
        e.start();
        engineRef.current = e;
        setPlaying(true);
      }, 200);
    }
  }

  async function composeAnthem() {
    setLoading(true);
    try {
      const prompt = `Write a 4-line Hinglish farming anthem in the spirit of raga "${raga.hindi}" (${raga.mood}) for a ${crop} farmer. Each line ≤ 10 words. Sensory, grounded, no clichés. Then a 1-line English "signature" (max 14 words) that captures the field's soul.
Return STRICT JSON: { "lyrics": ["l1","l2","l3","l4"], "signature": "..." }`;
      const raw = await callAi(prompt);
      const parsed = parseJson<{ lyrics: string[]; signature: string }>(raw);
      const lyrics = parsed?.lyrics?.length === 4 ? parsed.lyrics : FALLBACK_LYRICS[raga.key];
      const signature = parsed?.signature || FALLBACK_SIG;
      setAnthem({ ragaKey: raga.key, crop, lyrics, signature });
    } catch {
      setAnthem({ ragaKey: raga.key, crop, lyrics: FALLBACK_LYRICS[raga.key], signature: FALLBACK_SIG });
      toast.error("Composer offline — using village wisdom.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCard() {
    if (!anthem) return;
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, `hsl(${raga.hue}, 70%, 22%)`);
    grad.addColorStop(1, `hsl(${(raga.hue + 60) % 360}, 60%, 8%)`);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 60; i++) ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
    ctx.fillStyle = "rgba(251,191,36,0.85)";
    ctx.font = "600 36px serif"; ctx.fillText("॥ KRISHI RAAG ॥", 80, 130);
    ctx.fillStyle = "white";
    ctx.font = "bold 84px serif"; ctx.fillText(raga.hindi, 80, 250);
    ctx.font = "italic 32px serif"; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillText(`for the ${crop} farmer`, 80, 300);
    ctx.fillStyle = "white"; ctx.font = "44px serif";
    anthem.lyrics.forEach((l, i) => ctx.fillText(l, 80, 500 + i * 80));
    ctx.fillStyle = "rgba(251,191,36,0.9)"; ctx.font = "italic 30px serif";
    const sig = anthem.signature;
    const words = sig.split(" "); let line = ""; let y = 1080;
    words.forEach((w) => {
      const test = line + w + " ";
      if (ctx.measureText(test).width > 920) { ctx.fillText(line.trim(), 80, y); line = w + " "; y += 44; }
      else line = test;
    });
    if (line) ctx.fillText(line.trim(), 80, y);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "24px sans-serif";
    ctx.fillText("krishimitra · raag generated for your field", 80, 1280);
    const url = c.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = `krishi-raag-${raga.key}-${crop.toLowerCase()}.png`; a.click();
    toast.success("Anthem card saved to gallery.");
  }

  const RagaIcon = raga.Icon;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#080616] text-white">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 w-full h-full" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-[#080616]/60 pointer-events-none" />
      <div className="relative z-10">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs">
              <Music className="h-3 w-3" /> Krishi Raag — Your Field's Anthem
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mt-3 bg-gradient-to-r from-amber-200 via-rose-200 to-violet-200 bg-clip-text text-transparent">
              Listen to what your soil is humming.
            </h1>
            <p className="text-white/60 mt-2 text-sm max-w-2xl mx-auto">
              Each raga is a living, generative composition — drone, melody, and a four-line anthem written by AI for your crop and your season.
            </p>
          </motion.div>

          {/* Raga selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
            {RAGAS.map((r) => {
              const active = r.key === raga.key;
              const Ico = r.Icon;
              return (
                <button
                  key={r.key}
                  onClick={() => switchRaga(r)}
                  className={`group p-3 rounded-xl border text-left transition-all ${
                    active ? "border-white/60 bg-white/10 shadow-[0_0_24px_rgba(255,255,255,0.15)]" : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                  style={active ? { boxShadow: `0 0 30px hsla(${r.hue},90%,60%,0.45)` } : {}}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center"
                         style={{ background: `hsla(${r.hue},80%,55%,0.25)`, color: `hsl(${r.hue},90%,80%)` }}>
                      <Ico className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-white/50">{r.name}</div>
                      <div className="text-sm font-bold">{r.hindi}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-white/60 leading-snug">{r.mood}</div>
                </button>
              );
            })}
          </div>

          {/* Controls */}
          <div className="rounded-2xl p-5 bg-white/5 border border-white/10 backdrop-blur mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                     style={{ background: `hsla(${raga.hue},80%,55%,0.25)`, color: `hsl(${raga.hue},90%,80%)` }}>
                  <RagaIcon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest text-white/50">Now tuning</div>
                  <div className="text-lg font-bold truncate">Raag {raga.hindi} · {raga.tempo} bpm</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/50"
                >
                  {CROPS.map((c) => <option key={c} value={c} className="bg-[#080616]">{c}</option>)}
                </select>

                <Button
                  onClick={togglePlay}
                  size="lg"
                  className="bg-white text-black hover:bg-white/90 font-semibold"
                >
                  {playing ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play</>}
                </Button>

                <Button
                  onClick={composeAnthem}
                  disabled={loading}
                  size="lg"
                  className="bg-gradient-to-r from-amber-400 to-rose-500 text-black font-bold shadow-[0_0_24px_rgba(251,191,36,0.4)]"
                >
                  <Sparkles className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Composing..." : "Write Anthem"}
                </Button>
              </div>
            </div>

            {/* RMS bar */}
            <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full transition-[width] duration-75"
                style={{
                  width: `${Math.min(100, rms * 280)}%`,
                  background: `linear-gradient(90deg, hsl(${raga.hue},90%,60%), hsl(${(raga.hue + 60) % 360},90%,70%))`,
                }}
              />
            </div>
          </div>

          {/* Anthem card */}
          <AnimatePresence mode="wait">
            {anthem && (
              <motion.div
                key={anthem.ragaKey + anthem.crop + anthem.lyrics[0]}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-3xl p-6 md:p-10 border backdrop-blur-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, hsla(${raga.hue},70%,40%,0.25), rgba(8,6,22,0.6))`,
                  borderColor: `hsla(${raga.hue},80%,60%,0.4)`,
                  boxShadow: `0 0 60px hsla(${raga.hue},90%,50%,0.25)`,
                }}
              >
                <div className="absolute inset-0 opacity-30 pointer-events-none"
                     style={{ background: `radial-gradient(circle at 80% 20%, hsla(${raga.hue},90%,70%,0.4), transparent 60%)` }} />
                <div className="relative">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">॥ Anthem of the {crop} field ॥</div>
                  <div className="text-3xl md:text-4xl font-display font-bold mb-6"
                       style={{ color: `hsl(${raga.hue},90%,82%)` }}>
                    Raag {raga.hindi}
                  </div>
                  <div className="space-y-3 mb-6">
                    {anthem.lyrics.map((l, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="text-xl md:text-2xl font-serif leading-relaxed"
                      >
                        {l}
                      </motion.p>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                    className="pt-4 border-t border-white/15 italic text-white/70 text-sm md:text-base"
                  >
                    “{anthem.signature}”
                  </motion.div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button onClick={downloadCard} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <Download className="h-4 w-4" /> Save as poster
                    </Button>
                    <Button onClick={composeAnthem} variant="outline" disabled={loading}
                            className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                      <Sparkles className="h-4 w-4" /> Re-compose
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!anthem && (
            <div className="text-center text-white/40 text-sm py-8">
              Choose a raga, press Play, then "Write Anthem" to receive your field's verse.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
