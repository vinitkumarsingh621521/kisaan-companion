import { MapPin, Ruler, Layers, Award, Leaf } from "lucide-react";

const badges = [
  { label: "Organic Pioneer", emoji: "🌿" },
  { label: "Water Saver", emoji: "💧" },
  { label: "Early Adopter", emoji: "🚀" },
];

interface FarmProfileCardProps {
  profile?: {
    full_name: string | null;
    farm_location: string | null;
    farm_size: string | null;
    soil_type: string | null;
  } | null;
}

export default function FarmProfileCard({ profile }: FarmProfileCardProps) {
  const name = profile?.full_name || "Farmer";
  const location = profile?.farm_location || "Not set";
  const farmSize = profile?.farm_size || "Not set";
  const soilType = profile?.soil_type || "Not set";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
          <Leaf className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">{name}'s Farm</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {location}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <Ruler className="h-4 w-4 text-primary mb-1" />
          <div className="text-xs text-muted-foreground">Area</div>
          <div className="font-semibold text-foreground">{farmSize}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <Layers className="h-4 w-4 text-krishi-gold mb-1" />
          <div className="text-xs text-muted-foreground">Soil Type</div>
          <div className="font-semibold text-foreground">{soilType}</div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Award className="h-4 w-4 text-krishi-gold" />
          <span className="text-sm font-medium text-foreground">Achievements</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {badges.map((b) => (
            <span key={b.label} className="krishi-badge bg-krishi-gold-light text-krishi-earth text-xs">
              {b.emoji} {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="text-xs text-muted-foreground mb-1">Current Season</div>
        <div className="font-display font-semibold text-foreground">Kharif 2025 — Paddy + Maize</div>
        <div className="text-xs text-primary mt-1">Sowing in 12 days</div>
      </div>
    </div>
  );
}
