import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skull, Scale, Gavel, AlertTriangle, ArrowLeft, Sparkles, Loader2, Send, RefreshCw, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useDowryUnlock } from "@/hooks/useDowryUnlock";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import dowryGreed from "@/assets/dowry-greed.jpg";
import dowryJail from "@/assets/dowry-jail.jpg";

type Q = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  options?: string[];
  hint?: string;
  profileKey?: string; // auto-fill from farmer_details[profileKey]
  placeholder?: string;
  sarcastic?: boolean;
};

const QUESTIONS: Q[] = [
  // Personal
  { key: "name", label: "Your honourable name 🤴 (so we can shame you properly)", type: "text", placeholder: "Mr. Greedy Singh", sarcastic: true },
  { key: "age", label: "Age (years on this Earth wasted being like this)", type: "number", profileKey: "age", placeholder: "30", sarcastic: true },
  { key: "education", label: "Education level", type: "select", options: ["No formal education", "Primary school", "Secondary school", "Higher secondary", "Graduate", "Post-graduate", "PhD (in greed)"], profileKey: "education" },
  { key: "occupation", label: "Your real job (not 'businessman' please)", type: "text", placeholder: "Farmer / clerk / unemployed beta" },
  { key: "monthly_salary", label: "Honest monthly salary (₹)", type: "number", placeholder: "15000" },
  { key: "looks_self_rating", label: "How handsome are you out of 10? 😏", type: "select", options: ["10 — Shahrukh's twin", "8 — Decent", "6 — Average uncle", "4 — Mirror is scared", "2 — WhatsApp DP only"], sarcastic: true },
  { key: "height_cm", label: "Height in cm (no lying, we'll measure)", type: "number", placeholder: "170" },
  { key: "hair_status", label: "Hair situation 💇", type: "select", options: ["Full Bollywood mane", "Slight thinning", "Strategic hairstyle", "Bald & proud", "Patanjali oil dependent"], sarcastic: true },

  // Land & Farm (auto-fill)
  { key: "total_land", label: "Total land owned (acres)", type: "number", profileKey: "total_land", placeholder: "5" },
  { key: "irrigated_land", label: "Irrigated land (acres)", type: "number", profileKey: "irrigated_land", placeholder: "3" },
  { key: "ownership_type", label: "Land ownership", type: "select", options: ["Owned", "Leased", "Sharecropping", "Joint family", "Bank ka hai actually"], profileKey: "ownership_type" },
  { key: "annual_income", label: "Annual income bracket", type: "select", options: ["Below ₹1 lakh", "₹1-3 lakh", "₹3-5 lakh", "₹5-10 lakh", "Above ₹10 lakh"], profileKey: "annual_income" },
  { key: "monthly_profit", label: "Real monthly profit from farming (₹)", type: "number", placeholder: "12000" },
  { key: "existing_loans", label: "Loans you're hiding 🤐", type: "select", options: ["No loans (sure?)", "KCC loan", "Bank loan", "Microfinance", "Multiple loans + uncle's chit fund"], profileKey: "existing_loans" },

  // Cattle/Cows
  { key: "cows", label: "Number of cows 🐄", type: "number", placeholder: "2" },
  { key: "buffaloes", label: "Buffaloes", type: "number", placeholder: "1" },
  { key: "goats", label: "Goats / sheep", type: "number", placeholder: "5" },
  { key: "chickens", label: "Chickens (don't count the dead ones)", type: "number", placeholder: "10", sarcastic: true },
  { key: "tractor", label: "Tractor situation 🚜", type: "select", options: ["Own tractor (top bhai)", "Tractor on EMI", "Borrowed from cousin", "Bullock cart (heritage)", "Walking is best exercise"] },

  // House
  { key: "house_type", label: "Your house", type: "select", options: ["Pucca + 2 floors", "Pucca single floor", "Half pucca half kuccha", "Kuccha", "Joint family ke ghar mein"] },
  { key: "house_rooms", label: "Number of rooms (bathroom alag)", type: "number", placeholder: "3" },
  { key: "vehicles", label: "Vehicles owned", type: "select", options: ["Car + bike", "Bike only", "Bicycle (eco-warrior)", "Bullock cart", "Apne paer hi gaadi hain"], sarcastic: true },
  { key: "smartphone", label: "Phone", type: "select", options: ["Latest iPhone", "Mid-range Android", "Basic Android", "Keypad phone", "Bhai ka phone use karta hoon"], profileKey: "smartphone" },

  // Family pressure
  { key: "family_size", label: "Family size", type: "number", profileKey: "family_size", placeholder: "5" },
  { key: "siblings_unmarried", label: "Unmarried siblings (more pressure 😅)", type: "number", placeholder: "2", sarcastic: true },
  { key: "mother_demands", label: "Who's pushing for dowry?", type: "select", options: ["My darling mother 🙄", "Father (silent partner)", "Whole khandaan", "Just me (proud villain)", "Society pressure ji"], sarcastic: true },
  { key: "caste_pride", label: "How much caste pride? 1-10", type: "number", placeholder: "8", sarcastic: true },

  // Weird & sarcastic
  { key: "favourite_dialogue", label: "Your favourite filmy dialogue (we'll judge)", type: "text", placeholder: "Mogambo khush hua", sarcastic: true },
  { key: "biggest_achievement", label: "Biggest achievement so far", type: "text", placeholder: "Won kabaddi match in 2014" },
  { key: "kitchen_skills", label: "Can you make tea? ☕", type: "select", options: ["Master chef", "Decent chai", "Only Maggi", "Mom does it", "What is kitchen?"], sarcastic: true },
  { key: "social_media_followers", label: "Instagram followers (counting bots)", type: "number", placeholder: "243", sarcastic: true },
  { key: "love_marriage_story", label: "Ever been rejected in love? 💔", type: "select", options: ["Never tried", "Rejected once", "Rejected many times", "Friend-zoned permanently", "Yes that's why this dowry plan"], sarcastic: true },
  { key: "wife_qualifications_demanded", label: "Qualifications you DEMAND in wife", type: "text", placeholder: "MBA, fair, tall, can cook 50 dishes", sarcastic: true },
  { key: "what_you_offer_in_return", label: "What do YOU offer in return? (be honest)", type: "textarea", placeholder: "Mera pyaar... and 2 acre land...", sarcastic: true },

  // The big one
  { key: "expected_dowry", label: "💰 How much DOWRY you think you'll get? (₹)", type: "number", placeholder: "1500000", hint: "Be ambitious, we'll destroy this number" },
  { key: "expected_items", label: "Items demanded (car, gold, scooter…)", type: "textarea", placeholder: "Activa, 50 tola gold, cash, Royal Enfield, AC fridge…", sarcastic: true },
  { key: "justification", label: "Why do YOU deserve this dowry?", type: "textarea", placeholder: "Because… tradition?", sarcastic: true },
];

