import { motion } from "framer-motion";

interface ColorfulPageBannerProps {
  emoji: string;
  title: string;
  subtitle: string;
  /** Tailwind gradient classes, e.g. "from-emerald-900 via-teal-900 to-green-900" */
  gradient: string;
  stat?: { label: string; value: string; emoji: string };
  badge?: string;
}

export default function ColorfulPageBanner({
  emoji,
  title,
  subtitle,
  gradient,
  stat,
  badge,
}: ColorfulPageBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-3xl mb-6 bg-gradient-to-br ${gradient} bg-animated-gradient border border-white/10 shadow-2xl`}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />

      {/* Watermark emoji */}
      <div
        className="absolute -right-6 -bottom-10 text-[12rem] leading-none opacity-10 select-none pointer-events-none"
        aria-hidden
      >
        {emoji}
      </div>

      {/* Glow blob */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/15 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Left: icon + text */}
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-3xl sm:text-4xl shadow-lg">
            {emoji}
          </div>
          <div className="min-w-0">
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-[10px] uppercase tracking-wider font-semibold text-white mb-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                {badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white leading-tight">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-white/75 mt-1.5 max-w-2xl">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: stat */}
        {stat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="flex-shrink-0 px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center min-w-[140px]"
          >
            <div className="text-2xl sm:text-3xl font-display font-bold text-white whitespace-nowrap">
              <span className="mr-1">{stat.emoji}</span>
              {stat.value}
            </div>
            <p className="text-[11px] uppercase tracking-wider text-white/70 mt-1 font-semibold">
              {stat.label}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
