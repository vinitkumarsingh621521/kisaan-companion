import { Progress } from "@/components/ui/progress";

const soilData = [
  { label: "pH Level", value: 6.8, max: 14, status: "Optimal", color: "bg-primary" },
  { label: "Nitrogen (N)", value: 65, max: 100, status: "Medium", color: "bg-krishi-gold" },
  { label: "Phosphorus (P)", value: 42, max: 100, status: "Low", color: "bg-destructive" },
  { label: "Potassium (K)", value: 78, max: 100, status: "Good", color: "bg-primary" },
  { label: "Moisture", value: 55, max: 100, status: "Adequate", color: "bg-krishi-sky" },
  { label: "Organic Carbon", value: 0.8, max: 2, status: "Low", color: "bg-krishi-gold" },
];

export default function SoilHealthCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Soil Health Analysis</h3>
        <span className="krishi-badge bg-primary/10 text-primary">Field A-1</span>
      </div>

      <div className="text-center mb-5">
        <div className="relative inline-flex items-center justify-center w-28 h-28">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="8"
              strokeDasharray={`${72 * 2.64} ${100 * 2.64}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-2xl font-display font-bold text-foreground">72</div>
            <div className="text-xs text-muted-foreground">Score</div>
          </div>
        </div>
        <div className="text-sm text-primary font-medium mt-2">Good Health</div>
      </div>

      <div className="space-y-3">
        {soilData.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{s.label}</span>
              <span className={`font-medium ${
                s.status === "Low" ? "text-destructive" : 
                s.status === "Medium" ? "text-krishi-gold" : "text-primary"
              }`}>
                {s.value} — {s.status}
              </span>
            </div>
            <Progress value={(s.value / s.max) * 100} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
