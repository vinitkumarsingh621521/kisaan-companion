import { useState } from "react";
import { Sparkles, ArrowRight, Check, AlertTriangle, X, Loader2, TrendingUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

const CROPS = [
  "Rice", "Wheat", "Maize", "Soybean", "Cotton", "Sugarcane", "Mustard",
  "Bajra", "Pulses", "Chickpea", "Pigeon Pea", "Groundnut", "Sunflower",
  "Tomato", "Onion", "Potato", "Brinjal", "Okra", "Chilli", "Turmeric",
  "Banana", "Mango", "Sesame", "Jowar", "Ragi", "Apple", "Cauliflower",
  "Cabbage", "Peas", "Garlic", "Ginger", "Coriander", "Cumin",
];

const SEASONS = ["Kharif", "Rabi", "Zaid", "Year-round"];
const IRRIGATIONS = ["Drip", "Sprinkler", "Flood", "Rainfed", "Mixed"];

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

type Compat = {
  intercrop: "good" | "ok" | "bad";
  rotation: "good" | "ok" | "bad";
  water: "good" | "ok" | "bad";
  nutrient: "good" | "ok" | "bad";
  pest: "good" | "ok" | "bad";
  overall_score: number;
  recommendation: string;
  best_practice: string;
  warning: string;
  yield_uplift_pct: number;
};

function localFallback(a: string, b: string): Compat {
  const goodPairs: Record<string, string[]> = {
    Rice: ["Pulses", "Chickpea", "Mustard"],
    Wheat: ["Mustard", "Chickpea", "Pulses"],
    Maize: ["Soybean", "Pulses", "Chickpea"],
    Sugarcane: ["Onion", "Potato"],
    Cotton: ["Pulses", "Chickpea", "Soybean"],
  };
  const isGood = goodPairs[a]?.includes(b) || goodPairs[b]?.includes(a);
  return {
    intercrop: isGood ? "good" : "ok",
    rotation: isGood ? "good" : "ok",
    water: a === b ? "bad" : "ok",
    nutrient: isGood ? "good" : "ok",
    pest: isGood ? "good" : "ok",
    overall_score: isGood ? 78 : 55,
    recommendation: isGood
      ? `${a} and ${b} pair well. Rotate seasonally to keep nitrogen healthy.`
      : `${a} and ${b} have moderate compatibility. Verify with local agronomy extension before intercropping.`,
    best_practice: "Maintain 30-45 cm row spacing and stagger sowing by 10-15 days.",
    warning: isGood ? "" : "Watch for shared pests in monsoon weeks 3-5.",
    yield_uplift_pct: isGood ? 12 : 4,
  };
}

const cells = ["intercrop", "rotation", "water", "nutrient", "pest"] as const;
const labels: Record<string, string> = {
  intercrop: "Intercropping",
  rotation: "Crop Rotation",
  water: "Water Needs",
  nutrient: "Nutrient Conflict",
  pest: "Pest Cycle",
};

const colour = (v: "good" | "ok" | "bad") =>
  v === "good"
    ? "bg-primary/10 text-primary border-primary/30"
    : v === "bad"
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-krishi-gold-light text-krishi-gold border-krishi-gold/30";

const icon = (v: "good" | "ok" | "bad") =>
  v === "good" ? <Check className="h-3 w-3" /> : v === "bad" ? <X className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />;

export default function CropCompatibilityMatrix() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [a, setA] = useState("Rice");
  const [b, setB] = useState("Pulses");
  const [season, setSeason] = useState<string>(ctx?.climate?.current_season || "Kharif");
  const [irrigation, setIrrigation] = useState<string>(active?.farmer_details?.irrigation_type?.split(/[\/\s]/)[0] || "Drip");
  const [area, setArea] = useState<string>(active?.farmer_details?.total_land || "2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Compat | null>(null);

  const askAI = async () => {
    if (a === b) {
      toast.error("Pick two different crops");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "compat",
          profileContext: ctx,
          farmData: {
            cropA: a,
            cropB: b,
            state: ctx?.location?.state || active?.farmer_details?.state,
            soil: active?.soil_type || ctx?.climate?.soils?.[0],
            season,
            irrigation,
            area,
            goal: active?.farmer_details?.crop_priority || "balanced",
          },
        }),
      });
      if (!resp.ok) throw new Error(`AI failed (${resp.status})`);
      const data = await resp.json();
      const raw = data.result || "";
      const m = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          setResult(parsed);
          toast.success("Compatibility report ready 🌾");
        } catch {
          setResult(localFallback(a, b));
          toast.message("Using rule-based fallback");
        }
      } else {
        setResult(localFallback(a, b));
      }
    } catch (e: any) {
      setResult(localFallback(a, b));
      toast.message("AI unavailable — using local rules");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5">
      <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" /> Crop Compatibility Matrix
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Pick two crops and your farm context — get a personalised AI verdict on intercropping, rotation, water, nutrients & pests.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end mb-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Crop A</Label>
          <Select value={a} onValueChange={setA}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card max-h-60">
              {CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block self-center mt-5" />
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Crop B</Label>
          <Select value={b} onValueChange={setB}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card max-h-60">
              {CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Season</Label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card">
              {SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Irrigation</Label>
          <Select value={irrigation} onValueChange={setIrrigation}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card">
              {IRRIGATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Area (acres)</Label>
          <Input className="h-9" value={area} onChange={(e) => setArea(e.target.value)} placeholder="2" />
        </div>
      </div>

      <Button onClick={askAI} disabled={loading} className="w-full gradient-primary border-0 text-primary-foreground gap-1.5 mb-4">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing your farm context…</> : <><Sparkles className="h-4 w-4" /> Compare with AI</>}
      </Button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Overall score */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-krishi-sky/10 border border-primary/20">
              <div className="w-14 h-14 rounded-full bg-card border-2 border-primary flex items-center justify-center flex-shrink-0">
                <span className="font-display font-bold text-lg text-primary">{result.overall_score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">Overall compatibility</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  Estimated yield uplift: <span className="font-semibold text-primary">+{result.yield_uplift_pct}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {cells.map((k) => (
                <div key={k} className={`p-2.5 rounded-lg border text-center text-xs ${colour(result[k])}`}>
                  <div className="flex items-center justify-center mb-1">{icon(result[k])}</div>
                  <div className="font-medium">{labels[k]}</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-sm text-foreground">
              <span className="font-semibold text-primary">AI verdict: </span>
              {result.recommendation}
            </div>

            {result.best_practice && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground flex gap-2">
                <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div><span className="font-semibold">Best practice:</span> {result.best_practice}</div>
              </div>
            )}

            {result.warning && (
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive flex gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div><span className="font-semibold">Watch out:</span> {result.warning}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
