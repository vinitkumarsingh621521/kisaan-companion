import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { edgeToken } from "@/lib/edgeAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { errMsg } from "@/lib/errors";

interface SoilRec { priority: number; action: string; reason: string; cost: string; }
interface SoilAnalysis {
  soilType: string; phEstimate: string; phMidpoint: number;
  organicMatter: string; organicPct: number; color: string; hexColor: string;
  texture: string; drainage: string; fertility: string; nitrogen: string;
  recommendations: SoilRec[];
  cropSuitability: string[]; avoidCrops: string[];
  urgentAction: string; confidence: number;
}

const LOADING_STEPS = [
  "🔬 Scanning soil color & texture...",
  "🧪 Estimating pH and nutrients...",
  "🌱 Checking crop suitability...",
  "📊 Generating your report...",
];

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

function badgeColor(v: string) {
  const x = v.toLowerCase();
  if (x.includes("good") || x.includes("high") || x.includes("rich") || x.includes("adequate")) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (x.includes("moderate") || x.includes("medium") || x.includes("fair")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

const resizeAndBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 800;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });

export default function SoilPhotoAnalyzer() {
  const { active } = useActiveProfile();
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SoilAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) return;
    setLoadingStep(0);
    const id = setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_STEPS.length), 1500);
    return () => clearInterval(id);
  }, [loading]);

  async function handleFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    setError(null);
    setAnalysis(null);
    try {
      const base64 = await resizeAndBase64(file);
      setPhotoBase64(base64);
      analyze(base64);
    } catch (e: unknown) {
      toast.error("Could not read image");
    }
  }

  async function analyze(base64: string) {
    setLoading(true);
    try {
      const ctx = active?.farmer_details || {};
      const token = await edgeToken();
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "soil", image: base64, profileContext: ctx, profile: active }),
      });
      if (!resp.ok) throw new Error(`AI error ${resp.status}`);
      const { result, error: errMsg } = await resp.json();
      if (errMsg) throw new Error(errMsg);
      const data: SoilAnalysis = typeof result === "string" ? JSON.parse(result.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()) : result;
      setAnalysis(data);
    } catch (e: unknown) {
      console.error(e);
      setError(errMsg(e, "Analysis failed"));
      toast.error("Soil analysis failed", { description: errMsg(e, "") });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhotoBase64(null); setAnalysis(null); setError(null);
  }

  function exportPDF() {
    if (!analysis) return;
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(16); doc.text("🌍 Soil Intelligence Report", 14, y); y += 8;
    doc.setFontSize(10); doc.setTextColor(100); doc.text(new Date().toLocaleString(), 14, y); y += 8;
    doc.setTextColor(20); doc.setFontSize(12);
    const lines = [
      `Soil Type: ${analysis.soilType}`,
      `pH: ${analysis.phEstimate}  |  Color: ${analysis.color}  |  Texture: ${analysis.texture}`,
      `Organic Matter: ${analysis.organicMatter} (${analysis.organicPct}%)`,
      `Drainage: ${analysis.drainage}  |  Fertility: ${analysis.fertility}  |  Nitrogen: ${analysis.nitrogen}`,
      `Confidence: ${analysis.confidence}%`,
      ``,
      `Urgent: ${analysis.urgentAction}`,
      ``,
      `Recommendations:`,
      ...analysis.recommendations.map(r => ` ${r.priority}. ${r.action} — ${r.reason} (${r.cost})`),
      ``,
      `Best crops: ${analysis.cropSuitability.join(", ")}`,
      `Avoid: ${analysis.avoidCrops.join(", ")}`,
    ];
    lines.forEach((l) => {
      const split = doc.splitTextToSize(l, 180);
      split.forEach((s: string) => { doc.text(s, 14, y); y += 6; if (y > 280) { doc.addPage(); y = 15; } });
    });
    doc.save(`soil-report-${Date.now()}.pdf`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card"
    >
      <div className="bg-gradient-to-r from-amber-900 to-yellow-700 text-white px-5 py-4 flex items-center justify-between">
        <h2 className="font-display font-bold text-lg md:text-xl">🌍 Soil Intelligence Scanner</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-900">AI</span>
      </div>

      <div className="p-4 md:p-6">
        {!photoBase64 && (
          <div className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-amber-300/50 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="text-5xl">🌱</div>
              <p className="mt-2 font-medium text-foreground">Upload soil photo for AI analysis</p>
              <p className="text-xs text-muted-foreground">Drag & drop or click</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0] || null)} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0] || null)} />
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => camRef.current?.click()}>📷 Camera</Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>📁 Browse</Button>
            </div>
          </div>
        )}

        {photoBase64 && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-[200px_1fr] gap-4 items-start">
              <img src={`data:image/jpeg;base64,${photoBase64}`} alt="soil" className="w-full h-48 object-cover rounded-lg border border-border" />
              {loading && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">{LOADING_STEPS[loadingStep]}</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-[6000ms] ease-out" style={{ width: loading ? "100%" : "0%" }} />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}
              {error && !loading && (
                <div className="text-sm text-destructive">
                  <p>{error}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => photoBase64 && analyze(photoBase64)}>Retry</Button>
                </div>
              )}
            </div>

            {analysis && (
              <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="space-y-5">
                {/* Row 1: 3 metric cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-xl border border-border p-4 bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Soil Type</p>
                    <p className="font-bold text-lg text-foreground">{analysis.soilType}</p>
                    <div className="mt-3 relative h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-300 via-green-500 to-blue-500">
                      <div className="absolute -top-1 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent border-b-foreground"
                        style={{ left: `calc(${Math.max(0, Math.min(100, ((analysis.phMidpoint - 3) / 7) * 100))}% - 5px)` }} />
                    </div>
                    <p className="text-xs text-center mt-2 text-muted-foreground">pH {analysis.phEstimate}</p>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-xl border border-border p-4 bg-card">
                    <p className="text-xs text-muted-foreground mb-1">Color & Texture</p>
                    <div className="w-16 h-16 rounded-full mx-auto border-2 border-border shadow-inner" style={{ backgroundColor: analysis.hexColor }} />
                    <p className="text-center font-medium mt-2 text-foreground">{analysis.color}</p>
                    <p className="text-center text-xs italic text-muted-foreground">{analysis.texture}</p>
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-xl border border-border p-4 bg-card">
                    <p className="text-xs text-muted-foreground mb-2">Health Metrics</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor(analysis.fertility)}`}>Fertility: {analysis.fertility}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor(analysis.drainage)}`}>Drainage: {analysis.drainage}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor(analysis.nitrogen)}`}>N: {analysis.nitrogen}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600" style={{ width: `${analysis.confidence}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Confidence: {analysis.confidence}%</p>
                  </motion.div>
                </div>

                {/* Row 2: Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysis.recommendations.map((rec) => (
                    <motion.div
                      key={rec.priority}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                      whileHover={{ scale: 1.02 }}
                      className="rounded-xl border border-border p-4 bg-card flex gap-3"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                        {rec.priority}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{rec.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{rec.cost}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Row 3: Suitability */}
                <div className="rounded-xl border border-border p-4 bg-card space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">✅ Best for:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.cropSuitability.map((c) => (
                        <span key={c} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">❌ Avoid:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.avoidCrops.map((c) => (
                        <span key={c} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Urgent banner */}
                <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-3">
                  <span className="text-xl">⚡</span>
                  <p className="text-sm text-foreground font-medium">{analysis.urgentAction}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    onClick={() => {
                      if (!analysis) return;
                      const text = `🌍 *Soil Analysis Report — KisaanCompanion AI*\n\nSoil Type: ${analysis.soilType}\npH: ${analysis.phEstimate} | Fertility: ${analysis.fertility}\nOrganic Matter: ${analysis.organicMatter} (${analysis.organicPct}%)\nDrainage: ${analysis.drainage} | Nitrogen: ${analysis.nitrogen}\n\n✅ Best Crops: ${analysis.cropSuitability.join(", ")}\n❌ Avoid: ${analysis.avoidCrops.join(", ")}\n\n⚡ Urgent: ${analysis.urgentAction}\n\n📱 Get free AI soil analysis: kisaancompanion.in`;
                      window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
                    }}
                  >
                    📱 Share on WhatsApp
                  </Button>
                  <Button variant="outline" onClick={exportPDF}>📄 Export PDF Report</Button>
                  <Button variant="ghost" onClick={reset}>🔄 Analyze Another</Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
