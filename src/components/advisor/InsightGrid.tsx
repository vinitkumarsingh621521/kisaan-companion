import InsightCard from "./InsightCard";
import type { AdvisoryResult } from "@/lib/aiAdvisorSchema";

export default function InsightGrid({ r }: { r: AdvisoryResult }) {
  const verdictColor: Record<string, string> = {
    excellent: "text-emerald-600 dark:text-emerald-400",
    good: "text-green-600 dark:text-green-400",
    marginal: "text-amber-600 dark:text-amber-400",
    poor: "text-destructive",
  };

  return (
    <div className="space-y-3">
      {r.summary && (
        <div className="glass-card p-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <div className="text-xs uppercase tracking-wider text-primary mb-1">Personalized summary</div>
          <p className="text-sm text-foreground">{r.summary}</p>
          {r.status === "partial" && <p className="text-xs text-amber-600 mt-2">⚠ Some insights use defaults — fill more of your profile for sharper advice.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard title="Crop Suitability" icon="🎯" accent="emerald" delay={0.0}>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-foreground">{r.crop_suitability.score}</span>
            <span className={`text-xs font-semibold uppercase ${verdictColor[r.crop_suitability.verdict] || ""}`}>{r.crop_suitability.verdict}</span>
          </div>
          <p className="text-xs text-muted-foreground">{r.crop_suitability.chosen_crop}</p>
          <p className="text-sm">{r.crop_suitability.reason}</p>
        </InsightCard>

        <InsightCard title="Top Alternative Crops" icon="🌱" accent="emerald" delay={0.05}>
          <div className="space-y-1">
            {r.alternative_crops.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span>{c.emoji} <b>{c.name}</b> <span className="text-muted-foreground">— {c.profit_per_acre}</span></span>
                <span className="font-mono font-bold text-primary">{c.score}</span>
              </div>
            ))}
          </div>
        </InsightCard>

        <InsightCard title="Climate Risk" icon="⛈️" accent="sky" delay={0.1}>
          <div className="text-xs uppercase font-bold mb-1">Overall: <span className={verdictColor[r.climate_risk.overall === "high" ? "poor" : r.climate_risk.overall === "medium" ? "marginal" : "good"]}>{r.climate_risk.overall}</span></div>
          <ul className="text-xs space-y-0.5">
            <li>🔥 Heat: {r.climate_risk.heat}</li>
            <li>❄️ Frost: {r.climate_risk.frost}</li>
            <li>🌊 Flood: {r.climate_risk.flood}</li>
            <li>🏜️ Drought: {r.climate_risk.drought}</li>
          </ul>
        </InsightCard>

        <InsightCard title="Soil Plan" icon="🌾" accent="amber" delay={0.15}>
          <p><b>{r.soil_plan.action}</b> — {r.soil_plan.dosage}</p>
          <p className="text-xs text-muted-foreground">{r.soil_plan.why}</p>
        </InsightCard>

        <InsightCard title="Irrigation Plan" icon="💧" accent="cyan" delay={0.2}>
          <p><b>{r.irrigation_plan.method}</b></p>
          <p className="text-xs">{r.irrigation_plan.schedule}</p>
          <p className="text-xs text-emerald-600">Saves ~{r.irrigation_plan.water_saving_pct}% water</p>
        </InsightCard>

        <InsightCard title="Fertilizer Plan" icon="🧪" accent="violet" delay={0.25}>
          <p><b>NPK:</b> {r.fertilizer_plan.npk_kg_per_acre}</p>
          <p className="text-xs"><b>Timing:</b> {r.fertilizer_plan.timing}</p>
          <p className="text-xs"><b>Brands:</b> {r.fertilizer_plan.brands.join(", ")}</p>
          <p className="text-xs text-emerald-600"><b>Organic:</b> {r.fertilizer_plan.organic_alt}</p>
        </InsightCard>

        <InsightCard title="Pesticide / IPM" icon="🐛" accent="rose" delay={0.3}>
          <p><b>{r.pesticide_plan.needed ? "Recommended" : "Not needed"}</b></p>
          {r.pesticide_plan.products.length > 0 && <p className="text-xs">{r.pesticide_plan.products.join(", ")}</p>}
          <p className="text-xs text-emerald-600"><b>IPM:</b> {r.pesticide_plan.ipm_alternative}</p>
        </InsightCard>

        <InsightCard title="Cost Breakdown" icon="💰" accent="amber" delay={0.35}>
          <div className="text-xs space-y-0.5">
            <div>Seed: {r.cost_breakdown.seed}</div>
            <div>Labour: {r.cost_breakdown.labour}</div>
            <div>Machinery: {r.cost_breakdown.machinery}</div>
            <div>Transport: {r.cost_breakdown.transport}</div>
            <div className="pt-1 mt-1 border-t border-border/50 font-bold">Per acre: {r.cost_breakdown.total_per_acre}</div>
            <div className="font-bold">Total: {r.cost_breakdown.total}</div>
          </div>
        </InsightCard>

        <InsightCard title="Yield Forecast" icon="📊" accent="emerald" delay={0.4}>
          <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <div><div className="text-muted-foreground">Low</div><div className="font-bold">{r.yield_forecast.low}</div></div>
            <div><div className="text-primary">Expected</div><div className="font-bold text-primary">{r.yield_forecast.expected}</div></div>
            <div><div className="text-muted-foreground">High</div><div className="font-bold">{r.yield_forecast.high}</div></div>
          </div>
        </InsightCard>

        <InsightCard title="Revenue & Profit" icon="💹" accent="violet" delay={0.45}>
          <p><b>Gross:</b> {r.revenue_forecast.gross}</p>
          <p className="text-emerald-600 font-bold">Net: {r.revenue_forecast.net_profit} · {r.revenue_forecast.roi_pct}% ROI</p>
          <p className="text-xs text-muted-foreground">Break-even: {r.revenue_forecast.break_even_per_quintal}</p>
        </InsightCard>

        <InsightCard title="Sowing Window" icon="🌱" accent="emerald" delay={0.5}>
          <p className="font-bold">{r.sowing_window}</p>
        </InsightCard>

        <InsightCard title="Harvest Window" icon="🌾" accent="amber" delay={0.55}>
          <p className="font-bold">{r.harvest_window}</p>
        </InsightCard>

        <InsightCard title="Market Strategy" icon="🏪" accent="cyan" delay={0.6}>
          <p><b>{r.market_strategy.channel}</b> · {r.market_strategy.best_month}</p>
          <p className="text-xs text-muted-foreground">{r.market_strategy.reason}</p>
        </InsightCard>

        <InsightCard title="Government Schemes" icon="🏛️" accent="sky" delay={0.65}>
          <div className="space-y-1 text-xs">
            {r.schemes.map((s) => (
              <div key={s.name}><b>{s.name}</b> — {s.benefit}<div className="text-muted-foreground">{s.fit_reason}</div></div>
            ))}
          </div>
        </InsightCard>

        <InsightCard title="Insurance" icon="🛡️" accent="violet" delay={0.7}>
          <p><b>{r.insurance.recommended}</b></p>
          <p className="text-xs">Sum insured: {r.insurance.sum_insured} · Premium: {r.insurance.premium}</p>
        </InsightCard>

        <InsightCard title="Sustainability" icon="🌍" accent="emerald" delay={0.75}>
          <div className="text-2xl font-display font-bold text-emerald-600">{r.sustainability.score}/100</div>
          <p className="text-xs">{r.sustainability.improvement}</p>
        </InsightCard>

        <InsightCard title="Water Footprint" icon="💦" accent="cyan" delay={0.8}>
          <p>{r.water_footprint}</p>
        </InsightCard>
      </div>

      <InsightCard title="Top 5 Actionable Tips" icon="💡" accent="amber" delay={0.85}>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          {r.tips.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
      </InsightCard>

      {r.red_flags.length > 0 && (
        <InsightCard title="Red Flags — What Could Go Wrong" icon="🚩" accent="rose" delay={0.9}>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {r.red_flags.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </InsightCard>
      )}
    </div>
  );
}
