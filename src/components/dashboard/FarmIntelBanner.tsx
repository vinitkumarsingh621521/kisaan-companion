import { motion } from "framer-motion";
import { Leaf, Sun, TrendingUp, Brain, Zap, Activity } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

interface StatPillProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  live?: boolean;
}

function StatPill({ icon: Icon, label, value, color, live }: StatPillProps) {
  return (
    <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors flex-shrink-0 min-w-[160px]">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">{label}</p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
      </div>
      {live && (
        <span className="relative flex h-2 w-2 ml-auto flex-shrink-0">
          <motion.span
            animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
          />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
      )}
    </div>
  );
}

export default function FarmIntelBanner() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();

  const name = active?.full_name?.split(" ")[0] || "Farmer";
  const state = active?.farmer_details?.state || "India";
  const crop = ctx?.crops?.current?.[0] || ctx?.crops?.suitable?.[0] || "Rice";
  const weather = ctx?.weather?.forecast?.[0];
  const temp = weather ? `${weather.temp_high}°C` : "--";
  const rain = weather ? `${weather.rain_pct}%` : "--";
  const farmScore = 78;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl mb-5 bg-mesh-green border border-white/10 shadow-2xl"
    >
      {/* Mesh gradient bg layer */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl float-slow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl float-medium" />
      </div>

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative p-5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                {greeting}, {name}! 🙏
              </h2>
              <p className="text-xs text-white/60">
                {state} • {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
              </p>
            </div>
          </div>

          {/* Farm Score */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">Farm Score</span>
            <span className="text-lg font-bold text-white">
              {farmScore}<span className="text-xs text-white/50">/100</span>
            </span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${farmScore}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
              />
            </div>
          </div>
        </div>

        {/* Stat pills row */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
          <StatPill icon={Sun} label="Today's High" value={temp} color="bg-amber-500/30" live />
          <StatPill icon={Activity} label="Rain Chance" value={rain} color="bg-sky-500/30" live />
          <StatPill icon={Leaf} label="Active Crop" value={crop} color="bg-emerald-500/30" />
          <StatPill icon={TrendingUp} label="Market Trend" value="↑ Stable" color="bg-green-500/30" live />
          <StatPill icon={Brain} label="AI Insights" value="3 New" color="bg-violet-500/30" />
          <StatPill icon={Zap} label="Schemes" value="2 Matched" color="bg-orange-500/30" />
        </div>
      </div>
    </motion.div>
  );
}
