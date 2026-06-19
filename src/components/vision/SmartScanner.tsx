import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, Bug, Package, AlertTriangle, CheckCircle, RefreshCw, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { edgeToken } from "@/lib/edgeAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type ScanAction = "pest_identify" | "fertilizer_scan";

const LOADING_MSGS: Record<ScanAction, string[]> = {
  pest_identify: ["🔍 Scanning image...", "🧬 Identifying species...", "📚 Checking pest database...", "⚡ Generating action plan..."],
  fertilizer_scan: ["📷 Reading label...", "🧪 Analysing composition...", "✅ Checking quality markers...", "💡 Preparing safety advice..."],
};

function ScanMode({
  action,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  resultRenderer,
}: {
  action: ScanAction;
  title: string;
  subtitle: string;
  icon: typeof Bug;
  iconColor: string;
  resultRenderer: (result: any) => React.ReactNode;
}) {
  const { active } = useActiveProfile();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setResult(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setLoading(true);

    const msgs = LOADING_MSGS[action];
    let i = 0;
    setLoadingMsg(msgs[0]);
    const interval = setInterval(() => {
      i = Math.min(i + 1, msgs.length - 1);
      setLoadingMsg(msgs[i]);
    }, 1800);

    try {
      const base64 = await toBase64(file);
      const token = await edgeToken();
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action,
          image: base64,
          profileContext: active?.farmer_details,
          profile: active,
        }),
      });
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const { result: raw } = await resp.json();
      const text = typeof raw === "string"
        ? raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
        : null;
      setResult(text ? JSON.parse(text) : raw);
    } catch (e: any) {
      toast.error("Scan failed", { description: e?.message });
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const reset = () => { setPreview(null); setResult(null); };

  return (
    <div className="space-y-4">
      {!preview && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors bg-card/50"
        >
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${iconColor}`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          <div className="flex justify-center gap-2 mt-5">
            <button
              onClick={(e) => { e.stopPropagation(); camRef.current?.click(); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              <Camera className="h-4 w-4" /> Use Camera
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/70 transition-all">
              <Upload className="h-4 w-4" /> Upload Photo
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted">
              <img src={preview} alt="scan preview" className="w-full max-h-72 object-contain" />
              {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">{loadingMsg}</p>
                </div>
              )}
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-card/90 hover:bg-card border border-border rounded-full p-1.5"
                title="Scan another"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            {result && <div>{resultRenderer(result)}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PestResult({ result }: { result: any }) {
  const shareWA = () => {
    const text = `🔍 *Pest Identified — KisaanCompanion AI*\n\n${result.emoji || "🐛"} *${result.name}* (${result.scientificName || ""})\nRisk: *${result.riskLevel}* (${result.riskScore}/100)\nCrops affected: ${(result.cropsAffected || []).join(", ")}\n\nDamage: ${result.damageSymptom}\n\n💊 *Immediate action:*\n${result.immediateAction}\n\n🛡️ Prevention: ${result.preventiveMeasure}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };
  const risk = result.riskScore ?? 50;
  const riskColor = risk > 70 ? "bg-red-500" : risk > 40 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="text-4xl">{result.emoji || "🐛"}</div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-xl text-foreground">{result.name}</h3>
            <p className="text-xs italic text-muted-foreground">{result.scientificName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.type}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">{result.riskLevel} Risk</div>
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden mt-1">
              <div className={`h-full ${riskColor}`} style={{ width: `${risk}%` }} />
            </div>
            <div className="text-xs font-bold text-foreground mt-0.5">{risk}/100</div>
            <div className="text-[10px] text-muted-foreground">AI Conf: {result.confidence}%</div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 text-sm">
        <div>
          <h4 className="font-semibold text-foreground text-xs uppercase mb-1">Crops at Risk</h4>
          <div className="flex flex-wrap gap-1.5">
            {(result.cropsAffected || []).map((c: string) => (
              <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">🌾 {c}</span>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <h4 className="font-semibold text-foreground text-xs mb-1">⚠️ Damage Symptoms</h4>
          <p className="text-xs text-muted-foreground">{result.damageSymptom}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <h4 className="font-semibold text-foreground text-xs mb-1">⚡ Immediate Action Required</h4>
          <p className="text-xs text-muted-foreground">{result.immediateAction}</p>
        </div>
        {result.economicThreshold && (
          <div className="p-3 rounded-lg bg-muted/50">
            <h4 className="font-semibold text-foreground text-xs mb-1">📊 When to Spray (Economic Threshold)</h4>
            <p className="text-xs text-muted-foreground">{result.economicThreshold}</p>
          </div>
        )}
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <h4 className="font-semibold text-foreground text-xs mb-1">🛡️ Prevention</h4>
          <p className="text-xs text-muted-foreground">{result.preventiveMeasure}</p>
          {result.naturalEnemy && (
            <p className="text-xs text-muted-foreground mt-1">🦅 Natural enemy: {result.naturalEnemy}</p>
          )}
        </div>
        <button onClick={shareWA} className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors">
          <Share2 className="h-4 w-4" /> Share on WhatsApp
        </button>
      </div>
    </div>
  );
}

function FertilizerResult({ result }: { result: any }) {
  const shareWA = () => {
    const text = `🧪 *Fertilizer Scan — KisaanCompanion AI*\n\n📦 Product: *${result.productName}*\nManufacturer: ${result.manufacturer}\nNPK: *${result.npkRatio}*\nType: ${result.productType}\n\n✅ Recommended for: ${(result.recommendedFor || []).join(", ")}\n📏 Rate: ${result.applicationRate}\n⏰ Timing: ${result.applicationTiming}\n\n⚠️ Safety:\n${(result.safetyWarnings || []).join("\n")}\n\n💰 Fair price: ${result.priceAssessment}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };
  const isGood = !result.isFake;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isGood ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
              <h3 className="font-display font-bold text-lg text-foreground">{result.productName}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{result.manufacturer}</p>
          </div>
          <div className="text-center px-3 py-2 rounded-xl bg-card border border-border">
            <div className="text-[10px] uppercase text-muted-foreground">NPK</div>
            <div className="font-display font-bold text-base text-primary">{result.npkRatio}</div>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Nitrogen (N)", value: result.nitrogen, color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
            { label: "Phosphorus (P)", value: result.phosphorus, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
            { label: "Potassium (K)", value: result.potassium, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`text-center p-2 rounded-lg ${color}`}>
              <div className="font-display font-bold text-lg">{value ?? 0}%</div>
              <div className="text-[10px] uppercase font-medium opacity-80">{label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <span className="text-lg">📏</span>
            <div>
              <h4 className="font-semibold text-xs text-foreground">Application Rate</h4>
              <p className="text-xs text-muted-foreground">{result.applicationRate}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <span className="text-lg">⏰</span>
            <div>
              <h4 className="font-semibold text-xs text-foreground">Best Timing</h4>
              <p className="text-xs text-muted-foreground">{result.applicationTiming}</p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-foreground text-xs uppercase mb-1">✅ Suitable Crops</h4>
          <div className="flex flex-wrap gap-1.5">
            {(result.recommendedFor || []).map((c: string) => (
              <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{c}</span>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <h4 className="font-semibold text-foreground text-xs mb-1">⚠️ Safety Warnings</h4>
          <ul className="space-y-0.5">
            {(result.safetyWarnings || []).map((w: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground">• {w}</li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <h4 className="font-semibold text-foreground text-xs mb-1">🔍 Quality Check Points</h4>
          {(result.qualityFlags || []).map((f: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground">• {f}</p>
          ))}
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <h4 className="font-semibold text-foreground text-xs mb-1">💰 Price Guide</h4>
          <p className="text-xs text-muted-foreground">{result.priceAssessment}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">AI Confidence: {result.confidence}%</span>
          <button onClick={shareWA} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SmartScanner() {
  return (
    <div className="rounded-3xl bg-card border border-border p-5 md:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="text-3xl">🔬</div>
        <div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">Kisaan Smart Scanner</h2>
          <p className="text-sm text-muted-foreground">Point camera at pests, insects, or fertilizer bags — AI identifies instantly</p>
        </div>
      </div>
      <Tabs defaultValue="pest" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-5">
          <TabsTrigger value="pest">🐛 Pest Identifier</TabsTrigger>
          <TabsTrigger value="fertilizer">🧪 Fertilizer Scanner</TabsTrigger>
        </TabsList>
        <TabsContent value="pest" forceMount className="data-[state=inactive]:hidden mt-0">
          <ScanMode
            action="pest_identify"
            title="Identify Any Pest or Insect"
            subtitle="Take a clear photo of the insect or crop damage"
            icon={Bug}
            iconColor="bg-red-500"
            resultRenderer={(r) => <PestResult result={r} />}
          />
        </TabsContent>
        <TabsContent value="fertilizer" forceMount className="data-[state=inactive]:hidden mt-0">
          <ScanMode
            action="fertilizer_scan"
            title="Scan Fertilizer or Pesticide Label"
            subtitle="Take a photo of the product bag/label"
            icon={Package}
            iconColor="bg-blue-500"
            resultRenderer={(r) => <FertilizerResult result={r} />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
