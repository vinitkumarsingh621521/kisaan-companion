// Per-zone scientific agronomy panel for the Field Mapper.
// Computes water demand, NPK budget, expected yield and gross revenue for each
// drawn polygon, using the active farmer profile and crop reference data.

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Beaker, TrendingUp, Wallet, Sun, Leaf, Lightbulb, LayoutGrid, Table as TableIcon, ArrowUpDown, Brain, Sparkles, Loader2, Share2, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { edgeToken } from "@/lib/edgeAuth";
import type { Zone } from "@/components/tools/FieldMap";
import type { FarmerProfile } from "@/hooks/useActiveProfile";


// kg/ha N-P-K removal & water (mm season) & expected yield (t/ha) & farm-gate price (₹/qtl)
const CROP_REF: Record<string, {
  N: number; P: number; K: number;
  water_mm: number;
  yield_tph: number;        // tonnes per hectare
  price_per_qtl: number;    // ₹ per quintal at farm-gate
  ph_low: number; ph_high: number;
  duration_d: number;
}> = {
  Rice:       { N: 120, P: 60, K: 60, water_mm: 1200, yield_tph: 4.2, price_per_qtl: 2300, ph_low: 5.5, ph_high: 7.0, duration_d: 120 },
  Wheat:      { N: 120, P: 60, K: 40, water_mm:  500, yield_tph: 3.8, price_per_qtl: 2275, ph_low: 6.0, ph_high: 7.5, duration_d: 130 },
  Maize:      { N: 150, P: 75, K: 50, water_mm:  600, yield_tph: 5.5, price_per_qtl: 2090, ph_low: 5.8, ph_high: 7.0, duration_d: 110 },
  Cotton:     { N: 120, P: 60, K: 60, water_mm:  800, yield_tph: 1.8, price_per_qtl: 7100, ph_low: 6.0, ph_high: 8.0, duration_d: 180 },
  Vegetables: { N: 150, P: 80, K: 100, water_mm: 450, yield_tph: 18,  price_per_qtl: 1800, ph_low: 6.0, ph_high: 7.5, duration_d:  90 },
  Sugarcane:  { N: 250, P: 92, K: 92, water_mm: 2000, yield_tph: 75,  price_per_qtl:  340, ph_low: 6.5, ph_high: 7.5, duration_d: 365 },
  Pulses:     { N:  20, P: 60, K: 40, water_mm:  400, yield_tph: 1.2, price_per_qtl: 6600, ph_low: 6.0, ph_high: 7.5, duration_d: 100 },
  Fallow:     { N:   0, P:  0, K:  0, water_mm:    0, yield_tph: 0,   price_per_qtl:    0, ph_low: 0,   ph_high: 14,  duration_d:   0 },
};

interface Props {
  zones: Zone[];
  profile: FarmerProfile | null;
}

