import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Share2, FileDown, RotateCw, MapPin, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { edgeToken } from "@/lib/edgeAuth";
import { usePersonalization } from "@/hooks/usePersonalization";
import FeatureHint from "@/components/FeatureHint";

type Decision = "SELL_NOW" | "WAIT_3_DAYS" | "WAIT_WEEK" | "SELL_HALF" | "HOLD";
interface Verdict {
  decision: Decision;
  decisionLabel: string;
  urgency: "high" | "medium" | "low";
  confidence: number;
  totalEarnings: number;
  netAfterFreight: number;
  reasons: string[];
  risks: string[];
  bestMandi: string;
  optimalWindow: string;
  alternativeOption: string;
  marketSentiment: "Bullish" | "Bearish" | "Neutral";
  adviceHindi: string;
}

const CROPS = ["Rice", "Wheat", "Cotton", "Maize", "Tomato", "Potato", "Onion", "Mustard", "Soybean", "Sugarcane"];
const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

const STYLE: Record<Decision, { wrap: string; emoji: string }> = {
  SELL_NOW: { wrap: "border-green-500 bg-green-50 dark:bg-green-950/30", emoji: "✅" },
  WAIT_3_DAYS: { wrap: "border-amber-400 bg-amber-50 dark:bg-amber-950/30", emoji: "⏰" },
  WAIT_WEEK: { wrap: "border-blue-400 bg-blue-50 dark:bg-blue-950/30", emoji: "🔵" },
  SELL_HALF: { wrap: "border-orange-400 bg-orange-50 dark:bg-orange-950/30", emoji: "⚡" },
  HOLD: { wrap: "border-red-500 bg-red-50 dark:bg-red-950/30", emoji: "🔴" },
};

