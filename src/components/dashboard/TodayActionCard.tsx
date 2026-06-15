import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Volume2, Share2, RefreshCw, Loader2 } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { edgeToken } from "@/lib/edgeAuth";
import { toast } from "sonner";

interface AiAction {
  emoji: string;
  category: "Weather" | "Crop Care" | "Market" | "Admin" | "Planning";
  text: string;
  priority: "High" | "Medium" | "Low";
  timeEst: string;
}
interface DailyPlan {
  actions: AiAction[];
  dayGreeting: string;
  farmMood: "Optimistic" | "Cautious" | "Alert";
}

const CATEGORY_COLORS: Record<AiAction["category"], string> = {
  Weather: "bg-blue-100 text-blue-700",
  "Crop Care": "bg-green-100 text-green-700",
  Market: "bg-amber-100 text-amber-700",
  Admin: "bg-purple-100 text-purple-700",
  Planning: "bg-teal-100 text-teal-700",
};

const PRIORITY_COLORS: Record<AiAction["priority"], string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-slate-100 text-slate-700",
};

const MOOD_STYLES: Record<DailyPlan["farmMood"], { emoji: string; bg: string }> = {
  Optimistic: { emoji: "🌟", bg: "from-emerald-100/60 to-green-50/40" },
  Cautious: { emoji: "🌤️", bg: "from-amber-100/60 to-yellow-50/40" },
  Alert: { emoji: "⚠️", bg: "from-red-100/60 to-orange-50/40" },
};

function getDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getTodayKey() {
  return `km.tasks.${getDateStr()}`;
}
function getCacheKey() {
  return `km.aiplan.${getDateStr()}`;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

export default function TodayActionCard() {
  const { ctx } = usePersonalization();
  const todayKey = getTodayKey();
  const cacheKey = getCacheKey();

  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [checked, setChecked] = useState<boolean[]>([]);

  const fetchAiPlan = useCallback(async () => {
    if (!ctx) return;
    setAiLoading(true);
    try {
      const weather = ctx?.weather?.forecast?.[0];
      const weatherSummary = weather
        ? `${weather.emoji} high ${weather.temp_high}°C / low ${weather.temp_low}°C, rain ${weather.rain_pct}%`
        : "weather unavailable";
      const prompt = `Generate a 5-item personalized farming action plan for today:
- Farmer: ${ctx?.farmer_name || "Farmer"}, State: ${ctx?.location?.state || "India"}
- Crops: ${ctx?.crops?.current?.join(", ") || "mixed crops"}
- Today's weather: ${weatherSummary}
- Month: ${new Date().toLocaleString("en-IN", { month: "long" })}
- Season: ${ctx?.climate?.current_season || "Kharif"}


Return JSON only (no markdown):
{"actions":[
  {"emoji":"☀️","category":"Weather","text":"specific action based on today's weather","priority":"High","timeEst":"30 min"},
  {"emoji":"💊","category":"Crop Care","text":"specific spray or soil action for their crop","priority":"High","timeEst":"2 hours"},
  {"emoji":"📊","category":"Market","text":"specific market check for their crop","priority":"Medium","timeEst":"10 min"},
  {"emoji":"📋","category":"Admin","text":"scheme or paperwork task relevant this month","priority":"Medium","timeEst":"1 hour"},
  {"emoji":"🌱","category":"Planning","text":"soil or future crop preparation task","priority":"Low","timeEst":"3 hours"}
],"dayGreeting":"Good morning ${ctx?.farmer_name || "Kisan"}! One sentence motivational greeting.","farmMood":"Optimistic"}`;

      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await edgeToken()}`,
        },
        body: JSON.stringify({
          action: "chat",
          messages: [{ role: "user", content: prompt }],
          profileContext: ctx,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            fullText += parsed.choices?.[0]?.delta?.content || "";
          } catch {}
        }
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in AI response");
      const plan: DailyPlan = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(plan.actions)) throw new Error("Invalid plan shape");
      localStorage.setItem(cacheKey, JSON.stringify(plan));
      setDailyPlan(plan);
    } catch (e) {
      console.error("AI plan error:", e);
      toast.error("Couldn't generate today's farm plan");
    } finally {
      setAiLoading(false);
    }
  }, [ctx, cacheKey]);

  // Load cached plan or fetch
  useEffect(() => {
    if (!ctx) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyPlan;
        if (parsed?.actions?.length) {
          setDailyPlan(parsed);
          return;
        }
      }
    } catch {}
    fetchAiPlan();
  }, [ctx, cacheKey, fetchAiPlan]);

  const actions = dailyPlan?.actions || [];

  // Load checked state
  useEffect(() => {
    if (!actions.length) return;
    try {
      const raw = localStorage.getItem(todayKey);
      if (raw) {
        const parsed = JSON.parse(raw) as boolean[];
        if (Array.isArray(parsed) && parsed.length === actions.length) {
          setChecked(parsed);
          return;
        }
      }
    } catch {}
    setChecked(new Array(actions.length).fill(false));
  }, [actions.length, todayKey]);

  useEffect(() => {
    if (checked.length && actions.length) {
      localStorage.setItem(todayKey, JSON.stringify(checked));
    }
  }, [checked, todayKey, actions.length]);

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const doneCount = checked.filter(Boolean).length;
  const allDone = actions.length > 0 && doneCount === actions.length;

  const speak = () => {
    if (!actions.length || !("speechSynthesis" in window)) return;
    const text = `${dailyPlan?.dayGreeting || ""} Today's plan: ${actions.map((a) => a.text).join(". ")}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  };

  const shareToWhatsApp = () => {
    if (!dailyPlan) return;
    const text = `🌾 My Farm Plan — ${new Date().toLocaleDateString("en-IN")}\n\n${dailyPlan.actions
      .map((a, i) => `${i + 1}. ${a.emoji} ${a.text} (~${a.timeEst})`)
      .join("\n")}\n\n📱 KisaanCompanion AI`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };

  const refreshPlan = async () => {
    localStorage.removeItem(cacheKey);
    setDailyPlan(null);
    setChecked([]);
    await fetchAiPlan();
  };

  if (!ctx) return null;

  const mood = dailyPlan?.farmMood ? MOOD_STYLES[dailyPlan.farmMood] : MOOD_STYLES.Optimistic;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-krishi-gold/5 to-krishi-sky/5 border border-primary/20 mb-5"
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2 flex-wrap">
          <Sparkles className="h-5 w-5 text-primary" />
          Today's AI Farm Plan
          {actions.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {doneCount}/{actions.length} done
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={speak} className="gap-1 text-xs h-8 px-2" disabled={!actions.length}>
            <Volume2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={shareToWhatsApp} className="gap-1 text-xs h-8 px-2" disabled={!dailyPlan}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={refreshPlan} className="gap-1 text-xs h-8 px-2" disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {dailyPlan?.dayGreeting && (
        <div className={`mb-3 rounded-lg p-3 bg-gradient-to-r ${mood.bg} border border-border/50 flex items-start gap-2`}>
          <span className="text-xl flex-shrink-0">{mood.emoji}</span>
          <p className="text-sm text-foreground font-medium leading-snug">{dailyPlan.dayGreeting}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {aiLoading && !dailyPlan ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg">
                <Skeleton className="h-4 w-4 mt-0.5 rounded" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : allDone ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full text-center py-4 text-foreground font-semibold"
          >
            ✅ All tasks done for today! ({new Date().toLocaleDateString()})
          </motion.div>
        ) : actions.length ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {actions.map((action, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/40 ${
                  checked[i] ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={checked[i] ?? false}
                  onCheckedChange={() => toggle(i)}
                  className="mt-1 flex-shrink-0"
                />
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${CATEGORY_COLORS[action.category] || "bg-muted"}`}>
                  {action.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm text-foreground ${checked[i] ? "line-through" : ""}`}>
                    {action.text}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[action.priority] || "bg-muted"}`}>
                      {action.priority}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[action.category] || "bg-muted"}`}>
                      {action.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">⏱ {action.timeEst}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center py-4">
            No plan yet. Tap refresh to generate one.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
