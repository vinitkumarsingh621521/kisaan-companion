import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { edgeToken } from "@/lib/edgeAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import PrescriptionCard from "./PrescriptionCard";

const CROPS = [
  { name: "Rice", emoji: "🌾" }, { name: "Wheat", emoji: "🌿" },
  { name: "Cotton", emoji: "🌸" }, { name: "Maize", emoji: "🌽" },
  { name: "Tomato", emoji: "🍅" }, { name: "Potato", emoji: "🥔" },
  { name: "Onion", emoji: "🧅" }, { name: "Mustard", emoji: "🌼" },
  { name: "Soybean", emoji: "🫘" }, { name: "Sugarcane", emoji: "🎋" },
  { name: "Pulses", emoji: "🫛" }, { name: "Vegetables", emoji: "🥬" },
];

const GROWTH_STAGES = [
  { stage: "Pre-sowing", emoji: "🌰", desc: "Before planting" },
  { stage: "Seedling", emoji: "🌱", desc: "0–3 weeks" },
  { stage: "Vegetative", emoji: "🌿", desc: "Growing leaves" },
  { stage: "Flowering", emoji: "🌸", desc: "Flowers forming" },
  { stage: "Fruiting", emoji: "🍅", desc: "Grain/fruit set" },
  { stage: "Near harvest", emoji: "🌾", desc: "Almost ready" },
];

const KNOWN_ISSUES = [
  "Yellowing leaves", "Pale / stunted growth", "Wilting / drooping",
  "Holes in leaves", "White powdery coating", "Brown spots on leaves",
  "Root rot / soggy soil", "Insect infestation", "No visible problem",
];

const STATES = [
  "Uttar Pradesh","Bihar","Punjab","Haryana","Rajasthan","Maharashtra",
  "Gujarat","Madhya Pradesh","Andhra Pradesh","Karnataka","Tamil Nadu",
  "West Bengal","Odisha","Jharkhand","Chhattisgarh","Telangana","Assam",
];

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

interface WizardData {
  crop: string;
  areaAcres: number;
  soilPh: string;
  nitrogenStatus: string;
  waterSource: string;
  growthStage: string;
  state: string;
  knownIssues: string[];
}

