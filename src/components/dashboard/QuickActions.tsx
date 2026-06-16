import { Camera, Mic, CloudSun, BarChart3, MapPin, FileText, FlaskConical, Eye } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

const actions = [
  { icon: Camera, label: "Scan Disease", color: "gradient-primary", to: "/crop-advisor" },
  { icon: Mic, label: "Voice Ask", color: "gradient-gold", to: "/crop-advisor#voice" },
  { icon: CloudSun, label: "Weather", color: "gradient-sky", to: "/dashboard#weather", scrollId: "weather" },
  { icon: BarChart3, label: "Prices", color: "gradient-primary", to: "/market" },
  { icon: MapPin, label: "Mandi Map", color: "gradient-gold", to: "/market#mandi-map" },
  { icon: FileText, label: "Schemes", color: "gradient-sky", to: "/schemes" },
  { icon: FlaskConical, label: "Prescription", color: "gradient-primary", to: "/prescription" },
  { icon: Eye, label: "Farm Vision", color: "gradient-sky", to: "/vision" },
];

interface Ripple { id: number; x: number; y: number; }

export default function QuickActions() {
  const [ripples, setRipples] = useState<Record<string, Ripple[]>>({});
  const navigate = useNavigate();
  const location = useLocation();

  const onPress = (label: string, e: React.MouseEvent<HTMLAnchorElement>, action: typeof actions[number]) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const r: Ripple = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples((prev) => ({ ...prev, [label]: [...(prev[label] || []), r] }));
    setTimeout(() => {
      setRipples((prev) => ({ ...prev, [label]: (prev[label] || []).filter((x) => x.id !== r.id) }));
    }, 600);

    // If we're already on the target page and have a scroll target, scroll smoothly instead of navigating
    if (action.scrollId && location.pathname === action.to.split("#")[0]) {
      e.preventDefault();
      const el = document.getElementById(action.scrollId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="glass-card p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            onClick={(e) => onPress(a.label, e, a)}
            className="flex flex-col items-center gap-1.5 group relative"
          >
            <div className={`relative overflow-hidden w-12 h-12 rounded-xl ${a.color} flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95`}>
              <a.icon className={`h-5 w-5 ${a.color === "bg-muted" ? "text-foreground" : "text-primary-foreground"}`} />
              {(ripples[a.label] || []).map((r) => (
                <span
                  key={r.id}
                  className="absolute rounded-full bg-white/40 pointer-events-none animate-ripple"
                  style={{ left: r.x, top: r.y, width: 8, height: 8, transform: "translate(-50%, -50%)" }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-center">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
