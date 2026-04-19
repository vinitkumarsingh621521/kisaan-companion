import { MapPin, Ruler, Layers, Award, Leaf, Sparkles } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function FarmProfileCard() {
  const { active, completionPct } = useActiveProfile();
  const { ctx } = usePersonalization();

  if (!active) return null;

  const d = active.farmer_details || {};
  const name = active.full_name;
  const location =
    active.farm_location ||
    [d.village, d.district, d.state].filter(Boolean).join(", ") ||
    "Add location";
  const farmSize = active.farm_size || (d.total_land ? `${d.total_land} acres` : "Not set");
  const soilType = active.soil_type || d.soil_type || ctx?.climate.soils?.[0] || "Not set";
  const initials = name?.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "F";

  const goals = [d.main_goal, d.crop_priority].filter(Boolean);
  const cropList = ctx?.crops.current || [];
  const seasonText = ctx?.climate.current_season ? `${ctx.climate.current_season} ${new Date().getFullYear()}` : "Current season";

  // Completion ring
  const circ = 2 * Math.PI * 18;
  const dash = (completionPct / 100) * circ;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Avatar className="h-14 w-14">
            <AvatarImage src={active.avatar_url || undefined} />
            <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" width={56} height={56}>
            <circle cx="20" cy="20" r="18" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
            <circle cx="20" cy="20" r="18" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-lg text-foreground truncate">{name}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> <span className="truncate">{location}</span>
          </div>
          <div className="text-[10px] text-primary font-medium mt-0.5">{completionPct}% complete</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <Ruler className="h-4 w-4 text-primary mb-1" />
          <div className="text-xs text-muted-foreground">Area</div>
          <div className="font-semibold text-foreground text-sm">{farmSize}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <Layers className="h-4 w-4 text-krishi-gold mb-1" />
          <div className="text-xs text-muted-foreground">Soil</div>
          <div className="font-semibold text-foreground text-sm truncate">{soilType}</div>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Goals</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {goals.map(g => (
              <span key={g} className="krishi-badge bg-primary/10 text-primary text-[10px]">{g}</span>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current Season</div>
        <div className="font-display font-semibold text-foreground text-sm">
          {seasonText}{cropList.length ? ` — ${cropList.slice(0, 3).join(" + ")}` : ""}
        </div>
        {ctx?.nearest_mandi.distance_km && ctx.nearest_mandi.distance_km !== "unknown" && (
          <div className="text-xs text-muted-foreground mt-1">
            Nearest mandi: {ctx.nearest_mandi.name} ({ctx.nearest_mandi.distance_km} km)
          </div>
        )}
      </div>
    </div>
  );
}
