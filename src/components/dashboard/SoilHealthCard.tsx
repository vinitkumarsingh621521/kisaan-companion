import { Progress } from "@/components/ui/progress";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function SoilHealthCard() {
  const { active } = useActiveProfile();
  const { ctx, loading } = usePersonalization();
  const navigate = useNavigate();
  const d = active?.farmer_details || {};

  const ph = parseFloat(d.soil_ph) || null;
  const n = parseFloat(d.nitrogen) || null;
  const p = parseFloat(d.phosphorus) || null;
  const k = parseFloat(d.potassium) || null;
  const oc = parseFloat(d.organic_carbon) || null;
  const soilType = d.soil_type || active?.soil_type || "Not set";

  const hasAnyData = ph || n || p || k || oc;

  if (loading && !ctx) {
    return (
      <div className="glass-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-28 w-28 mx-auto rounded-full mb-4" />
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className="glass-card p-5 text-center">
        <h3 className="font-display font-semibold text-foreground mb-2">Soil Health Analysis</h3>
        <p className="text-sm text-muted-foreground italic mb-4">
          Empty as a fallow field 🌱 — fill in your soil details to see real analysis.
        </p>
        <Button size="sm" variant="outline" onClick={() => navigate("/profile")}>
          Add soil data <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  const score = ctx?.scores.soil_health || 50;

  const items = [
    ph !== null && { label: "pH Level", value: ph, max: 14, status: ph >= 6 && ph <= 7.5 ? "Optimal" : ph < 6 ? "Acidic" : "Alkaline" },
    n !== null && { label: "Nitrogen (N)", value: n, max: 280, status: n > 200 ? "Good" : n > 100 ? "Medium" : "Low" },
    p !== null && { label: "Phosphorus (P)", value: p, max: 50, status: p > 30 ? "Good" : p > 15 ? "Medium" : "Low" },
    k !== null && { label: "Potassium (K)", value: k, max: 280, status: k > 200 ? "Good" : k > 100 ? "Medium" : "Low" },
    oc !== null && { label: "Organic Carbon", value: oc, max: 2, status: oc > 0.75 ? "Good" : oc > 0.5 ? "Medium" : "Low" },
  ].filter(Boolean) as { label: string; value: number; max: number; status: string }[];

  const circ = 2 * Math.PI * 42;
  const dash = (score / 100) * circ;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Soil Health</h3>
        <span className="krishi-badge bg-primary/10 text-primary">{soilType}</span>
      </div>

      <div className="text-center mb-5">
        <div className="relative inline-flex items-center justify-center w-28 h-28">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
          </svg>
          <div className="absolute text-center">
            <div className="text-2xl font-display font-bold text-foreground">{score}</div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>
        <div className={`text-sm font-medium mt-2 ${score >= 70 ? "text-primary" : score >= 50 ? "text-krishi-gold" : "text-destructive"}`}>
          {score >= 70 ? "Good Health" : score >= 50 ? "Fair" : "Needs Attention"}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((s) => {
          const pct = Math.min(100, (s.value / s.max) * 100);
          return (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{s.label}</span>
                <span className={`font-medium ${
                  s.status === "Low" || s.status === "Acidic" || s.status === "Alkaline" ? "text-destructive" :
                  s.status === "Medium" ? "text-krishi-gold" : "text-primary"
                }`}>
                  {s.value} — {s.status}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
