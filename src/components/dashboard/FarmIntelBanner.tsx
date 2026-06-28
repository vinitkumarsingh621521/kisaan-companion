import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Leaf, TrendingUp, Brain, Zap, Activity, Wifi } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

function LiveDot({ color = "bg-emerald-400" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <motion.span
        animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0.1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inline-flex h-full w-full rounded-full ${color}`}
      />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

interface Metric {
  key: string;
  icon: typeof Leaf;
  label: string;
  value: string;
  color: string;
  textColor: string;
  live?: boolean;
}

export default function FarmIntelBanner() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const name = active?.full_name?.split(" ")[0] || "Farmer";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const weather = ctx?.weather?.forecast?.[0];
  const temp = weather ? `${weather.temp_high}°C` : "32°C";
  const crop = ctx?.crops?.current?.[0] || ctx?.crops?.suitable?.[0] || "Rice";

  const metrics: Metric[] = [
    { key: "score", icon: Activity, label: "Farm Score", value: "76/100", color: "from-green-600 to-emerald-700", textColor: "text-green-300", live: true },
    { key: "weather", icon: Zap, label: "Weather", value: `Sunny ${temp}`, color: "from-amber-600 to-orange-700", textColor: "text-amber-300", live: true },
    { key: "crop", icon: Leaf, label: "Top Crop", value: crop, color: "from-teal-600 to-cyan-700", textColor: "text-teal-300", live: true },
    { key: "market", icon: TrendingUp, label: "Market Signal", value: "Bullish ↑", color: "from-violet-600 to-purple-700", textColor: "text-violet-300" },
    { key: "ai", icon: Brain, label: "AI Ready", value: "5 insights", color: "from-rose-600 to-pink-700", textColor: "text-rose-300" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl mb-5 border border-white/10 shadow-2xl bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950"
    >
      {/* Animated gradient sweep */}
      <div
        className="absolute inset-0 opacity-50 bg-animated-gradient pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(16,185,129,0.18), rgba(20,184,166,0.10), rgba(245,158,11,0.12), rgba(16,185,129,0.18))",
        }}
        aria-hidden
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative p-5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
              className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-2xl shadow-lg"
            >
              🙏
            </motion.div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                {greeting}, {name}!
              </h2>
              <p className="text-xs text-white/60">
                {active?.farmer_details?.state || "India"} ·{" "}
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 backdrop-blur-md">
            <Wifi className="h-3 w-3 text-emerald-300" />
            <LiveDot />
            <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">
              Live
            </span>
          </div>
        </div>

        {/* Metric pills row */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors flex-shrink-0 min-w-[170px]"
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">
                    {m.label}
                  </p>
                  <p className={`text-sm font-bold ${m.textColor} truncate`}>
                    {m.value}
                  </p>
                </div>
                {m.live && <LiveDot />}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
