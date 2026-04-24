import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Award, Trophy, Lock, Flame, Star, Sparkles, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useXP } from "@/hooks/useXP";
import { useAuth } from "@/hooks/useAuth";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";

const ALL_BADGES = [
  { id: "first_login", name: "First Steps 👶", desc: "Sign in for the first time", xp: 10, emoji: "🎉" },
  { id: "profile_50", name: "Half Filled 🌱", desc: "Complete 50% of your profile", xp: 30, emoji: "📝" },
  { id: "profile_100", name: "Profile Pro 🌾", desc: "Fully complete your profile", xp: 100, emoji: "🏆" },
  { id: "first_chat", name: "Curious Kisaan 💬", desc: "Ask the AI advisor your first question", xp: 20, emoji: "🤖" },
  { id: "first_scan", name: "Disease Detective 🔬", desc: "Run your first disease scan", xp: 25, emoji: "🦠" },
  { id: "first_report", name: "Report Maestro 📊", desc: "Generate your first PDF report", xp: 30, emoji: "📄" },
  { id: "multi_profile", name: "Multi-Farm Boss 🚜", desc: "Manage 2+ farmer profiles", xp: 40, emoji: "👥" },
  { id: "organic_pioneer", name: "Organic Pioneer 🌿", desc: "Mark your farm as organic", xp: 50, emoji: "🌱" },
  { id: "water_saver", name: "Water Saver 💧", desc: "Use drip irrigation", xp: 50, emoji: "💧" },
  { id: "early_bird", name: "Early Bird 🐦", desc: "Plan crops 30 days before season", xp: 40, emoji: "🌅" },
  { id: "iot_connect", name: "IoT Ninja 📡", desc: "Connect a soil sensor", xp: 60, emoji: "🛰️" },
  { id: "field_mapper", name: "Cartographer 🗺️", desc: "Map all your fields", xp: 35, emoji: "📍" },
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

  // Auto-award based on profile state
  useEffect(() => {
    if (!active) return;
    const auto: string[] = ["first_login"];
    if (completionPct >= 50) auto.push("profile_50");
    if (completionPct >= 95) auto.push("profile_100");
    if (profiles.length >= 2) auto.push("multi_profile");
    if (active.farmer_details?.farming_type?.toString().includes("Organic")) auto.push("organic_pioneer");
    if (active.farmer_details?.irrigation_type?.toString().includes("Drip")) auto.push("water_saver");
    auto.forEach(id => awardBadge(id, /* silent */ seenRef.current));
    seenRef.current = true;
  }, [active, completionPct, profiles.length]);

  const load = async () => {
    const { data } = await supabase.from("achievements").select("*");
    setEarned(new Set((data || []).map((a: any) => a.badge_id)));
  };

  const awardBadge = async (badgeId: string, silent = false) => {
    if (earned.has(badgeId)) return;
    const badge = ALL_BADGES.find(b => b.id === badgeId);
    if (!badge || !user) return;
    const { error } = await supabase.from("achievements").insert({
      user_id: user.id, badge_id: badge.id, badge_name: badge.name, xp: badge.xp,
    });
    if (!error) {
      setEarned(prev => new Set(prev).add(badge.id));
      await addXP(badge.xp);
      if (!silent) {
        toast.success(`🏆 New badge: ${badge.name}! +${badge.xp} XP`);
        fireConfetti();
      }
    }
  };

  const totalXp = xpRow?.xp ?? 0;
  const level = xpRow?.level ?? 1;
  const streak = xpRow?.streak_days ?? 1;
  const levelProgress = totalXp % 100;

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
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    } finally { setSharing(false); }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-7 w-7 text-krishi-gold" /> Achievements & Badges
              </h1>
              <p className="text-muted-foreground mt-1">Earn XP for sustainable farming. Climb the leaderboard!</p>
            </div>
            <Button onClick={shareCard} disabled={sharing} variant="outline" className="gap-2">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Share as image
            </Button>
          </motion.div>

          <div ref={cardRef} className="bg-background p-1 rounded-2xl">
            <div className="glass-card p-6 mb-6 bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground">Current Level</div>
                  <div className="text-4xl font-display font-bold text-foreground flex items-center gap-2">
                    <Star className="h-7 w-7 text-krishi-gold fill-krishi-gold" /> Level {level}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Total XP</div>
                  <div className="text-3xl font-display font-bold text-primary">{totalXp}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Badges Earned</div>
                  <div className="text-3xl font-display font-bold text-foreground">{earned.size} <span className="text-sm text-muted-foreground">/ {ALL_BADGES.length}</span></div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Streak 🔥</div>
                  <div className="text-3xl font-display font-bold text-destructive flex items-center gap-1"><Flame className="h-6 w-6" /> {streak}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-1">Next level: {100 - levelProgress} XP to go</div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-2 pb-2">
              {ALL_BADGES.map((b, i) => {
                const got = earned.has(b.id);
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    title={b.desc}
                    className={`glass-card p-4 text-center transition-all ${got ? "ring-2 ring-primary/30" : "opacity-50"}`}
                  >
                    <div className="text-4xl mb-2">{got ? b.emoji : "🔒"}</div>
                    <h3 className="font-semibold text-sm text-foreground">{b.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">{b.desc}</p>
                    <div className="text-xs font-medium mt-2 flex items-center justify-center gap-1">
                      {got ? <span className="text-primary"><Sparkles className="h-3 w-3 inline" /> +{b.xp} XP earned</span> : <span className="text-muted-foreground"><Lock className="h-3 w-3 inline" /> {b.xp} XP</span>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="text-center mt-6">
            <Button onClick={() => awardBadge("first_chat")} variant="outline" size="sm">Test: Award "First Chat" Badge</Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
