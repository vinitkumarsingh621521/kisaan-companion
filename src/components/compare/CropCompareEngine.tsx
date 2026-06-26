import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { edgeToken } from "@/lib/edgeAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import CompareResultCard from "./CompareResultCard";
import { errMsg } from "@/lib/errors";

const CROPS = [
  { name: "Rice", emoji: "🌾", hindi: "धान" },
  { name: "Wheat", emoji: "🌿", hindi: "गेहूं" },
  { name: "Maize", emoji: "🌽", hindi: "मक्का" },
  { name: "Cotton", emoji: "🌸", hindi: "कपास" },
  { name: "Tomato", emoji: "🍅", hindi: "टमाटर" },
  { name: "Potato", emoji: "🥔", hindi: "आलू" },
  { name: "Onion", emoji: "🧅", hindi: "प्याज" },
  { name: "Mustard", emoji: "🌼", hindi: "सरसों" },
  { name: "Soybean", emoji: "🫘", hindi: "सोयाबीन" },
  { name: "Sugarcane", emoji: "🎋", hindi: "गन्ना" },
  { name: "Chickpea", emoji: "🫛", hindi: "चना" },
  { name: "Groundnut", emoji: "🥜", hindi: "मूंगफली" },
  { name: "Millet", emoji: "🌾", hindi: "बाजरा" },
  { name: "Lentil", emoji: "🟤", hindi: "मसूर" },
  { name: "Sunflower", emoji: "🌻", hindi: "सूरजमुखी" },
  { name: "Turmeric", emoji: "🟡", hindi: "हल्दी" },
];

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

export default function CropCompareEngine() {
  const { active } = useActiveProfile();
  const [cropA, setCropA] = useState("");
  const [cropB, setCropB] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const swap = () => {
    const tmp = cropA;
    setCropA(cropB);
    setCropB(tmp);
  };

  const canCompare = cropA && cropB && cropA !== cropB;

  const compare = async () => {
    if (!canCompare) {
      toast.error("Pick two different crops to compare");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const ctx: any = active?.farmer_details || {};
      const state = ctx.state || "Uttar Pradesh";
      const soil = ctx.soil_type || "Unknown";
      const water = ctx.irrigation_type || "Borewell";
      const season = ctx.season || "Kharif";
      const token = await edgeToken();

      const prompt = `Compare these two crops for an Indian farmer:
Crop A: ${cropA}
Crop B: ${cropB}
Farmer context:
- State: ${state}
- Soil type: ${soil}
- Water source: ${water}
- Season: ${season}
- Farm size: ${ctx.total_land || "2"} acres
- Experience: ${ctx.farming_experience || "5"} years

Score each crop on all 6 dimensions (0-100) specifically for this farmer's context in ${state}. Give honest, data-driven analysis — do not just pick the more famous crop.`;

      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "crop_compare",
          messages: [{ role: "user", content: prompt }],
          profileContext: ctx,
          profile: active,
        }),
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const { result: raw } = await resp.json();
      const text = typeof raw === "string"
        ? raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
        : null;
      setResult(text ? JSON.parse(text) : raw);
    } catch (e: unknown) {
      toast.error("Comparison failed", { description: errMsg(e) });
    } finally {
      setLoading(false);
    }
  };

  const CropGrid = ({
    label,
    selected,
    onSelect,
    exclude,
    accent,
  }: {
    label: string;
    selected: string;
    onSelect: (v: string) => void;
    exclude: string;
    accent: "violet" | "emerald";
  }) => (
    <div className="flex-1">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {CROPS.map((c) => {
          const isSelected = selected === c.name;
          const isExcluded = exclude === c.name;
          return (
            <button
              key={c.name}
              onClick={() => onSelect(c.name)}
              disabled={isExcluded}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? accent === "violet"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30"
                    : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                  : isExcluded
                  ? "border-border bg-muted opacity-30 cursor-not-allowed"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[11px] font-semibold text-foreground">{c.name}</span>
              <span className="text-[10px] text-muted-foreground">{c.hindi}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (result) {
    return (
      <CompareResultCard
        result={result}
        onReset={() => setResult(null)}
        farmContext={{
          state: (active?.farmer_details as any)?.state || "India",
          season: (active?.farmer_details as any)?.season || "Kharif",
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-6 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="text-4xl">⚖️</div>
        <div>
          <h2 className="font-display font-bold text-xl">Crop Battle Comparison</h2>
          <p className="text-xs text-muted-foreground">
            Pick 2 crops · AI analyzes 6 scientific dimensions · Get a verdict for YOUR farm
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <CropGrid label="🟣 Crop A" selected={cropA} onSelect={setCropA} exclude={cropB} accent="violet" />

        <div className="flex md:flex-col items-center justify-center gap-2 md:px-2">
          <div className="font-bold text-lg bg-gradient-to-r from-violet-600 to-emerald-600 bg-clip-text text-transparent">
            VS
          </div>
          <button
            onClick={swap}
            className="p-2 rounded-full border border-border bg-card hover:bg-muted transition-colors"
            title="Swap"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <CropGrid label="🟢 Crop B" selected={cropB} onSelect={setCropB} exclude={cropA} accent="emerald" />
      </div>

      {(cropA || cropB) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex items-center justify-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-emerald-50 dark:from-violet-900/20 dark:to-emerald-900/20"
        >
          <div className="text-center">
            <div className="text-4xl">{CROPS.find((c) => c.name === cropA)?.emoji || "❓"}</div>
            <div className="text-sm font-semibold mt-1">{cropA || "Select Crop A"}</div>
          </div>
          <div className="font-display font-bold text-2xl text-muted-foreground">VS</div>
          <div className="text-center">
            <div className="text-4xl">{CROPS.find((c) => c.name === cropB)?.emoji || "❓"}</div>
            <div className="text-sm font-semibold mt-1">{cropB || "Select Crop B"}</div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {[
          { label: "📍 State", value: (active?.farmer_details as any)?.state || "Not set" },
          { label: "🌱 Soil", value: (active?.farmer_details as any)?.soil_type || "Not set" },
          { label: "💧 Water", value: (active?.farmer_details as any)?.irrigation_type || "Not set" },
          { label: "🌾 Season", value: (active?.farmer_details as any)?.season || "Kharif" },
        ].map(({ label, value }) => (
          <span
            key={label}
            className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border"
          >
            {label}: {value}
          </span>
        ))}
      </div>

      <button
        onClick={compare}
        disabled={!canCompare || loading}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-emerald-600 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing {cropA} vs {cropB} for your farm...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            {canCompare ? `Compare ${cropA} vs ${cropB}` : "Select 2 different crops to compare"}
          </>
        )}
      </button>

      <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { icon: "💧", label: "Water" },
          { icon: "💰", label: "Profit" },
          { icon: "🌡️", label: "Climate" },
          { icon: "🐛", label: "Pest Risk" },
          { icon: "👷", label: "Labor" },
          { icon: "📈", label: "Market" },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50 border border-border"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-muted-foreground mt-3">
        AI scores both crops on all 6 dimensions for your exact location, soil, and season
      </p>
    </motion.div>
  );
}
