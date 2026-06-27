import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useXP } from "@/hooks/useXP";
import { useAuth } from "@/hooks/useAuth";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";
import { errMsg } from "@/lib/errors";

const ALL_BADGES = [
  { id: "first_login", name: "First Steps", desc: "Sign in for the first time", xp: 10, emoji: "🎉" },
  { id: "profile_50", name: "Half Filled", desc: "Complete 50% of your profile", xp: 30, emoji: "📝" },
  { id: "profile_100", name: "Profile Pro", desc: "Fully complete your profile", xp: 100, emoji: "🏆" },
  { id: "first_chat", name: "Curious Kisaan", desc: "Ask the AI advisor your first question", xp: 20, emoji: "🤖" },
  { id: "first_scan", name: "Disease Detective", desc: "Run your first disease scan", xp: 25, emoji: "🦠" },
  { id: "first_report", name: "Report Maestro", desc: "Generate your first PDF report", xp: 30, emoji: "📄" },
  { id: "multi_profile", name: "Multi-Farm Boss", desc: "Manage 2+ farmer profiles", xp: 40, emoji: "👥" },
  { id: "organic_pioneer", name: "Organic Pioneer", desc: "Mark your farm as organic", xp: 50, emoji: "🌱" },
  { id: "water_saver", name: "Water Saver", desc: "Use drip irrigation", xp: 50, emoji: "💧" },
  { id: "early_bird", name: "Early Bird", desc: "Plan crops 30 days before season", xp: 40, emoji: "🌅" },
  { id: "iot_connect", name: "IoT Ninja", desc: "Connect a soil sensor", xp: 60, emoji: "🛰️" },
  { id: "field_mapper", name: "Cartographer", desc: "Map all your fields", xp: 35, emoji: "📍" },
];

