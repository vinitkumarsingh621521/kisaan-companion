import { useState, useRef } from "react";
import { Upload, X, Loader2, Bug, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;
const MAX_IMAGES = 5;

type Disease = {
  name: string;
  confidence: number;
  severity: "Low" | "Medium" | "High";
  treatment: string;
  prevention: string;
  videoUrl?: string;
};

type Result = {
  image: string;
  diseases?: Disease[];
  summary?: string;
  loading: boolean;
  error?: string;
};

// Severity → colour & angle for radial gauge
const severity = {
  Low: { color: "hsl(var(--primary))", deg: 90, label: "Low" },
  Medium: { color: "hsl(38, 85%, 55%)", deg: 200, label: "Moderate" },
  High: { color: "hsl(var(--destructive))", deg: 310, label: "Critical" },
};

function SeverityGauge({ level }: { level: "Low" | "Medium" | "High" }) {
  const s = severity[level];
  const dashArray = 188.5; // 2*pi*30
  const filled = (s.deg / 360) * dashArray;
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r="30" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke={s.color}
          strokeWidth="6"
          strokeDasharray={dashArray}
          strokeDashoffset={dashArray - filled}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-foreground">{s.label}</span>
    </div>
  );
}

export default function MultiImageDiseaseScanner() {
  const [results, setResults] = useState<Result[]>([]);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImages = async (files: File[]) => {
    const slots = MAX_IMAGES - results.length;
    if (slots <= 0) {
      toast.error(`Max ${MAX_IMAGES} images`);
      return;
    }
    const taken = files.slice(0, slots);
    const reads = await Promise.all(
      taken.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = (e) => res(e.target?.result as string);
            r.readAsDataURL(f);
          })
      )
    );
    setResults((prev) => [...prev, ...reads.map((image) => ({ image, loading: false }))]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) addImages(files);
  };

  const removeAt = (i: number) => setResults((p) => p.filter((_, idx) => idx !== i));

  const scanAll = async () => {
    if (!results.length) {
      toast.error("Upload at least one image");
      return;
    }
    setScanning(true);
    setResults((prev) => prev.map((r) => ({ ...r, loading: true, error: undefined })));

    await Promise.all(
      results.map(async (r, i) => {
        try {
          const resp = await fetch(AI_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ action: "disease", image: r.image }),
          });
          if (!resp.ok) throw new Error(`Scan ${i + 1}: AI ${resp.status}`);
          const data = await resp.json();
          const content = data.result || "";
          const m = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
          const parsed = JSON.parse(m[1] || content);
          setResults((prev) => {
            const next = [...prev];
            next[i] = {
              ...next[i],
              loading: false,
              diseases: parsed.diseases,
              summary: parsed.summary,
            };
            return next;
          });
        } catch (e: any) {
          setResults((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], loading: false, error: e.message };
            return next;
          });
        }
      })
    );

    setScanning(false);
    toast.success(`Scanned ${results.length} image${results.length > 1 ? "s" : ""}`);
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Bug className="h-4 w-4 text-destructive" />
          </div>
          Multi-Image Disease Scanner
        </h3>
        <span className="krishi-badge bg-primary/10 text-primary text-[10px]">
          {results.length}/{MAX_IMAGES}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addImages(Array.from(e.target.files))}
      />

      {results.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Drag & drop up to 5 leaf photos</p>
          <p className="text-xs text-muted-foreground/60 mt-1">or click to browse</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {results.map((r, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-square">
                <img src={r.image} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-foreground/60 text-background"
                >
                  <X className="h-3 w-3" />
                </button>
                {r.loading && (
                  <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-background" />
                  </div>
                )}
              </div>
            ))}
            {results.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition"
              >
                <Camera className="h-6 w-6" />
              </button>
            )}
          </div>

          <Button
            onClick={scanAll}
            disabled={scanning}
            className="w-full gradient-primary border-0 text-primary-foreground gap-2"
          >
            {scanning ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</> : <><Bug className="h-4 w-4" /> Scan All {results.length}</>}
          </Button>
        </>
      )}

      {/* Per-image results */}
      <AnimatePresence>
        {results.some((r) => r.diseases || r.error) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 space-y-3"
          >
            {results.map((r, i) =>
              r.diseases || r.error ? (
                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex gap-3">
                    <img src={r.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {r.error && <p className="text-xs text-destructive">⚠️ {r.error}</p>}
                      {r.diseases?.[0] && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm text-foreground truncate">{r.diseases[0].name}</p>
                            <SeverityGauge level={r.diseases[0].severity} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">{r.diseases[0].confidence}% confidence</span> · {r.diseases[0].treatment}
                          </p>
                          <a
                            href={
                              r.diseases[0].videoUrl ||
                              `https://www.youtube.com/results?search_query=${encodeURIComponent(r.diseases[0].name + " treatment hindi")}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                          >
                            ▶ Watch treatment video
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
