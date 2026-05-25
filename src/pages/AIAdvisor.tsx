import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, Send, MessageCircle, Zap, Settings2, History } from "lucide-react";
import Navbar from "@/components/Navbar";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import Footer from "@/components/Footer";
import InputWizard from "@/components/advisor/InputWizard";
import InsightGrid from "@/components/advisor/InsightGrid";
import PdfExportButton from "@/components/advisor/PdfExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { advisorInputSchema, type AdvisorInput, type AdvisoryResult } from "@/lib/aiAdvisorSchema";
import { toast } from "sonner";

const ADVISOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`;
const historyKey = (id?: string) => `km.advisor.history.${id || "anon"}`;

type HistoryEntry = { ts: number; label: string; inputs: AdvisorInput; result: AdvisoryResult };

const INDIAN_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Gujarat","Haryana","Himachal Pradesh",
  "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab",
  "Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal",
];

export default function AIAdvisor() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [result, setResult] = useState<AdvisoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"quick" | "full">("quick");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Quick mode fields
  const [qState, setQState] = useState("");
  const [qCrop, setQCrop] = useState("");
  const [qLand, setQLand] = useState<string>("");
  const [qSoil, setQSoil] = useState<string>("");
  const [qBudget, setQBudget] = useState<string>("");

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendFollowup = async () => {
    const q = chatInput.trim();
    if (!q || !result || chatStreaming) return;
    setChatInput("");
    const history = [...chatMessages, { role: "user" as const, content: q }];
    setChatMessages([...history, { role: "assistant", content: "" }]);
    setChatStreaming(true);
    try {
      const resp = await fetch(ADVISOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action: "followup", question: q, result, messages: chatMessages }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (e: any) {
      setChatMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: `⚠ ${e.message || "Failed to get response"}` };
        return next;
      });
      toast.error(e.message || "Follow-up failed");
    } finally {
      setChatStreaming(false);
    }
  };

  // Prefill from profile + personalization
  const initial: AdvisorInput = useMemo(() => {
    const d: any = active?.farmer_details || {};
    const toArr = (x: any): string[] => {
      if (Array.isArray(x)) return x.map(String);
      if (typeof x === "string" && x.trim()) return x.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    };
    const toNum = (x: any) => {
      const n = typeof x === "number" ? x : parseFloat(x);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      state: d.state || ctx?.location?.state,
      district: d.district || ctx?.location?.district,
      village: d.village || ctx?.location?.village,
      lat: ctx?.location?.lat,
      lon: ctx?.location?.lon,
      soil_type: d.soil_type,
      soil_ph: toNum(d.soil_ph),
      nitrogen: toNum(d.nitrogen),
      phosphorus: toNum(d.phosphorus),
      potassium: toNum(d.potassium),
      organic_carbon_pct: toNum(d.organic_carbon),
      land_size_acres: toNum(d.total_land),
      irrigation_source: d.irrigation_type,
      current_crops: toArr(d.current_crops),
      previous_crops: toArr(d.previous_crops),
      budget_per_acre: toNum(d.budget_per_acre),
      mandi_distance_km: toNum(d.nearest_mandi_km),
      risk_appetite: d.risk_tolerance,
      market_preference: d.market_preference,
      tech_comfort: toNum(d.tech_comfort),
    } as AdvisorInput;
  }, [active, ctx]);

  // Prefill Quick mode fields from profile
  useEffect(() => {
    if (initial.state && !qState) setQState(initial.state);
    if (Array.isArray(initial.current_crops) && initial.current_crops[0] && !qCrop) setQCrop(initial.current_crops[0]);
    if (initial.land_size_acres && !qLand) setQLand(String(initial.land_size_acres));
    if (initial.soil_type && !qSoil) {
      const s = initial.soil_type.toLowerCase();
      const match = ["Alluvial","Black","Red","Sandy"].find((x) => s.includes(x.toLowerCase()));
      if (match) setQSoil(match);
    }
    if (initial.budget_per_acre && !qBudget) setQBudget(String(initial.budget_per_acre));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // Load history
  useEffect(() => {
    if (!active?.id) return;
    try {
      const raw = localStorage.getItem(historyKey(active.id));
      if (raw) {
        const arr = JSON.parse(raw) as HistoryEntry[];
        if (Array.isArray(arr)) {
          setHistory(arr);
          // Show most recent in output panel
          const latest = arr[0];
          if (latest && Date.now() - latest.ts < 12 * 60 * 60 * 1000) {
            setResult(latest.result);
            setLastRun(latest.ts);
          }
        }
      }
    } catch {}
  }, [active?.id]);

  const saveToHistory = (inputs: AdvisorInput, data: AdvisoryResult) => {
    const crop = (Array.isArray(inputs.current_crops) && inputs.current_crops[0]) || inputs.intended_crop || "Farm";
    const defaultLabel = `${crop} · ${new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
    const userLabel = typeof window !== "undefined" ? window.prompt("Save this analysis as:", defaultLabel) : defaultLabel;
    const label = (userLabel && userLabel.trim()) || defaultLabel;
    const entry: HistoryEntry = { ts: Date.now(), label, inputs, result: data };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 5);
      try { localStorage.setItem(historyKey(active?.id), JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const loadFromHistory = (h: HistoryEntry) => {
    setResult(h.result);
    setLastRun(h.ts);
    setChatMessages([]);
    toast.success(`Loaded: ${h.label}`);
  };

  const run = async (inputs: AdvisorInput) => {
    const parsed = advisorInputSchema.safeParse(inputs);
    if (!parsed.success) {
      toast.error("Invalid inputs");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(ADVISOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ inputs: parsed.data, profileContext: ctx }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) throw new Error("AI is busy — try again in a moment.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Top up in Settings → Usage.");
        throw new Error(err.error || "AI service failed");
      }
      const data = (await resp.json()) as AdvisoryResult;
      if ((data as any).error) throw new Error((data as any).error);
      setResult(data);
      setLastRun(Date.now());
      toast.success("25 insights ready! 🌾");
      saveToHistory(parsed.data, data);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const runQuick = () => {
    if (!qState || !qCrop || !qLand) {
      toast.error("Please fill state, crop and land size");
      return;
    }
    const inputs: AdvisorInput = {
      ...initial,
      state: qState,
      current_crops: [qCrop],
      intended_crop: qCrop,
      land_size_acres: parseFloat(qLand) || undefined,
      soil_type: qSoil || initial.soil_type,
      budget_per_acre: qBudget ? parseFloat(qBudget) : initial.budget_per_acre,
    } as AdvisorInput;
    run(inputs);
  };

  // Merge Quick values into the wizard's initial when in Full mode
  const fullInitial: AdvisorInput = useMemo(() => ({
    ...initial,
    state: qState || initial.state,
    current_crops: qCrop ? [qCrop] : initial.current_crops,
    intended_crop: qCrop || initial.intended_crop,
    land_size_acres: qLand ? parseFloat(qLand) : initial.land_size_acres,
    soil_type: qSoil || initial.soil_type,
    budget_per_acre: qBudget ? parseFloat(qBudget) : initial.budget_per_acre,
  }) as AdvisorInput, [initial, qState, qCrop, qLand, qSoil, qBudget]);

  return (
    <AgriPageBackground variant="advisor" className="flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 mb-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
              <Sparkles className="h-3 w-3" /> AI ADVISOR · 50+ inputs · 25 insights
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground mb-2">Your whole farm, decoded.</h1>
            <p className="text-muted-foreground max-w-2xl">Tell KrishiMitra about your land, soil, crops, finances, and goals. Get a personalized 25-point advisory — crop fit, costs, yields, profit, schemes, risks — all in seconds.</p>
            {lastRun && (
              <p className="text-xs text-muted-foreground mt-3">Last analyzed: {new Date(lastRun).toLocaleString()}</p>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Input panel */}
          <div className="lg:col-span-2 space-y-3">
            {/* Past Analyses chips */}
            {history.length > 0 && (
              <div className="glass-card p-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground">
                  <History className="h-3 w-3" /> Past Analyses
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <button
                      key={h.ts}
                      onClick={() => loadFromHistory(h)}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 text-foreground transition-colors"
                      title={new Date(h.ts).toLocaleString()}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border">
              <button
                onClick={() => setMode("quick")}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${mode === "quick" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Zap className="h-3 w-3" /> Quick (5 fields)
              </button>
              <span className="text-muted-foreground text-xs">·</span>
              <button
                onClick={() => setMode("full")}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all ${mode === "full" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Settings2 className="h-3 w-3" /> Full (50+ fields)
              </button>
            </div>

            {mode === "quick" ? (
              <div className="glass-card p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">State</Label>
                  <Select value={qState} onValueChange={setQState}>
                    <SelectTrigger><SelectValue placeholder="Select state…" /></SelectTrigger>
                    <SelectContent className="bg-card max-h-72">
                      {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Main Crop</Label>
                  <Input value={qCrop} onChange={(e) => setQCrop(e.target.value)} placeholder="e.g. Paddy, Wheat, Cotton" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Land Size (acres)</Label>
                  <Input type="number" step="0.1" value={qLand} onChange={(e) => setQLand(e.target.value)} placeholder="e.g. 2.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Soil Type</Label>
                  <Select value={qSoil} onValueChange={setQSoil}>
                    <SelectTrigger><SelectValue placeholder="Select soil…" /></SelectTrigger>
                    <SelectContent className="bg-card">
                      {["Alluvial","Black","Red","Sandy"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Budget per acre (₹)</Label>
                  <Input type="number" value={qBudget} onChange={(e) => setQBudget(e.target.value)} placeholder="e.g. 25000" />
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button onClick={runQuick} disabled={loading} className="w-full h-12 gradient-primary border-0 text-primary-foreground font-semibold text-base">
                    {loading ? "Analyzing…" : "✨ Generate Insights"}
                  </Button>
                </motion.div>
                <p className="text-[11px] text-muted-foreground text-center">Switch to Full Mode for crop rotation, NPK, irrigation & 45+ more fields.</p>
              </div>
            ) : (
              <InputWizard initial={fullInitial} onSubmit={run} loading={loading} />
            )}
          </div>

          {/* Output panel */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
              </div>
            ) : result ? (
              <>
                <div className="flex justify-end mb-2 gap-2">
                  <PdfExportButton
                    targetId="advisor-report"
                    result={result}
                    farmer={{
                      name: active?.full_name,
                      location:
                        active?.farm_location ||
                        [active?.farmer_details?.district, active?.farmer_details?.state]
                          .filter(Boolean)
                          .join(", "),
                      season: ctx?.climate?.current_season,
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => setResult(null)} className="gap-1">
                    <RefreshCw className="h-3 w-3" /> New analysis
                  </Button>
                </div>
                <div id="advisor-report" className="bg-background p-2 rounded-2xl">
                  <InsightGrid r={result} />
                </div>

                {/* Follow-up chat */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <MessageCircle className="h-4 w-4 text-primary" /> Ask a follow-up
                  </div>
                  {chatMessages.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-[420px] overflow-y-auto pr-1">
                      {chatMessages.map((m, i) => (
                        <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                          <div className={
                            m.role === "user"
                              ? "max-w-[85%] rounded-2xl px-4 py-2 bg-primary text-primary-foreground text-sm"
                              : "max-w-[90%] rounded-2xl px-4 py-2 bg-muted text-foreground text-sm whitespace-pre-wrap"
                          }>
                            {m.content || (chatStreaming && i === chatMessages.length - 1 ? <Loader2 className="h-3 w-3 animate-spin" /> : "")}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                  <div className="sticky bottom-2 z-10">
                    <div className="flex gap-2 bg-background/95 backdrop-blur border border-border rounded-2xl p-2 shadow-lg">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFollowup(); } }}
                        placeholder="Ask anything about your analysis…"
                        disabled={chatStreaming}
                        className="border-0 focus-visible:ring-0 bg-transparent"
                      />
                      <Button onClick={sendFollowup} disabled={chatStreaming || !chatInput.trim()} size="icon">
                        {chatStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-10 text-center">
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-3 opacity-50" />
                <h3 className="font-display font-semibold text-lg text-foreground mb-1">Ready when you are</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">Fill in the inputs on the left (many are already prefilled from your profile) and click <b>Generate Insights</b>.</p>
              </div>
            )}
            {loading && (
              <div className="text-center text-sm text-muted-foreground mt-3 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> KrishiMitra is thinking about your farm…
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
