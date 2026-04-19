import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { FileText, Download, Calculator, Shield, Zap, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";

interface Scheme { name: string; match_score: number; benefit: string; why: string; action: string }

const tools = [
  { icon: FileText, title: "Loan Application Helper", desc: "Generate documents needed for bank agricultural loans" },
  { icon: Shield, title: "Insurance Claim Assistant", desc: "Automated crop damage documentation with photos" },
  { icon: Calculator, title: "Tax Calculator", desc: "Calculate agricultural income with exemptions" },
  { icon: Download, title: "Export Reports", desc: "Download farm data as PDF or Excel" },
];

export default function SchemesPage() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || !ctx) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "scheme_match", profileContext: ctx, profile: active }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        try {
          const cleaned = (data.result || "{}").replace(/```json\s*|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.schemes) setSchemes(parsed.schemes);
        } catch {}
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [active?.id, ctx?.farmer_name]);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-4 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">⚡ Govt Schemes & Tools</h1>
            <p className="text-muted-foreground mt-1">
              AI-matched to your profile {active?.farmer_details?.state ? `· ${active.farmer_details.state}` : ""}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-krishi-gold" /> Personalized Schemes
                <span className="krishi-badge bg-primary/10 text-primary text-[10px] ml-auto">{schemes.length} matched</span>
              </h3>
              {loading && schemes.length === 0 ? (
                <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
              ) : schemes.length === 0 ? (
                <p className="text-center text-muted-foreground italic py-8">
                  Fill in your profile and we'll find schemes faster than a sarkari babu signs a file 📋
                </p>
              ) : (
                <div className="space-y-3">
                  {schemes.map((s) => (
                    <motion.div key={s.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">{s.name}</div>
                          <div className="text-xs text-primary font-medium mt-0.5">{s.benefit}</div>
                        </div>
                        <span className="krishi-badge bg-primary/10 text-primary text-xs">{s.match_score}% match</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2"><span className="font-medium">Why:</span> {s.why}</p>
                      <p className="text-xs text-foreground"><span className="font-medium text-primary">Action:</span> {s.action}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(s.name + " apply online")}`, "_blank")}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Apply
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-4">Documentation Tools</h3>
              <div className="space-y-3">
                {tools.map((t) => (
                  <div key={t.title} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <t.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{t.desc}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toast.info(`Opening ${t.title}…`)}>Open</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
