import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Trash2, X, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { edgeToken } from "@/lib/edgeAuth";
import { usePersonalization } from "@/hooks/usePersonalization";

interface PriceAlert {
  id: string; crop: string; emoji: string;
  targetPrice: number; condition: "above" | "below";
  createdAt: string; active: boolean;
}

const CROP_EMOJIS: Record<string, string> = {
  Rice: "🌾", Wheat: "🌿", Cotton: "🌸", Maize: "🌽", Tomato: "🍅",
  Potato: "🥔", Onion: "🧅", Mustard: "🌻", Soybean: "🫘", Sugarcane: "🎋",
};
const CROPS = Object.keys(CROP_EMOJIS);
const KEY = "km.price.alerts.v1";
const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

export default function PriceAlertSystem() {
  const { ctx } = usePersonalization();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [crop, setCrop] = useState("Wheat");
  const [target, setTarget] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setAlerts(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const month = new Date().toLocaleString("en-IN", { month: "long" });
        const season = ctx?.climate?.current_season || "Kharif";
        const prompt = `Give a 2-sentence market sentiment for Indian farm commodity prices in ${month} ${season} season. Return JSON only: {"insight":"sentence 1. sentence 2."}`;
        const resp = await fetch(AI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await edgeToken()}` },
          body: JSON.stringify({ action: "market_decision", messages: [{ role: "user", content: prompt }] }),
        });
        if (!resp.ok) return;
        const { result } = await resp.json();
        const parsed = typeof result === "string" ? JSON.parse(result.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()) : result;
        if (alive && parsed?.insight) setInsight(parsed.insight);
      } catch {}
    })();
    return () => { alive = false; };
  }, [ctx?.climate?.current_season]);

  const save = (next: PriceAlert[]) => {
    setAlerts(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  const addAlert = () => {
    const t = parseFloat(target);
    if (!crop || !t || t <= 0) { toast.error("Enter crop and target price."); return; }
    const a: PriceAlert = {
      id: Math.random().toString(36).slice(2, 9),
      crop, emoji: CROP_EMOJIS[crop] || "🌾",
      targetPrice: t, condition,
      createdAt: new Date().toISOString(), active: true,
    };
    save([a, ...alerts]);
    setTarget(""); setShowForm(false);
    toast.success("Alert saved 🔔");
  };

  const deleteAlert = (id: string) => save(alerts.filter((a) => a.id !== id));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl border border-border bg-card shadow-lg p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" /> Price Alerts
        </h3>
        <Button size="sm" variant="ghost" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <><X className="h-4 w-4" /> Close</> : <><Plus className="h-4 w-4" /> Add Alert</>}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border bg-muted/30 p-3 mb-3 space-y-3">
              <div>
                <Label className="text-xs mb-1 block">Crop</Label>
                <Select value={crop} onValueChange={setCrop}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CROPS.map((c) => <SelectItem key={c} value={c}>{CROP_EMOJIS[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Target price (₹/qtl)</Label>
                <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 2500" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCondition("above")} className={`flex-1 px-3 py-2 rounded-full text-sm border transition-colors ${condition === "above" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-foreground"}`}>📈 When ABOVE</button>
                <button onClick={() => setCondition("below")} className={`flex-1 px-3 py-2 rounded-full text-sm border transition-colors ${condition === "below" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-foreground"}`}>📉 When BELOW</button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addAlert} className="flex-1">Save Alert</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 flex-1 min-h-0">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <div className="text-3xl mb-2">🔕</div>
            No price alerts set. Create one to track the best selling window!
          </div>
        ) : (
          alerts.map((a) => (
            <motion.div key={a.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-2xl">{a.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm">{a.crop}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {a.condition === "above" ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
                  ₹{a.targetPrice.toLocaleString("en-IN")}/qtl
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">Watching</span>
              <Button size="icon" variant="ghost" onClick={() => deleteAlert(a.id)} className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </motion.div>
          ))
        )}
      </div>

      {insight && (
        <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-foreground/90">
          🤖 <span className="font-semibold">AI Insight:</span> {insight}
        </div>
      )}
    </motion.div>
  );
}
