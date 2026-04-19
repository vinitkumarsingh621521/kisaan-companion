import { Camera, Mic, CloudSun, BarChart3, MapPin, FileText, Settings, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { icon: Camera, label: "Scan Disease", color: "gradient-primary", to: "/crop-advisor" },
  { icon: Mic, label: "Voice Ask", color: "gradient-gold", to: "/crop-advisor" },
  { icon: CloudSun, label: "Weather", color: "gradient-sky", to: "/dashboard" },
  { icon: BarChart3, label: "Prices", color: "gradient-primary", to: "/market" },
  { icon: MapPin, label: "Mandi Map", color: "gradient-gold", to: "/market" },
  { icon: FileText, label: "Schemes", color: "gradient-sky", to: "/schemes" },
  { icon: Settings, label: "Profile", color: "bg-muted", to: "/profile" },
  { icon: HelpCircle, label: "Community", color: "bg-muted", to: "/community" },
];

export default function QuickActions() {
  return (
    <div className="glass-card p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link key={a.label} to={a.to} className="flex flex-col items-center gap-1.5 group">
            <div className={`w-12 h-12 rounded-xl ${a.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
              <a.icon className={`h-5 w-5 ${a.color === "bg-muted" ? "text-foreground" : "text-primary-foreground"}`} />
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
