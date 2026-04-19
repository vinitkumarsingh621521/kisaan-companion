import { Zap, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const schemes = [
  {
    name: "PM-KISAN",
    desc: "₹6,000/year income support",
    status: "Eligible",
    match: 98,
  },
  {
    name: "PMFBY",
    desc: "Crop insurance at low premium",
    status: "Eligible",
    match: 95,
  },
  {
    name: "Soil Health Card",
    desc: "Free soil testing & recommendations",
    status: "Applied",
    match: 100,
  },
  {
    name: "KCC",
    desc: "Kisan Credit Card — 4% interest",
    status: "Eligible",
    match: 90,
  },
];

export default function GovtSchemesCard() {
  const navigate = useNavigate();

  const handleSchemeClick = (scheme: typeof schemes[number]) => {
    if (scheme.status === "Applied") {
      toast.info(`${scheme.name}: Application submitted. Track status on the schemes page.`);
    } else {
      toast.success(`Checking eligibility for ${scheme.name}...`, { description: scheme.desc });
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-krishi-gold" />
          Govt Schemes
        </h3>
        <span className="krishi-badge bg-krishi-gold-light text-krishi-gold">4 Matched</span>
      </div>

      <div className="space-y-2.5">
        {schemes.map((s) => (
          <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleSchemeClick(s)}>
            <div className="flex items-center gap-2">
              {s.status === "Applied" ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-krishi-gold/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-krishi-gold">{s.match}</span>
                </div>
              )}
              <div>
                <div className="font-medium text-sm text-foreground">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </div>
            <span className={`krishi-badge text-xs ${
              s.status === "Applied" ? "bg-primary/10 text-primary" : "bg-krishi-gold-light text-krishi-gold"
            }`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full mt-4 text-sm" onClick={() => navigate("/schemes")}>
        <ExternalLink className="h-4 w-4 mr-1" />
        View All Schemes
      </Button>
    </div>
  );
}
