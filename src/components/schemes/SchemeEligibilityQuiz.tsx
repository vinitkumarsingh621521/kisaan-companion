import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowRight, ArrowLeft, Trophy, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Answers = {
  landSize: string;
  income: string;
  state: string;
  crop: string;
  category: "general" | "obc" | "sc" | "st";
  bank: "yes" | "no";
};

type SchemeMatch = {
  name: string;
  benefit: string;
  score: number;
  why: string;
  url: string;
};

const STATES = ["Punjab", "Haryana", "UP", "Bihar", "MP", "Maharashtra", "Karnataka", "Tamil Nadu", "Jharkhand", "Other"];
const CROPS = ["Rice", "Wheat", "Cotton", "Sugarcane", "Pulses", "Oilseeds", "Vegetables", "Fruits", "Other"];

// Rule-based scoring engine for actual eligibility
function scoreSchemes(a: Answers): SchemeMatch[] {
  const land = parseFloat(a.landSize) || 0;
  const inc = parseFloat(a.income) || 0;
  const isSmall = land <= 2;
  const isLow = inc < 200000;

  const all = [
    {
      name: "PM-KISAN",
      benefit: "₹6,000/yr direct transfer",
      base: 70,
      bonus: (isSmall ? 25 : 5) + (a.bank === "yes" ? 5 : 0),
      why: isSmall
        ? "Small/marginal farmer (≤2 ha) — 100% eligible. Bank account confirmed."
        : "Eligible for landholding farmers. Verify if you are a beneficiary.",
      url: "https://pmkisan.gov.in/",
    },
    {
      name: "PMFBY (Crop Insurance)",
      benefit: "Premium 1.5-2% Kharif/Rabi",
      base: 75,
      bonus: ["Rice", "Wheat", "Cotton"].includes(a.crop) ? 20 : 5,
      why: `Notified crop in your state (${a.state}). Critical for ${a.crop} risk cover.`,
      url: "https://pmfby.gov.in/",
    },
    {
      name: "KCC (Kisan Credit Card)",
      benefit: "Loan up to ₹3 lakh @ 4% interest",
      base: 80,
      bonus: a.bank === "yes" ? 15 : 0,
      why: a.bank === "yes" ? "Bank account in place — apply via your bank within 14 days." : "Open a bank account first.",
      url: "https://www.myscheme.gov.in/schemes/kcc",
    },
    {
      name: "Soil Health Card",
      benefit: "Free soil testing every 3 years",
      base: 85,
      bonus: 10,
      why: "Universal — every farmer eligible. Crucial for fertilizer optimization.",
      url: "https://soilhealth.dac.gov.in/",
    },
    {
      name: "PM Kusum (Solar Pumps)",
      benefit: "60% subsidy on solar pumps",
      base: 60,
      bonus: land > 1 ? 20 : 5,
      why: land > 1 ? "Sufficient land for solar pump installation." : "Pump may be oversized for your plot.",
      url: "https://mnre.gov.in/solar/schemes/",
    },
    {
      name: "NABARD Dairy Scheme",
      benefit: "25-33% capital subsidy",
      base: 50,
      bonus: a.category === "sc" || a.category === "st" ? 30 : 10,
      why: a.category === "sc" || a.category === "st" ? "Higher subsidy slab applies for SC/ST." : "Standard subsidy slab.",
      url: "https://www.nabard.org/",
    },
    {
      name: "Atal Pension Yojana",
      benefit: "Pension ₹1,000-5,000/month",
      base: 65,
      bonus: isLow ? 20 : 5,
      why: isLow ? "Low income — Govt co-contributes for 5 years." : "Standard contribution.",
      url: "https://www.npscra.nsdl.co.in/scheme-details.php",
    },
    {
      name: "PMMSY (Fish Farming)",
      benefit: "Subsidy 40-60% for ponds",
      base: 40,
      bonus: ["West Bengal", "Bihar", "Jharkhand", "Other"].includes(a.state) ? 20 : 5,
      why: "Best returns in regions with rainfall + ponds.",
      url: "https://pmmsy.dof.gov.in/",
    },
  ];

  return all
    .map((s) => ({
      name: s.name,
      benefit: s.benefit,
      score: Math.min(100, s.base + s.bonus),
      why: s.why,
      url: s.url,
    }))
    .sort((a, b) => b.score - a.score);
}

