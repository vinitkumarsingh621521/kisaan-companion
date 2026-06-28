import ColorfulPageBanner from "@/components/ColorfulPageBanner";
import PageGuide from "@/components/PageGuide";
import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import {
  FileText, Download, Calculator, Shield, Zap, ExternalLink, Sparkles,
  CheckCircle, Trophy, IndianRupee, ChevronDown, Copy, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import SchemeEligibilityQuiz from "@/components/schemes/SchemeEligibilityQuiz";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Scheme { name: string; match_score: number; benefit: string; why: string; action: string }
type ToolKind = "loan" | "insurance" | "tax" | "export";
type SchemeStatus = "eligible" | "applied" | "received";

const tools = [
  { kind: "loan" as const, icon: FileText, title: "Loan Application Helper", desc: "Generate documents needed for bank agricultural loans" },
  { kind: "insurance" as const, icon: Shield, title: "Insurance Claim Assistant", desc: "Automated crop damage documentation with photos" },
  { kind: "tax" as const, icon: Calculator, title: "Tax Calculator", desc: "Calculate agricultural income with exemptions" },
  { kind: "export" as const, icon: Download, title: "Export Reports", desc: "Download farm data as PDF or Excel" },
];

const CATEGORIES = [
  { id: "all",       label: "All Schemes",   emoji: "🌾", color: "bg-primary/10 text-primary" },
  { id: "cash",      label: "Cash Transfer", emoji: "💰", color: "bg-green-500/10 text-green-600" },
  { id: "insurance", label: "Insurance",     emoji: "🛡️", color: "bg-blue-500/10 text-blue-600" },
  { id: "credit",    label: "Credit/Loan",   emoji: "🏦", color: "bg-purple-500/10 text-purple-600" },
  { id: "input",     label: "Seeds/Input",   emoji: "🌱", color: "bg-emerald-500/10 text-emerald-600" },
  { id: "equipment", label: "Equipment",     emoji: "🚜", color: "bg-orange-500/10 text-orange-600" },
];

const STATUSES: { id: SchemeStatus; label: string; color: string }[] = [
  { id: "eligible",  label: "Eligible",   color: "text-muted-foreground" },
  { id: "applied",   label: "Applied",    color: "text-blue-500" },
  { id: "received",  label: "Received ✓", color: "text-green-500" },
];

const SCHEME_URLS: Record<string, string> = {
  "PM-KISAN": "https://pmkisan.gov.in/",
  "PMFBY": "https://pmfby.gov.in/",
  "KCC": "https://www.nabard.org/content1.aspx?id=572",
  "PM Fasal Bima": "https://pmfby.gov.in/",
  "Pradhan Mantri Krishi Sinchayee": "https://pmksy.gov.in/",
  "PM-KUSUM": "https://mnre.gov.in/solar/schemes/",
  "Soil Health Card": "https://soilhealth.dac.gov.in/",
  "eNAM": "https://enam.gov.in/web/",
  "National Food Security": "https://nfsa.gov.in/",
};

function schemeCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("kisan") || n.includes("samman") || n.includes("cash") || n.includes("transfer")) return "cash";
  if (n.includes("insurance") || n.includes("pmfby") || n.includes("fasal bima")) return "insurance";
  if (n.includes("credit") || n.includes("kcc") || n.includes("loan") || n.includes("mudra")) return "credit";
  if (n.includes("seed") || n.includes("fertilizer") || n.includes("input") || n.includes("soil")) return "input";
  if (n.includes("equipment") || n.includes("mechaniz") || n.includes("tractor") || n.includes("drip")) return "equipment";
  return "cash";
}

function parseBenefitAmount(s: string): number {
  if (!s) return 0;
  const lower = s.toLowerCase();
  const numMatch = lower.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return 0;
  const n = parseFloat(numMatch[1]);
  if (lower.includes("lakh")) return n * 100000;
  if (lower.includes("crore")) return n * 10000000;
  return n;
}

function findSchemeUrl(name: string): string | null {
  const low = name.toLowerCase();
  for (const key of Object.keys(SCHEME_URLS)) {
    if (low.includes(key.toLowerCase())) return SCHEME_URLS[key];
  }
  return null;
}

function scoreColor(v: number): string {
  if (v >= 75) return "hsl(142, 70%, 40%)";
  if (v >= 50) return "hsl(45, 90%, 50%)";
  return "hsl(0, 70%, 50%)";
}

function MatchRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(c - (Math.max(0, Math.min(100, value)) / 100) * c));
    return () => cancelAnimationFrame(id);
  }, [value, c]);
  const color = scoreColor(value);
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
        <circle
          cx="28" cy="28" r={r} stroke={color} strokeWidth="4" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export default function SchemesPage() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const { t } = useTranslation();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<(typeof tools)[number] | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [tracker, setTracker] = useState<Record<string, SchemeStatus>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);

  // Load tracker
  useEffect(() => {
    try {
      const raw = localStorage.getItem("km.scheme.status");
      if (raw) setTracker(JSON.parse(raw));
    } catch {}
  }, []);

  const setStatus = (name: string, status: SchemeStatus) => {
    setTracker(prev => {
      const next = { ...prev, [name]: status };
      try { localStorage.setItem("km.scheme.status", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const appliedCount = useMemo(
    () => Object.values(tracker).filter(v => v === "applied" || v === "received").length,
    [tracker]
  );
  const receivedCount = useMemo(
    () => Object.values(tracker).filter(v => v === "received").length,
    [tracker]
  );

  const totalBenefit = useMemo(
    () => schemes.reduce((sum, s) => sum + parseBenefitAmount(s.benefit), 0),
    [schemes]
  );

  // Animate counter
  useEffect(() => {
    if (totalBenefit <= 0) { setAnimatedTotal(0); return; }
    let rafId = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedTotal(Math.round(totalBenefit * eased));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [totalBenefit]);

  const filteredSchemes = useMemo(
    () => activeCategory === "all" ? schemes : schemes.filter(s => schemeCategory(s.name) === activeCategory),
    [schemes, activeCategory]
  );

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
        if (parsed.schemes) setSchemes(parsed.schemes);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [active?.id, ctx?.farmer_name]);

  // Deadlines
  const currentYear = new Date().getFullYear();
  const DEADLINES = [
    { scheme: "PM-KISAN Installment 1", date: new Date(currentYear, 2, 31), desc: "Apr–Jul installment", icon: "💰" },
    { scheme: "PM-KISAN Installment 2", date: new Date(currentYear, 6, 31), desc: "Aug–Nov installment", icon: "💰" },
    { scheme: "PM-KISAN Installment 3", date: new Date(currentYear, 10, 30), desc: "Dec–Mar installment", icon: "💰" },
    { scheme: "PMFBY Kharif Enrollment", date: new Date(currentYear, 6, 31), desc: "Last date to enroll Kharif crops", icon: "🛡️" },
    { scheme: "PMFBY Rabi Enrollment", date: new Date(currentYear, 11, 15), desc: "Last date to enroll Rabi crops", icon: "🛡️" },
    { scheme: "KCC Renewal", date: new Date(currentYear, 2, 31), desc: "Annual KCC renewal at bank", icon: "🏦" },
    { scheme: "Soil Health Card", date: new Date(currentYear, 8, 30), desc: "Apply for free soil testing", icon: "🌱" },
  ];
  const sortedDeadlines = [...DEADLINES].sort((a, b) => a.date.getTime() - b.date.getTime());
  const dayDiff = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86400000);
  const upcomingCount = sortedDeadlines.filter(d => dayDiff(d.date) > 0).length;
  const urgentCount = sortedDeadlines.filter(d => { const x = dayDiff(d.date); return x > 0 && x <= 7; }).length;

  const applyScheme = (s: Scheme) => {
    const url = findSchemeUrl(s.name) || `https://www.google.com/search?q=${encodeURIComponent(s.name + " apply online")}`;
    window.open(url, "_blank");
    if ((tracker[s.name] || "eligible") === "eligible") {
      setStatus(s.name, "applied");
      toast.success("Marked as Applied — good luck! 🎯");
    }
  };

  const barPct = (n: number) => schemes.length > 0 ? Math.min(100, (n / schemes.length) * 100) : 0;

  return (
    <AgriPageBackground variant="schemes">
      <style>{`
        @keyframes bar-fill { from { width: 0%; } to { width: var(--w); } }
        @keyframes urgency-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .km-bar { animation: bar-fill 0.8s ease-out forwards; }
        .km-urgent { animation: urgency-pulse 1.5s ease-in-out infinite; }
        .km-expand { max-height: 0; overflow: hidden; transition: max-height 0.2s ease-out; }
        .km-expand.open { max-height: 120px; }
      `}</style>
      <Navbar />
      <Breadcrumbs />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <PageGuide
            pageId="schemes"
            title="Government Schemes"
            subtitle="AI matches you with schemes you're eligible for"
            description="AI analyses your farm profile and finds the government schemes you are most likely to qualify for — PM-KISAN, PMFBY, KCC, and 50+ others. Each scheme shows your match score, benefit amount, and how to apply. Track which schemes you've applied for and received."
            gradient="from-orange-900 to-amber-700"
            aiContext="Government Schemes page: AI matches farmer's profile to 50+ central and state schemes with eligibility score, benefit amount, and application status tracking."
            features={[
              { icon: "🎯", title: "AI Matching", desc: "AI scores your eligibility for every scheme based on your profile" },
              { icon: "💰", title: "Benefit Calculator", desc: "See exact amount you can receive from each scheme" },
              { icon: "📋", title: "Status Tracker", desc: "Mark schemes as Eligible → Applied → Received" },
              { icon: "🔗", title: "Apply Links", desc: "Direct links to official government portals" },
              { icon: "🏦", title: "Loan Helper", desc: "Generate documents needed for agricultural bank loans" },
              { icon: "🛡️", title: "Insurance Guide", desc: "PMFBY crop insurance documentation assistant" },
            ]}
          />
          <ColorfulPageBanner
            emoji="🏛️"
            title="Government Schemes"
            subtitle={`AI-matched subsidies · PM-KISAN · PMFBY · KCC · 50+ more${active?.farmer_details?.state ? ` · ${active.farmer_details.state}` : ""}`}
            gradient="from-amber-900 via-orange-900 to-yellow-900"
            badge="AI Matched"
            stat={{ emoji: "💰", value: "₹12K+", label: "Annual support" }}
          />

          {/* HERO IMPACT BANNER */}
          <div className="glass-card p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                {loading && schemes.length === 0 ? (
                  <>
                    <Skeleton className="h-12 w-56 mb-2" />
                    <Skeleton className="h-4 w-72" />
                  </>
                ) : schemes.length === 0 ? (
                  <div className="text-base text-muted-foreground">
                    Complete your profile to calculate your benefits
                  </div>
                ) : (
                  <>
                    <div className="text-4xl font-bold text-primary tracking-tight">
                      ₹{animatedTotal.toLocaleString("en-IN")}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      in annual government support you may qualify for
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {loading && schemes.length === 0 ? (
                  <>
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-36" />
                  </>
                ) : (
                  <>
                    <span className="krishi-badge bg-krishi-gold/10 text-krishi-gold inline-flex items-center gap-1.5 text-xs px-3 py-1.5">
                      <Zap className="h-3.5 w-3.5" /> {schemes.length} Schemes Matched
                    </span>
                    <span className="krishi-badge bg-blue-500/10 text-blue-600 inline-flex items-center gap-1.5 text-xs px-3 py-1.5">
                      <CheckCircle className="h-3.5 w-3.5" /> {appliedCount} Applied
                    </span>
                    <span className="krishi-badge bg-green-500/10 text-green-600 inline-flex items-center gap-1.5 text-xs px-3 py-1.5">
                      <Trophy className="h-3.5 w-3.5" /> {receivedCount} Benefits Received
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Progress bars */}
            {schemes.length > 0 && (
              <div className="mt-5 space-y-2">
                {[
                  { label: "Potential", w: 100, fill: "hsl(var(--muted))" },
                  { label: "Applied",   w: barPct(appliedCount), fill: "hsla(142, 60%, 45%, 0.3)" },
                  { label: "Received",  w: barPct(receivedCount), fill: "hsl(142, 70%, 40%)" },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground w-20">{b.label}</div>
                    <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="km-bar h-full rounded-full"
                        style={{ ["--w" as string]: `${b.w}%`, background: b.fill }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Tabs defaultValue="ai" className="mb-5">
            <TabsList>
              <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="h-4 w-4" /> AI Matched</TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5"><Zap className="h-4 w-4" /> Eligibility Quiz</TabsTrigger>
              <TabsTrigger value="deadlines" className="gap-1.5"><Clock className="h-4 w-4" /> Deadlines</TabsTrigger>
            </TabsList>

            <TabsContent value="quiz" className="mt-4">
              <div className="glass-card p-5">
                <SchemeEligibilityQuiz />
              </div>
            </TabsContent>

            <TabsContent value="deadlines" className="mt-4">
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Scheme Deadlines & Installments
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {upcomingCount} upcoming deadlines · {urgentCount} urgent
                </p>
                <div className="space-y-2">
                  {sortedDeadlines.map((d) => {
                    const days = dayDiff(d.date);
                    const past = days <= 0;
                    const urgent = !past && days <= 7;
                    const soon = !past && days > 7 && days <= 30;
                    const iconBg = past ? "bg-muted text-muted-foreground"
                      : urgent ? "bg-red-500/15 text-red-500"
                      : soon ? "bg-krishi-gold/15 text-krishi-gold"
                      : "bg-green-500/15 text-green-600";
                    const pillBg = past ? "bg-muted text-muted-foreground"
                      : urgent ? "bg-red-500/15 text-red-500"
                      : soon ? "bg-krishi-gold/15 text-krishi-gold"
                      : "bg-green-500/15 text-green-600";
                    return (
                      <div key={d.scheme} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${iconBg}`}>
                          {d.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{d.scheme}</div>
                          <div className="text-xs text-muted-foreground">{d.desc} · {d.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                        </div>
                        <span className={`krishi-badge text-xs px-2.5 py-1 ${pillBg} ${urgent ? "km-urgent" : ""}`}>
                          {past ? "Passed" : `${days} days left`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-4">
              {/* Category filter pills */}
              {schemes.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1 scrollbar-hide">
                  {CATEGORIES.map(cat => {
                    const active = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium cursor-pointer transition-all hover:scale-105 whitespace-nowrap flex-shrink-0 ${
                          active ? cat.color : "bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <span className="mr-1">{cat.emoji}</span>{cat.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 glass-card p-5">
                  <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-krishi-gold" /> Personalized Schemes
                    <span className="krishi-badge bg-primary/10 text-primary text-[10px] ml-auto">{filteredSchemes.length} shown</span>
                  </h3>
                  {loading && schemes.length === 0 ? (
                    <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
                  ) : filteredSchemes.length === 0 ? (
                    <p className="text-center text-muted-foreground italic py-8">
                      {schemes.length === 0
                        ? "Fill in your profile and we'll find schemes faster than a sarkari babu signs a file 📋"
                        : "No schemes in this category."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filteredSchemes.map((s, idx) => {
                        const catId = schemeCategory(s.name);
                        const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];
                        const currentStatus: SchemeStatus = tracker[s.name] || "eligible";
                        const statusIdx = STATUSES.findIndex(x => x.id === currentStatus);
                        const isExpanded = expandedCard === s.name;
                        return (
                          <motion.div
                            key={s.name}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="relative p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col items-center flex-shrink-0 w-12">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${cat.color}`}>
                                  {cat.emoji}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">{cat.label}</div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground text-sm line-clamp-2">{s.name}</div>
                                <div className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                                  <IndianRupee className="h-3 w-3" /> {s.benefit}
                                </div>
                              </div>
                              <MatchRing value={s.match_score} />
                            </div>

                            {/* Why collapsible */}
                            <div className="mt-3">
                              <button
                                onClick={() => setExpandedCard(isExpanded ? null : s.name)}
                                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                              >
                                Why you qualify
                                <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </button>
                              <div className={`km-expand ${isExpanded ? "open" : ""}`}>
                                <div className="text-sm text-muted-foreground italic p-2 mt-1 bg-muted/30 rounded-lg">
                                  {s.why}
                                </div>
                              </div>
                            </div>

                            {/* Bottom row: status tracker + apply */}
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-0">
                                  {STATUSES.map((st, i) => {
                                    const passed = i <= statusIdx;
                                    const fill = st.id === "applied" ? "bg-blue-500 border-blue-500"
                                      : st.id === "received" ? "bg-green-500 border-green-500"
                                      : "bg-muted-foreground border-muted-foreground";
                                    return (
                                      <div key={st.id} className="flex items-center">
                                        <button
                                          onClick={() => setStatus(s.name, st.id)}
                                          aria-label={`Mark as ${st.label}`}
                                          className={`w-5 h-5 rounded-full border-2 transition-colors ${
                                            passed ? fill : "bg-muted border-border"
                                          }`}
                                        />
                                        {i < STATUSES.length - 1 && (
                                          <div className={`h-0.5 w-6 ${i < statusIdx ? "bg-primary" : "bg-border"}`} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className={`text-[10px] mt-1 ${STATUSES[statusIdx]?.color || "text-muted-foreground"}`}>
                                  {STATUSES[statusIdx]?.label || "Eligible"}
                                </div>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => applyScheme(s)}>
                                <ExternalLink className="h-3 w-3 mr-1" /> Apply →
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="glass-card p-5">
                  <h3 className="font-display font-semibold text-foreground mb-4">Documentation Tools</h3>
                  <div className="space-y-3">
                    {tools.map((tl) => (
                      <div key={tl.title} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <tl.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{tl.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{tl.desc}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTool(tl)}>Open</Button>
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
          <div className="relative">
            <button
              onClick={() => { navigator.clipboard.writeText(toolText); toast.success("Copied to clipboard"); }}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/60 transition-colors"
              aria-label="Copy"
            >
              <Copy className="h-4 w-4" />
            </button>
            <div className="max-h-[55vh] overflow-y-auto rounded-lg bg-muted/40 p-4 pr-10 text-sm text-foreground whitespace-pre-wrap border border-border/50">
              {toolText}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={downloadText}>Download Text/Data</Button>
            <Button className="gradient-primary border-0 text-primary-foreground" onClick={downloadPdf}>Download PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </AgriPageBackground>
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
