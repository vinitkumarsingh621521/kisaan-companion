import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

interface ScheduleItem { week: number; label: string; nKg: number; pKg: number; kKg: number; action: string; }
interface Props { schedule: ScheduleItem[]; }

export default function FertilizerScheduleChart({ schedule }: Props) {
  const data = schedule.map((s) => ({ name: `Wk ${s.week}`, N: s.nKg, P: s.pKg, K: s.kKg, label: s.label }));

  return (
    <div className="rounded-xl bg-muted/30 border border-border p-4 mb-5">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
        📊 Weekly NPK Application Schedule (kg/acre)
      </p>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} barSize={18} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }}
            formatter={(value: any, name: string) => [`${value} kg`, name === "N" ? "Nitrogen" : name === "P" ? "Phosphorus" : "Potassium"]}
            labelFormatter={(label, payload) => `${label} — ${payload?.[0]?.payload?.label || ""}`}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v) => v === "N" ? "Nitrogen (N)" : v === "P" ? "Phosphorus (P)" : "Potassium (K)"} />
          <Bar dataKey="N" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="P" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="K" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 space-y-1.5">
        {schedule.map((s) => (
          <div key={s.week} className="flex gap-2 text-xs">
            <span className="text-muted-foreground flex-shrink-0 w-14">Week {s.week}:</span>
            <span className="text-foreground">{s.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