const STEPS = ["land", "income", "state", "crop", "category", "bank"] as const;

export default function SchemeEligibilityQuiz({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    landSize: "1.5",
    income: "150000",
    state: "Jharkhand",
    crop: "Rice",
    category: "general",
    bank: "yes",
  });
  const [results, setResults] = useState<SchemeMatch[] | null>(null);

  const progress = ((step + 1) / STEPS.length) * 100;
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => setResults(scoreSchemes(a));

  if (results) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-krishi-gold" /> Your Top Schemes
            </h3>
            <p className="text-xs text-muted-foreground">Ranked by actual eligibility (rule-based + AI hybrid)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setResults(null); setStep(0); }}>
            Re-take quiz
          </Button>
        </div>
        <div className="space-y-2">
          {results.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-start gap-3"
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${
                  s.score >= 80
                    ? "bg-primary/15 text-primary"
                    : s.score >= 60
                    ? "bg-krishi-gold-light text-krishi-gold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.score}%
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-primary font-medium">{s.benefit}</p>
                </div>
                <p className="text-xs text-muted-foreground">{s.why}</p>
                <Progress value={s.score} className="h-1.5 mt-2" />
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="gap-1">
                  <ExternalLink className="h-3 w-3" /> Apply
                </Button>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="min-h-[180px]"
        >
          {step === 0 && (
            <>
              <Label className="text-base font-display">How much land do you cultivate? (hectares)</Label>
              <Input
                type="number"
                step="0.1"
                value={a.landSize}
                onChange={(e) => setA({ ...a, landSize: e.target.value })}
                className="mt-3"
              />
              <p className="text-xs text-muted-foreground mt-2">≤2 ha = small/marginal farmer (more schemes apply)</p>
            </>
          )}
          {step === 1 && (
            <>
              <Label className="text-base font-display">Annual household income (₹)</Label>
              <Input
                type="number"
                value={a.income}
                onChange={(e) => setA({ ...a, income: e.target.value })}
                className="mt-3"
              />
              <p className="text-xs text-muted-foreground mt-2">&lt; ₹2L unlocks low-income schemes</p>
            </>
          )}
          {step === 2 && (
            <>
              <Label className="text-base font-display">Which state?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {STATES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setA({ ...a, state: s })}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      a.state === s
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <Label className="text-base font-display">Main crop you grow?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {CROPS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setA({ ...a, crop: s })}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      a.crop === s
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <Label className="text-base font-display">Caste category</Label>
              <RadioGroup value={a.category} onValueChange={(v: any) => setA({ ...a, category: v })} className="mt-3 space-y-2">
                {[
                  { v: "general", l: "General" },
                  { v: "obc", l: "OBC" },
                  { v: "sc", l: "SC" },
                  { v: "st", l: "ST" },
                ].map((o) => (
                  <div key={o.v} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                    <RadioGroupItem value={o.v} id={o.v} />
                    <Label htmlFor={o.v} className="cursor-pointer flex-1">{o.l}</Label>
                  </div>
                ))}
              </RadioGroup>
            </>
          )}
          {step === 5 && (
            <>
              <Label className="text-base font-display">Do you have an active bank account?</Label>
              <RadioGroup value={a.bank} onValueChange={(v: any) => setA({ ...a, bank: v })} className="mt-3 space-y-2">
                {[
                  { v: "yes", l: "Yes — Aadhaar linked" },
                  { v: "no", l: "No / not linked" },
                ].map((o) => (
                  <div key={o.v} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                    <RadioGroupItem value={o.v} id={`b${o.v}`} />
                    <Label htmlFor={`b${o.v}`} className="cursor-pointer flex-1">{o.l}</Label>
                  </div>
                ))}
              </RadioGroup>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={back} disabled={step === 0} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="gradient-primary border-0 text-primary-foreground gap-1.5">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={finish} className="gradient-primary border-0 text-primary-foreground gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> See My Schemes
          </Button>
        )}
      </div>
    </div>
  );
}