export default function FieldZoneAnalytics({ zones, profile }: Props) {
  const soilPh = parseFloat(profile?.farmer_details?.soil_ph || "6.5") || 6.5;
  const irrigationType = profile?.farmer_details?.irrigation_type || "Flood";
  const irrigEfficiency = irrigationType.toLowerCase().includes("drip") ? 0.9
    : irrigationType.toLowerCase().includes("sprinkler") ? 0.75 : 0.45;

  const rows = useMemo(() => zones.map((z) => {
    const ref = CROP_REF[z.crop] || CROP_REF.Rice;
    const ha = z.hectares;
    const water_kl = (ref.water_mm * 10 * ha) / irrigEfficiency; // 1mm × 1ha = 10 kL → adjusted by efficiency
    const N_kg = ref.N * ha;
    const P_kg = ref.P * ha;
    const K_kg = ref.K * ha;
    // pH suitability factor 0–1
    const phFit = soilPh >= ref.ph_low && soilPh <= ref.ph_high ? 1
      : Math.max(0.4, 1 - Math.min(Math.abs(soilPh - ref.ph_low), Math.abs(soilPh - ref.ph_high)) / 2);
    const yield_t = ref.yield_tph * ha * phFit;
    const revenue = yield_t * 10 * ref.price_per_qtl; // 1 t = 10 qtl
    return {
      ...z, ref, water_kl, N_kg, P_kg, K_kg, yield_t, revenue, phFit,
    };
  }), [zones, soilPh, irrigEfficiency]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    water_kl: acc.water_kl + r.water_kl,
    N_kg: acc.N_kg + r.N_kg,
    P_kg: acc.P_kg + r.P_kg,
    K_kg: acc.K_kg + r.K_kg,
    yield_t: acc.yield_t + r.yield_t,
    revenue: acc.revenue + r.revenue,
  }), { water_kl: 0, N_kg: 0, P_kg: 0, K_kg: 0, yield_t: 0, revenue: 0 }), [rows]);

  // Suggest best alternative crop for any zone with phFit < 0.7
  const suggestions = useMemo(() => rows
    .filter((r) => r.phFit < 0.85 && r.crop !== "Fallow")
    .map((r) => {
      const better = Object.entries(CROP_REF)
        .filter(([k]) => k !== "Fallow" && k !== r.crop)
        .map(([k, v]) => ({ crop: k, fit: soilPh >= v.ph_low && soilPh <= v.ph_high ? 1 : 0 }))
        .filter((x) => x.fit === 1);
      return better.length ? { id: r.id, current: r.crop, alt: better[0].crop } : null;
    })
    .filter(Boolean) as { id: string; current: string; alt: string }[],
    [rows, soilPh]);

  const [view, setView] = useState<"cards" | "table">(zones.length >= 4 ? "table" : "cards");
  const [sortKey, setSortKey] = useState<"acres" | "water_kl" | "N_kg" | "yield_t" | "revenue" | "phFit">("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(true);

  const runFieldAI = async () => {
    if (zones.length === 0) { toast.error("Draw at least one field zone first"); return; }
    setAiLoading(true);
    setAiReport(null);
    try {
      const token = await edgeToken();
      const zoneSummary = rows.map((r, i) =>
        `Zone ${i + 1} (${r.crop}, ${r.hectares.toFixed(2)} ha): water=${r.water_kl.toFixed(0)} kL, N=${r.N_kg.toFixed(0)}kg P=${r.P_kg.toFixed(0)}kg K=${r.K_kg.toFixed(0)}kg, est yield=${r.yield_t.toFixed(1)}t, revenue=₹${r.revenue.toLocaleString("en-IN")}`
      ).join("; ");
      const ph = profile?.farmer_details?.soil_ph || "6.5";
      const irrig = profile?.farmer_details?.irrigation_type || "Flood";
      const state = profile?.farmer_details?.state || "India";
      const name = profile?.full_name || "Farmer";
      const prompt = `Analyse farm field zones for ${name} in ${state}. Soil pH: ${ph}, Irrigation: ${irrig}. Zones: ${zoneSummary}. Total area: ${rows.reduce((s, r) => s + r.hectares, 0).toFixed(2)} ha. Provide field intelligence report.`;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "field_intelligence",
            messages: [{ role: "user", content: prompt }],
            profileContext: profile?.farmer_details,
          }),
        }
      );
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const { result: raw } = await resp.json();
      const text = typeof raw === "string"
        ? raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
        : null;
      setAiReport(text ? JSON.parse(text) : raw);
      toast.success("AI Field Analysis complete!");
    } catch (e: any) {
      toast.error("AI analysis failed", { description: e?.message });
    } finally {
      setAiLoading(false);
    }
  };

  const shareFieldReport = () => {
    if (!aiReport) return;
    const zoneList = zones.map((z, i) => `• Zone ${i+1}: ${z.crop} (${z.hectares?.toFixed(1)} ha)`).join("\n");
    const text = `🗺️ *My Farm Field Analysis — KisaanCompanion AI*\n━━━━━━━━━━━━━━━━━\n${zoneList}\n━━━━━━━━━━━━━━━━━\n📊 Field Score: *${aiReport.fieldHealthScore}/100*\n💰 Revenue Estimate: *${aiReport.totalRevenueEstimate}*\n📈 ROI: ${aiReport.roiPercent}%\n\n💪 Strength: ${aiReport.topStrength}\n⚠️ Main Risk: ${aiReport.mainRisk}\n\n✅ This Week: ${aiReport.nextActionThisWeek}\n💡 Optimization: ${aiReport.optimizationPotential}\n━━━━━━━━━━━━━━━━━\n📱 Analyse your field free: kisaancompanion.in`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };


  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0;
      const bv = (b as any)[sortKey] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  // best/worst per column for cell colouring
  const bounds = useMemo(() => {
    const keys = ["acres", "water_kl", "N_kg", "yield_t", "revenue", "phFit"] as const;
    const b: Record<string, { min: number; max: number }> = {};
    keys.forEach((k) => {
      const vals = rows.map((r) => (r as any)[k] as number);
      b[k] = { min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 0 };
    });
    return b;
  }, [rows]);

  if (zones.length === 0) {
    return (
      <div className="glass-card p-4 text-xs text-muted-foreground">
        🧪 <strong>Agronomy panel</strong> — draw a zone on the map and we'll instantly compute water demand,
        NPK budget, expected yield and revenue based on <em>your</em> soil pH and irrigation system.
      </div>
    );
  }

  const fmtRupee = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(2)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  // For water and N (inputs), lower is better; for yield, revenue, phFit, acres → higher is better
  const cellClass = (k: string, v: number) => {
    const { min, max } = bounds[k] || { min: 0, max: 0 };
    if (min === max) return "";
    const higherBetter = k === "yield_t" || k === "revenue" || k === "phFit" || k === "acres";
    const best = higherBetter ? max : min;
    const worst = higherBetter ? min : max;
    if (v === best) return "bg-primary/15 text-primary font-semibold";
    if (v === worst) return "bg-destructive/10 text-destructive";
    return "";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* AI Field Intelligence */}
      <div className="space-y-3">
        <button
          onClick={runFieldAI}
          disabled={aiLoading || zones.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:shadow-xl disabled:opacity-60 transition-all"
        >
          {aiLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analysing your fields with AI...</>
          ) : (
            <><Brain className="h-4 w-4" /> 🤖 AI Field Intelligence</>
          )}
        </button>

        <AnimatePresence>
          {aiReport && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl overflow-hidden border border-border bg-card shadow-xl"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-700 to-fuchsia-700 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-display font-semibold text-sm">AI Field Intelligence Report</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={shareFieldReport} className="text-xs px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 flex items-center gap-1">
                    <Share2 className="h-3 w-3" /> WhatsApp
                  </button>
                  <button onClick={() => setAiExpanded(e => !e)} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
                    {aiExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {aiExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className={`p-3 rounded-xl text-center ${
                          aiReport.fieldHealthScore >= 70
                            ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                            : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                        }`}>
                          <div className={`text-lg font-bold ${aiReport.fieldHealthScore >= 70 ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                            {aiReport.fieldHealthScore}/100
                          </div>
                          <div className="text-[10px] text-muted-foreground">Field Score</div>
                        </div>
                        <div className="p-3 rounded-xl text-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{aiReport.totalRevenueEstimate}</div>
                          <div className="text-[10px] text-muted-foreground">Est. Revenue</div>
                        </div>
                        <div className="p-3 rounded-xl text-center bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                          <div className="text-lg font-bold text-violet-700 dark:text-violet-300">{aiReport.roiPercent}%</div>
                          <div className="text-[10px] text-muted-foreground">ROI</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300">Strength</span>
                          </div>
                          <p className="text-xs text-foreground">{aiReport.topStrength}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Main Risk</span>
                          </div>
                          <p className="text-xs text-foreground">{aiReport.mainRisk}</p>
                        </div>
                      </div>

                      {(aiReport.alerts || []).map((alert: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                            alert.severity === "High" ? "bg-destructive/15 text-destructive" :
                            alert.severity === "Medium" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                            "bg-green-500/15 text-green-700 dark:text-green-400"
                          }`}>{alert.severity}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground">{alert.zone} — {alert.crop}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{alert.message}</div>
                          </div>
                        </div>
                      ))}

                      {[
                        { label: "🔄 Crop Rotation", value: aiReport.cropRotationAdvice },
                        { label: "💧 Irrigation Tip", value: aiReport.irrigationTip },
                        { label: "🌱 Soil Health", value: aiReport.soilHealthTip },
                        { label: "⚡ This Week", value: aiReport.nextActionThisWeek },
                      ].map(({ label, value }) => value && (
                        <div key={label} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                          <div className="text-xs font-semibold text-foreground mb-1">{label}</div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{value}</p>
                        </div>
                      ))}

                      <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 border border-violet-200 dark:border-violet-800">
                        <div className="text-xs font-semibold text-violet-800 dark:text-violet-200 mb-1">💡 Optimization Potential</div>
                        <p className="text-xs text-foreground">{aiReport.optimizationPotential}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 italic">{aiReport.seasonalOutlook}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-sm">
            <Leaf className="h-4 w-4 text-primary" /> Per-zone agronomy
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">soil pH {soilPh} • {irrigationType}</span>
          </h3>
          <div className="flex gap-1 p-0.5 rounded-md bg-muted/50">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`text-[10px] px-2 py-1 rounded inline-flex items-center gap-1 ${view === "cards" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            ><LayoutGrid className="h-3 w-3" /> Cards</button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`text-[10px] px-2 py-1 rounded inline-flex items-center gap-1 ${view === "table" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            ><TableIcon className="h-3 w-3" /> Compare</button>
          </div>
        </div>

        {view === "cards" ? (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded shrink-0" style={{ background: r.color }} />
                    <span className="font-medium text-sm">{r.crop}</span>
                    <span className="text-[10px] text-muted-foreground">{r.acres.toFixed(2)} ac · {r.hectares.toFixed(3)} ha</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.phFit >= 0.95 ? "bg-primary/10 text-primary" : r.phFit >= 0.7 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-destructive/10 text-destructive"}`}>
                    pH fit {(r.phFit*100).toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <Stat icon={<Droplets className="h-3 w-3 text-krishi-sky" />} label="Water / season" value={`${(r.water_kl/1000).toFixed(1)} ML`} />
                  <Stat icon={<Beaker  className="h-3 w-3 text-krishi-gold" />} label="N-P-K (kg)" value={`${Math.round(r.N_kg)}-${Math.round(r.P_kg)}-${Math.round(r.K_kg)}`} />
                  <Stat icon={<TrendingUp className="h-3 w-3 text-primary" />} label="Yield (est.)" value={`${r.yield_t.toFixed(1)} t`} />
                  <Stat icon={<Wallet  className="h-3 w-3 text-primary" />} label="Revenue (gross)" value={fmtRupee(r.revenue)} />
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  <Sun className="h-3 w-3 inline mr-1" /> {r.ref.duration_d} day cycle · {r.ref.water_mm} mm CWR
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border/40">
                  <th className="text-left font-medium py-1.5 px-2">Zone</th>
                  {([
                    ["acres", "Acres"],
                    ["water_kl", "Water kL"],
                    ["N_kg", "N kg"],
                    ["yield_t", "Yield t"],
                    ["revenue", "Revenue"],
                    ["phFit", "pH fit"],
                  ] as const).map(([k, label]) => (
                    <th key={k} className="text-right font-medium py-1.5 px-2 cursor-pointer hover:text-foreground" onClick={() => toggleSort(k as any)}>
                      <span className="inline-flex items-center gap-0.5">{label}<ArrowUpDown className="h-2.5 w-2.5 opacity-60" /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/20 last:border-0">
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded shrink-0" style={{ background: r.color }} />
                        <span className="font-medium">{r.crop}</span>
                      </div>
                    </td>
                    <td className={`text-right py-1.5 px-2 tabular-nums rounded ${cellClass("acres", r.acres)}`}>{r.acres.toFixed(2)}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums rounded ${cellClass("water_kl", r.water_kl)}`}>{Math.round(r.water_kl).toLocaleString("en-IN")}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums rounded ${cellClass("N_kg", r.N_kg)}`}>{Math.round(r.N_kg)}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums rounded ${cellClass("yield_t", r.yield_t)}`}>{r.yield_t.toFixed(1)}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums rounded ${cellClass("revenue", r.revenue)}`}>{fmtRupee(r.revenue)}</td>
                    <td className={`text-right py-1.5 px-2 tabular-nums rounded ${cellClass("phFit", r.phFit)}`}>{(r.phFit*100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <Stat label="Total water" value={`${(totals.water_kl/1000).toFixed(1)} ML`} />
          <Stat label="Total NPK" value={`${Math.round(totals.N_kg+totals.P_kg+totals.K_kg)} kg`} />
          <Stat label="Total yield" value={`${totals.yield_t.toFixed(1)} t`} />
          <Stat label="Gross revenue" value={fmtRupee(totals.revenue)} />
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="glass-card p-4 border-amber-500/30">
          <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Crop-fit suggestions
          </h3>
          <ul className="space-y-1 text-xs">
            {suggestions.map((s) => (
              <li key={s.id} className="text-muted-foreground">
                Your soil pH ({soilPh}) is sub-optimal for <strong className="text-foreground">{s.current}</strong>.
                Consider <strong className="text-primary">{s.alt}</strong> on this zone — better fit, ~15-25% higher yield potential.
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/60 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{icon}{label}</div>
      <div className="font-semibold text-foreground text-sm tabular-nums">{value}</div>
    </div>
  );
}