function fireConfetti() {
  const end = Date.now() + 800;
  const colors = ["#22c55e", "#fbbf24", "#3b82f6", "#a855f7", "#ef4444"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function AchievementsPage() {
  const { active, completionPct, profiles } = useActiveProfile();
  const { user } = useAuth();
  const { data: xpRow, addXP } = useXP();
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!active) return;
    const auto: string[] = ["first_login"];
    if (completionPct >= 50) auto.push("profile_50");
    if (completionPct >= 95) auto.push("profile_100");
    if (profiles.length >= 2) auto.push("multi_profile");
    if (active.farmer_details?.farming_type?.toString().includes("Organic")) auto.push("organic_pioneer");
    if (active.farmer_details?.irrigation_type?.toString().includes("Drip")) auto.push("water_saver");
    auto.forEach((id) => awardBadge(id, seenRef.current));
    seenRef.current = true;
    // eslint-disable-next-line
  }, [active, completionPct, profiles.length]);

  const load = async () => {
    const { data } = await supabase.from("achievements").select("*");
    setEarned(new Set((data || []).map((a: { badge_id: string }) => a.badge_id)));
  };

  const awardBadge = async (badgeId: string, silent = false) => {
    if (earned.has(badgeId)) return;
    const badge = ALL_BADGES.find((b) => b.id === badgeId);
    if (!badge || !user) return;
    const { data, error } = await supabase.rpc("award_badge", { _badge_id: badgeId });
    const res = data as { awarded?: boolean; already_earned?: boolean } | null;
    if (!error && res?.awarded) {
      setEarned((prev) => new Set(prev).add(badge.id));
      await addXP(badge.xp);
      if (!silent) {
        toast.success(`🏆 New badge: ${badge.name}! +${badge.xp} XP`);
        fireConfetti();
      }
    } else if (!error && res?.already_earned) {
      setEarned((prev) => new Set(prev).add(badge.id));
    }
  };

  const totalXp = xpRow?.xp ?? 0;
  const level = xpRow?.level ?? 1;
  const streak = xpRow?.streak_days ?? 1;
  const xpInLevel = totalXp % 500;
  const ringPct = (xpInLevel / 500) * 100;
  const ringCirc = 2 * Math.PI * 70;
  const ringDash = (ringPct / 100) * ringCirc;

  const shareCard = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const png = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = png;
      a.download = `KrishiMitra_Achievements_${Date.now()}.png`;
      a.click();
      toast.success("Achievement card downloaded — share it!");
    } catch (e: unknown) {
      toast.error("Export failed: " + errMsg(e));
    } finally { setSharing(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl" ref={cardRef}>
          {/* HERO */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-emerald-50 p-6 md:p-10 mb-8 shadow-xl"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
            />
            <div className="pointer-events-none absolute -top-20 -right-16 w-80 h-80 rounded-full bg-amber-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-teal-400/20 blur-3xl" />

            <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-6 md:gap-8 items-center">
              {/* XP Ring */}
              <div className="relative w-44 h-44 mx-auto md:mx-0">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.15)" strokeWidth="10" fill="none" />
                  <circle
                    cx="80" cy="80" r="70" fill="none"
                    stroke="url(#xpGrad)" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${ringDash} ${ringCirc}`}
                    style={{ transition: "stroke-dasharray .8s ease" }}
                  />
                  <defs>
                    <linearGradient id="xpGrad" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#fcd34d" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-5xl leading-none">{level}</div>
                  <div className="text-[11px] uppercase tracking-wider text-emerald-200/80 mt-1">Level</div>
                </div>
              </div>

              {/* Stats */}
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold border border-white/20 mb-3">
                  🏆 {earned.size} Badges Earned
                </div>
                <h1 className="font-display text-3xl md:text-4xl mb-1">Your Farming Journey</h1>
                <p className="text-emerald-100/80 text-sm mb-5">
                  {totalXp} XP total · Level {level} Farmer
                </p>
                <div className="mb-2 flex justify-between text-[11px] text-emerald-100/80">
                  <span>{xpInLevel} XP</span>
                  <span>{500 - xpInLevel} XP to Level {level + 1}</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mb-5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-300 to-emerald-300"
                    initial={{ width: 0 }} animate={{ width: `${ringPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { emoji: "🔥", label: "Streak", value: `${streak}d` },
                    { emoji: "✅", label: "Earned", value: `${earned.size}/${ALL_BADGES.length}` },
                    { emoji: "⭐", label: "Total XP", value: totalXp.toLocaleString() },
                  ].map(({ emoji, label, value }) => (
                    <div key={label} className="px-3 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/15">
                      <div className="text-lg">{emoji}</div>
                      <div className="text-[10px] text-emerald-200/80 uppercase tracking-wider mt-0.5">{label}</div>
                      <div className="text-sm font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share */}
              <div className="flex md:flex-col gap-2 justify-center">
                <Button
                  onClick={shareCard} disabled={sharing}
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur gap-2"
                >
                  {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Share
                </Button>
              </div>
            </div>
          </motion.div>

          {/* BADGES GRID */}
          <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
            🎖️ All Badges <span className="text-sm text-muted-foreground">({earned.size}/{ALL_BADGES.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
            {ALL_BADGES.map((badge, i) => {
              const isEarned = earned.has(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  title={badge.desc}
                  className={`relative rounded-2xl p-4 text-center border transition-all duration-200 ${
                    isEarned
                      ? "bg-card border-amber-300/50 shadow-[0_4px_20px_-6px_rgba(251,191,36,0.4)] hover:-translate-y-1"
                      : "bg-muted/40 border-border opacity-60 hover:opacity-80"
                  }`}
                >
                  {isEarned && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-200/20 via-transparent to-emerald-200/20 pointer-events-none" />
                  )}
                  <div className={`relative text-5xl mb-2 transition-transform ${isEarned ? "" : "grayscale"}`}>
                    {isEarned ? badge.emoji : "🔒"}
                  </div>
                  <div className="relative text-sm font-semibold text-foreground leading-tight">{badge.name}</div>
                  <div className="relative text-[10px] text-muted-foreground mt-1 line-clamp-2">{badge.desc}</div>
                  <div className={`relative mt-2.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isEarned ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-muted text-muted-foreground"
                  }`}>+{badge.xp} XP</div>
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isEarned ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>{isEarned ? "✓" : "🔒"}</div>
                </motion.div>
              );
            })}
          </div>

          {/* LEVEL ROAD */}
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 mb-6">
            <h2 className="font-display text-2xl text-foreground mb-5 flex items-center gap-2">📈 Level Road</h2>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {Array.from({ length: 10 }, (_, idx) => idx + 1).map((lvl, i) => {
                const reached = level >= lvl;
                const isCurrent = level === lvl;
                return (
                  <div key={lvl} className="flex items-center gap-1 shrink-0">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                        reached
                          ? "bg-gradient-to-br from-amber-300 to-emerald-500 text-white border-amber-200 shadow-lg"
                          : "bg-muted text-muted-foreground border-border"
                      } ${isCurrent ? "ring-4 ring-primary/40 scale-110" : ""}`}>
                        {lvl}
                      </div>
                      {isCurrent && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold whitespace-nowrap">
                          You ▼
                        </div>
                      )}
                    </div>
                    {i < 9 && (
                      <div className={`h-1 w-6 md:w-10 rounded-full ${level > lvl ? "bg-emerald-500" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center">
            <Button onClick={() => awardBadge("first_chat")} variant="outline" size="sm">
              Test: Award "First Chat" Badge
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
