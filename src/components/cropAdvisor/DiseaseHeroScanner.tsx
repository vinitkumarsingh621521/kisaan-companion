import { edgeToken } from "@/lib/edgeAuth";
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, AlertTriangle, Loader2, ShieldAlert, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

type DiseaseResult = {
  name: string;
  confidence: number;
  severity: "Low" | "Medium" | "High";
  treatment: string;
  prevention: string;
};

const severityMap = {
  Low: { color: "hsl(var(--primary))", deg: 90, label: "Low" },
  Medium: { color: "hsl(38, 85%, 55%)", deg: 200, label: "Moderate" },
  High: { color: "hsl(var(--destructive))", deg: 310, label: "Critical" },
};

function SeverityGauge({ level }: { level: "Low" | "Medium" | "High" }) {
  const s = severityMap[level];
  const dashArray = 188.5;
  const filled = (s.deg / 360) * dashArray;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r="30" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="40" cy="40" r="30" fill="none"
          stroke={s.color} strokeWidth="6"
          strokeDasharray={dashArray}
          strokeDashoffset={dashArray - filled}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">{s.label}</span>
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = Math.max(1, Math.ceil(value / 40));
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { cur = value; clearInterval(t); }
      setN(cur);
    }, 25);
    return () => clearInterval(t);
  }, [value]);
  return <span>{n}</span>;
}

// Inline illustrated leaf + magnifier
function LeafIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="w-32 h-24 mx-auto mb-4">
      <defs>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <path d="M30 80 Q 35 30 90 25 Q 110 60 75 95 Q 45 100 30 80 Z" fill="url(#leafGrad)" opacity="0.9" />
      <path d="M40 78 Q 65 55 88 32" stroke="#064e3b" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M55 88 Q 65 75 72 60" stroke="#064e3b" strokeWidth="1" fill="none" opacity="0.5" />
      <circle cx="115" cy="70" r="22" fill="none" stroke="#fbbf24" strokeWidth="3" />
      <line x1="132" y1="87" x2="148" y2="103" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
      <circle cx="115" cy="70" r="22" fill="hsl(var(--primary))" opacity="0.08" />
    </svg>
  );
}

export default function DiseaseHeroScanner() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [diseaseResults, setDiseaseResults] = useState<DiseaseResult[] | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be smaller than 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setDiseaseResults(null); setSummary("");
      toast.success("Image uploaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const runAnalysis = async () => {
    if (!uploadedImage) return;
    setIsAnalyzing(true); setAnalysisProgress(0);
    setDiseaseResults(null); setSummary("");
    const progressInterval = setInterval(() => {
      setAnalysisProgress((p) => Math.min(p + 5, 90));
    }, 300);
    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await edgeToken()}` },
        body: JSON.stringify({ action: "disease", image: uploadedImage, profileContext: ctx, profile: active }),
      });
      clearInterval(progressInterval); setAnalysisProgress(100);
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || "Analysis failed"); }
      const data = await resp.json();
      const content = data.result || "";
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const parsed = JSON.parse(jsonMatch[1] || content);
        if (parsed.diseases) {
          setDiseaseResults(parsed.diseases); setSummary(parsed.summary || "");
          toast.success(`${parsed.diseases.length} issue(s) detected.`);
        } else if (parsed.error) { toast.error(parsed.error); setSummary(parsed.error); }
      } catch { setSummary(content); toast.success("Analysis complete!"); }
    } catch (e: any) {
      clearInterval(progressInterval);
      toast.error(e.message || "Disease analysis failed");
      setSummary("Analysis failed. Please try again with a clearer image.");
    } finally { setIsAnalyzing(false); }
  };

  const clearImage = () => {
    setUploadedImage(null); setDiseaseResults(null); setSummary(""); setAnalysisProgress(0);
  };

  return (
    <div className="glass-card p-6">
      <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2 text-lg">
        <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        AI Disease Scanner
      </h3>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
      <input id="cameraInputHero" type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

      {!uploadedImage ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <LeafIllustration />
          <p className="text-base font-medium text-foreground mb-1">
            {isDragging ? "Drop your image here!" : "Drop a leaf photo or click to upload"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">High-resolution JPG / PNG up to 10MB</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              <Upload className="h-4 w-4 mr-1.5" /> Upload Image
            </Button>
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); document.getElementById("cameraInputHero")?.click(); }}>
              <Camera className="h-4 w-4 mr-1.5" /> Take Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-[300px_1fr] gap-4">
          <div className="relative rounded-xl overflow-hidden">
            <img src={uploadedImage} alt="Uploaded crop" className="w-full h-64 object-cover" />
            <button className="absolute top-2 right-2 p-1.5 bg-foreground/60 rounded-full text-background hover:bg-foreground/80" onClick={clearImage}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {isAnalyzing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" /> AI is analyzing your image…
                </div>
                <Progress value={analysisProgress} className="h-2" />
              </div>
            )}
            {!isAnalyzing && !diseaseResults && !summary && (
              <Button className="w-full gradient-primary border-0 text-primary-foreground" onClick={runAnalysis}>
                <Bug className="h-4 w-4 mr-1" /> Analyze with AI
              </Button>
            )}
            {summary && !diseaseResults && (
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {diseaseResults && diseaseResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <AlertTriangle className="h-4 w-4 text-krishi-gold" /> AI Detected Issues
            </h4>
            {summary && <p className="text-xs text-muted-foreground mb-3">{summary}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diseaseResults.map((d, i) => (
                <motion.div
                  key={d.name + i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className={`rounded-xl p-4 border ${
                    d.severity === "High" ? "bg-destructive/5 border-destructive/20"
                    : d.severity === "Medium" ? "bg-krishi-gold-light border-krishi-gold/20"
                    : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <SeverityGauge level={d.severity} />
                    <div className="text-right">
                      <div className="text-3xl font-display font-bold text-primary">
                        <CountUp value={d.confidence} />%
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Confidence</div>
                    </div>
                  </div>
                  <div className="font-semibold text-foreground mb-2">{d.name}</div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="font-medium text-foreground mb-1">Treatment</div>
                      <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                        {d.treatment.split(/\.\s+|;\s*/).filter(Boolean).slice(0, 4).map((step, idx) => (
                          <li key={idx}>{step.trim()}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="pt-2 border-t border-border/40">
                      <span className="font-medium text-foreground">Prevention: </span>
                      <span className="text-muted-foreground">{d.prevention}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Smart quick-action chat prompts based on the top detected disease */}
            {(() => {
              const top = diseaseResults[0];
              if (!top) return null;
              const prompts = [
                { emoji: "💊", text: `Full treatment plan for ${top.name}` },
                { emoji: "🛒", text: `Where to buy medicine for ${top.name} in my district?` },
                { emoji: "🌿", text: `Organic alternative for ${top.name} treatment` },
              ];
              const askAI = (q: string) => {
                document.getElementById("ai-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("krishi-prefill", { detail: { text: q } }));
                }, 350);
              };
              return (
                <div className="mt-4 flex flex-wrap gap-2">
                  {prompts.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => askAI(`${p.emoji} ${p.text}`)}
                      className="text-xs md:text-sm px-3 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 hover:scale-105 transform duration-200"
                    >
                      {p.emoji} {p.text}
                    </button>
                  ))}
                </div>
              );
            })()}

            <Button variant="outline" size="sm" className="mt-4" onClick={clearImage}>Scan Another Image</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
