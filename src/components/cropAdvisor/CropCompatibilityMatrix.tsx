import { useState, useMemo } from "react";
import { Sparkles, ArrowRight, Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const CROPS = [
  "Rice", "Wheat", "Maize", "Soybean", "Cotton", "Sugarcane", "Mustard",
  "Bajra", "Pulses", "Chickpea", "Pigeon Pea", "Groundnut", "Sunflower",
  "Tomato", "Onion", "Potato", "Brinjal", "Okra", "Chilli", "Turmeric",
  "Banana", "Mango", "Sesame", "Jowar", "Ragi",
];

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

type Compat = {
  intercrop: "good" | "ok" | "bad";
  rotation: "good" | "ok" | "bad";
  water: "good" | "ok" | "bad";
  nutrient: "good" | "ok" | "bad";
  pest: "good" | "ok" | "bad";
  recommendation: string;
};

// Local rule-based fallback to ensure something always renders
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
    recommendation: isGood
      ? `${a} and ${b} are compatible. ${a} can be grown with or rotated with ${b} to improve soil health.`
      : `${a} and ${b} have moderate compatibility. Verify with local agronomy extension before intercropping.`,
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
  const [a, setA] = useState("Rice");
  const [b, setB] = useState("Pulses");
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
          action: "chat",
          messages: [
            {
              role: "user",
              content: `Compatibility report for ${a} + ${b}. Reply ONLY with valid JSON: {"intercrop":"good|ok|bad","rotation":"good|ok|bad","water":"good|ok|bad","nutrient":"good|ok|bad","pest":"good|ok|bad","recommendation":"2-sentence specific advice for an Indian farmer"}`,
            },
          ],
        }),
      });
      if (!resp.ok) throw new Error(`AI failed (${resp.status})`);
      const data = await resp.json();
      const content: string = data.result || "";
      const m = content.match(/\{[\s\S]*\}/);
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
        Pick two crops — find out if they intercrop, rotate, or share resources well.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end mb-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Crop A</label>
          <Select value={a} onValueChange={setA}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card max-h-60">
              {CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block self-center mt-5" />
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Crop B</label>
          <Select value={b} onValueChange={setB}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card max-h-60">
              {CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={askAI} disabled={loading} className="gradient-primary border-0 text-primary-foreground gap-1.5">
          {loading ? "Analyzing…" : "Compare"}
        </Button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
