import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useState } from "react";
import { Zap, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";

interface Scheme { name: string; match_score: number; benefit: string; why: string; action: string }

export default function GovtSchemesCard() {
  const navigate = useNavigate();
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || !ctx) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await edgeToken()}` },
          body: JSON.stringify({ action: "scheme_match", profileContext: ctx, profile: active }),
        });
        const data = await resp.json();
        if (cancelled) return;
        const cleaned = (data.result || "{}").replace(/```json\s*|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.schemes) setSchemes(parsed.schemes.slice(0, 4));
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [active?.id, ctx?.farmer_name]);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-krishi-gold" /> Govt Schemes
        </h3>
        <span className="krishi-badge bg-krishi-gold-light text-krishi-gold text-[10px]">
          {schemes.length} matched
        </span>
      </div>

      {loading && schemes.length === 0 ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : schemes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-4">
          Schemes appear once your profile is filled in 📋
        </p>
      ) : (
        <div className="space-y-2.5">
          {schemes.map((s) => (
            <div key={s.name} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/schemes")}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-foreground">{s.name}</span>
                <span className="krishi-badge bg-primary/10 text-primary text-[10px]">{s.match_score}%</span>
              </div>
              <div className="text-xs text-muted-foreground">{s.benefit}</div>
              <div className="text-[11px] text-primary mt-1 line-clamp-1">{s.why}</div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-full mt-4 text-sm" onClick={() => navigate("/schemes")}>
        <ExternalLink className="h-4 w-4 mr-1" /> View All Schemes
      </Button>
    </div>
  );
}
