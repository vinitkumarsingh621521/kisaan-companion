import { Calendar } from "lucide-react";

const crops = [
  { name: "Paddy", emoji: "🌾", sowStart: 5, sowEnd: 6, harvestStart: 9, harvestEnd: 10, color: "bg-primary" },
  { name: "Maize", emoji: "🌽", sowStart: 5, sowEnd: 6, harvestStart: 8, harvestEnd: 9, color: "bg-krishi-gold" },
  { name: "Soybean", emoji: "🫘", sowStart: 6, sowEnd: 7, harvestStart: 9, harvestEnd: 10, color: "bg-krishi-sky" },
  { name: "Wheat", emoji: "🌾", sowStart: 10, sowEnd: 11, harvestStart: 2, harvestEnd: 3, color: "bg-krishi-earth" },
];

const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function CropCalendarWidget() {
  const currentMonth = new Date().getMonth();

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Crop Calendar
        </h3>
        <span className="krishi-badge bg-primary/10 text-primary">2025-26</span>
      </div>

      <div className="space-y-3">
        {/* Month headers */}
        <div className="flex items-center gap-1">
          <div className="w-24 flex-shrink-0" />
          {months.map((m, i) => (
            <div
              key={m + i}
              className={`flex-1 text-center text-[10px] font-medium ${
                i === currentMonth ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              {m}
            </div>
          ))}
        </div>

        {/* Crop rows */}
        {crops.map((crop) => (
          <div key={crop.name} className="flex items-center gap-1">
            <div className="w-24 flex-shrink-0 flex items-center gap-1.5 text-sm">
              <span>{crop.emoji}</span>
              <span className="text-foreground font-medium truncate">{crop.name}</span>
            </div>
            {months.map((_, i) => {
              const isSow = i >= crop.sowStart && i <= crop.sowEnd;
              const isHarvest =
                crop.harvestStart <= crop.harvestEnd
                  ? i >= crop.harvestStart && i <= crop.harvestEnd
                  : i >= crop.harvestStart || i <= crop.harvestEnd;
              const isCurrent = i === currentMonth;

              return (
                <div
                  key={i}
                  className={`flex-1 h-6 rounded-sm transition-all ${
                    isSow
                      ? `${crop.color}/30 border border-primary/20`
                      : isHarvest
                      ? `${crop.color}/60`
                      : "bg-muted/30"
                  } ${isCurrent ? "ring-1 ring-primary" : ""}`}
                  title={`${crop.name} - ${months[i]}: ${isSow ? "Sowing" : isHarvest ? "Harvest" : "Off season"}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary/30 border border-primary/20" />
          Sowing
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary/60" />
          Harvest
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm ring-1 ring-primary bg-muted/30" />
          Current
        </div>
      </div>
    </div>
  );
}
