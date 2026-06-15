import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { edgeToken } from "@/lib/edgeAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";

const STORAGE_KEY = "km.diary.v2";
const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;
const CROPS = ["Rice","Wheat","Cotton","Maize","Tomato","Potato","Onion","Sugarcane","Mustard","Soybean","Chickpea","Lentil"];

interface DiaryAnalysis {
  growthStage: string; stagePercent: number; healthScore: number;
  healthStatus: "Healthy" | "Stressed" | "Diseased";
  visibleIssues: string[]; nextAction: string;
  daysToHarvest: number | null; aiCaption: string;
}
interface DiaryEntry {
  id: string; date: string; crop: string;
  photoBase64: string; notes: string;
  analysis: DiaryAnalysis | null;
  createdAt: string;
}

const resizeAndBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const c = document.createElement("canvas");
        const s = Math.min(1, 800 / img.width);
        c.width = img.width * s; c.height = img.height * s;
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });

export default function CropGrowthDiary() {
  const { active } = useActiveProfile();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // form
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [crop, setCrop] = useState("Rice");
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }, []);

  function saveAll(next: DiaryEntry[]) {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function resetForm() {
    setPhotoBase64(null); setDate(new Date().toISOString().slice(0, 10)); setCrop("Rice"); setNotes("");
  }

  async function pickPhoto(f: File | null) {
    if (!f) return;
    try {
      const b = await resizeAndBase64(f);
      setPhotoBase64(b);
    } catch { toast.error("Could not read photo"); }
  }

  async function callAnalyze(base64: string): Promise<DiaryAnalysis | null> {
    try {
      const ctx = active?.farmer_details || {};
      const token = await edgeToken();
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "crop_photo", image: base64, cropHint: crop, profileContext: ctx }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { result } = await resp.json();
      const clean = typeof result === "string" ? result.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim() : null;
      return typeof result === "string" ? JSON.parse(clean!) : result;
    } catch (e: any) {
      toast.error("AI analysis failed", { description: e?.message || "" });
      return null;
    }
  }

  async function save(withAI: boolean) {
    if (!photoBase64) { toast.error("Add a photo first"); return; }
    setBusy(true);
    const analysis = withAI ? await callAnalyze(photoBase64) : null;
    const entry: DiaryEntry = {
      id: `e_${Date.now()}`, date, crop, photoBase64, notes,
      analysis, createdAt: new Date().toISOString(),
    };
    saveAll([entry, ...entries]);
    setBusy(false);
    setOpen(false);
    resetForm();
    toast.success("Entry saved");
  }

  function deleteEntry(id: string) {
    saveAll(entries.filter((e) => e.id !== id));
  }

  async function generateReport() {
    if (entries.length === 0) return;
    setReportOpen(true); setReportText(""); setReportLoading(true);
    try {
      const summary = entries.slice(0, 10).map(e =>
        `${e.date} · ${e.crop} · ${e.analysis ? `${e.analysis.growthStage} (${e.analysis.stagePercent}%), Health ${e.analysis.healthScore}%, Issues: ${e.analysis.visibleIssues.join(", ") || "none"}` : "no AI data"}${e.notes ? ` · Notes: ${e.notes}` : ""}`
      ).join("\n");
      const token = await edgeToken();
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "chat",
          messages: [{ role: "user", content: `Here is my farm growth diary:\n${summary}\n\nSummarize crop health trends, flag any concerns, and give 3 actionable next steps. Be concise and farmer-friendly.` }],
          profileContext: active?.farmer_details || {},
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body?.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content || "";
            if (delta) setReportText((t) => t + delta);
          } catch {}
        }
      }
    } catch (e: any) {
      setReportText("Could not generate report: " + (e?.message || ""));
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card"
    >
      <div className="bg-gradient-to-r from-emerald-700 to-green-600 text-white px-5 py-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-lg md:text-xl">📅 Farm Growth Diary</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-300 text-emerald-900">{entries.length} entries</span>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <Button size="sm" variant="secondary" onClick={generateReport}>🔍 AI Farm Report</Button>
          )}
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-white text-emerald-700 hover:bg-white/90">+ Add Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New diary entry</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-emerald-300/60 rounded-xl h-40 flex items-center justify-center cursor-pointer overflow-hidden"
                >
                  {photoBase64
                    ? <img src={`data:image/jpeg;base64,${photoBase64}`} className="w-full h-full object-cover" alt="preview" />
                    : <div className="text-center"><div className="text-4xl">📸</div><p className="text-xs text-muted-foreground mt-1">Tap to choose photo</p></div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0] || null)} />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Select value={crop} onValueChange={setCrop}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div>
                  <Textarea maxLength={150} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <p className="text-xs text-muted-foreground text-right">{150 - notes.length} left</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" disabled={busy} onClick={() => save(false)}>Save Without Analysis</Button>
                  <Button disabled={busy} onClick={() => save(true)}>{busy ? "Analyzing..." : "🔍 Analyze & Save"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto" width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="20" width="48" height="34" rx="4" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2"/>
              <circle cx="32" cy="38" r="9" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2"/>
              <path d="M22 20 L26 14 L38 14 L42 20" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2"/>
              <path d="M48 12 Q 52 16 48 22 Q 44 16 48 12 Z" fill="#22c55e" fillOpacity="0.6"/>
            </svg>
            <p className="mt-3 font-medium text-foreground">Start your farm diary</p>
            <p className="text-sm text-muted-foreground">Add your first crop photo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="rounded-xl overflow-hidden border border-border bg-card flex flex-col"
              >
                <div className="relative">
                  <img src={`data:image/jpeg;base64,${entry.photoBase64}`} alt={entry.crop} className="w-full h-40 object-cover" />
                  <span className="absolute top-2 right-2 text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full">{entry.date}</span>
                </div>
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <p className="font-bold text-foreground">🌾 {entry.crop}</p>
                  {entry.analysis && (
                    <>
                      <div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{entry.analysis.growthStage}</span>
                          <span className="font-semibold text-foreground">{entry.analysis.stagePercent}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full transition-all ${
                              entry.analysis.growthStage === "Seedling" ? "bg-gradient-to-r from-lime-400 to-lime-500" :
                              entry.analysis.growthStage === "Vegetative" ? "bg-gradient-to-r from-green-500 to-emerald-600" :
                              entry.analysis.growthStage === "Flowering" ? "bg-gradient-to-r from-yellow-400 to-amber-500" :
                              entry.analysis.growthStage === "Fruiting" ? "bg-gradient-to-r from-orange-400 to-orange-600" :
                              "bg-gradient-to-r from-red-400 to-rose-600"
                            }`}
                            style={{ width: `${entry.analysis.stagePercent}%` }}
                          />
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${
                        entry.analysis.healthScore >= 75 ? "text-green-600 dark:text-green-400" :
                        entry.analysis.healthScore >= 50 ? "text-amber-600 dark:text-amber-400" :
                        "text-red-600 dark:text-red-400"
                      }`}>
                        ❤️ Health: {entry.analysis.healthScore}%
                      </p>
                      <p className="text-xs italic text-muted-foreground">"{entry.analysis.aiCaption}"</p>
                      {entry.analysis.daysToHarvest != null && (
                        <p className="text-xs text-foreground">📅 {entry.analysis.daysToHarvest} days to harvest</p>
                      )}
                      {entry.analysis.visibleIssues.length > 0 && (
                        <div className="space-y-1">
                          {entry.analysis.visibleIssues.map((iss, i) => (
                            <p key={i} className="text-xs text-amber-700 dark:text-amber-300">⚠️ {iss}</p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {entry.notes && <p className="text-xs text-muted-foreground">📝 {entry.notes}</p>}
                  <div className="flex gap-2 pt-2 mt-auto">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      window.dispatchEvent(new CustomEvent("krishi-prefill", {
                        detail: { text: `My ${entry.crop} at ${entry.analysis?.growthStage || "current"} stage. Issues: ${entry.analysis?.visibleIssues?.join(", ") || "none"}. What should I do?` }
                      }));
                    }}>Ask AI 🤖</Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteEntry(entry.id)}>🗑️</Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>🔍 AI Farm Report</DialogTitle></DialogHeader>
          {reportLoading && !reportText && (
            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-5/6" /></div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground">{reportText}</div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
