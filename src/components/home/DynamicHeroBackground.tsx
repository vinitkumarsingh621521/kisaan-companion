import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Shuffle, Pause, Play } from "lucide-react";

/**
 * DynamicHeroBackground
 * Canvas-based animated background with 5 scientifically-inspired modes:
 *  - aurora       : flowing aurora plasma (perlin-ish gradient field)
 *  - constellation: connected particle network ("agri-mycelium")
 *  - bioluminescence: drifting glowing spores
 *  - photosynthesis : radiating wave rings (light → leaf chlorophyll)
 *  - dna          : double-helix of light strands
 *
 * Auto-rotates every 18s. User can switch manually or pause rotation.
 */

type Mode = "aurora" | "constellation" | "bioluminescence" | "photosynthesis" | "dna";

const MODES: { id: Mode; label: string }[] = [
  { id: "aurora", label: "Aurora" },
  { id: "constellation", label: "Mycelium" },
  { id: "bioluminescence", label: "Spores" },
  { id: "photosynthesis", label: "Chlorophyll" },
  { id: "dna", label: "Helix" },
];

const ROTATE_MS = 18000;

export default function DynamicHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const stateRef = useRef<any>({});
  const [mode, setMode] = useState<Mode>(() => MODES[Math.floor(Math.random() * MODES.length)].id);
  const [autoRotate, setAutoRotate] = useState(true);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) return;
    const id = setInterval(() => {
      setMode((m) => {
        const idx = MODES.findIndex((x) => x.id === m);
        return MODES[(idx + 1) % MODES.length].id;
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [autoRotate]);

  // Init particles when mode changes / resize
  const init = useCallback((w: number, h: number) => {
    const m = modeRef.current;
    const s: any = { t: 0 };
    if (m === "constellation") {
      const n = Math.min(110, Math.floor((w * h) / 14000));
      s.nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.6,
      }));
    } else if (m === "bioluminescence") {
      s.spores = Array.from({ length: 70 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.4 - 0.05,
        r: Math.random() * 22 + 6,
        hue: 130 + Math.random() * 60,
        phase: Math.random() * Math.PI * 2,
      }));
    } else if (m === "photosynthesis") {
      s.rings = [];
      s.spawnTimer = 0;
    } else if (m === "dna") {
      s.strands = 80;
    } else if (m === "aurora") {
      s.blobs = Array.from({ length: 5 }, (_, i) => ({
        x: Math.random(), y: Math.random(),
        r: 0.35 + Math.random() * 0.25,
        hue: [142, 38, 200, 45, 142][i],
        spd: 0.0002 + Math.random() * 0.0004,
        phase: Math.random() * Math.PI * 2,
      }));
    }
    stateRef.current = s;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const s = stateRef.current;
      s.t += 1;
      const m = modeRef.current;

      // base wash
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "hsl(150, 30%, 6%)");
      grad.addColorStop(1, "hsl(25, 35%, 10%)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";

      if (m === "aurora") {
        for (const b of s.blobs) {
          b.phase += b.spd * 16;
          const cx = (b.x + Math.cos(b.phase) * 0.15) * w;
          const cy = (b.y + Math.sin(b.phase * 1.3) * 0.15) * h;
          const rad = b.r * Math.max(w, h);
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
          g.addColorStop(0, `hsla(${b.hue}, 80%, 55%, 0.55)`);
          g.addColorStop(0.5, `hsla(${b.hue}, 80%, 45%, 0.18)`);
          g.addColorStop(1, "hsla(0,0%,0%,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
      } else if (m === "constellation") {
        const nodes = s.nodes as any[];
        // move
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        // links
        ctx.lineWidth = 1;
        const maxD = 140;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < maxD * maxD) {
              const alpha = 1 - Math.sqrt(d2) / maxD;
              ctx.strokeStyle = `hsla(142, 70%, 55%, ${alpha * 0.45})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        // nodes
        for (const n of nodes) {
          ctx.fillStyle = "hsla(45, 90%, 65%, 0.9)";
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (m === "bioluminescence") {
        for (const sp of s.spores as any[]) {
          sp.x += sp.vx + Math.sin(s.t * 0.01 + sp.phase) * 0.2;
          sp.y += sp.vy;
          if (sp.y < -sp.r) { sp.y = h + sp.r; sp.x = Math.random() * w; }
          if (sp.x < -sp.r) sp.x = w + sp.r;
          if (sp.x > w + sp.r) sp.x = -sp.r;
          const pulse = 0.55 + 0.45 * Math.sin(s.t * 0.04 + sp.phase);
          const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r);
          g.addColorStop(0, `hsla(${sp.hue}, 90%, 65%, ${0.7 * pulse})`);
          g.addColorStop(1, "hsla(0,0%,0%,0)");
          ctx.fillStyle = g;
          ctx.fillRect(sp.x - sp.r, sp.y - sp.r, sp.r * 2, sp.r * 2);
        }
      } else if (m === "photosynthesis") {
        s.spawnTimer = (s.spawnTimer || 0) + 1;
        if (s.spawnTimer > 22) {
          s.spawnTimer = 0;
          s.rings.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 0,
            hue: 100 + Math.random() * 60,
            life: 0,
          });
        }
        s.rings = (s.rings as any[]).filter((r) => {
          r.r += 1.6;
          r.life += 1;
          const alpha = Math.max(0, 1 - r.life / 180);
          ctx.strokeStyle = `hsla(${r.hue}, 80%, 60%, ${alpha * 0.7})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
          ctx.stroke();
          return r.life < 180;
        });
      } else if (m === "dna") {
        const cx = w / 2;
        const amp = Math.min(w, 600) * 0.35;
        const cycles = 4;
        const n = s.strands;
        for (let i = 0; i < n; i++) {
          const ty = i / (n - 1);
          const y = ty * h;
          const ph = ty * Math.PI * 2 * cycles + s.t * 0.02;
          const x1 = cx + Math.sin(ph) * amp;
          const x2 = cx + Math.sin(ph + Math.PI) * amp;
          // rung
          ctx.strokeStyle = `hsla(45, 90%, 65%, ${0.15 + 0.25 * Math.abs(Math.sin(ph))})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
          // beads
          const beadGrad = (x: number, hue: number) => {
            const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
            g.addColorStop(0, `hsla(${hue}, 85%, 65%, 0.95)`);
            g.addColorStop(1, "hsla(0,0%,0%,0)");
            return g;
          };
          ctx.fillStyle = beadGrad(x1, 142);
          ctx.fillRect(x1 - 9, y - 9, 18, 18);
          ctx.fillStyle = beadGrad(x2, 38);
          ctx.fillRect(x2 - 9, y - 9, 18, 18);
        }
      }

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [init]);

  // re-init particles when mode changes
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    init(c.clientWidth, c.clientHeight);
  }, [mode, init]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden
      />
      {/* readability vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-krishi-soil/80 via-krishi-soil/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-krishi-soil/70 via-transparent to-krishi-soil/20 pointer-events-none" />

      {/* Mode switcher */}
      <div className="absolute top-24 right-4 md:right-6 z-20 flex flex-col items-end gap-2">
        <div className="glass-card bg-card/15 backdrop-blur-xl border-krishi-wheat/20 px-3 py-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-krishi-gold" />
          <span className="text-xs font-medium text-krishi-wheat hidden sm:inline">
            Live Background
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={mode}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-xs text-krishi-gold font-semibold"
            >
              · {MODES.find((m) => m.id === mode)?.label}
            </motion.span>
          </AnimatePresence>
          <button
            onClick={() => setAutoRotate((v) => !v)}
            className="ml-1 p-1 rounded hover:bg-krishi-wheat/10 text-krishi-wheat/80"
            aria-label={autoRotate ? "Pause rotation" : "Resume rotation"}
            title={autoRotate ? "Pause rotation" : "Resume rotation"}
          >
            {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => {
              const idx = MODES.findIndex((m) => m.id === mode);
              setMode(MODES[(idx + 1) % MODES.length].id);
            }}
            className="p-1 rounded hover:bg-krishi-wheat/10 text-krishi-wheat/80"
            aria-label="Shuffle background"
            title="Shuffle background"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="hidden md:flex gap-1 glass-card bg-card/10 backdrop-blur-xl border-krishi-wheat/10 px-2 py-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`text-[10px] px-2 py-1 rounded-full transition-all ${
                mode === m.id
                  ? "bg-krishi-gold text-krishi-soil font-semibold"
                  : "text-krishi-wheat/70 hover:bg-krishi-wheat/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
