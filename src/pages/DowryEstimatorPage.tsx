import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Sparkles, RefreshCw, TrendingUp, Download, Share2,
  Plus, Trash2, IndianRupee,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { edgeToken } from "@/lib/edgeAuth";
import jsPDF from "jspdf";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import PageGuide from "@/components/PageGuide";
import { errMsg } from "@/lib/errors";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

const CROPS_LIST = [
  "Rice", "Wheat", "Maize", "Cotton", "Tomato", "Potato",
  "Onion", "Mustard", "Soybean", "Sugarcane", "Chickpea", "Groundnut",
];

const COST_LABELS: Record<string, string> = {
  seeds: "Seeds", fertilizer: "Fertilizer", pesticide: "Pesticide",
  irrigation: "Irrigation", labor: "Labor", harvesting: "Harvesting", transport: "Transport",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#10b981", "#f97316"];

interface CropEntry {
  id: string;
  name: string;
  area: number;
  expectedYield: number;
  pricePerQtl: number;
}

const DEFAULT_PRICES: Record<string, number> = {
  Rice: 2300, Wheat: 2275, Maize: 2090, Cotton: 7121, Tomato: 1200,
  Potato: 900, Onion: 1100, Mustard: 5650, Soybean: 4600,
  Sugarcane: 375, Chickpea: 5440, Groundnut: 6377,
};

const DEFAULT_YIELD: Record<string, number> = {
  Rice: 20, Wheat: 22, Maize: 25, Cotton: 8, Tomato: 120,
  Potato: 100, Onion: 80, Mustard: 10, Soybean: 12,
  Sugarcane: 300, Chickpea: 8, Groundnut: 15,
};

export default function KisaanArthNiti() {
  const { active } = useActiveProfile();
  const [crops, setCrops] = useState<CropEntry[]>([
    {
      id: "1",
      name: (active?.farmer_details as any)?.current_crops?.[0] || "Rice",
      area: 2,
      expectedYield: 20,
      pricePerQtl: 2300,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const addCrop = () => {
    const newCrop = CROPS_LIST.find((c) => !crops.some((e) => e.name === c)) || "Wheat";
    setCrops((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newCrop,
        area: 1,
        expectedYield: DEFAULT_YIELD[newCrop] || 15,
        pricePerQtl: DEFAULT_PRICES[newCrop] || 2000,
      },
    ]);
  };

  const updateCrop = (id: string, field: keyof CropEntry, value: any) => {
    setCrops((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated: CropEntry = { ...c, [field]: value };
        if (field === "name") {
          updated.expectedYield = DEFAULT_YIELD[value] || c.expectedYield;
          updated.pricePerQtl = DEFAULT_PRICES[value] || c.pricePerQtl;
        }
        return updated;
      }),
    );
  };

  const removeCrop = (id: string) => {
    if (crops.length === 1) {
      toast.error("Keep at least one crop");
      return;
    }
    setCrops((prev) => prev.filter((c) => c.id !== id));
  };

  const analyse = async () => {
    setLoading(true);
    setResult(null);
    try {
      const ctx = (active?.farmer_details as any) || {};
      const token = await edgeToken();
      const cropDetails = crops
        .map(
          (c) =>
            `${c.name}: ${c.area} acres, expected yield ${c.expectedYield} qtl/acre, price ₹${c.pricePerQtl}/qtl`,
        )
        .join("; ");

      const prompt = `Generate a complete farm financial projection for:
Farmer: ${ctx.name || active?.full_name || "Indian Farmer"}, State: ${ctx.state || "Uttar Pradesh"}
Crops: ${cropDetails}
Soil: ${ctx.soil_type || active?.soil_type || "Unknown"}, Water: ${ctx.irrigation_type || "Borewell"}
Season: ${ctx.season || "Kharif"}, Total area: ${crops.reduce((s, c) => s + c.area, 0)} acres

Calculate realistic Indian input costs (seeds, fertilizer, pesticide, irrigation, labor, harvesting, transport) per crop. Give actionable savings advice.`;

      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "farm_finance",
          messages: [{ role: "user", content: prompt }],
          profileContext: ctx,
          profile: active,
        }),
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const { result: raw } = await resp.json();
      const text =
        typeof raw === "string"
          ? raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
          : null;
      setResult(text ? JSON.parse(text) : raw);
    } catch (e: unknown) {
      toast.error("Analysis failed", { description: errMsg(e) });
    } finally {
      setLoading(false);
    }
  };

  /* PDF export */
  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const W = doc.internal.pageSize.width;
    let y = 10;
    doc.setFillColor(22, 101, 52);
    doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("Kisaan Arth Niti — Farm Financial Report", 10, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${active?.full_name || "Farmer"} | ${new Date().toLocaleDateString("en-IN")}`,
      10,
      22,
    );
    doc.setTextColor(0, 0, 0);
    y = 36;
    const kv = (k: string, v: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${k}:`, 12, y);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(v, W - 68);
      doc.text(lines, 60, y);
      y += 5 * Math.max(1, lines.length);
    };
    const sec = (t: string) => {
      if (y > 258) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 253, 244);
      doc.rect(8, y - 4, W - 16, 8, "F");
      doc.text(t, 10, y);
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    };
    sec("Financial Summary");
    kv("Total Income", `INR ${result.totalIncome?.toLocaleString("en-IN")}`);
    kv("Total Expenses", `INR ${result.totalExpenses?.toLocaleString("en-IN")}`);
    kv("Net Profit", `INR ${result.netProfit?.toLocaleString("en-IN")}`);
    kv("Profit Margin", `${result.profitMargin}%`);
    kv("ROI", `${result.roiPercent}%`);
    kv("Risk Level", `${result.riskLevel} (${result.riskScore}/100)`);
    kv("Break-even Yield", result.breakEvenYield);
    y += 4;
    sec("Top Savings Advice");
    (result.topAdvice || []).forEach((a: string, i: number) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const lines = doc.splitTextToSize(`${i + 1}. ${a}`, W - 22);
      doc.text(lines, 12, y);
      y += 5 * lines.length;
    });
    y += 4;
    sec("Cash Flow Timeline");
    (result.monthlyPlan || []).forEach((m: any) => {
      kv(
        m.month,
        `Out: INR ${m.cashOut?.toLocaleString("en-IN")} | In: INR ${m.cashIn?.toLocaleString("en-IN")} — ${m.note}`,
      );
    });
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("KisaanCompanion Arth Niti | kisaancompanion.in/farm-finance", 10, 287);
    doc.save(`KisaanArth-${Date.now()}.pdf`);
    toast.success("Financial report downloaded!");
  };

  const shareWA = () => {
    if (!result) return;
    const text = `💹 *Kisaan Arth Niti — Farm Financial Report*
━━━━━━━━━━━━━━━━━
Crops: ${crops.map((c) => `${c.name} (${c.area}ac)`).join(", ")}

💰 Total Income: *₹${result.totalIncome?.toLocaleString("en-IN")}*
💸 Total Expenses: ₹${result.totalExpenses?.toLocaleString("en-IN")}
✅ Net Profit: *₹${result.netProfit?.toLocaleString("en-IN")}*
📈 ROI: *${result.roiPercent}%*
⚠️ Risk Level: ${result.riskLevel}

💡 Top tip: ${result.topAdvice?.[0] || ""}
━━━━━━━━━━━━━━━━━
📱 Free farm finance tool: kisaancompanion.in`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };

  return (
    <AgriPageBackground variant="crops">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <PageGuide
          pageId="arth-niti"
          title="Kisaan Arth Niti — Farm Finance"
          subtitle="AI farm income, profit & risk calculator"
          description="Enter your crops, area and expected yield — AI computes income, expenses, ROI, risk score and gives personalised tips to grow your profit."
          gradient="from-emerald-900 to-green-700"
          aiContext="Kisaan Arth Niti is a farm financial planner: it calculates income, expense breakdown, ROI, break-even yield, risk score, cash-flow timeline, and AI savings tips for any combination of crops the farmer plans to grow."
          features={[
            { icon: "💰", title: "Income & Profit", desc: "Per-crop and total income, expenses and net profit" },
            { icon: "📊", title: "Cost Breakdown", desc: "Pie chart of seed, fertilizer, labor, irrigation, harvest costs" },
            { icon: "📈", title: "ROI & Margin", desc: "Return on investment and profit margin for the season" },
            { icon: "⚠️", title: "Risk Score", desc: "0-100 risk rating with the main risk factors highlighted" },
            { icon: "🗓️", title: "Cash Flow", desc: "Month-by-month cash-in vs cash-out plan" },
            { icon: "💡", title: "AI Savings", desc: "Personalised tips to cut cost and boost profit" },
          ]}
        />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <TrendingUp className="h-3.5 w-3.5" /> Farm Financial Intelligence
          </div>
          <h1 className="font-display font-bold text-3xl md:text-5xl text-foreground">
            Kisaan Arth Niti
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl mx-auto">
            Enter your crops and area — AI calculates your complete income, profit, ROI, risk
            score, and gives personalised savings advice.
          </p>
        </motion.div>

        {/* Crop input form */}
        <div className="rounded-2xl border border-border bg-card shadow-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-foreground text-lg">
                Your Crops This Season
              </h2>
              <p className="text-xs text-muted-foreground">
                Add all crops you plan to grow or are currently growing
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addCrop} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Crop
            </Button>
          </div>

          <div className="space-y-3">
            {crops.map((crop, i) => (
              <div
                key={crop.id}
                className="rounded-xl border border-border bg-muted/30 p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Crop {i + 1}</span>
                  {crops.length > 1 && (
                    <button
                      onClick={() => removeCrop(crop.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Crop</label>
                    <Select
                      value={crop.name}
                      onValueChange={(v) => updateCrop(crop.id, "name", v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CROPS_LIST.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Area (acres)
                    </label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={crop.area}
                      onChange={(e) =>
                        updateCrop(crop.id, "area", parseFloat(e.target.value) || 1)
                      }
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-9"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Expected Yield (qtl/ac)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={crop.expectedYield}
                      onChange={(e) =>
                        updateCrop(crop.id, "expectedYield", parseFloat(e.target.value) || 1)
                      }
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-9"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Price (₹/qtl)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={crop.pricePerQtl}
                      onChange={(e) =>
                        updateCrop(crop.id, "pricePerQtl", parseFloat(e.target.value) || 1)
                      }
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-9"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>
                    Est. Income:{" "}
                    <span className="font-semibold text-emerald-600">
                      ₹{(crop.area * crop.expectedYield * crop.pricePerQtl).toLocaleString("en-IN")}
                    </span>
                  </span>
                  <span>
                    Total production:{" "}
                    <span className="font-semibold text-foreground">
                      {(crop.area * crop.expectedYield).toFixed(0)} qtl
                    </span>
                  </span>
                </div>
              </div>
            ))}

            <Button
              onClick={analyse}
              disabled={loading}
              className="w-full gap-2 bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 text-white"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculating your farm finances...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Analyse My Farm Finances
                </>
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total Income",
                    value: `₹${result.totalIncome?.toLocaleString("en-IN")}`,
                    color: "text-green-600",
                    bg: "bg-green-50 dark:bg-green-950/20",
                  },
                  {
                    label: "Net Profit",
                    value: `₹${result.netProfit?.toLocaleString("en-IN")}`,
                    color: "text-emerald-600",
                    bg: "bg-emerald-50 dark:bg-emerald-950/20",
                  },
                  {
                    label: "Profit Margin",
                    value: `${result.profitMargin}%`,
                    color: "text-blue-600",
                    bg: "bg-blue-50 dark:bg-blue-950/20",
                  },
                  {
                    label: "ROI",
                    value: `${result.roiPercent}%`,
                    color: "text-violet-600",
                    bg: "bg-violet-50 dark:bg-violet-950/20",
                  },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`rounded-xl p-4 border border-border ${bg}`}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-xl md:text-2xl font-bold ${color} mt-1`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Risk + break-even */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-muted-foreground">Risk Score</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {result.riskScore}/100
                  </p>
                  <p className="text-sm text-amber-600 font-medium">{result.riskLevel} Risk</p>
                  <div className="mt-2 space-y-0.5">
                    {(result.riskFactors || []).map((r: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        • {r}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-muted-foreground">Break-even Yield</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {result.breakEvenYield}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum yield needed to cover all costs
                  </p>
                  {result.comparisonVsLastYear && (
                    <p className="text-xs text-emerald-600 mt-2 font-medium">
                      {result.comparisonVsLastYear}
                    </p>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
                <Tabs defaultValue="breakdown">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="breakdown">📊 Cost Breakdown</TabsTrigger>
                    <TabsTrigger value="cashflow">🗓️ Cash Flow</TabsTrigger>
                    <TabsTrigger value="advice">💡 Savings Tips</TabsTrigger>
                  </TabsList>

                  <TabsContent value="breakdown" className="space-y-5 mt-4">
                    {(result.crops || []).map((c: any, idx: number) => {
                      const pieData = Object.entries(c.costBreakdown || {}).map(([k, v]) => ({
                        name: COST_LABELS[k] || k,
                        value: v as number,
                      }));
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-border p-4 bg-muted/20"
                        >
                          <h3 className="font-semibold text-foreground mb-3">
                            {c.name} ({c.area} acres)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                Cost Breakdown
                              </p>
                              <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={75}
                                    label={({ name, percent }) =>
                                      `${name} ${((percent as number) * 100).toFixed(0)}%`
                                    }
                                    labelLine={false}
                                  >
                                    {pieData.map((_, i) => (
                                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    formatter={(v: any) =>
                                      `₹${Number(v).toLocaleString("en-IN")}`
                                    }
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-2 content-center">
                              {[
                                { label: "Income", value: c.income, color: "text-green-600" },
                                { label: "Expenses", value: c.expenses, color: "text-red-600" },
                                { label: "Profit", value: c.profit, color: "text-emerald-600" },
                                { label: "Per Acre", value: c.profitPerAcre, color: "text-blue-600" },
                              ].map(({ label, value, color }) => (
                                <div
                                  key={label}
                                  className="rounded-lg border border-border bg-card p-2"
                                >
                                  <p className="text-[11px] text-muted-foreground">{label}</p>
                                  <p className={`text-sm font-semibold ${color}`}>
                                    ₹{Number(value || 0).toLocaleString("en-IN")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="cashflow" className="space-y-4 mt-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={result.monthlyPlan || []}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.5}
                        />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                          tick={{ fontSize: 9 }}
                          width={50}
                        />
                        <Tooltip
                          formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Legend />
                        <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cashIn" name="Cash In" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-2">
                      {(result.monthlyPlan || []).map((m: any, i: number) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-2 text-xs p-2 rounded-lg border border-border bg-muted/30"
                        >
                          <span className="font-semibold text-foreground">{m.month}</span>
                          <span className="text-red-600">
                            Out: ₹{m.cashOut?.toLocaleString("en-IN")}
                          </span>
                          {m.cashIn > 0 && (
                            <span className="text-green-600">
                              In: ₹{m.cashIn?.toLocaleString("en-IN")}
                            </span>
                          )}
                          <span className="text-muted-foreground">— {m.note}</span>
                        </div>
                      ))}
                    </div>

                    {result.savingOpportunity && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          💡 Saving Opportunity
                        </p>
                        <p className="text-sm text-foreground mt-1">{result.savingOpportunity}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="advice" className="space-y-3 mt-4">
                    <h3 className="font-semibold text-foreground">
                      AI-Generated Profit Improvement Tips
                    </h3>
                    {(result.topAdvice || []).map((advice: string, i: number) => (
                      <div
                        key={i}
                        className="flex gap-3 p-3 rounded-xl border border-border bg-muted/30"
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground leading-snug">{advice}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button onClick={exportPDF} variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" /> Download Report
                </Button>
                <Button onClick={shareWA} variant="outline" className="gap-1.5">
                  <Share2 className="h-4 w-4" /> Share on WhatsApp
                </Button>
                <Button onClick={() => setResult(null)} variant="ghost" className="gap-1.5">
                  <RefreshCw className="h-4 w-4" /> Recalculate
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