export default function DowryEstimatorPage() {
  const navigate = useNavigate();
  const { unlocked } = useDowryUnlock();
  const { active } = useActiveProfile();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<any>(null);

  // Auto-fill from profile
  useEffect(() => {
    if (!active?.farmer_details) return;
    const fd = active.farmer_details;
    const init: Record<string, string> = {};
    for (const q of QUESTIONS) {
      if (q.profileKey && fd[q.profileKey] && !answers[q.key]) {
        init[q.key] = String(fd[q.profileKey]);
      }
    }
    if (Object.keys(init).length) setAnswers(prev => ({ ...init, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Hard guard — if locked, redirect home
  useEffect(() => {
    if (!unlocked) {
      toast.error("🔒 This page is hidden. Type the secret password in the search bar.");
      navigate("/", { replace: true });
    }
  }, [unlocked, navigate]);

  const filledCount = useMemo(() => QUESTIONS.filter(q => answers[q.key] && String(answers[q.key]).trim()).length, [answers]);
  const progress = Math.round((filledCount / QUESTIONS.length) * 100);

  const set = (k: string, v: string) => setAnswers(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!answers.expected_dowry) {
      toast.error("Bata na bhai, kitna dowry chahiye? Fill the expected amount first.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dowry-estimate", {
        body: { answers, profile: active?.farmer_details || {} }
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "AI failed");
      setVerdict((data as any).verdict);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast.error(e.message || "Roast failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setVerdict(null); window.scrollTo({ top: 400, behavior: "smooth" }); };

  if (!unlocked) return null;

  const bg = verdict ? dowryJail : dowryGreed;

  return (
    <div className="min-h-screen relative">
      <Navbar />
      {/* Background */}
      <div className="fixed inset-0 -z-10 transition-opacity duration-700">
        <img src={bg} alt="" className="w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
      </div>

      <div className="container mx-auto px-4 pt-20 pb-16 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back (escape karma)
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Hidden page — auto-locks when you leave
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold mb-3">
            <Skull className="h-3.5 w-3.5" /> SATIRE / EDUCATION ONLY · DOWRY IS A CRIME
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground drop-shadow-lg">
            🤡 AI Dowry Reality Check 3000
          </h1>
          <p className="text-foreground/90 mt-3 text-lg drop-shadow max-w-2xl mx-auto">
            So you think your face is worth a Royal Enfield + 50 tola gold? Let our AI judge you mercilessly using science, math, and pure desi sarcasm.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!verdict ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="p-6 bg-card/95 backdrop-blur-md border-2 border-destructive/30 shadow-2xl">
                {/* Progress */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {filledCount}/{QUESTIONS.length} questions answered
                    </span>
                    <span className="text-xs text-muted-foreground">{progress}% — {progress < 30 ? "warming up the roast 🔥" : progress < 70 ? "AI is sharpening knives 🔪" : "roast is ready, beta"}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {/* Auto-fill notice */}
                {active?.farmer_details && Object.keys(active.farmer_details).length > 0 && (
                  <div className="mb-5 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">
                      <strong>Auto-filled from your profile:</strong> land, income, education, family size, livestock — but you can edit anything. We'll use this against you. 😈
                    </p>
                  </div>
                )}

                {/* Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {QUESTIONS.map((q, idx) => (
                    <div key={q.key} className={q.type === "textarea" ? "md:col-span-2" : ""}>
                      <Label className="text-xs mb-1 block text-foreground font-medium">
                        <span className="text-muted-foreground mr-1">Q{idx + 1}.</span>
                        {q.label}
                        {q.sarcastic && <span className="ml-1 text-[10px] text-destructive">😏</span>}
                      </Label>
                      {q.type === "select" && q.options ? (
                        <Select value={answers[q.key] || ""} onValueChange={v => set(q.key, v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select honestly…" /></SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {q.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : q.type === "textarea" ? (
                        <Textarea
                          value={answers[q.key] || ""}
                          onChange={e => set(q.key, e.target.value)}
                          placeholder={q.placeholder}
                          rows={2}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          className="h-9"
                          type={q.type}
                          value={answers[q.key] || ""}
                          onChange={e => set(q.key, e.target.value)}
                          placeholder={q.placeholder}
                          onKeyDown={e => {
                            if (e.key === "Enter" && q.key === "expected_dowry") submit();
                          }}
                        />
                      )}
                      {q.hint && <p className="text-[10px] text-muted-foreground italic mt-0.5">{q.hint}</p>}
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <p className="text-xs text-muted-foreground italic">
                    Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-foreground">Enter</kbd> in the dowry field, or click below to face judgement.
                  </p>
                  <Button
                    onClick={submit}
                    disabled={loading || !answers.expected_dowry}
                    size="lg"
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 shadow-lg"
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI is laughing at you…</> : <><Send className="h-4 w-4" /> Get My Brutal Verdict 🔨</>}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div key="verdict" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              {/* Big number */}
              <Card className="p-8 bg-card/95 backdrop-blur-md border-2 border-destructive shadow-2xl text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold mb-4">
                  <Gavel className="h-3.5 w-3.5" /> VERDICT IS IN
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">{verdict.roast_title}</h2>
                <div className="my-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">You expected</div>
                  <div className="text-2xl font-bold text-muted-foreground line-through">₹{Number(verdict.user_expected_inr).toLocaleString("en-IN")}</div>
                  <div className="text-xs text-destructive uppercase tracking-wider mt-3">AI says you're actually worth</div>
                  <div className="text-5xl md:text-6xl font-display font-bold text-destructive drop-shadow-lg">
                    ₹{Number(verdict.estimated_inr).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-destructive font-semibold mt-2">{verdict.reality_gap_pct}% below your fantasy 📉</div>
                </div>
              </Card>

              {/* Roast paragraphs */}
              <Card className="p-6 bg-card/95 backdrop-blur-md border border-border shadow-xl">
                <h3 className="font-display font-bold text-lg text-foreground mb-3 flex items-center gap-2">
                  <Skull className="h-5 w-5 text-destructive" /> The Roast
                </h3>
                <div className="space-y-3">
                  {verdict.roast_paragraphs?.map((p: string, i: number) => (
                    <p key={i} className="text-sm text-foreground leading-relaxed">{p}</p>
                  ))}
                </div>
              </Card>

              {/* Breakdown */}
              <Card className="p-6 bg-card/95 backdrop-blur-md border border-border shadow-xl">
                <h3 className="font-display font-bold text-lg text-foreground mb-3 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" /> Itemised Calculation
                </h3>
                <div className="space-y-2">
                  {verdict.breakdown?.map((b: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{b.factor}</span>
                        <span className={`text-sm font-bold ${b.contribution_inr < 0 ? "text-destructive" : "text-primary"}`}>
                          {b.contribution_inr < 0 ? "−" : "+"}₹{Math.abs(b.contribution_inr).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-1">"{b.snark}"</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Legal warning */}
              <Card className="p-6 bg-destructive/10 backdrop-blur-md border-2 border-destructive shadow-xl">
                <h3 className="font-display font-bold text-lg text-destructive mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> ⚖️ LEGAL REALITY (this is real, not a joke)
                </h3>
                <div className="space-y-3 text-sm text-foreground">
                  <div>
                    <div className="font-semibold mb-1">Sections you're violating:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {verdict.legal_warning?.sections?.map((s: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-destructive/20 text-destructive font-mono font-semibold">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="text-xs text-muted-foreground">Jail term</div>
                      <div className="text-sm font-bold text-destructive">{verdict.legal_warning?.jail_years}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="text-xs text-muted-foreground">Fine</div>
                      <div className="text-sm font-bold text-destructive">{verdict.legal_warning?.fine_inr}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Real consequences:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {verdict.legal_warning?.consequences?.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Redemption */}
              <Card className="p-6 bg-primary/10 backdrop-blur-md border-2 border-primary shadow-xl">
                <h3 className="font-display font-bold text-lg text-primary mb-3 flex items-center gap-2">
                  ✨ Redemption Path
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-foreground">
                  {verdict.redemption_path?.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
              </Card>

              {/* Final burn */}
              <Card className="p-6 bg-gradient-to-br from-destructive/20 to-foreground/10 backdrop-blur-md border-2 border-destructive shadow-2xl text-center">
                <p className="text-lg font-display font-bold text-foreground italic">"{verdict.final_savage_line}"</p>
                <p className="text-xs text-muted-foreground mt-2">— Your conscience, sponsored by AI</p>
              </Card>

              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Try again with different lies
                </Button>
                <Button onClick={() => navigate("/")} className="gap-2 gradient-primary border-0 text-primary-foreground">
                  <ArrowLeft className="h-4 w-4" /> Reform myself & go home
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground italic pt-4 max-w-2xl mx-auto">
                ⚠️ This page is satire intended to discourage dowry. The Dowry Prohibition Act 1961, IPC §498A and §304B make giving, taking, or demanding dowry a serious criminal offence in India. Report dowry harassment: <strong className="text-foreground">Women Helpline 1091</strong> · <strong className="text-foreground">National Commission for Women 7827170170</strong>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
