import { Cloud, Droplets, Wind, Sun, CloudRain, Thermometer } from "lucide-react";

const forecast = [
  { day: "Today", icon: Sun, temp: "34°", rain: "10%" },
  { day: "Tue", icon: Cloud, temp: "32°", rain: "25%" },
  { day: "Wed", icon: CloudRain, temp: "28°", rain: "80%" },
  { day: "Thu", icon: CloudRain, temp: "26°", rain: "90%" },
  { day: "Fri", icon: Sun, temp: "30°", rain: "15%" },
];

interface WeatherWidgetProps {
  location?: string | null;
}

export default function WeatherWidget({ location }: WeatherWidgetProps) {
  const displayLocation = location || "Your Location";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Weather — {displayLocation}</h3>
        <span className="krishi-badge bg-krishi-sky-light text-krishi-sky">Live</span>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <Sun className="h-14 w-14 text-krishi-gold" />
        <div>
          <div className="text-4xl font-display font-bold text-foreground">34°C</div>
          <div className="text-muted-foreground text-sm">Partly Cloudy • Feels like 37°</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Droplets className="h-4 w-4 text-krishi-sky mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Humidity</div>
          <div className="font-semibold text-sm text-foreground">68%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Wind className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">Wind</div>
          <div className="font-semibold text-sm text-foreground">12 km/h</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <Thermometer className="h-4 w-4 text-destructive mx-auto mb-1" />
          <div className="text-xs text-muted-foreground">UV Index</div>
          <div className="font-semibold text-sm text-foreground">High</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {forecast.map((d) => (
          <div key={d.day} className={`flex-1 min-w-[60px] rounded-lg p-2.5 text-center ${d.day === "Today" ? "bg-primary/10 border border-primary/20" : "bg-muted/30"}`}>
            <div className="text-xs text-muted-foreground mb-1">{d.day}</div>
            <d.icon className={`h-5 w-5 mx-auto mb-1 ${d.day === "Today" ? "text-krishi-gold" : "text-muted-foreground"}`} />
            <div className="font-semibold text-sm text-foreground">{d.temp}</div>
            <div className="text-xs text-krishi-sky">{d.rain}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
