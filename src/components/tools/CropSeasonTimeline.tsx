import { useMemo } from "react";
import { Calendar } from "lucide-react";
import type { Zone } from "@/components/tools/FieldMap";

// Mirror of CROP_FACTS in ZoneDetailSheet — kept in sync intentionally so the
// timeline reads the same growth stages without coupling components.
const CROP_FACTS: Record<string, {
  days: number;
  stages: { until: number; name: string; color: string }[];
}> = {
  Rice:       { days: 120, stages: [
    { until: 15,  name: "Nursery",     color: "#86efac" },
    { until: 45,  name: "Tillering",   color: "#4ade80" },
    { until: 75,  name: "Panicle",     color: "#22c55e" },
    { until: 100, name: "Grain-fill",  color: "#eab308" },
    { until: 120, name: "Harvest",     color: "#f59e0b" },
  ]},
  Wheat:      { days: 135, stages: [
    { until: 20,  name: "Germination", color: "#fef3c7" },
    { until: 55,  name: "Tillering",   color: "#fde68a" },
    { until: 85,  name: "Heading",     color: "#fbbf24" },
    { until: 115, name: "Grain-fill",  color: "#f59e0b" },
    { until: 135, name: "Harvest",     color: "#d97706" },
  ]},
  Maize:      { days: 100, stages: [
    { until: 18, name: "Seedling",   color: "#fef08a" },
    { until: 45, name: "Vegetative", color: "#facc15" },
    { until: 65, name: "Tasseling",  color: "#eab308" },
    { until: 90, name: "Grain-fill", color: "#ca8a04" },
    { until: 100, name: "Harvest",   color: "#a16207" },
  ]},
  Cotton:     { days: 180, stages: [
    { until: 30,  name: "Seedling",  color: "#f5d0fe" },
    { until: 75,  name: "Squaring",  color: "#f0abfc" },
    { until: 130, name: "Bolling",   color: "#d946ef" },
    { until: 180, name: "Harvest",   color: "#a21caf" },
  ]},
  Vegetables: { days: 75, stages: [
    { until: 10, name: "Germination", color: "#bfdbfe" },
    { until: 35, name: "Vegetative",  color: "#60a5fa" },
    { until: 55, name: "Flowering",   color: "#3b82f6" },
    { until: 75, name: "Harvest",     color: "#1d4ed8" },
  ]},
  Sugarcane:  { days: 365, stages: [
    { until: 45,  name: "Germination",   color: "#a7f3d0" },
    { until: 120, name: "Tillering",     color: "#34d399" },
    { until: 270, name: "Grand growth",  color: "#10b981" },
    { until: 365, name: "Maturity",      color: "#047857" },
  ]},
  Pulses:     { days: 110, stages: [
    { until: 15, name: "Germination", color: "#ddd6fe" },
    { until: 45, name: "Branching",   color: "#a78bfa" },
    { until: 80, name: "Pod-fill",    color: "#8b5cf6" },
    { until: 110, name: "Harvest",    color: "#6d28d9" },
  ]},
  Fallow:     { days: 0, stages: [{ until: 0, name: "Resting", color: "#94a3b8" }] },
};

const META_KEY = "fieldmapper.zoneMeta.v1";
function loadMeta(): Record<string, { sownOn?: string }> {
  try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; }
}

export default function CropSeasonTimeline({ zones }: { zones: Zone[] }) {
  const meta = useMemo(() => loadMeta(), [zones.length]);

  const rows = useMemo(() => zones.map((z) => {
    const facts = CROP_FACTS[z.crop] || CROP_FACTS.Fallow;
    const sownStr = meta[z.id]?.sownOn;
    const sown = sownStr ? new Date(sownStr) : null;
    const validSown = sown && !isNaN(sown.getTime());
    const dap = validSown ? Math.max(0, Math.floor((Date.now() - sown!.getTime()) / 86_400_000)) : null;
    const pct = validSown && facts.days > 0 ? Math.min(100, (dap! / facts.days) * 100) : null;
    const currentStage = validSown && facts.days > 0
      ? (facts.stages.find(s => dap! <= s.until) || facts.stages[facts.stages.length - 1]).name
      : null;
    return { zone: z, facts, validSown, pct, currentStage, dap };
  }), [zones, meta]);

  if (zones.length === 0) return null;

  const anySown = rows.some((r) => r.validSown);

  return (
    <div className="glass-card p-4">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-primary" /> Season timeline
        <span className="text-[10px] text-muted-foreground font-normal">today cursor in red</span>
      </h3>

      {!anySown && (
        <p className="text-xs text-muted-foreground italic mb-2">
          Open any zone and set a sowing date to populate this timeline.
        </p>
      )}

      <div className="space-y-2">
        {rows.map(({ zone, facts, validSown, pct, currentStage, dap }) => (
          <div key={zone.id} className="grid grid-cols-[80px_1fr_70px] items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded shrink-0" style={{ background: zone.color }} />
              <span className="text-xs font-medium truncate">{zone.crop}</span>
            </div>

            <div className="relative h-5 rounded overflow-hidden bg-muted/40 border border-border/40">
              {facts.stages.length > 0 && facts.days > 0 && (
                <div className="absolute inset-0 flex">
                  {facts.stages.map((s, i) => {
                    const prev = i === 0 ? 0 : facts.stages[i - 1].until;
                    const w = ((s.until - prev) / facts.days) * 100;
                    return (
                      <div
                        key={s.name}
                        title={`${s.name} · day ${prev}–${s.until}`}
                        className="h-full flex items-center justify-center text-[9px] text-white/90 font-medium overflow-hidden"
                        style={{ width: `${w}%`, background: s.color }}
                      >
                        {w > 12 ? s.name : ""}
                      </div>
                    );
                  })}
                </div>
              )}
              {validSown && pct !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-destructive shadow-[0_0_0_1px_white]"
                  style={{ left: `${pct}%` }}
                  title={`Today · DAP ${dap}`}
                />
              )}
            </div>

            <div className="text-[10px] text-muted-foreground text-right tabular-nums">
              {validSown ? `${currentStage} · D${dap}` : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