export default function SellDecisionEngine() {
  const { ctx } = usePersonalization();
  const [crop, setCrop] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);

  const fillFromProfile = () => {
    const c = ctx?.crops?.current?.[0];
    if (c) {
      setCrop(c);
      toast.success(`Filled crop: ${c}`);
    } else {
      toast.error("No crop in profile.");
    }
  };

  const analyze = async () => {
    if (!crop || !qty || !price) {
      toast.error("Enter crop, quantity and price.");
      return;
    }
    setLoading(true);
    setVerdict(null);
    try {
      const state = ctx?.location?.state || "Uttar Pradesh";
      const season = ctx?.climate?.current_season || "Kharif";
      const month = new Date().toLocaleString("en-IN", { month: "long" });
      const payload = `Analyze sell decision: Crop=${crop}, Qty=${qty} quintals, Current price=₹${price}/qtl, State=${state}, Season=${season}, Month=${month}. Consider MSP, seasonal demand, post-harvest price trends, storage risk, transportation cost.`;
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await edgeToken()}` },
        body: JSON.stringify({
          action: "market_decision",
          messages: [{ role: "user", content: payload }],
          profileContext: ctx,
        }),
      });
      if (!resp.ok) throw new Error(`AI ${resp.status}`);
      const { result, error } = await resp.json();
      if (error) throw new Error(error);
      const parsed = typeof result === "string" ? JSON.parse(result.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()) : result;
      setVerdict(parsed);
    } catch (e: any) {
      toast.error(`Analysis failed: ${e.message || "Try again"}`);
    } finally {
      setLoading(false);
    }
  };

  const shareWhatsApp = () => {
    if (!verdict) return;
    const txt = `🌾 *KisaanCompanion Market Alert*\n\nCrop: ${crop} | ${qty} Quintals\nPrice: ₹${price}/qtl\n\n🤖 AI Recommendation: *${verdict.decisionLabel}*\n💰 Estimated Earnings: ₹${verdict.totalEarnings.toLocaleString("en-IN")}\n🏪 Best Mandi: ${verdict.bestMandi}\n📅 Sell Window: ${verdict.optimalWindow}\n\n📱 Free AI advice: kisaancompanion.in`;
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank");
  };

  const exportPdf = () => {
    if (!verdict) return;
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setFillColor(6, 78, 59);
    pdf.rect(0, 0, 210, 25, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("AI Bazaar Bodh — Sell Decision Report", 10, 15);
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(11);
    let y = 35;
    const line = (l: string) => { pdf.text(l, 10, y); y += 7; };
    pdf.setFont("helvetica", "bold"); line(`Crop: ${crop}   |   Qty: ${qty} qtl   |   Price: ₹${price}/qtl`);
    pdf.setFont("helvetica", "normal");
    line(`Decision: ${verdict.decisionLabel}  (Confidence ${verdict.confidence}%)`);
    line(`Sentiment: ${verdict.marketSentiment}   Urgency: ${verdict.urgency}`);
    line(`Total Earnings: ₹${verdict.totalEarnings.toLocaleString("en-IN")}`);
    line(`After Freight:  ₹${verdict.netAfterFreight.toLocaleString("en-IN")}`);
    line(`Best Mandi: ${verdict.bestMandi}`);
    line(`Optimal Window: ${verdict.optimalWindow}`);
    y += 3;
    pdf.setFont("helvetica", "bold"); line("Why:");
    pdf.setFont("helvetica", "normal");
    verdict.reasons.forEach((r) => { const w = pdf.splitTextToSize(`• ${r}`, 185); pdf.text(w, 10, y); y += w.length * 6; });
    y += 2;
    pdf.setFont("helvetica", "bold"); line("Risks:");
    pdf.setFont("helvetica", "normal");
    verdict.risks.forEach((r) => { const w = pdf.splitTextToSize(`• ${r}`, 185); pdf.text(w, 10, y); y += w.length * 6; });
    y += 2;
    pdf.setFont("helvetica", "italic");
    const alt = pdf.splitTextToSize(`Alternative: ${verdict.alternativeOption}`, 185);
    pdf.text(alt, 10, y); y += alt.length * 6 + 2;
    const hi = pdf.splitTextToSize(verdict.adviceHindi, 185);
    pdf.text(hi, 10, y);
    pdf.save(`BazaarBodh-${crop}-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF saved 📄");
  };

  const s = verdict ? STYLE[verdict.decision] || STYLE.HOLD : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
      <div className="bg-gradient-to-r from-emerald-900 to-green-700 text-white p-5">
        <h2 className="text-2xl font-display font-bold">
          🤖 Kab Beche? — AI Sell Decision Engine
          <FeatureHint
            title="AI Sell Decision Engine"
            description="Enter your crop, quantity, and current mandi price. AI analyses market trends, weather, and seasonal patterns to tell you whether to sell today or wait — with a confidence percentage."
            example="Rice at ₹2,450/qtl → AI says 'Sell within 3 days (78% confidence)'"
          />
        </h2>
        <p className="text-white/80 text-sm mt-1">Should you sell today or wait for a better price?</p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs mb-1 block">Crop</Label>
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
              <SelectContent>{CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Quantity (quintals)</Label>
            <Input type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 50" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Current price (₹/qtl)</Label>
            <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 2350" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={fillFromProfile}>📍 Fill from Profile</Button>
        </div>

        <Button onClick={analyze} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing market…</> : <>🔍 Analyze Market</>}
        </Button>

        {loading && <Skeleton className="h-40 w-full" />}

        <AnimatePresence>
          {verdict && s && (
            <motion.div
              key={verdict.decision}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className={`rounded-2xl border-2 p-5 ${s.wrap}`}
            >
              <div className="text-2xl font-bold text-foreground mb-3">{s.emoji} {verdict.decisionLabel}</div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1 text-foreground/80">
                  <span>AI Confidence</span><span className="font-semibold">{verdict.confidence}%</span>
                </div>
                <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${verdict.confidence}%` }} transition={{ duration: 0.8 }} className="h-full bg-foreground/70" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/60 text-xs font-medium mb-4">
                {verdict.marketSentiment === "Bullish" ? <TrendingUp className="h-3 w-3 text-green-600" /> :
                 verdict.marketSentiment === "Bearish" ? <TrendingDown className="h-3 w-3 text-red-600" /> :
                 <Minus className="h-3 w-3" />}
                {verdict.marketSentiment} Market
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-background/60 p-3">
                  <div className="text-xs text-muted-foreground">Total Earnings</div>
                  <div className="text-xl font-bold text-foreground">₹{verdict.totalEarnings.toLocaleString("en-IN")}</div>
                </div>
                <div className="rounded-lg bg-background/60 p-3">
                  <div className="text-xs text-muted-foreground">After Freight</div>
                  <div className="text-xl font-bold text-foreground">₹{verdict.netAfterFreight.toLocaleString("en-IN")}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-foreground/70" /><span className="font-medium">Best Mandi:</span><span>{verdict.bestMandi}</span></div>
                <div className="flex items-start gap-2"><Calendar className="h-4 w-4 mt-0.5 text-foreground/70" /><span className="font-medium">Optimal:</span><span>{verdict.optimalWindow}</span></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg bg-background/60 p-3">
                  <div className="font-semibold text-sm mb-2 text-foreground">✅ Why this decision</div>
                  <ul className="space-y-1.5 text-sm">
                    {verdict.reasons?.map((r, i) => (
                      <li key={i} className="flex gap-2"><span className="text-green-600 font-bold">✓</span><span className="text-foreground/90">{r}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-background/60 p-3">
                  <div className="font-semibold text-sm mb-2 text-foreground">⚠️ Risks to consider</div>
                  <ul className="space-y-1.5 text-sm">
                    {verdict.risks?.map((r, i) => (
                      <li key={i} className="flex gap-2"><span className="text-amber-600 font-bold">!</span><span className="text-foreground/90">{r}</span></li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-lg bg-blue-100 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 p-3 mb-3 text-sm">
                💡 <span className="font-semibold">Alternative:</span> {verdict.alternativeOption}
              </div>
              <div className="rounded-lg bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-3 mb-4 text-sm">
                🇮🇳 {verdict.adviceHindi}
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button size="sm" onClick={shareWhatsApp} className="bg-green-600 hover:bg-green-700 text-white"><Share2 className="h-4 w-4" /> 📱 Share to WhatsApp</Button>
                <Button size="sm" variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4" /> 📄 Export PDF</Button>
                <Button size="sm" variant="ghost" onClick={() => setVerdict(null)}><RotateCw className="h-4 w-4" /> 🔁 Analyze Again</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
