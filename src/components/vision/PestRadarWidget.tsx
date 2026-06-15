import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { edgeToken } from "@/lib/edgeAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

interface Alert {
  pest: string; emoji: string; risk: "High" | "Medium" | "Low"; riskScore: number;
  cropAffected: string; symptom: string; preventiveSpray: string; nextCheckDays: number;
}

const FALLBACK_ALERTS: Alert[] = [
  { pest: "Brown Plant Hopper", emoji: "🦟", risk: "High", riskScore: 82, cropAffected: "Rice", symptom: "Yellowing at plant base, hopper burn patches", preventiveSpray: "Imidacloprid 17.8 SL @ 125ml/200L water/acre", nextCheckDays: 3 },
  { pest: "Late Blight", emoji: "🍄", risk: "Medium", riskScore: 55, cropAffected: "Potato", symptom: "Dark water-soaked spots on leaves", preventiveSpray: "Mancozeb 75WP @ 2g/L water", nextCheckDays: 5 },
  { pest: "Aphids", emoji: "🐜", risk: "Low", riskScore: 30, cropAffected: "Mustard", symptom: "Curled leaves, honeydew deposits", preventiveSpray: "Neem oil 4ml/L or Dimethoate 30EC", nextCheckDays: 7 },
];

const COMMUNITY_ALERTS = [
  { district: "Lucknow", pest: "Brown Plant Hopper", crop: "Rice", farms: 23, severity: "High", daysAgo: 2, emoji: "🦟", action: "Spray Imidacloprid 17.8 SL" },
  { district: "Kanpur", pest: "Late Blight", crop: "Potato", farms: 11, severity: "Medium", daysAgo: 1, emoji: "🍄", action: "Spray Mancozeb 75WP @ 2g/L" },
  { district: "Agra", pest: "Aphids", crop: "Mustard", farms: 8, severity: "Low", daysAgo: 3, emoji: "🐜", action: "Neem oil spray 4ml/L" },
  { district: "Mathura", pest: "Whitefly", crop: "Cotton", farms: 15, severity: "Medium", daysAgo: 1, emoji: "🦋", action: "Yellow traps + Acetamiprid 20SP" },
  { district: "Varanasi", pest: "Stem Borer", crop: "Rice", farms: 19, severity: "High", daysAgo: 4, emoji: "🐛", action: "Cartap Hydrochloride 4G @ 8kg/acre" },
  { district: "Bareilly", pest: "Rust Fungus", crop: "Wheat", farms: 6, severity: "Low", daysAgo: 5, emoji: "🍂", action: "Propiconazole 25EC spray" },
  { district: "Aligarh", pest: "Root Rot", crop: "Soybean", farms: 4, severity: "Medium", daysAgo: 2, emoji: "🌿", action: "Seed treatment with Thiram" },
  { district: "Moradabad", pest: "Leaf Folder", crop: "Rice", farms: 31, severity: "High", daysAgo: 1, emoji: "🌾", action: "Chlorpyriphos 20EC @ 1.5L/acre" },
];

const PEST_PRESSURE: Record<string, number[]> = {
  Rice:   [10,15,20,25,35,55,80,90,70,45,20,10],
  Wheat:  [40,50,70,85,60,20,10,10,15,25,45,55],
  Cotton: [10,15,20,35,55,70,85,90,80,60,30,15],
  Potato: [20,30,55,70,80,50,20,15,25,50,70,40],
  default:[30,35,45,50,55,60,65,70,55,45,35,30],
};
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const KEY_ACTIONS: Record<string, string[]> = {
  Rice: ["Scout fields twice weekly for hopper burn patches", "Maintain 2-3cm standing water — drain if BPH spotted", "Set up light traps for stem borer adults"],
  Wheat: ["Check for yellow rust pustules on lower leaves", "Spray Propiconazole if humidity stays >70% for 3 days", "Rotate aphid sprays to prevent resistance"],
  Cotton: ["Hang 10 yellow sticky traps per acre for whitefly", "Scout bolls for pink bollworm every 3 days", "Stop spraying 7 days before harvest"],
  Potato: ["Spray Mancozeb every 7-10 days during cool damp weather", "Remove and burn blighted leaves immediately", "Earth-up to prevent tuber exposure"],
  default: ["Walk fields twice a week — check upper and lower leaves", "Rotate spray chemistries to avoid resistance", "Keep sprayer nozzles clean and calibrated"],
};

