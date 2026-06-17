import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend,
} from "recharts";

interface Props {
  result: any;
  onReset: () => void;
  farmContext: { state: string; season: string };
}

const DIMENSION_META = [
  { key: "waterEfficiency", label: "Water", icon: "💧", fullLabel: "Water Efficiency" },
  { key: "profitability", label: "Profit", icon: "💰", fullLabel: "Profitability" },
  { key: "climateMatch", label: "Climate", icon: "🌡️", fullLabel: "Climate Match" },
  { key: "pestResistance", label: "Pest", icon: "🐛", fullLabel: "Pest Resistance" },
  { key: "easeOfGrowing", label: "Ease", icon: "👷", fullLabel: "Ease of Growing" },
  { key: "marketStability", label: "Market", icon: "📈", fullLabel: "Market Stability" },
];

const COLOR_A = "#8b5cf6"; // violet
const COLOR_B = "#10b981"; // emerald

export default function CompareResultCard({ result, onReset, farmContext }: Props) {
  const { cropA, cropB, verdict, dimensionInsights } = result;
  const [activeTab, setActiveTab] = useState("radar");

  const radarData = DIMENSION_META.map((d) => ({
    dimension: d.label,
    [cropA.name]: cropA.scores?.[d.key] ?? 0,
    [cropB.name]: cropB.scores?.[d.key] ?? 0,
  }));

  const num = (s: string | undefined) => parseInt((s || "").split("–")[0].replace(/[^0-9]/g, "") || "0");

  const financialData = [
    { name: "Investment", [cropA.name]: num(cropA.investmentPerAcre), [cropB.name]: num(cropB.investmentPerAcre) },
    { name: "Income", [cropA.name]: num(cropA.expectedIncomePerAcre), [cropB.name]: num(cropB.expectedIncomePerAcre) },
    { name: "Profit", [cropA.name]: num(cropA.netProfitPerAcre), [cropB.name]: num(cropB.netProfitPerAcre) },
  ];

  const shareWA = () => {
    const text = `⚖️ *Fasal Compare — KisaanCompanion AI*\n━━━━━━━━━━━━━━━━━\n${cropA.emoji} ${cropA.name}: *${cropA.totalScore}/100*\n${cropB.emoji} ${cropB.name}: *${cropB.totalScore}/100*\n━━━━━━━━━━━━━━━━━\n🏆 *Winner for ${farmContext.state}: ${verdict.winnerEmoji} ${verdict.winner}* (${verdict.confidence}% confidence)\n\n📊 ${verdict.reasoning}\n\n💡 Smart plan: ${verdict.smartMix}\n\n💰 ${verdict.financialGap}\n━━━━━━━━━━━━━━━━━\n📱 Compare crops free: kisaancompanion.in/compare`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const W = doc.internal.pageSize.width;
      let y = 10;

      doc.setFillColor(109, 40, 217);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15); doc.setFont("helvetica", "bold");
      doc.text(`Fasal Compare: ${cropA.name} vs ${cropB.name}`, 10, 12);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`State: ${farmContext.state} | Season: ${farmContext.season} | ${new Date().toLocaleDateString("en-IN")}`, 10, 22);
      doc.setTextColor(0, 0, 0); y = 36;

      const sec = (t: string) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.setFillColor(245, 240, 255); doc.rect(8, y - 4, W - 16, 8, "F");
        doc.text(t, 10, y); y += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      };
      const kv = (k: string, v: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold"); doc.text(`${k}:`, 12, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(v, W - 68);
        doc.text(lines, 60, y); y += 5 * Math.max(1, lines.length);
      };

      sec(`AI Verdict`);
      kv("Winner", `${verdict.winner} (${verdict.confidence}% confidence)`);
      kv("Margin", verdict.winMarginLabel || "");
      const rl = doc.splitTextToSize(verdict.reasoning || "", W - 22);
      doc.text(rl, 10, y); y += rl.length * 4.5 + 4;
      kv("Smart Mix", verdict.smartMix || "");
      kv("Financial Gap", verdict.financialGap || "");
      kv("Break-even", verdict.breakEvenNote || ""); y += 4;

      sec(`Scores: ${cropA.name} vs ${cropB.name}`);
      DIMENSION_META.forEach((d) => {
        kv(d.fullLabel, `${cropA.name}: ${cropA.scores?.[d.key] ?? 0}/100 vs ${cropB.name}: ${cropB.scores?.[d.key] ?? 0}/100`);
      });
      kv("Total", `${cropA.name}: ${cropA.totalScore}/100 vs ${cropB.name}: ${cropB.totalScore}/100`); y += 4;

      sec(`Financial Comparison`);
      [cropA, cropB].forEach((c: any) => {
        kv(c.name, `Income: ${c.expectedIncomePerAcre} | Investment: ${c.investmentPerAcre} | Profit: ${c.netProfitPerAcre}`);
        kv(`${c.name} MSP`, c.msp || "");
        kv(`${c.name} Water`, `${c.waterRequirementMm}mm | Labor: ${c.laborDaysPerAcre} days/acre`);
      }); y += 3;

      sec(`Key Strengths`);
      [cropA, cropB].forEach((c: any) => {
        doc.setFont("helvetica", "bold"); doc.text(`${c.name}:`, 12, y);
        doc.setFont("helvetica", "normal"); y += 5;
        (c.keyStrengths || []).forEach((s: string) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`  - ${s}`, 14, y); y += 5;
        }); y += 2;
      });

      sec(`Dimension Insights`);
      (dimensionInsights || []).forEach((ins: any) => {
        kv(ins.dimension, ins.insight || "");
      });

      doc.setFontSize(7.5); doc.setTextColor(140, 140, 140);
      doc.text(`KisaanCompanion Fasal Compare | ${new Date().toLocaleDateString("en-IN")}`, 10, 287);

      doc.save(`FasalCompare-${cropA.name}-vs-${cropB.name}.pdf`);
      toast.success("Comparison PDF downloaded!");
    } catch {
      toast.error("PDF export failed");
    }
  };

  const isAWinner = verdict.winner === cropA.name;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* VS HEADER */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
        <div className="grid grid-cols-3 items-center gap-3">
          <div className={`text-center p-4 rounded-xl ${isAWinner ? "bg-violet-50 dark:bg-violet-900/30 ring-2 ring-violet-500" : "bg-muted/40"}`}>
            <div className="text-5xl">{cropA.emoji}</div>
            <div className="font-bold mt-1">{cropA.name}</div>
            <div className="font-display text-4xl font-extrabold mt-2" style={{ color: COLOR_A }}>
              {cropA.totalScore}
            </div>
            <div className="text-xs text-muted-foreground">/ 100</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-muted-foreground">VS</div>
          </div>
          <div className={`text-center p-4 rounded-xl ${!isAWinner ? "bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500" : "bg-muted/40"}`}>
            <div className="text-5xl">{cropB.emoji}</div>
            <div className="font-bold mt-1">{cropB.name}</div>
            <div className="font-display text-4xl font-extrabold mt-2" style={{ color: COLOR_B }}>
              {cropB.totalScore}
            </div>
            <div className="text-xs text-muted-foreground">/ 100</div>
          </div>
        </div>

        {/* Winner banner */}
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 justify-center">
            <Trophy className="h-5 w-5 text-amber-600" />
            <span className="font-bold text-lg text-amber-900 dark:text-amber-200">
              {verdict.winnerEmoji} {verdict.winner} wins for {farmContext.state}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 justify-center text-xs">
            <span className="text-muted-foreground">AI Confidence:</span>
            <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${verdict.confidence}%` }} />
            </div>
            <span className="font-bold">{verdict.confidence}%</span>
          </div>
          <p className="text-sm text-foreground mt-3 text-center">{verdict.reasoning}</p>
        </div>
      </div>

      {/* Short-term / Long-term */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">⚡ Short Term</div>
          <div className="font-bold text-lg">{verdict.bestForShortTerm}</div>
          <p className="text-sm text-muted-foreground mt-1">{verdict.bestForShortTermReason}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">🌱 Long Term</div>
          <div className="font-bold text-lg">{verdict.bestForLongTerm}</div>
          <p className="text-sm text-muted-foreground mt-1">{verdict.bestForLongTermReason}</p>
        </div>
      </div>

      {/* Smart Mix */}
      <div className="bg-gradient-to-r from-violet-50 to-emerald-50 dark:from-violet-900/20 dark:to-emerald-900/20 border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-2">💡 Smart Farm Mix Recommendation</h3>
        <p className="text-sm text-foreground">{verdict.smartMix}</p>
        <p className="text-xs text-muted-foreground mt-2">{verdict.breakEvenNote}</p>
      </div>

      {/* TABS */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="radar">🕸️ Radar</TabsTrigger>
            <TabsTrigger value="financial">💰 Financial</TabsTrigger>
            <TabsTrigger value="details">📋 Details</TabsTrigger>
          </TabsList>

          <TabsContent value="radar" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              6-dimension scientific comparison (higher = better on each axis)
            </p>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Radar name={cropA.name} dataKey={cropA.name} stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.35} />
                  <Radar name={cropB.name} dataKey={cropB.name} stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.35} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-2">
              {DIMENSION_META.map((d) => {
                const aScore = cropA.scores?.[d.key] ?? 0;
                const bScore = cropB.scores?.[d.key] ?? 0;
                return (
                  <div key={d.key} className="flex items-center gap-3 text-sm">
                    <span className="text-lg">{d.icon}</span>
                    <span className="w-28 text-xs font-medium">{d.fullLabel}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full" style={{ width: `${aScore}%`, background: COLOR_A }} />
                      </div>
                      <span className="text-xs w-10 text-right font-semibold" style={{ color: COLOR_A }}>{aScore}</span>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <span className="text-xs w-10 font-semibold" style={{ color: COLOR_B }}>{bScore}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full" style={{ width: `${bScore}%`, background: COLOR_B }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Income, Investment & Profit per acre (₹)
            </p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={financialData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    width={50}
                  />
                  <Tooltip
                    formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, ""]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey={cropA.name} fill={COLOR_A} radius={[6, 6, 0, 0]} />
                  <Bar dataKey={cropB.name} fill={COLOR_B} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {[cropA, cropB].map((c: any) => (
                <div key={c.name} className="border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{c.emoji}</span>
                    <span className="font-bold">{c.name}</span>
                    {verdict.winner === c.name && <Trophy className="h-4 w-4 text-amber-500" />}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: "Income", value: c.expectedIncomePerAcre },
                      { label: "Investment", value: c.investmentPerAcre },
                      { label: "Net Profit", value: c.netProfitPerAcre },
                      { label: "MSP", value: c.msp },
                      { label: "Water Need", value: `${c.waterRequirementMm}mm` },
                      { label: "Labor", value: `${c.laborDaysPerAcre} days` },
                      { label: "Duration", value: `${c.growthDays} days` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-3">🔬 Scientific Dimension Insights</h3>
              <div className="space-y-3">
                {(dimensionInsights || []).map((ins: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <span className="text-2xl">{ins.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{ins.dimension}</div>
                      <p className="text-xs text-muted-foreground mt-1">{ins.insight}</p>
                      {ins.cropALabel && ins.cropBLabel && (
                        <div className="flex gap-3 text-[11px] mt-2">
                          <span style={{ color: COLOR_A }}>🟣 {cropA.name}: {ins.cropALabel}</span>
                          <span style={{ color: COLOR_B }}>🟢 {cropB.name}: {ins.cropBLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[cropA, cropB].map((c: any) => (
                <div key={c.name} className="border border-border rounded-xl p-4">
                  <h4 className="font-semibold mb-2">{c.emoji} {c.name}</h4>
                  <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">✅ Strengths</div>
                  <ul className="space-y-1 mb-3">
                    {(c.keyStrengths || []).map((s: string, j: number) => (
                      <li key={j} className="text-xs flex gap-1.5"><span className="text-green-600">✓</span>{s}</li>
                    ))}
                  </ul>
                  <div className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">⚠️ Risks</div>
                  <ul className="space-y-1 mb-3">
                    {(c.keyRisks || []).map((r: string, j: number) => (
                      <li key={j} className="text-xs flex gap-1.5"><span className="text-red-600">!</span>{r}</li>
                    ))}
                  </ul>
                  <div className="text-xs p-2 rounded-lg bg-muted/50 mt-2">
                    <span className="font-semibold">🌱 Soil:</span> {c.soilVerdict}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={shareWA} className="bg-green-600 hover:bg-green-700 text-white">
          <Share2 className="h-4 w-4 mr-2" /> Share on WhatsApp
        </Button>
        <Button onClick={exportPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
        <Button onClick={onReset} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Compare Again
        </Button>
      </div>
    </motion.div>
  );
}
