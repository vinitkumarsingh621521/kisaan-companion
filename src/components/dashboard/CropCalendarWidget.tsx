import { Calendar } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const CROP_WINDOWS: Record<string, { sowStart: number; sowEnd: number; harvestStart: number; harvestEnd: number; emoji: string; color: string }> = {
  rice:      { sowStart: 5, sowEnd: 6, harvestStart: 9, harvestEnd: 10, emoji: "🌾", color: "bg-primary" },
  paddy:     { sowStart: 5, sowEnd: 6, harvestStart: 9, harvestEnd: 10, emoji: "🌾", color: "bg-primary" },
  maize:     { sowStart: 5, sowEnd: 6, harvestStart: 8, harvestEnd: 9, emoji: "🌽", color: "bg-krishi-gold" },
  soybean:   { sowStart: 6, sowEnd: 7, harvestStart: 9, harvestEnd: 10, emoji: "🫘", color: "bg-krishi-sky" },
  wheat:     { sowStart: 10, sowEnd: 11, harvestStart: 2, harvestEnd: 3, emoji: "🌾", color: "bg-krishi-earth" },
  cotton:    { sowStart: 4, sowEnd: 5, harvestStart: 9, harvestEnd: 11, emoji: "🌿", color: "bg-primary" },
  sugarcane: { sowStart: 1, sowEnd: 3, harvestStart: 11, harvestEnd: 2, emoji: "🎋", color: "bg-krishi-green" },
  mustard:   { sowStart: 9, sowEnd: 10, harvestStart: 1, harvestEnd: 2, emoji: "🌼", color: "bg-krishi-gold" },
  groundnut: { sowStart: 5, sowEnd: 6, harvestStart: 9, harvestEnd: 10, emoji: "🥜", color: "bg-krishi-earth" },
  bajra:     { sowStart: 5, sowEnd: 6, harvestStart: 9, harvestEnd: 10, emoji: "🌾", color: "bg-krishi-gold" },
  pulses:    { sowStart: 9, sowEnd: 10, harvestStart: 2, harvestEnd: 3, emoji: "🫘", color: "bg-krishi-sky" },
  potato:    { sowStart: 9, sowEnd: 10, harvestStart: 0, harvestEnd: 1, emoji: "🥔", color: "bg-krishi-earth" },
  onion:     { sowStart: 10, sowEnd: 11, harvestStart: 2, harvestEnd: 3, emoji: "🧅", color: "bg-krishi-gold" },
  tomato:    { sowStart: 5, sowEnd: 6, harvestStart: 9, harvestEnd: 10, emoji: "🍅", color: "bg-destructive" },
};

export default function CropCalendarWidget() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const currentMonth = new Date().getMonth();

  const userCropsRaw = ctx?.crops.current?.length ? ctx.crops.current : (active?.farmer_details?.current_crops || "").split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
  const cropsToShow = (userCropsRaw.length ? userCropsRaw : ["Rice", "Wheat", "Maize"])
    .map((c: string) => ({ name: c, key: c.toLowerCase().trim() }))
    .map((c) => ({ ...c, ...(CROP_WINDOWS[c.key] || CROP_WINDOWS.rice) }))
    .slice(0, 6);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Your Crop Calendar
        </h3>
        <span className="krishi-badge bg-primary/10 text-primary text-[10px]">
          {ctx?.climate.current_season || "Current"} {new Date().getFullYear()}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-1">
          <div className="w-24 flex-shrink-0" />
          {months.map((m, i) => (
            <div key={m + i} className={`flex-1 text-center text-[10px] font-medium ${i === currentMonth ? "text-primary font-bold" : "text-muted-foreground"}`}>{m}</div>
          ))}
        </div>

        {cropsToShow.map((crop, idx) => (
          <div key={crop.name + idx} className="flex items-center gap-1">
            <div className="w-24 flex-shrink-0 flex items-center gap-1.5 text-sm">
              <span>{crop.emoji}</span>
              <span className="text-foreground font-medium truncate capitalize">{crop.name}</span>
            </div>
            {months.map((_, i) => {
              const isSow = i >= crop.sowStart && i <= crop.sowEnd;
              const isHarvest = crop.harvestStart <= crop.harvestEnd
                ? i >= crop.harvestStart && i <= crop.harvestEnd
                : i >= crop.harvestStart || i <= crop.harvestEnd;
              const isCurrent = i === currentMonth;
              return (
                <div key={i}
                  className={`flex-1 h-6 rounded-sm transition-all ${isSow ? `${crop.color}/30 border border-primary/20` : isHarvest ? `${crop.color}/60` : "bg-muted/30"} ${isCurrent ? "ring-1 ring-primary" : ""}`}
                  title={`${crop.name} - ${months[i]}: ${isSow ? "Sowing" : isHarvest ? "Harvest" : "Off season"}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary/30 border border-primary/20" />Sowing</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary/60" />Harvest</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm ring-1 ring-primary bg-muted/30" />Current</div>
      </div>
    </div>
  );
}
