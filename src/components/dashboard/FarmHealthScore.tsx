import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, X } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Skeleton } from "@/components/ui/skeleton";
import FeatureHint from "@/components/FeatureHint";

type AxisDef = { key: string; label: string; emoji: string };
const AXES: AxisDef[] = [
  { key: "soil",    label: "Soil",    emoji: "🌱" },
  { key: "crops",   label: "Crops",   emoji: "🌾" },
  { key: "tech",    label: "Tech",    emoji: "📱" },
  { key: "finance", label: "Finance", emoji: "💰" },
  { key: "weather", label: "Weather", emoji: "🌧" },
  { key: "market",  label: "Market",  emoji: "📈" },
];

const CENTER = 130;
const MAX_R = 90;
// Start from top (-90°) and step 60° clockwise
const angles = AXES.map((_, i) => (-90 + i * 60) * (Math.PI / 180));

const dotColor = (v: number) =>
  v >= 70 ? "hsl(142,70%,45%)" : v >= 45 ? "#ca8a04" : "hsl(var(--destructive))";

const chip = (status: "Optimal" | "Medium" | "Low") => {
  const cls =
    status === "Optimal" ? "bg-primary/15 text-primary" :
    status === "Medium" ? "bg-krishi-gold/15 text-krishi-gold" :
    "bg-destructive/15 text-destructive";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{status}</span>;
};

const phStatus = (ph?: number | null) =>
  ph == null ? null : ph >= 6 && ph <= 7.5 ? "Optimal" : ph >= 5.5 && ph <= 8 ? "Medium" : "Low";
const nStatus = (v?: number | null) =>
  v == null ? null : v >= 240 ? "Optimal" : v >= 150 ? "Medium" : "Low";
const pStatus = (v?: number | null) =>
  v == null ? null : v >= 22 ? "Optimal" : v >= 15 ? "Medium" : "Low";
const kStatus = (v?: number | null) =>
  v == null ? null : v >= 200 ? "Optimal" : v >= 120 ? "Medium" : "Low";