function riskBadge(r: string) {
  if (r === "High") return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  if (r === "Medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
}

export default function PestRadarWidget() {
  const { active } = useActiveProfile();
  const ctx = active?.farmer_details || {};
  const state = ctx.state || "Uttar Pradesh";
  const crops: string[] = Array.isArray(ctx.current_crops)
    ? ctx.current_crops
    : (typeof ctx.current_crops === "string" ? ctx.current_crops.split(",").map((c: string) => c.trim()).filter(Boolean) : []);
  const activeCrop = crops[0] || "Rice";

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [advisory, setAdvisory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);
  const [checkedAlerts, setCheckedAlerts] = useState<Set<number>>(new Set());
  const toggleAlert = (i: number) => {
    setCheckedAlerts((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const month = new Date().toLocaleString("en-IN", { month: "long" });
        const cropsStr = crops.length ? crops.join(", ") : "Rice, Wheat";
        const token = await edgeToken();
        const resp = await fetch(AI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "pest_alert",
            messages: [{ role: "user", content: `Farmer in ${state} growing ${cropsStr}. Month: ${month}. Kharif season. Generate pest early warning.` }],
            profileContext: ctx,
          }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const { result } = await resp.json();
        const clean = typeof result === "string" ? result.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim() : null;
        const data = typeof result === "string" ? JSON.parse(clean!) : result;
        if (cancelled) return;
        setAlerts(data.alerts || []);
        setAdvisory(data.weeklyAdvisory || "");
      } catch {
        if (cancelled) return;
        setAlerts(FALLBACK_ALERTS);
        setUsedFallback(true);
        setAdvisory("Monsoon humidity is rising — scout fields twice this week and prep your preventive sprays now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, activeCrop]);

  const currentMonthIdx = new Date().getMonth();
  const pressureData = (PEST_PRESSURE[activeCrop] || PEST_PRESSURE.default).map((value, i) => ({
    month: monthNames[i], pressure: value,
    fill: i <= 2 || i >= 9 ? "#3b82f6" : i >= 6 ? "#22c55e" : "#f59e0b",
  }));
  const currentMonthName = monthNames[currentMonthIdx];
  const keyActions = KEY_ACTIONS[activeCrop] || KEY_ACTIONS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card"
    >
      <div className="bg-gradient-to-r from-rose-700 to-red-600 text-white px-5 py-4 flex items-center justify-between">
        <h2 className="font-display font-bold text-lg md:text-xl">🛡️ Pest Radar</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">{state}</span>
      </div>

      <div className="p-4 md:p-6">
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="alerts">🚨 My Alerts</TabsTrigger>
            <TabsTrigger value="community">👥 Community</TabsTrigger>
            <TabsTrigger value="calendar">📅 Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-4 space-y-3">
            {loading && (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            )}
            {!loading && alerts.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.01 }}
                className={`rounded-xl border border-border p-3 bg-card flex gap-3 ${checkedAlerts.has(i) ? "opacity-60" : ""}`}
              >
                <div className="text-3xl flex-shrink-0">{a.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground">{a.pest}</p>
                    {a.risk === "High" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${riskBadge(a.risk)}`}>{a.risk} Risk</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Crop: <span className="font-medium text-foreground">{a.cropAffected}</span></p>
                  <p className="text-xs text-muted-foreground">Symptom: {a.symptom}</p>
                  <p className="text-xs mt-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300">💊 Spray: {a.preventiveSpray}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">✓ Check again in {a.nextCheckDays} days</p>
                  <button
                    onClick={() => toggleAlert(i)}
                    className={`mt-2 text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors ${
                      checkedAlerts.has(i)
                        ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-muted text-muted-foreground border-border hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {checkedAlerts.has(i) ? "✓ Inspected" : "Mark as Inspected"}
                  </button>
                </div>
              </motion.div>
            ))}
            {!loading && advisory && (
              <div className="rounded-xl border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-foreground">
                {advisory}
                {usedFallback && <span className="text-xs text-muted-foreground block mt-1">(offline sample)</span>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="community" className="mt-4 space-y-2">
            {COMMUNITY_ALERTS.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.01 }}
                className="rounded-lg border border-border p-3 bg-card flex items-center gap-3"
              >
                <div className="text-2xl">{c.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm">📍 {c.district}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${riskBadge(c.severity)}`}>{c.severity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.pest} on {c.crop} · {c.farms} farms affected</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">→ {c.action}</p>
                </div>
                <p className="text-[10px] text-muted-foreground flex-shrink-0">{c.daysAgo}d ago</p>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Pest pressure for {activeCrop} (12-month)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pressureData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine x={currentMonthName} stroke="#dc2626" strokeDasharray="3 3" label={{ value: "Now", fill: "#dc2626", fontSize: 10 }} />
                  <Bar dataKey="pressure" radius={[4, 4, 0, 0]}>
                    {pressureData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-border p-3 bg-card">
              <p className="text-sm font-semibold text-foreground mb-2">📋 Key Actions for {currentMonthName}:</p>
              <ul className="space-y-1.5 text-sm text-foreground">
                {keyActions.map((a, i) => (
                  <li key={i} className="flex gap-2"><span className="text-emerald-600">•</span> <span>{a}</span></li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
