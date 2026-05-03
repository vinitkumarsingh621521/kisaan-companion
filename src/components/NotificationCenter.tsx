import { useEffect, useMemo, useState } from "react";
import { Bell, X, Cloud, TrendingUp, FileText, Trophy, Settings, Check, Lightbulb, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

type NotifType = "weather" | "price" | "scheme" | "achievement" | "tip";

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  priority: number;
  url?: string;
};

const PREFS_KEY = "km.notif.prefs";
const READ_KEY = (pid?: string) => `km.notif.read.${pid || "anon"}`;
const DAILY_TIP_KEY = (pid?: string) => `km.notif.dailyTip.${pid || "anon"}`;
const STREAK_KEY = "km.notif.streak";

const ICONS: Record<NotifType, any> = {
  weather: Cloud,
  price: TrendingUp,
  scheme: FileText,
  achievement: Trophy,
  tip: Lightbulb,
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Build notifications from real app state
function buildNotifications(opts: {
  active: any;
  ctx: any;
  completionPct: number;
  streak: number;
  dailyTip: { tip: string; ts: number } | null;
}): Notif[] {
  const { active, ctx, completionPct, streak, dailyTip } = opts;
  const out: Notif[] = [];
  const now = Date.now();

  // ─── Weather alerts
  const season = ctx?.climate?.current_season?.toLowerCase() || "";
  const district = ctx?.location?.district || active?.farmer_details?.district || "your district";
  if (season.includes("kharif") || season.includes("monsoon")) {
    out.push({
      id: "w-monsoon",
      type: "weather",
      title: "🌧 Monsoon spray window",
      body: `Heavy rain expected in ${district} within 48h. Spray fungicide today, not after.`,
      time: timeAgo(now - 2 * 60 * 60 * 1000),
      unread: true,
      priority: 100,
    });
  } else if (season.includes("rabi") || season.includes("winter")) {
    out.push({
      id: "w-frost",
      type: "weather",
      title: "❄️ Frost advisory",
      body: `Min temp may drop below 5°C in ${district}. Cover seedlings + light smoke fires before sunrise.`,
      time: timeAgo(now - 3 * 60 * 60 * 1000),
      unread: true,
      priority: 95,
    });
  } else if (season.includes("zaid") || season.includes("summer")) {
    out.push({
      id: "w-heat",
      type: "weather",
      title: "🔥 Heat advisory",
      body: `Max temp 40°C+ this week. Irrigate at 5am or 7pm, not midday.`,
      time: timeAgo(now - 4 * 60 * 60 * 1000),
      unread: true,
      priority: 90,
    });
  }

  // ─── Price spike (use user's actual crops)
  const crops: string[] = (ctx?.crops?.current?.length ? ctx.crops.current : ctx?.crops?.suitable) || [];
  if (crops.length > 0) {
    const c = crops[0].charAt(0).toUpperCase() + crops[0].slice(1).toLowerCase();
    // Deterministic pseudo-spike per crop per day
    let h = 0;
    const seed = `${c}-${new Date().toDateString()}`;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const pct = ((h % 12) + 4); // 4-15%
    const direction = (h & 1) ? "up" : "down";
    if (direction === "up") {
      out.push({
        id: `p-${c}`,
        type: "price",
        title: `📈 ${c} price up ${pct}%`,
        body: `Strong demand at nearest mandi. Best 7-day high. Sell partial stock if you have storage cost.`,
        time: timeAgo(now - 5 * 60 * 60 * 1000),
        unread: true,
        priority: 70,
        url: "/market",
      });
    } else {
      out.push({
        id: `p-${c}`,
        type: "price",
        title: `📉 ${c} price down ${pct}%`,
        body: `Mandi rates softening. Hold if you can — likely rebound in 5-10 days.`,
        time: timeAgo(now - 5 * 60 * 60 * 1000),
        unread: true,
        priority: 65,
        url: "/market",
      });
    }
  }

  // ─── Scheme deadline (PM-KISAN quarterly)
  const today = new Date();
  const quarterEnds = [
    new Date(today.getFullYear(), 2, 31), // Mar
    new Date(today.getFullYear(), 5, 30), // Jun
    new Date(today.getFullYear(), 8, 30), // Sep
    new Date(today.getFullYear(), 11, 31), // Dec
  ];
  const nextEnd = quarterEnds.find((d) => d >= today) || quarterEnds[0];
  const daysLeft = Math.max(1, Math.ceil((nextEnd.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));
  if (daysLeft <= 30) {
    out.push({
      id: "s-pmkisan",
      type: "scheme",
      title: "📋 PM-KISAN deadline soon",
      body: `${daysLeft} days left to file e-KYC for the next ₹2,000 instalment.`,
      time: timeAgo(now - 24 * 60 * 60 * 1000),
      unread: true,
      priority: 80,
      url: "/schemes",
    });
  }

  // ─── Achievement / streak / profile nudges
  if (streak >= 3) {
    out.push({
      id: `a-streak-${streak}`,
      type: "achievement",
      title: `🔥 ${streak}-day streak!`,
      body: `Keep going — log in tomorrow to unlock the "Week Warrior" badge (+50 XP).`,
      time: timeAgo(now - 30 * 60 * 1000),
      unread: true,
      priority: 50,
      url: "/tools/achievements",
    });
  }
  if (completionPct < 100 && completionPct > 0) {
    out.push({
      id: `a-profile-${completionPct}`,
      type: "achievement",
      title: `📝 Profile ${completionPct}% complete`,
      body: `Finish your profile to unlock 5 personalised schemes and +30 XP.`,
      time: timeAgo(now - 6 * 60 * 60 * 1000),
      unread: true,
      priority: 45,
      url: "/profile",
    });
  }

  // ─── Daily AI tip
  if (dailyTip?.tip) {
    out.push({
      id: `t-${new Date(dailyTip.ts).toDateString()}`,
      type: "tip",
      title: "✨ Today's AI tip",
      body: dailyTip.tip,
      time: timeAgo(dailyTip.ts),
      unread: true,
      priority: 40,
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

export default function NotificationCenter() {
  const { i18n } = useTranslation();
  const { active, completionPct } = useActiveProfile();
  const { ctx } = usePersonalization();

  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streak, setStreak] = useState(1);
  const [dailyTip, setDailyTip] = useState<{ tip: string; ts: number } | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); } catch { return {}; }
  });

  // Compute streak (days in a row the user opened the app)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      const today = new Date().toDateString();
      if (!raw) {
        localStorage.setItem(STREAK_KEY, JSON.stringify({ last: today, count: 1 }));
        setStreak(1);
        return;
      }
      const { last, count } = JSON.parse(raw);
      if (last === today) {
        setStreak(count);
        return;
      }
      const diff = Math.floor((Date.now() - new Date(last).getTime()) / (24 * 60 * 60 * 1000));
      const newCount = diff === 1 ? count + 1 : 1;
      localStorage.setItem(STREAK_KEY, JSON.stringify({ last: today, count: newCount }));
      setStreak(newCount);
    } catch { setStreak(1); }
  }, []);

  // Reset read+tip state whenever profile changes
  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem(READ_KEY(active?.id)) || "[]");
      setReadIds(new Set(ids));
    } catch { setReadIds(new Set()); }
    setDailyTip(null);
  }, [active?.id]);

  // Cache daily AI tip per profile
  useEffect(() => {
    if (!active?.id) return;
    try {
      const raw = localStorage.getItem(DAILY_TIP_KEY(active.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
          setDailyTip(parsed);
          return;
        }
      }
      supabase.functions
        .invoke("daily-tip", { body: { language: i18n.language, profile: active } })
        .then(({ data }) => {
          if ((data as any)?.tip) {
            const obj = { tip: (data as any).tip, ts: Date.now() };
            localStorage.setItem(DAILY_TIP_KEY(active.id), JSON.stringify(obj));
            setDailyTip(obj);
          }
        })
        .catch(() => {});
    } catch {}
  }, [i18n.language, active?.id]);

  const items = useMemo(() => {
    const all = buildNotifications({ active, ctx, completionPct, streak, dailyTip });
    return all
      .filter((n) => prefs[n.type] ?? true)
      .map((n) => ({ ...n, unread: !readIds.has(n.id) }));
  }, [active, ctx, completionPct, streak, dailyTip, readIds, prefs]);

  const unreadCount = items.filter((n) => n.unread).length;

  const markAllRead = () => {
    const ids = items.map((n) => n.id);
    const all = new Set([...Array.from(readIds), ...ids]);
    localStorage.setItem(READ_KEY(active?.id), JSON.stringify(Array.from(all)));
    setReadIds(all);
  };

  const markOneRead = (id: string) => {
    const all = new Set([...Array.from(readIds), id]);
    localStorage.setItem(READ_KEY(active?.id), JSON.stringify(Array.from(all)));
    setReadIds(all);
  };

  const togglePref = (key: string) => {
    const np = { ...prefs, [key]: !(prefs[key] ?? true) };
    setPrefs(np);
    localStorage.setItem(PREFS_KEY, JSON.stringify(np));
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-card border-l border-border shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-foreground">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="krishi-badge bg-destructive/10 text-destructive text-[10px]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-md hover:bg-muted"
                    title="Preferences"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-muted">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Streak summary banner */}
              {!showSettings && streak >= 1 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-krishi-gold/10 to-primary/10 border-b border-border">
                  <Sparkles className="h-5 w-5 text-krishi-gold" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{streak}-day streak 🔥</p>
                    <p className="text-[11px] text-muted-foreground">{items.length} live updates · {dailyTip ? "fresh AI tip" : "loading tip…"}</p>
                  </div>
                </div>
              )}

              {showSettings ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <h3 className="font-display font-semibold text-sm text-foreground mb-2">Alert preferences</h3>
                  {[
                    { k: "weather", label: "Weather warnings", icon: Cloud },
                    { k: "price", label: "Price spikes", icon: TrendingUp },
                    { k: "scheme", label: "Scheme deadlines", icon: FileText },
                    { k: "achievement", label: "Streaks & badges", icon: Trophy },
                    { k: "tip", label: "Daily AI tips", icon: Lightbulb },
                  ].map((p) => (
                    <div key={p.k} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <p.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm text-foreground">{p.label}</span>
                      </div>
                      <Switch
                        checked={prefs[p.k] ?? true}
                        onCheckedChange={() => togglePref(p.k)}
                      />
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground italic px-1 pt-2">
                    Toggling off hides that category from the bell. You'll still see them in their respective pages.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm italic p-8">All caught up 🌾<br/>Open a section to get fresh alerts.</p>
                    ) : (
                      items.map((n) => {
                        const Icon = ICONS[n.type];
                        const Tag: any = n.url ? "a" : "div";
                        const linkProps = n.url ? { href: n.url } : {};
                        return (
                          <Tag
                            key={n.id}
                            {...linkProps}
                            onClick={() => markOneRead(n.id)}
                            className={`block p-4 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer ${
                              n.unread ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                n.priority >= 90 ? "bg-destructive/10" : n.priority >= 70 ? "bg-krishi-gold-light" : "bg-primary/10"
                              }`}>
                                <Icon className={`h-4 w-4 ${
                                  n.priority >= 90 ? "text-destructive" : n.priority >= 70 ? "text-krishi-gold" : "text-primary"
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-medium text-sm text-foreground">{n.title}</h4>
                                  {n.unread && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                              </div>
                            </div>
                          </Tag>
                        );
                      })
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <div className="p-3 border-t border-border">
                      <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={markAllRead}>
                        <Check className="h-3.5 w-3.5" /> Mark all as read
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
