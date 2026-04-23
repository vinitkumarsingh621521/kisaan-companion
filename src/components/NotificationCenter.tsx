import { useState, useEffect } from "react";
import { Bell, X, Cloud, TrendingUp, FileText, Trophy, Settings, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type Notif = {
  id: string;
  type: "weather" | "price" | "scheme" | "achievement";
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const PREFS_KEY = "km.notif.prefs";
const READ_KEY = "km.notif.read";

const seed: Notif[] = [
  { id: "n1", type: "weather", title: "🌧 Heavy rain alert", body: "30 mm expected in your district tomorrow. Postpone spraying.", time: "2h ago", unread: true },
  { id: "n2", type: "price", title: "📈 Wheat price up 8%", body: "Karnal APMC: ₹2,380/q. Best 30-day high.", time: "5h ago", unread: true },
  { id: "n3", type: "scheme", title: "📋 PM-KISAN deadline", body: "12 days left for the next instalment KYC.", time: "1d ago", unread: false },
  { id: "n4", type: "achievement", title: "🏆 You unlocked: Soil Saver", body: "Logged 5 organic actions this month. +50 XP", time: "2d ago", unread: false },
];

const ICONS = { weather: Cloud, price: TrendingUp, scheme: FileText, achievement: Trophy };

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [items, setItems] = useState<Notif[]>(seed);
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const read = JSON.parse(localStorage.getItem(READ_KEY) || "[]") as string[];
    setItems((prev) => prev.map((n) => ({ ...n, unread: !read.includes(n.id) })));
  }, []);

  const unreadCount = items.filter((n) => n.unread).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    localStorage.setItem(READ_KEY, JSON.stringify(items.map((n) => n.id)));
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
          <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
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

              {showSettings ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <h3 className="font-display font-semibold text-sm text-foreground mb-2">Alert preferences</h3>
                  {[
                    { k: "weather", label: "Weather warnings", icon: Cloud },
                    { k: "price", label: "Price spikes", icon: TrendingUp },
                    { k: "scheme", label: "Scheme deadlines", icon: FileText },
                    { k: "achievement", label: "Streaks & badges", icon: Trophy },
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
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm italic p-8">No notifications yet 🌾</p>
                    ) : (
                      items.map((n) => {
                        const Icon = ICONS[n.type];
                        return (
                          <div
                            key={n.id}
                            className={`p-4 border-b border-border hover:bg-muted/30 transition-colors ${
                              n.unread ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-4 w-4 text-primary" />
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
                          </div>
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
