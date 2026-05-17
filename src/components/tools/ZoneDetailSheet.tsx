import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sprout, Droplets, FlaskConical, CalendarDays, Bot, Send, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Zone } from "@/components/tools/FieldMap";

interface Props {
  zone: Zone | null;
  open: boolean;
  onClose: () => void;
}

interface ZoneMeta { sownOn?: string; notes?: string }

const META_KEY = "fieldmapper.zoneMeta.v1";
function loadMeta(): Record<string, ZoneMeta> {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; }
}
function saveMeta(all: Record<string, ZoneMeta>) {
  localStorage.setItem(META_KEY, JSON.stringify(all));
}

// crop → days from sowing to harvest, total cycle water mm, NPK kg per acre
const CROP_FACTS: Record<string, {
  days: number; weeklyMm: number;
  stages: { until: number; name: string }[];
  npkPerAcre: { n: number; p: number; k: number };
}> = {
  Rice:       { days: 120, weeklyMm: 50, npkPerAcre: { n: 50, p: 25, k: 25 },
    stages: [{ until: 15, name: "Nursery / Transplant" }, { until: 45, name: "Tillering" }, { until: 75, name: "Panicle initiation" }, { until: 100, name: "Grain-fill" }, { until: 120, name: "Maturity / Harvest" }] },
  Wheat:      { days: 135, weeklyMm: 25, npkPerAcre: { n: 48, p: 24, k: 16 },
    stages: [{ until: 20, name: "Germination" }, { until: 55, name: "Tillering" }, { until: 85, name: "Jointing / Heading" }, { until: 115, name: "Grain-fill" }, { until: 135, name: "Harvest" }] },
  Maize:      { days: 100, weeklyMm: 35, npkPerAcre: { n: 60, p: 25, k: 25 },
    stages: [{ until: 18, name: "Seedling" }, { until: 45, name: "Vegetative" }, { until: 65, name: "Tasseling" }, { until: 90, name: "Grain-fill" }, { until: 100, name: "Harvest" }] },
  Cotton:     { days: 180, weeklyMm: 40, npkPerAcre: { n: 40, p: 20, k: 20 },
    stages: [{ until: 30, name: "Seedling" }, { until: 75, name: "Squaring" }, { until: 130, name: "Bolling" }, { until: 180, name: "Boll opening / Harvest" }] },
  Vegetables: { days: 75,  weeklyMm: 30, npkPerAcre: { n: 40, p: 20, k: 30 },
    stages: [{ until: 10, name: "Germination" }, { until: 35, name: "Vegetative" }, { until: 55, name: "Flowering" }, { until: 75, name: "Harvest" }] },
  Sugarcane:  { days: 365, weeklyMm: 55, npkPerAcre: { n: 100, p: 30, k: 60 },
    stages: [{ until: 45, name: "Germination" }, { until: 120, name: "Tillering" }, { until: 270, name: "Grand growth" }, { until: 365, name: "Maturity" }] },
  Pulses:     { days: 110, weeklyMm: 20, npkPerAcre: { n: 10, p: 20, k: 10 },
    stages: [{ until: 15, name: "Germination" }, { until: 45, name: "Branching" }, { until: 80, name: "Pod-fill" }, { until: 110, name: "Harvest" }] },
  Fallow:     { days: 0,   weeklyMm: 0,  npkPerAcre: { n: 0, p: 0, k: 0 }, stages: [{ until: 0, name: "Resting" }] },
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

interface ChatMsg { role: "user" | "assistant"; content: string }

export default function ZoneDetailSheet({ zone, open, onClose }: Props) {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<ZoneMeta>({});
  const [notesDraft, setNotesDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!zone) return;
    const all = loadMeta();
    const m = all[zone.id] || {};
    setMeta(m);
    setNotesDraft(m.notes || "");
  }, [zone?.id]);

  const facts = useMemo(() => zone ? (CROP_FACTS[zone.crop] || CROP_FACTS.Fallow) : null, [zone]);

  const computed = useMemo(() => {
    if (!zone || !facts) return null;
    const acres = zone.acres;
    const weeklyLiters = Math.round(facts.weeklyMm * acres * 4046.86); // 1 mm × m² = 1 L; 1 ac = 4046.86 m²
    const npk = {
      n: Math.round(facts.npkPerAcre.n * acres),
      p: Math.round(facts.npkPerAcre.p * acres),
      k: Math.round(facts.npkPerAcre.k * acres),
    };
    let stageName = "—";
    let harvestEta = "—";
    let dap: number | null = null;
    if (meta.sownOn && facts.days > 0) {
      const sown = new Date(meta.sownOn);
      if (!isNaN(sown.getTime())) {
        dap = Math.max(0, daysBetween(sown, new Date()));
        const stage = facts.stages.find(s => dap! <= s.until) || facts.stages[facts.stages.length - 1];
        stageName = stage.name;
        const harvestDate = new Date(sown.getTime() + facts.days * 86_400_000);
        const left = daysBetween(new Date(), harvestDate);
        harvestEta = left > 0
          ? `${harvestDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} (${left} d)`
          : `${harvestDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} (ready)`;
      }
    }
    return { weeklyLiters, npk, stageName, harvestEta, dap };
  }, [zone, facts, meta.sownOn]);

  if (!zone) return null;

  const updateMeta = (patch: Partial<ZoneMeta>) => {
    const all = loadMeta();
    const next = { ...(all[zone.id] || {}), ...patch };
    all[zone.id] = next;
    saveMeta(all);
    setMeta(next);
  };

  const saveNotes = () => {
    updateMeta({ notes: notesDraft });
    toast.success(t("fieldMapper.detail.savedNotes", "Notes saved"));
  };

  const buildContextPrompt = (userQ: string) => {
    if (!zone || !facts) return userQ;
    const lines = [
      `Field zone:`,
      `- Crop: ${zone.crop}`,
      `- Area: ${zone.acres.toFixed(2)} acres (${zone.hectares.toFixed(3)} ha)`,
      meta.sownOn ? `- Sown on: ${meta.sownOn}` : `- Sown on: not set`,
      computed?.stageName ? `- Current stage: ${computed.stageName} (DAP ${computed.dap ?? "?"})` : null,
      computed?.harvestEta ? `- Expected harvest: ${computed.harvestEta}` : null,
      `- Recommended weekly water: ${facts.weeklyMm} mm/wk (~${computed?.weeklyLiters?.toLocaleString("en-IN")} L)`,
      `- NPK budget for this zone: N ${computed?.npk.n}kg · P ${computed?.npk.p}kg · K ${computed?.npk.k}kg`,
      meta.notes ? `- Farmer notes: ${meta.notes}` : null,
    ].filter(Boolean).join("\n");
    return `${lines}\n\nFarmer's question: ${userQ}\n\nGive a short, specific, actionable answer for THIS zone — include quantities, timing, and reasoning.`;
  };

  const sendChat = async (q?: string) => {
    const question = (q ?? chatInput).trim();
    if (!question || streaming) return;
    setChatInput("");
    const userMsg: ChatMsg = { role: "user", content: question };
    const next = [...chat, userMsg];
    setChat(next);
    setStreaming(true);
    setChat((c) => [...c, { role: "assistant", content: "" }]);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;
      const messages = next.map((m, i) => ({
        role: m.role,
        content: i === next.length - 1 ? buildContextPrompt(m.content) : m.content,
      }));
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "chat", messages }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const errTxt = await res.text().catch(() => "");
        throw new Error(errTxt || `AI error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) {
              acc += delta;
              setChat((c) => {
                const copy = [...c];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
              requestAnimationFrame(() => {
                chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e.message || "AI request failed");
        setChat((c) => c.slice(0, -1));
      }
    } finally {
      setStreaming(false);
    }
  };

  const openAI = () => {
    setChatOpen(true);
    if (chat.length === 0) {
      sendChat("What should I do this week for this field?");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ background: zone.color }} />
            {zone.crop} · {zone.acres.toFixed(2)} ac
          </SheetTitle>
          <SheetDescription>
            {zone.hectares.toFixed(3)} ha · {t("fieldMapper.detail.title", "Field details")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          {/* Sowing date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {t("fieldMapper.detail.sowingDate", "Sowing date")}
            </label>
            <Input
              type="date"
              value={meta.sownOn || ""}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => updateMeta({ sownOn: e.target.value || undefined })}
            />
          </div>

          {/* Stage + harvest */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Sprout className="h-3 w-3" /> {t("fieldMapper.detail.stage", "Stage")}</div>
              <div className="font-semibold text-sm mt-0.5">{computed?.stageName || "—"}</div>
              {computed?.dap !== null && computed?.dap !== undefined && <div className="text-[11px] text-muted-foreground">DAP: {computed.dap}</div>}
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {t("fieldMapper.detail.harvest", "Expected harvest")}</div>
              <div className="font-semibold text-sm mt-0.5">{computed?.harvestEta || "—"}</div>
            </div>
          </div>

          {!meta.sownOn && (
            <p className="text-xs text-muted-foreground italic">
              {t("fieldMapper.detail.noSowingDate", "Set a sowing date to see stage and harvest window.")}
            </p>
          )}

          {/* Water */}
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs font-medium flex items-center gap-1.5 mb-1">
              <Droplets className="h-3.5 w-3.5 text-blue-500" /> {t("fieldMapper.detail.water", "Weekly water need")}
            </div>
            <div className="text-sm">
              <span className="font-semibold">{facts?.weeklyMm} mm/wk</span> · {(computed?.weeklyLiters || 0).toLocaleString("en-IN")} L total
            </div>
          </div>

          {/* NPK */}
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs font-medium flex items-center gap-1.5 mb-1">
              <FlaskConical className="h-3.5 w-3.5 text-amber-600" /> {t("fieldMapper.detail.npk", "NPK recommendation")}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-amber-50 dark:bg-amber-950/30 py-1.5">
                <div className="text-[10px] text-muted-foreground">N</div>
                <div className="font-semibold text-sm">{computed?.npk.n} kg</div>
              </div>
              <div className="rounded bg-rose-50 dark:bg-rose-950/30 py-1.5">
                <div className="text-[10px] text-muted-foreground">P</div>
                <div className="font-semibold text-sm">{computed?.npk.p} kg</div>
              </div>
              <div className="rounded bg-violet-50 dark:bg-violet-950/30 py-1.5">
                <div className="text-[10px] text-muted-foreground">K</div>
                <div className="font-semibold text-sm">{computed?.npk.k} kg</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {t("fieldMapper.detail.notes", "Notes")}
            </label>
            <Textarea
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Last spray, pest seen, planned activity…"
            />
            <Button size="sm" variant="outline" className="mt-2" onClick={saveNotes}>
              {t("fieldMapper.detail.saveNotes", "Save notes")}
            </Button>
          </div>

          {!chatOpen ? (
            <Button className="w-full gap-2" onClick={openAI}>
              <Bot className="h-4 w-4" /> {t("fieldMapper.detail.askAI", "Ask AI about this field")}
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/60">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Bot className="h-3.5 w-3.5 text-primary" /> KrishiMitra · this field
                </div>
                <button
                  type="button"
                  onClick={() => { abortRef.current?.abort(); setChatOpen(false); }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close chat"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div ref={chatScrollRef} className="max-h-72 overflow-y-auto p-3 space-y-2 text-xs">
                {chat.length === 0 && (
                  <div className="text-muted-foreground italic">Ask anything about this field…</div>
                )}
                {chat.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border text-foreground"
                    }`}>
                      {m.content || (streaming && i === chat.length - 1 ? <Loader2 className="h-3 w-3 animate-spin" /> : "")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-border bg-background/60 flex gap-1.5">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Follow up question…"
                  disabled={streaming}
                  className="h-8 text-xs"
                />
                <Button size="sm" className="h-8 px-2" onClick={() => sendChat()} disabled={streaming || !chatInput.trim()}>
                  {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
