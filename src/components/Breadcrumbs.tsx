import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  tools: "Tools",
  "field-mapper": "Field Mapper",
  reports: "Reports",
  satellite: "Satellite",
  iot: "IoT Sensors",
  achievements: "Achievements",
  offline: "Offline",
  admin: "Admin",
  team: "Team",
  "crop-advisor": "Crop Advisor",
  "ai-advisor": "AI Advisor",
  market: "Market",
  schemes: "Schemes",
  community: "Community",
  news: "News",
  research: "Research",
  profile: "Profile",
  dashboard: "Dashboard",
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const segments = parts.map((p, i) => ({
    label: LABELS[p] || p.charAt(0).toUpperCase() + p.slice(1),
    href: "/" + parts.slice(0, i + 1).join("/"),
    last: i === parts.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 pt-2 -mb-2">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <li>
          <Link to="/" className="flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="h-3 w-3" /> Home
          </Link>
        </li>
        {segments.map((s) => (
          <li key={s.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            {s.last ? (
              <span className="text-foreground font-medium">{s.label}</span>
            ) : (
              <Link to={s.href} className="hover:text-primary transition-colors">
                {s.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