export default function PrescriptionWizard() {
  const { active } = useActiveProfile();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [data, setData] = useState<Partial<WizardData>>({
    crop: active?.farmer_details?.primary_crop || "",
    state: active?.farmer_details?.state || "",
    areaAcres: active?.farmer_details?.farm_size_acres || 1,
    knownIssues: [],
  });
  const [loading, setLoading] = useState(false);
  const [prescription, setPrescription] = useState<any>(null);

  const Pill = ({ value, current, onSelect, label }: { value: string; current?: string; onSelect: (v: string) => void; label?: string }) => (
    <button
      onClick={() => onSelect(value)}
      className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
        current === value
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40"
      }`}
    >
      {label || value}
    </button>
  );

  const toggleIssue = (issue: string) => {
    setData((d) => {
      const prev = d.knownIssues || [];
      if (issue === "No visible problem") return { ...d, knownIssues: ["No visible problem"] };
      const filtered = prev.filter((i) => i !== "No visible problem");
      return {
        ...d,
        knownIssues: filtered.includes(issue)
          ? filtered.filter((i) => i !== issue)
          : [...filtered, issue],
      };
    });
  };

  const canProceed = () => {
    if (step === 1) return !!data.crop && (data.areaAcres || 0) > 0;
    if (step === 2) return !!data.soilPh && !!data.nitrogenStatus && !!data.waterSource;
    if (step === 3) return !!data.growthStage && !!data.state;
    return true;
  };

  const generatePrescription = async () => {
    setLoading(true);
    try {
      const ctx = active?.farmer_details || {};
      const token = await edgeToken();
      const issues = (data.knownIssues || []).join(", ") || "None reported";
      const prompt = `Generate a complete farm prescription for:
Crop: ${data.crop}
Area: ${data.areaAcres} acres
Soil pH: ${data.soilPh}
Nitrogen Status: ${data.nitrogenStatus}
Growth Stage: ${data.growthStage}
Water Source: ${data.waterSource}
Known Issues: ${issues}
State: ${data.state}
Season: ${ctx.season || "Kharif"}
Farmer: ${ctx.name || "Farmer"}

Provide precise ICAR-standard recommendations. Be specific with product names, doses per acre, and timing in DAS (days after sowing).`;

      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "prescription",
          messages: [{ role: "user", content: prompt }],
          profileContext: ctx,
          profile: active,
        }),
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const { result } = await resp.json();
      const text = typeof result === "string"
        ? result.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
        : null;
      const rx = text ? JSON.parse(text) : result;
      setPrescription(rx);
    } catch (e: any) {
      toast.error("Could not generate prescription", { description: e?.message || "Try again" });
    } finally {
      setLoading(false);
    }
  };

  const StepHeader = () => (
    <div className="flex items-center mb-8">
      {[
        { n: 1, label: "Crop" },
        { n: 2, label: "Soil" },
        { n: 3, label: "Farm" },
        { n: 4, label: "Issues" },
      ].map((s, i, arr) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 transition-all ${
            step > s.n ? "bg-primary border-primary text-white" :
            step === s.n ? "bg-primary/10 border-primary text-primary" :
            "bg-muted border-border text-muted-foreground"
          }`}>
            {step > s.n ? "✓" : s.n}
          </div>
          <span className={`ml-1.5 text-xs font-medium hidden sm:block ${step === s.n ? "text-foreground" : "text-muted-foreground"}`}>
            {s.label}
          </span>
          {i < arr.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 rounded transition-all ${step > s.n ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );

  if (prescription) {
    return (
      <PrescriptionCard
        prescription={prescription}
        wizardData={data as WizardData}
        onReset={() => { setPrescription(null); setStep(1); }}
      />
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
      <div className="bg-gradient-to-r from-green-900 to-emerald-700 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💊</span>
          <div>
            <p className="font-display font-bold text-white text-lg">Generate My Farm Prescription</p>
            <p className="text-white/70 text-xs">4 quick questions · AI answers in seconds</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <StepHeader />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">🌾 Which crop are you growing?</h3>
                  <p className="text-xs text-muted-foreground mb-4">Select the main crop you want the prescription for</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {CROPS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setData((d) => ({ ...d, crop: c.name }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all hover:border-primary/50 ${
                          data.crop === c.name
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        <span className="text-2xl">{c.emoji}</span>
                        <span className="text-xs font-medium">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">📐 Farm area (acres)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0.1} max={200} step={0.5}
                      value={data.areaAcres || ""}
                      onChange={(e) => setData((d) => ({ ...d, areaAcres: parseFloat(e.target.value) || 0 }))}
                      className="border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground w-36 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. 2.5"
                    />
                    <span className="text-sm text-muted-foreground">acres</span>
                    {(data.areaAcres || 0) > 0 && (
                      <span className="text-xs text-green-600 font-medium">
                        ≈ {((data.areaAcres || 0) * 0.4047).toFixed(2)} hectares
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">🧪 Soil condition</h3>
                  <p className="text-xs text-muted-foreground mb-4">Best guesses are fine — AI will adjust</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Soil pH (if known)</p>
                  {["Acidic — below 6.5 (sour taste, reddish soil)", "Neutral — 6.5–7.5 (ideal for most crops)", "Alkaline — above 7.5 (white crust, hard soil)", "I don't know my soil pH"].map((opt) => (
                    <Pill key={opt} value={opt} current={data.soilPh} onSelect={(v) => setData((d) => ({ ...d, soilPh: v }))} />
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Nitrogen status (leaf color)</p>
                  {["Deficient — pale yellow or light green leaves", "Adequate — healthy dark green leaves", "Possible excess — very dark green, thick, lodging", "I'm not sure"].map((opt) => (
                    <Pill key={opt} value={opt} current={data.nitrogenStatus} onSelect={(v) => setData((d) => ({ ...d, nitrogenStatus: v }))} />
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Water / irrigation source</p>
                  {["Canal / River water", "Borewell / Tubewell", "Rainfed — monsoon only", "Drip or sprinkler system"].map((opt) => (
                    <Pill key={opt} value={opt} current={data.waterSource} onSelect={(v) => setData((d) => ({ ...d, waterSource: v }))} />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">🌍 Farm context</h3>
                  <p className="text-xs text-muted-foreground mb-4">Helps AI give region-specific advice</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Current crop stage</p>
                  <div className="grid grid-cols-3 gap-2">
                    {GROWTH_STAGES.map(({ stage, emoji, desc }) => (
                      <button
                        key={stage}
                        onClick={() => setData((d) => ({ ...d, growthStage: stage }))}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          data.growthStage === stage
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{stage}</span>
                        <span className="text-[10px] text-muted-foreground text-center">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Your state</p>
                  <Select value={data.state || ""} onValueChange={(v) => setData((d) => ({ ...d, state: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">⚠️ Any visible problems?</h3>
                  <p className="text-xs text-muted-foreground mb-4">Select all you've noticed. AI will prioritize accordingly.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {KNOWN_ISSUES.map((issue) => {
                    const selected = (data.knownIssues || []).includes(issue);
                    const emoji = issue === "Yellowing leaves" ? "🍂" : issue === "Pale / stunted growth" ? "📉" : issue === "Wilting / drooping" ? "💧" : issue === "Holes in leaves" ? "🐛" : issue === "White powdery coating" ? "🍄" : issue === "Brown spots on leaves" ? "🟤" : issue === "Root rot / soggy soil" ? "🌊" : issue === "Insect infestation" ? "🦟" : "✅";
                    return (
                      <button
                        key={issue}
                        onClick={() => toggleIssue(issue)}
                        className={`px-3 py-2 rounded-full text-sm border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        }`}
                      >
                        {emoji} {issue}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">📋 Prescription summary</p>
                  {[
                    ["Crop", `${CROPS.find(c => c.name === data.crop)?.emoji || ""} ${data.crop}`],
                    ["Area", `${data.areaAcres} acres`],
                    ["Stage", data.growthStage],
                    ["State", data.state],
                    ["Water", data.waterSource?.split(" — ")[0]],
                    ["Issues", (data.knownIssues || []).length === 0 ? "None selected" : (data.knownIssues || []).join(", ")],
                  ].map(([label, value]) => value && (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium text-right max-w-[55%] truncate">{value}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={generatePrescription}
                  disabled={loading || !data.crop}
                  className="w-full bg-gradient-to-r from-green-800 to-emerald-600 hover:from-green-700 hover:to-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Generating your prescription...</>
                  ) : (
                    <><Sparkles className="h-5 w-5" /> Generate My Farm Prescription</>
                  )}
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1) as any)}
            disabled={step === 1 || loading}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as any)}
              disabled={!canProceed() || loading}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
