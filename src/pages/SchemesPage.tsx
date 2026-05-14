import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import { FileText, Download, Calculator, Shield, Zap, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";
import SchemeEligibilityQuiz from "@/components/schemes/SchemeEligibilityQuiz";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Scheme { name: string; match_score: number; benefit: string; why: string; action: string }
type ToolKind = "loan" | "insurance" | "tax" | "export";

const tools = [
  { kind: "loan" as const, icon: FileText, title: "Loan Application Helper", desc: "Generate documents needed for bank agricultural loans" },
  { kind: "insurance" as const, icon: Shield, title: "Insurance Claim Assistant", desc: "Automated crop damage documentation with photos" },
  { kind: "tax" as const, icon: Calculator, title: "Tax Calculator", desc: "Calculate agricultural income with exemptions" },
  { kind: "export" as const, icon: Download, title: "Export Reports", desc: "Download farm data as PDF or Excel" },
];

export default function SchemesPage() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<(typeof tools)[number] | null>(null);

  const toolText = useMemo(() => activeTool ? buildToolText(activeTool.kind, active, ctx, schemes) : "", [activeTool, active, ctx, schemes]);

  const downloadText = () => {
    if (!activeTool) return;
    const blob = new Blob([toolText], { type: activeTool.kind === "export" ? "application/json" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTool.title.toLowerCase().replace(/\s+/g, "-")}.${activeTool.kind === "export" ? "json" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Document downloaded");
  };

  const downloadPdf = async () => {
    if (!activeTool) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(activeTool.title, 40, 44);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(toolText, 515);
    pdf.text(lines, 40, 72);
    pdf.save(`${activeTool.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF ready");
  };

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
      <Breadcrumbs />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">⚡ Govt Schemes & Tools</h1>
            <p className="text-muted-foreground mt-1">
              AI-matched to your profile {active?.farmer_details?.state ? `· ${active.farmer_details.state}` : ""}
            </p>
          </motion.div>

          <Tabs defaultValue="ai" className="mb-5">
            <TabsList>
              <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="h-4 w-4" /> AI Matched</TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5"><Zap className="h-4 w-4" /> Eligibility Quiz</TabsTrigger>
            </TabsList>
            <TabsContent value="quiz" className="mt-4">
              <div className="glass-card p-5">
                <SchemeEligibilityQuiz />
              </div>
            </TabsContent>
            <TabsContent value="ai" className="mt-4">
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
                    <Button variant="ghost" size="sm" onClick={() => setActiveTool(t)}>Open</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Dialog open={!!activeTool} onOpenChange={(open) => !open && setActiveTool(null)}>
        <DialogContent className="max-w-2xl bg-card">
          <DialogHeader>
            <DialogTitle>{activeTool?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto rounded-lg bg-muted/40 p-4 text-sm text-foreground whitespace-pre-wrap border border-border/50">
            {toolText}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(toolText); toast.success("Copied"); }}>Copy</Button>
            <Button variant="outline" onClick={downloadText}>Download Text/Data</Button>
            <Button className="gradient-primary border-0 text-primary-foreground" onClick={downloadPdf}>Download PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

function buildToolText(kind: ToolKind, active: any, ctx: any, schemes: Scheme[]) {
  const d = active?.farmer_details || {};
  const name = active?.full_name || ctx?.farmer_name || "Farmer";
  const location = [d.village || ctx?.location?.village, d.district || ctx?.location?.district, d.state || ctx?.location?.state].filter(Boolean).join(", ") || "India";
  const crops = Array.isArray(d.current_crops) ? d.current_crops.join(", ") : d.current_crops || ctx?.crops?.current?.join(", ") || "Not specified";
  const land = d.total_land || d.land_size_acres || "Not specified";
  const soil = d.soil_type || ctx?.climate?.soils?.join(", ") || "Not specified";

  if (kind === "loan") return `AGRICULTURAL LOAN APPLICATION CHECKLIST\n\nApplicant: ${name}\nFarm location: ${location}\nLand holding: ${land} acres\nCurrent crops: ${crops}\nSoil: ${soil}\n\nDocuments to attach:\n1. Aadhaar and PAN copy\n2. Land ownership / lease document\n3. Latest land record or Khasra-Khatauni\n4. Bank passbook copy\n5. Crop plan and estimated input cost\n6. Existing loan statement, if any\n\nSuggested loan purpose:\nSeasonal crop input finance for seeds, fertilizer, pesticide, irrigation, labour and transport.\n\nBank note:\nThe applicant is cultivating ${crops} at ${location}. Based on profile data, recommended schemes to mention are: ${schemes.slice(0, 3).map(s => s.name).join(", ") || "KCC / PM-KISAN / PMFBY"}.`;

  if (kind === "insurance") return `CROP INSURANCE / DAMAGE CLAIM HELPER\n\nFarmer: ${name}\nLocation: ${location}\nCrop affected: ${crops}\nApprox land: ${land} acres\n\nBefore filing claim:\n1. Take 6 clear photos: whole field, close crop damage, water/pest mark, boundary, date/location screenshot, farmer with field.\n2. Note date and approximate time of damage.\n3. Estimate affected area in acres and expected yield loss %.\n4. Keep seed/fertilizer bills and insurance policy/KCC details ready.\n\nClaim summary template:\nI, ${name}, request crop damage assessment for ${crops} cultivated at ${location}. Damage was observed on ____ due to ____. Approx affected area is ____ acres with estimated loss of ____%. Please arrange survey and claim processing under applicable crop insurance rules.`;

  if (kind === "tax") return `AGRICULTURAL INCOME TAX CALCULATOR\n\nFarmer: ${name}\nLocation: ${location}\nCrops: ${crops}\n\nImportant India note:\nPure agricultural income is generally exempt from central income tax, but it can be considered for rate calculation if the farmer also has non-agricultural income above the basic exemption limit.\n\nSimple worksheet:\nGross crop sales: ₹________\nMinus seed/fertilizer/pesticide/labour/irrigation/transport: ₹________\nNet agricultural income: ₹________\nNon-agricultural income, if any: ₹________\n\nKeep these records:\nMandi receipts, input bills, labour payments, land records, lease papers, bank entries, insurance/loan documents.`;

  return JSON.stringify({
    farmer: { name, location, land_acres: land, crops, soil },
    personalization: ctx || {},
    matched_schemes: schemes,
    generated_at: new Date().toISOString(),
  }, null, 2);
}
