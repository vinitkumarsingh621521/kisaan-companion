import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Share2, ShoppingCart, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import FertilizerScheduleChart from "./FertilizerScheduleChart";

interface Props {
  prescription: any;
  wizardData: { crop: string; areaAcres: number; growthStage: string; state: string; knownIssues: string[] };
  onReset: () => void;
}

export default function PrescriptionCard({ prescription: rx, wizardData: wd, onReset }: Props) {
  const [showShop, setShowShop] = useState(false);

  const shareWA = () => {
    const text = `💊 *Kisaan Nuska — AI Farm Prescription*\n━━━━━━━━━━━━━━━━━\nCrop: ${wd.crop} | Area: ${wd.areaAcres} acres\nRx No: *${rx.prescriptionNumber}*\nFarm Score: ${rx.overallHealthScore}/100\n━━━━━━━━━━━━━━━━━\n🩺 *Diagnosis:* ${rx.diagnosisSummary}\n━━━━━━━━━━━━━━━━━\n💊 Fertilizer Cost/Acre: ${rx.fertilizer.totalCostPerAcre}\n🌾 Harvest: ${rx.harvestPlan.estimatedHarvestDate}\n📈 Expected Yield: ${rx.harvestPlan.expectedYieldRange}\n💰 Profit/Acre: ${rx.economics.estimatedProfitPerAcre}\n📊 ROI: ${rx.economics.roiPercent}%\n━━━━━━━━━━━━━━━━━\n📱 Free AI prescription: kisaancompanion.in/prescription`;
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const W = doc.internal.pageSize.width;
      let y = 10;
      const nl = (extra = 5) => { y += extra; if (y > 270) { doc.addPage(); y = 20; } };

      doc.setFillColor(22, 101, 52);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255,255,255); doc.setFontSize(15); doc.setFont("helvetica","bold");
      doc.text("Kisaan Nuska — AI Farm Prescription", 10, 11);
      doc.setFontSize(8); doc.setFont("helvetica","normal");
      doc.text(`Rx: ${rx.prescriptionNumber} | Crop: ${wd.crop} ${wd.areaAcres}ac | ${new Date().toLocaleDateString("en-IN")} | Confidence: ${rx.aiConfidence}%`, 10, 20);
      doc.setTextColor(0,0,0); y = 35;

      const heading = (t: string) => {
        if (y > 260) { doc.addPage(); y = 15; }
        doc.setFontSize(11); doc.setFont("helvetica","bold");
        doc.setFillColor(240,253,244); doc.rect(8, y-4, W-16, 8, "F");
        doc.text(t, 10, y); nl(10); doc.setFont("helvetica","normal"); doc.setFontSize(9.5);
      };
      const kv = (k: string, v: string) => {
        if (!v) return;
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont("helvetica","bold"); doc.text(`${k}:`, 12, y);
        doc.setFont("helvetica","normal");
        const lines = doc.splitTextToSize(v, W - 68);
        doc.text(lines, 58, y); y += 5 * Math.max(1, lines.length);
      };

      heading("Diagnosis");
      const diag = doc.splitTextToSize(rx.diagnosisSummary, W-20);
      doc.text(diag, 10, y); y += diag.length * 5 + 2;
      kv("Farm Score", `${rx.overallHealthScore}/100 (${rx.severity})`); nl(3);

      heading("Fertilizer Prescription");
      [...(rx.fertilizer.baseApplication||[]), ...(rx.fertilizer.topDressing||[]), ...(rx.fertilizer.micronutrients||[])].forEach((f: any) => {
        kv(f.product, `${f.dosePerAcre} | ${f.timing} | ${f.costPerAcre}`);
        const r = doc.splitTextToSize(`Purpose: ${f.purpose}`, W-22);
        doc.setTextColor(80,80,80); doc.text(r, 14, y); doc.setTextColor(0,0,0); y += r.length * 4 + 2;
      });
      kv("Total Fertilizer Cost/Acre", rx.fertilizer.totalCostPerAcre); nl(3);

      heading("Irrigation Schedule");
      kv("Total Water", `${rx.irrigation.totalWaterMm}mm per season`);
      (rx.irrigation.schedule||[]).forEach((s: any) => kv(s.week, `${s.frequency} · ${s.amountMm}mm · ${s.stage}`));
      kv("Water-Saving Tip", rx.irrigation.waterSavingTip); nl(3);

      heading("Pest & Disease Control");
      (rx.pestControl||[]).forEach((p: any) => {
        kv(`${p.pest} [${p.riskLevel}]`, `${p.product} @ ${p.dose} · ${p.timing} · ${p.costPerAcre}`);
      }); nl(3);

      heading("Harvest & Economics");
      kv("Harvest Window", rx.harvestPlan.estimatedHarvestDate);
      kv("Expected Yield", rx.harvestPlan.expectedYieldRange);
      kv("MSP Rate", rx.harvestPlan.recommendedMSP);
      kv("Total Input Cost/Acre", rx.economics.totalInputCostPerAcre);
      kv("Expected Revenue/Acre", rx.economics.expectedRevenuePerAcre);
      doc.setFont("helvetica","bold"); doc.setTextColor(22,101,52);
      kv("Estimated Profit/Acre", rx.economics.estimatedProfitPerAcre);
      kv("ROI", `${rx.economics.roiPercent}%`);
      doc.setTextColor(0,0,0); doc.setFont("helvetica","normal"); nl(3);

      heading("Dealer Shopping List");
      (rx.dealerShoppingList||[]).forEach((item: any, i: number) => {
        const line = doc.splitTextToSize(`${i+1}. ${item.item} — ${item.quantity} (${item.estimatedCost}) ! ${item.notes}`, W-20);
        if (y > 265) { doc.addPage(); y = 20; }
        doc.text(line, 10, y); y += line.length * 5;
      });

      doc.setFontSize(7.5); doc.setTextColor(140,140,140);
      doc.text(`KisaanCompanion AI | ${rx.prescriptionNumber} | Generated ${new Date().toLocaleDateString("en-IN")} | Valid ${rx.validForDays} days | AI Confidence: ${rx.aiConfidence}%`, 10, 287);

      doc.save(`KisaanNuska-${wd.crop}-${rx.prescriptionNumber}.pdf`);
      toast.success("Prescription PDF downloaded!");
    } catch (e) {
      toast.error("PDF export failed");
    }
  };

  const InfoRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
    <div className={`flex justify-between items-center py-1.5 border-b border-border/50 last:border-0 ${highlight ? "mt-1" : ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-green-600 dark:text-green-400 text-base" : "text-foreground"}`}>{value}</span>
    </div>
  );

  const RiskBadge = ({ level }: { level: string }) => (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      level === "High" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
      level === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    }`}>{level} Risk</span>
  );

  const ProductCard = ({ item }: { item: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <p className="font-bold text-foreground text-sm">{item.product}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.method}</p>
          <p className="text-xs text-muted-foreground">⏰ {item.timing}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-primary font-bold text-base">{item.dosePerAcre}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{item.costPerAcre}</p>
        </div>
      </div>
      <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-800 dark:text-blue-300">
        💡 {item.purpose}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden border border-border bg-card shadow-xl"
    >
      <div className="bg-gradient-to-r from-green-900 to-emerald-700 text-white px-6 py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">💊</span>
              <span className="font-display font-bold text-xl">Kisaan Nuska</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">AI Prescription</span>
            </div>
            <p className="text-white/70 text-xs">#{rx.prescriptionNumber} · Valid {rx.validForDays} days · AI Confidence: {rx.aiConfidence}%</p>
            <p className="text-white/60 text-xs">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="text-right">
            <div className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${
              rx.overallHealthScore >= 70 ? "bg-green-200 text-green-900" :
              rx.overallHealthScore >= 45 ? "bg-amber-200 text-amber-900" : "bg-red-200 text-red-900"
            }`}>
              Farm Score {rx.overallHealthScore}/100
            </div>
            <p className="text-white/60 text-xs mt-1">{rx.severity} concern</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 bg-white/10 rounded-xl px-4 py-3 text-center text-xs mb-3">
          <div><p className="text-white/60 mb-0.5">Crop</p><p className="font-bold">{wd.crop}</p></div>
          <div><p className="text-white/60 mb-0.5">Area</p><p className="font-bold">{wd.areaAcres} acres</p></div>
          <div><p className="text-white/60 mb-0.5">Stage</p><p className="font-bold">{wd.growthStage}</p></div>
        </div>
        <div className="bg-white/10 rounded-xl px-4 py-3">
          <p className="text-white/60 text-xs mb-1">🩺 AI Diagnosis</p>
          <p className="text-sm leading-relaxed">{rx.diagnosisSummary}</p>
        </div>
      </div>

      <div className="p-5">
        <Tabs defaultValue="fertilizer">
          <TabsList className="grid grid-cols-4 w-full mb-5">
            <TabsTrigger value="fertilizer" className="text-xs">💊 Fertilizer</TabsTrigger>
            <TabsTrigger value="irrigation" className="text-xs">💧 Irrigation</TabsTrigger>
            <TabsTrigger value="pest" className="text-xs">🛡️ Pest</TabsTrigger>
            <TabsTrigger value="harvest" className="text-xs">🌾 Harvest</TabsTrigger>
          </TabsList>

          <TabsContent value="fertilizer" className="space-y-3">
            <FertilizerScheduleChart schedule={rx.fertilizer.weeklySchedule || []} />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Base Application</p>
            {(rx.fertilizer.baseApplication || []).map((f: any, i: number) => <ProductCard key={i} item={f} />)}
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-2">Top Dressing</p>
            {(rx.fertilizer.topDressing || []).map((f: any, i: number) => <ProductCard key={i} item={f} />)}
            {(rx.fertilizer.micronutrients || []).length > 0 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-2">Micronutrients</p>
                {rx.fertilizer.micronutrients.map((f: any, i: number) => <ProductCard key={i} item={f} />)}
              </>
            )}
            <div className="flex justify-between items-center p-3 mt-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <span className="text-sm font-semibold text-foreground">Total Fertilizer Cost/Acre</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400">{rx.fertilizer.totalCostPerAcre}</span>
            </div>
          </TabsContent>

          <TabsContent value="irrigation" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-3xl mb-1">💧</p>
                <p className="text-xs text-muted-foreground">Total Water/Season</p>
                <p className="font-bold text-foreground text-lg">{rx.irrigation.totalWaterMm}mm</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-3xl mb-1">💸</p>
                <p className="text-xs text-muted-foreground">Irrigation Cost/Acre</p>
                <p className="font-bold text-foreground text-lg">{rx.irrigation.irrigationCostPerAcre}</p>
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Schedule</p>
            <div className="space-y-1">
              {(rx.irrigation.schedule || []).map((s: any, i: number) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">{i+1}</div>
                    {i < (rx.irrigation.schedule.length - 1) && <div className="w-0.5 h-6 bg-border mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="font-semibold text-foreground text-sm">{s.week}</p>
                    <p className="text-xs text-muted-foreground">{s.frequency} · {s.amountMm}mm · Stage: {s.stage}</p>
                    {s.note && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">⚠️ {s.note}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">💡 Water-saving tip</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{rx.irrigation.waterSavingTip}</p>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Critical Stages — Never miss irrigation</p>
            <div className="flex flex-wrap gap-2">
              {(rx.irrigation.criticalStages || []).map((s: string) => (
                <span key={s} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full font-medium">⚡ {s}</span>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pest" className="space-y-3">
            {(rx.pestControl || []).map((p: any, i: number) => (
              <motion.div key={i} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.1 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-foreground">{p.pest}</p>
                  <RiskBadge level={p.riskLevel} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">⏰ Timing: {p.timing}</p>
                  <p className="text-xs"><span className="font-medium text-foreground">Product:</span> <span className="text-muted-foreground">{p.product}</span></p>
                  <p className="text-xs"><span className="font-medium text-foreground">Dose:</span> <span className="text-muted-foreground">{p.dose} · {p.method}</span></p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Cost: {p.costPerAcre}/acre</p>
                </div>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="harvest" className="space-y-4">
            <div className="text-center p-6 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-muted-foreground mb-1">🗓️ Estimated Harvest Window</p>
              <p className="text-3xl font-display font-bold text-amber-800 dark:text-amber-300">{rx.harvestPlan.estimatedHarvestDate}</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">Signal: {rx.harvestPlan.harvestSignal}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-0.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Expected Output</p>
              <InfoRow label="Yield Range" value={rx.harvestPlan.expectedYieldRange} />
              <InfoRow label="MSP Rate" value={rx.harvestPlan.recommendedMSP} />
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">💹 Economics per Acre</p>
              <InfoRow label="Total Input Cost" value={rx.economics.totalInputCostPerAcre} />
              <InfoRow label="Expected Revenue" value={rx.economics.expectedRevenuePerAcre} />
              <InfoRow label="Break-even Yield" value={rx.economics.breakEvenYield} />
              <InfoRow label="Estimated Profit" value={rx.economics.estimatedProfitPerAcre} highlight />
              <InfoRow label="ROI" value={`${rx.economics.roiPercent}%`} highlight />
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-xl">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300">📦 Post-harvest action</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">{rx.harvestPlan.postHarvestAction}</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card flex-shrink-0">
              <QRCodeSVG
                value={`KisaanNuska|${rx.prescriptionNumber}|${wd.crop}|${wd.areaAcres}ac|${new Date().toISOString().slice(0,10)}`}
                size={96}
                bgColor="transparent"
                fgColor="hsl(var(--foreground))"
              />
              <p className="text-[10px] text-muted-foreground text-center max-w-[100px] leading-tight">Scan at Kisan Sewa Kendra</p>
            </div>
            <div className="flex flex-wrap gap-2 flex-1 content-start">
              <Button onClick={exportPDF} className="bg-green-700 hover:bg-green-600 text-white gap-1.5 text-sm">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" onClick={shareWA} className="gap-1.5 text-sm">
                <Share2 className="h-4 w-4" /> WhatsApp
              </Button>
              <Button variant="outline" onClick={() => setShowShop(true)} className="gap-1.5 text-sm">
                <ShoppingCart className="h-4 w-4" /> Dealer List
              </Button>
              <Button variant="ghost" onClick={onReset} className="gap-1.5 text-sm">
                <RefreshCw className="h-4 w-4" /> New Prescription
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showShop} onOpenChange={setShowShop}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🛒 Dealer Shopping List</DialogTitle>
            <p className="text-xs text-muted-foreground">Show this at your Kisan Sewa Kendra or input dealer</p>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(rx.dealerShoppingList || []).map((item: any, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
                <span className="text-lg flex-shrink-0">🛍️</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{item.item}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity} · Est: {item.estimatedCost}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">⚠️ {item.notes}</p>
                </div>
              </div>
            ))}
          </div>
          <Button className="w-full mt-2 gap-1.5" onClick={() => {
            const list = (rx.dealerShoppingList || []).map((it: any, n: number) => `${n+1}. ${it.item} — ${it.quantity} (${it.estimatedCost})`).join("\n");
            window.open("https://wa.me/?text=" + encodeURIComponent(`🛒 Kisan Sewa Kendra Shopping List\nCrop: ${wd.crop} | ${wd.areaAcres} acres\nRx: ${rx.prescriptionNumber}\n\n${list}\n\n📱 KisaanCompanion AI`), "_blank");
          }}>
            <Share2 className="h-4 w-4" /> Share List on WhatsApp
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