export default function FarmHealthScore() {
  const { ctx, loading } = usePersonalization();
  const { active } = useActiveProfile();
  const [selected, setSelected] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>();

  // Build score array (depends on ctx — define before effects use it)
  const scores = useMemo(() => {
    if (!ctx) return [0, 0, 0, 0, 0, 0];
    const { soil_health, diversification, tech_readiness } = ctx.scores;
    const finance =
      ctx.financial.bucket === "high" ? 100 :
      ctx.financial.bucket === "upper-mid" ? 75 :
      ctx.financial.bucket === "mid" ? 50 :
      ctx.financial.bucket === "low-mid" ? 35 : 25;

    const today = ctx.weather?.forecast?.[0];
    const rain_pct = today?.rain_pct ?? ctx.weather?.today_rain_pct ?? 0;
    const temp_high = today?.temp_high ?? 30;
    const weather =
      rain_pct > 70 ? 30 :
      rain_pct > 40 ? 60 :
      temp_high > 38 ? 45 : 85;

    const market =
      ctx.financial.bucket === "high" ? 80 :
      ctx.financial.bucket === "upper-mid" ? 65 :
      ctx.financial.bucket === "mid" ? 50 : 35;

    return [soil_health, diversification, tech_readiness, finance, weather, market];
  }, [ctx]);

  // Animate polygon outward on mount / when ctx becomes available
  useEffect(() => {
    if (!ctx) return;
    setProgress(0);
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1000);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ctx?.farmer_name]);

  if (loading || !ctx) {
    return (
      <div className="glass-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-64 w-64 mx-auto rounded-full" />
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
    );
  }

  const farm_health = ctx.scores.farm_health;
  const status =
    farm_health >= 80 ? "Excellent" :
    farm_health >= 60 ? "Good" :
    farm_health >= 40 ? "Fair" : "Needs Work";

  // Polygon vertices (animated by progress)
  const pts = scores.map((s, i) => {
    const r = (s / 100) * MAX_R * progress;
    return [CENTER + r * Math.cos(angles[i]), CENTER + r * Math.sin(angles[i])] as const;
  });
  const polyStr = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  // Full-radius outer vertices for grid + axes
  const ringPts = (factor: number) =>
    angles
      .map((a) => `${(CENTER + MAX_R * factor * Math.cos(a)).toFixed(2)},${(CENTER + MAX_R * factor * Math.sin(a)).toFixed(2)}`)
      .join(" ");

  // Label position helpers
  const labelXY = (i: number) => {
    const a = angles[i];
    return [CENTER + MAX_R * 1.18 * Math.cos(a), CENTER + MAX_R * 1.18 * Math.sin(a)] as const;
  };
  const labelAnchor = (i: number) => {
    const a = angles[i];
    const cx = Math.cos(a);
    if (Math.abs(cx) < 0.3) return "middle";
    return cx > 0 ? "start" : "end";
  };

  // Detail panel content per axis
  const fd: any = active?.farmer_details || {};
  const renderDetail = () => {
    if (selected === null) return null;
    const idx = selected;
    if (idx === 0) {
      const ph = fd.soil_ph != null ? Number(fd.soil_ph) : null;
      if (ph == null && fd.nitrogen == null && fd.phosphorus == null && fd.potassium == null) {
        return <p className="text-xs text-muted-foreground">Add soil data in Profile.</p>;
      }
      const items = [
        { label: "pH", val: ph, status: phStatus(ph) },
        { label: "Nitrogen (N)", val: fd.nitrogen, status: nStatus(fd.nitrogen) },
        { label: "Phosphorus (P)", val: fd.phosphorus, status: pStatus(fd.phosphorus) },
        { label: "Potassium (K)", val: fd.potassium, status: kStatus(fd.potassium) },
      ];
      return (
        <ul className="space-y-1.5 text-xs">
          {items.map((it) => (
            <li key={it.label} className="flex items-center justify-between">
              <span className="text-muted-foreground">{it.label}</span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-foreground">{it.val ?? "—"}</span>
                {it.status && chip(it.status as any)}
              </span>
            </li>
          ))}
        </ul>
      );
    }
    if (idx === 1) {
      const current = ctx.crops.current ?? [];
      const suitable = (ctx.crops.suitable ?? []).slice(0, 3);
      return (
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">Growing: </span>
            {current.length === 0 ? <span className="text-muted-foreground italic">none set</span> :
              current.map((c) => (
                <span key={c} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-medium">{c}</span>
              ))}
          </div>
          <div>
            <span className="text-muted-foreground">Also suitable: </span>
            {suitable.map((c) => (
              <span key={c} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-muted text-foreground/70 text-[10px]">{c}</span>
            ))}
          </div>
        </div>
      );
    }
    if (idx === 2) {
      const tech = ctx.scores.tech_readiness;
      const completion = active ? Math.min(100, Object.keys(fd).filter((k) => fd[k] != null && fd[k] !== "").length * 6) : 0;
      const used = Math.round(tech * 0.85);
      const Bar = ({ label, v }: { label: string; v: number }) => (
        <div>
          <div className="flex items-center justify-between text-[11px] mb-0.5">
            <span className="text-muted-foreground">{label}</span><span className="font-medium">{v}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${v}%` }} />
          </div>
        </div>
      );
      return (
        <div className="space-y-2">
          <Bar label="Tech readiness" v={Math.round(tech)} />
          <Bar label="Profile completeness" v={completion} />
          <Bar label="Features used" v={used} />
        </div>
      );
    }
    if (idx === 3) {
      const b = ctx.financial.bucket;
      const order = ["low", "low-mid", "mid", "upper-mid", "high"];
      const idxB = Math.max(0, order.indexOf(b));
      const pct = (idxB / (order.length - 1)) * 100;
      return (
        <div className="space-y-2">
          <span className="inline-block px-2 py-1 rounded bg-primary/15 text-primary text-xs font-semibold uppercase">{b}</span>
          <div className="text-[11px] text-muted-foreground">Investment: {ctx.financial.monthly_investment ?? "—"}</div>
          <div className="relative h-2 rounded-full bg-gradient-to-r from-destructive/40 via-krishi-gold/60 to-primary/70">
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background shadow"
                 style={{ left: `calc(${pct}% - 6px)` }} />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground"><span>Low</span><span>High</span></div>
        </div>
      );
    }
    if (idx === 4) {
      const d = ctx.weather?.forecast?.[0];
      const advice = !d ? "No live weather available."
        : d.rain_pct > 70 ? "Heavy rain risk — postpone spraying and protect harvested crop."
        : d.temp_high > 38 ? "Heat stress likely — irrigate at dawn, mulch to reduce evaporation."
        : d.wind_kph > 25 ? "Strong winds — avoid foliar spray today."
        : "Conditions favorable. Continue normal field activities.";
      return (
        <div className="space-y-2 text-xs">
          {d && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/40 rounded p-2 text-center"><div>🌡️</div><div className="font-semibold">{d.temp_high}°C</div></div>
              <div className="bg-muted/40 rounded p-2 text-center"><div>🌧</div><div className="font-semibold">{d.rain_pct}%</div></div>
              <div className="bg-muted/40 rounded p-2 text-center"><div>💨</div><div className="font-semibold">{d.wind_kph} km/h</div></div>
            </div>
          )}
          <p className="italic text-sm text-muted-foreground">{advice}</p>
        </div>
      );
    }
    if (idx === 5) {
      return (
        <div className="space-y-2 text-xs">
          <span className="inline-block px-2 py-1 rounded bg-krishi-gold/15 text-krishi-gold text-xs font-semibold uppercase">{ctx.financial.bucket}</span>
          <p className="text-muted-foreground">Based on your financial profile and crop season.</p>
        </div>
      );
    }
    return null;
  };

  // Top priority hint
  const today = ctx.weather?.forecast?.[0];
  const priority =
    (fd.phosphorus != null && Number(fd.phosphorus) < 15)
      ? "Add DAP fertilizer before next irrigation to raise Phosphorus"
      : (today && today.rain_pct > 60)
      ? "Heavy rain expected — check field drainage today"
      : farm_health < 50
      ? "Complete your soil profile to unlock better recommendations"
      : ctx.scores.diversification < 40
      ? "Consider adding a second crop to improve diversity score"
      : "Farm is in good shape — monitor market prices for selling opportunity";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Farm Vitals
        </h3>
        <div className="flex items-center gap-1">
          {AXES.map((a, i) => (
            <span
              key={a.key}
              title={`${a.label}: ${Math.round(scores[i])}`}
              className="w-2.5 h-2.5 rounded-full border border-background/40"
              style={{ background: dotColor(scores[i]) }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <svg viewBox="0 0 260 260" className="w-full max-w-[280px] h-auto">
          {/* Grid rings */}
          {[0.33, 0.66, 1].map((f) => (
            <polygon key={f} points={ringPts(f)} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
          ))}
          {/* Axis lines */}
          {angles.map((a, i) => {
            const x2 = CENTER + MAX_R * Math.cos(a);
            const y2 = CENTER + MAX_R * Math.sin(a);
            const isSel = selected === i;
            return (
              <line key={i} x1={CENTER} y1={CENTER} x2={x2} y2={y2}
                stroke={isSel ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isSel ? 1.5 : 0.5}
                opacity={isSel ? 1 : 0.5} />
            );
          })}
          {/* Data polygon */}
          <polygon points={polyStr}
            fill="hsl(var(--primary))" fillOpacity="0.15"
            stroke="hsl(var(--primary))" strokeWidth="2" />
          {/* Data dots */}
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} fill={dotColor(scores[i])} stroke="hsl(var(--background))" strokeWidth="1" />
          ))}
          {/* Labels (clickable) */}
          {AXES.map((a, i) => {
            const [lx, ly] = labelXY(i);
            const isSel = selected === i;
            return (
              <g key={a.key} className="cursor-pointer" onClick={() => setSelected(isSel ? null : i)}>
                <text x={lx} y={ly} textAnchor={labelAnchor(i)}
                  fontSize="9"
                  fill="hsl(var(--foreground))"
                  opacity={isSel ? 1 : 0.75}
                  fontWeight={isSel ? 600 : 400}
                  style={{ userSelect: "none" }}>
                  {a.emoji} {a.label}
                </text>
              </g>
            );
          })}
          {/* Center score */}
          <text x={CENTER} y={126} textAnchor="middle" fontSize="22" fontWeight="bold" fill="hsl(var(--foreground))">
            {Math.round(farm_health)}
          </text>
          <text x={CENTER} y={138} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" opacity="0.9">
            {status}
          </text>
        </svg>
      </div>

      {/* Detail expansion */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${selected !== null ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"}`}
      >
        {selected !== null && (
          <div className="relative rounded-lg border border-border bg-muted/30 p-3">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground">
              <span>{AXES[selected].emoji}</span>
              <span>{AXES[selected].label}</span>
              <span className="ml-1 text-muted-foreground font-normal">· {Math.round(scores[selected])}/100</span>
            </div>
            {renderDetail()}
          </div>
        )}
      </div>

      {/* Top priority */}
      <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 text-sm p-3 flex items-start gap-2">
        <span className="text-lg leading-none">💡</span>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-0.5">Top Priority</div>
          <div className="text-foreground/90">{priority}</div>
        </div>
      </div>
    </div>
  );
}
