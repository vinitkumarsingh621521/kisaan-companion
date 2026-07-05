import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Compass, Moon, Music, Star, CloudSun } from "lucide-react";
import RouteSkeleton from "@/components/RouteSkeleton";

// Reuse existing pages as tab panels — zero logic changes to them.
const KrishiMandalaPage  = lazy(() => import("./KrishiMandalaPage"));
const MausamYantraPage   = lazy(() => import("./MausamYantraPage"));
const KrishiSwapnaPage   = lazy(() => import("./KrishiSwapnaPage"));
const KrishiRaagPage     = lazy(() => import("./KrishiRaagPage"));
const KrishiAakashPage   = lazy(() => import("./KrishiAakashPage"));

type TabId = "mandala" | "yantra" | "swapna" | "raag" | "aakash";

const TABS: Array<{
  id: TabId;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;      // pill active bg
  ringGlow: string;      // radial glow behind hero
  accent: string;        // dot color
  Component: React.LazyExoticComponent<React.ComponentType>;
}> = [
  { id: "mandala", label: "Krishi Mandala", sub: "Monthly wheel & ritual calendar", icon: Compass,
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    ringGlow: "from-emerald-400/40 via-teal-400/20 to-transparent",
    accent: "bg-emerald-400", Component: KrishiMandalaPage },
  { id: "yantra",  label: "Mausam Yantra",  sub: "Elemental weather intelligence",   icon: CloudSun,
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    ringGlow: "from-sky-400/40 via-blue-400/20 to-transparent",
    accent: "bg-sky-400", Component: MausamYantraPage },
  { id: "swapna",  label: "Krishi Swapna",  sub: "Farm oracle & dream guide",        icon: Moon,
    gradient: "from-violet-500 via-fuchsia-500 to-pink-500",
    ringGlow: "from-violet-400/40 via-fuchsia-400/20 to-transparent",
    accent: "bg-fuchsia-400", Component: KrishiSwapnaPage },
  { id: "raag",    label: "Krishi Raag",    sub: "AI-generated farming raag",        icon: Music,
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    ringGlow: "from-amber-400/40 via-orange-400/20 to-transparent",
    accent: "bg-amber-400", Component: KrishiRaagPage },
  { id: "aakash",  label: "Krishi Aakash",  sub: "Star map & constellation guide",   icon: Star,
    gradient: "from-indigo-500 via-purple-500 to-slate-700",
    ringGlow: "from-indigo-400/40 via-purple-400/20 to-transparent",
    accent: "bg-indigo-400", Component: KrishiAakashPage },
];

function CosmosStarfield() {
  const stars = useMemo(
    () => Array.from({ length: 60 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 1.6 + 0.4,
      d: Math.random() * 4 + 2,
    })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((st, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/70"
          style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: st.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }}
        />
      ))}
    </div>
  );
}

export default function KrishiCosmosPage() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as TabId) || "mandala";
  const [active, setActive] = useState<TabId>(
    TABS.some((t) => t.id === initial) ? initial : "mandala"
  );

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("tab", active);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const current = TABS.find((t) => t.id === active) ?? TABS[0];
  const Icon = current.icon;

  return (
    <div className="relative min-h-screen">
      {/* Cosmic hero */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white">
        <CosmosStarfield />
        <motion.div
          key={current.id + "-glow"}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full blur-3xl bg-gradient-radial ${current.ringGlow}`}
          style={{
            background: `radial-gradient(closest-side, hsl(0 0% 100% / .18), transparent 70%)`,
          }}
        />
        <div className="container mx-auto max-w-6xl px-4 py-14 md:py-20 relative">
          <motion.div
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-4"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-white/70 border border-white/20 rounded-full px-3 py-1 backdrop-blur">
              <Sparkles className="h-3 w-3" /> Krishi Cosmos
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
              Five sacred instruments,{" "}
              <span className={`bg-gradient-to-r ${current.gradient} bg-clip-text text-transparent`}>
                one living cosmos
              </span>
            </h1>
            <p className="max-w-2xl text-white/70 text-sm md:text-base">
              The wheel, the winds, the dream, the raag, and the stars — every rhythm of the Indian
              farm, reimagined into a single interactive universe.
            </p>

            {/* Active-tab caption */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id + "-caption"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mt-2 inline-flex items-center gap-2 text-sm text-white/85"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${current.accent} animate-pulse`} />
                <Icon className="h-4 w-4" />
                <span className="font-medium">{current.label}</span>
                <span className="text-white/50">— {current.sub}</span>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Sticky tab rail */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-2 md:px-4">
          <div
            role="tablist"
            aria-label="Krishi Cosmos sections"
            className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-none"
          >
            {TABS.map((t) => {
              const TabIcon = t.icon;
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(t.id)}
                  className={`relative shrink-0 group flex items-center gap-2 rounded-full px-3.5 md:px-4 py-2 text-sm font-medium transition-colors btn-press
                    ${isActive
                      ? "text-white"
                      : "text-muted-foreground hover:text-foreground"}
                  `}
                >
                  {isActive && (
                    <motion.span
                      layoutId="cosmos-tab-pill"
                      className={`absolute inset-0 rounded-full bg-gradient-to-r ${t.gradient} shadow-lg`}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <TabIcon className="h-4 w-4" />
                    <span className="whitespace-nowrap">{t.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Animated tab panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<RouteSkeleton />}>
            <current.Component />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
