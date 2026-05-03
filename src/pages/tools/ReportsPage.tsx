import { useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileText, Download, Loader2, Share2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export default function ReportsPage() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const generate = () => {
    if (!active) { toast.error("Pick a profile first"); return; }
    setLoading(true);
    try {
      const d = active.farmer_details || {};
      const doc = new jsPDF();
      const W = doc.internal.pageSize.width;
      const H = doc.internal.pageSize.height;
      let y = 20;

      const addHeader = (subtitle: string) => {
        doc.setFillColor(34, 139, 73);
        doc.rect(0, 0, W, 28, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("KrishiMitra · Smart Farm Report", 14, 14);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(subtitle, 14, 22);
        doc.setTextColor(0, 0, 0);
        y = 36;
      };
      const addFooter = (page: number, total: number) => {
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`KrishiMitra · SIH 2025 #25030 · ${active.full_name}`, 14, H - 8);
        doc.text(`Page ${page} of ${total}`, W - 30, H - 8);
        doc.setTextColor(0, 0, 0);
      };
      const ensure = (need: number) => {
        if (y + need > H - 18) { doc.addPage(); y = 20; }
      };
      const sec = (title: string) => {
        ensure(12);
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.setFillColor(240, 248, 240);
        doc.rect(12, y - 5, W - 24, 8, "F");
        doc.text(title, 14, y); y += 9;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      };
      const line = (label: string, val: any) => {
        if (val === undefined || val === null || val === "") return;
        ensure(6);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 18, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(String(val), W - 80);
        doc.text(wrapped, 70, y);
        y += 5 * Math.max(1, wrapped.length);
      };
      const para = (txt: string) => {
        ensure(8);
        doc.setFontSize(9);
        const w = doc.splitTextToSize(txt, W - 28);
        doc.text(w, 14, y); y += 4.2 * w.length + 2;
        doc.setFontSize(10);
      };
      const bar = (label: string, score: number) => {
        ensure(10);
        doc.setFontSize(9);
        doc.text(`${label}: ${score}/100`, 18, y);
        doc.setFillColor(220, 220, 220);
        doc.rect(80, y - 3.5, 100, 4, "F");
        const c = score >= 70 ? [34, 139, 73] : score >= 40 ? [240, 180, 40] : [220, 60, 60];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(80, y - 3.5, score, 4, "F");
        y += 7;
        doc.setFontSize(10);
      };

      // PAGE 1 — Cover + summary
      addHeader(`Generated ${new Date().toLocaleString()} · ${ctx?.location?.district || d.district || "—"}, ${ctx?.location?.state || d.state || "India"}`);

      doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text(active.full_name, 14, y); y += 8;
      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      doc.text(`Farmer ID: ${active.id.slice(0, 8).toUpperCase()}`, 14, y); y += 5;
      doc.text(`PIN: ${d.pincode || "—"} · Land: ${d.total_land || "?"} acres · Soil: ${active.soil_type || d.soil_color || "—"}`, 14, y); y += 10;

      sec("1. Farm Snapshot");
      line("State", ctx?.location?.state || d.state);
      line("District", ctx?.location?.district || d.district);
      line("Village", d.village);
      line("PIN Code", d.pincode);
      line("Coordinates", ctx?.location?.lat ? `${ctx.location.lat.toFixed(3)}, ${ctx.location.lon?.toFixed(3)}` : d.gps_coords);
      line("Climate Zone", ctx?.climate?.zone);
      line("Annual Rainfall", ctx?.climate?.rainfall || (d.annual_rainfall ? `${d.annual_rainfall} mm` : ""));
      line("Current Season", ctx?.climate?.current_season);
      line("Monsoon Stage", ctx?.climate?.monsoon_stage);
      y += 2;

      if (ctx?.scores) {
        sec("2. Farm Scorecard");
        bar("Farm Health", ctx.scores.farm_health);
        bar("Soil Health", ctx.scores.soil_health);
        bar("Diversification", ctx.scores.diversification);
        bar("Tech Readiness", ctx.scores.tech_readiness);
        y += 2;
      }

      sec("3. Soil & Water Analysis");
      const ph = parseFloat(d.soil_ph) || 0;
      line("Soil Type (eyeball)", d.soil_color);
      line("Soil pH", d.soil_ph ? `${d.soil_ph} (${ph < 6 ? "Acidic — apply lime 200-400 kg/acre" : ph > 8 ? "Alkaline — apply gypsum 250 kg/acre" : "Optimal range 6.0–7.5"})` : "");
      line("Nitrogen (kg/ha)", d.nitrogen ? `${d.nitrogen} (${parseFloat(d.nitrogen) < 280 ? "Low — apply urea 60 kg/acre" : "OK"})` : "");
      line("Phosphorus (kg/ha)", d.phosphorus ? `${d.phosphorus} (${parseFloat(d.phosphorus) < 25 ? "Low — apply DAP 40 kg/acre" : "OK"})` : "");
      line("Potassium (kg/ha)", d.potassium ? `${d.potassium} (${parseFloat(d.potassium) < 280 ? "Low — apply MOP 30 kg/acre" : "OK"})` : "");
      line("Organic Carbon (%)", d.organic_carbon ? `${d.organic_carbon} (target 0.75% — add 5 t/acre FYM if below)` : "");
      line("Water Source", d.water_source);
      line("Irrigation Type", d.irrigation_type);
      line("Annual Rainfall", d.annual_rainfall ? `${d.annual_rainfall} mm` : "");

      sec("4. Cropping System");
      line("Current Crops", d.current_crops);
      line("Last Season", d.previous_crops);
      line("Preferred Season", d.preferred_season);
      line("Farming Style", d.farming_type);
      line("Livestock", d.livestock);
      if (ctx?.crops?.suitable?.length) {
        line("AI Suggested for Your Climate", ctx.crops.suitable.join(", "));
      }

      // PAGE 2 — Weather + 7-day plan
      doc.addPage(); y = 20;
      addHeader("Climate Outlook & 7-Day Action Plan");
      sec("5. Live Weather (Open-Meteo · " + (ctx?.location?.district || "your area") + ")");
      if (ctx?.weather) {
        line("Now", `${ctx.weather.current_temp}°C · ${ctx.weather.current_humidity}% RH · wind ${ctx.weather.current_wind} km/h`);
        line("Today rain probability", `${ctx.weather.today_rain_pct}%`);
        y += 2;
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text("Day", 18, y);
        doc.text("Min/Max °C", 50, y);
        doc.text("Rain %", 95, y);
        doc.text("Rain mm", 120, y);
        doc.text("Wind km/h", 150, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        ctx.weather.forecast.forEach((f) => {
          ensure(5);
          doc.text(`${f.emoji} ${f.day}`, 18, y);
          doc.text(`${f.temp_low}/${f.temp_high}`, 50, y);
          doc.text(`${f.rain_pct}%`, 95, y);
          doc.text(`${f.rain_mm}`, 120, y);
          doc.text(`${f.wind_kph}`, 150, y);
          y += 5;
        });
        doc.setFontSize(10);
      } else {
        para("Weather data unavailable. Set PIN code in profile for live forecasts.");
      }

      sec("6. AI Action Plan (next 7 days)");
      const acts: string[] = [];
      const tw = ctx?.weather?.forecast?.[0];
      if (tw) {
        if (tw.rain_pct > 60) acts.push(`Day 1: Postpone spraying — ${tw.rain_pct}% rain. Check field drainage and clear bunds.`);
        else if (tw.temp_high > 36) acts.push(`Day 1: Heat advisory ${tw.temp_high}°C. Irrigate before 9 AM. Mulch around vegetable rows.`);
        else acts.push(`Day 1: Stable weather. Good window for weeding, fertilizer top-dress, transplanting.`);
      }
      acts.push(`Day 2-3: Scout 10 random plants per acre for pest eggs / leaf damage. Log findings.`);
      if (parseFloat(d.soil_ph) < 6) acts.push(`Day 3: Spread agricultural lime 200-400 kg/acre to raise pH toward 6.5.`);
      acts.push(`Day 4: Test irrigation pump efficiency — replace worn nozzles to save 15-20% water.`);
      if (ctx?.schemes_matched?.length) acts.push(`Day 5: Apply / renew ${ctx.schemes_matched[0]} (you qualify based on profile).`);
      acts.push(`Day 6: Soil moisture check 15 cm deep — irrigate only if dry crumble at fist test.`);
      acts.push(`Day 7: Record yield observations and update KrishiMitra profile to refine next week's plan.`);
      acts.forEach((a) => para("• " + a));

      // PAGE 3 — Financial + schemes + risk
      doc.addPage(); y = 20;
      addHeader("Financial Profile, Schemes & Recommendations");
      sec("7. Financial Profile");
      line("Annual Income", d.annual_income);
      line("Monthly Investment", d.monthly_investment);
      line("Budget per Acre", d.budget_per_acre ? `₹${d.budget_per_acre}` : "");
      line("Bank Account", d.bank_account);
      line("Existing Loans", d.existing_loans);
      line("Insurance", d.insurance_status);
      line("Risk Tolerance", ctx?.risk_profile);

      sec("8. Government Schemes Matched");
      if (ctx?.schemes_matched?.length) {
        ctx.schemes_matched.forEach((s) => para("✓ " + s));
      } else {
        para("Complete more profile fields to unlock matched schemes.");
      }

      sec("9. Yield & Revenue Estimate");
      const land = parseFloat(d.total_land) || 0;
      if (land > 0 && ctx?.crops?.current?.length) {
        const baseYields: Record<string, { yield: number; price: number }> = {
          rice: { yield: 25, price: 2200 }, wheat: { yield: 18, price: 2200 },
          maize: { yield: 22, price: 1900 }, soybean: { yield: 12, price: 4400 },
          cotton: { yield: 8, price: 6500 }, mustard: { yield: 10, price: 5500 },
          potato: { yield: 80, price: 1200 }, sugarcane: { yield: 350, price: 320 },
        };
        let total = 0;
        ctx.crops.current.forEach((c) => {
          const k = c.toLowerCase();
          const b = baseYields[k] || { yield: 15, price: 2500 };
          const acres = land / ctx.crops.current.length;
          const qtl = b.yield * acres;
          const rev = qtl * b.price;
          total += rev;
          para(`${c}: ~${qtl.toFixed(0)} qtl on ${acres.toFixed(1)} ac × ₹${b.price}/qtl ≈ ₹${rev.toLocaleString("en-IN")}`);
        });
        para(`Estimated gross revenue: ₹${total.toLocaleString("en-IN")} / season (deduct 35-50% for input cost).`);
      } else {
        para("Add land size and current crops to see revenue projection.");
      }

      sec("10. Top 5 AI Recommendations");
      const recs: string[] = [];
      if ((ctx?.scores?.soil_health ?? 100) < 60) recs.push("Soil health is below 60. Add 5 t FYM/acre + green manure (dhaincha) before next sowing.");
      if ((ctx?.scores?.diversification ?? 0) < 50) recs.push("Add 1-2 more crops (pulse + vegetable) to spread weather and price risk.");
      if (!d.insurance_status?.includes("PMFBY")) recs.push("Enroll in PMFBY crop insurance — premium is just 1.5-2% of sum insured.");
      if (parseFloat(d.organic_carbon || "0") < 0.5) recs.push("Organic carbon < 0.5% — adopt zero-till or cover crops to rebuild soil life.");
      if (!d.irrigation_type?.includes("Drip") && parseFloat(d.total_land || "0") > 1) recs.push("Switch to drip / sprinkler under PMKSY — saves up to 50% water + 60% subsidy.");
      if (!recs.length) recs.push("Profile looks healthy — keep logging weekly observations to unlock yield-prediction insights.");
      recs.slice(0, 5).forEach((r, i) => para(`${i + 1}. ${r}`));

      // Footers
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) { doc.setPage(i); addFooter(i, total); }

      doc.save(`KrishiMitra_${active.full_name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("📄 Multi-page report downloaded!");
    } catch (e: any) {
      toast.error("PDF generation failed: " + e.message);
    } finally { setLoading(false); }
  };

  const sharePNG = async () => {
    if (!cardRef.current || !active) { toast.error("Pick a profile first"); return; }
    setExporting(true);
    try {
      const png = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = png;
      a.download = `KrishiMitra_Card_${active.full_name.replace(/\s+/g, "_")}.png`;
      a.click();
      toast.success("📸 Farm card downloaded — share on WhatsApp!");
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    } finally { setExporting(false); }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <Breadcrumbs />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" /> Smart Farm Reports
            </h1>
            <p className="text-muted-foreground mt-1">Generate a real PDF report or shareable PNG of your farm — perfect for bank loans, insurance claims, or social proof</p>
          </motion.div>

          {/* Shareable card preview (also captured as PNG) */}
          {active && (
            <div ref={cardRef} className="glass-card p-6 mb-5 bg-gradient-to-br from-primary/5 via-background to-krishi-gold-light/40">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">KrishiMitra · Farm Card</div>
                  <h2 className="text-xl font-display font-bold text-foreground">{active.full_name}</h2>
                  <div className="text-xs text-muted-foreground">{active.farm_location || `${active.farmer_details?.district || ""}, ${active.farmer_details?.state || "India"}`}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl">🌾</div>
                  <div className="text-[10px] text-muted-foreground">SIH 2025 · #25030</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-background/60 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">Land</div>
                  <div className="font-semibold text-foreground text-sm">{active.farmer_details?.total_land || "?"} ac</div>
                </div>
                <div className="bg-background/60 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">Soil</div>
                  <div className="font-semibold text-foreground text-sm truncate">{active.soil_type || active.farmer_details?.soil_color || "—"}</div>
                </div>
                <div className="bg-background/60 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">Health</div>
                  <div className="font-semibold text-primary text-sm">{ctx?.scores.farm_health ?? "—"}/100</div>
                </div>
                <div className="bg-background/60 rounded-lg p-2">
                  <div className="text-[10px] text-muted-foreground">Schemes</div>
                  <div className="font-semibold text-foreground text-sm">{ctx?.schemes_matched.length ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-2">Your Farm Report Includes</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 mb-5 list-disc pl-5">
              <li>Personal & farm location details</li>
              <li>Soil composition & water resources</li>
              <li>Current crops, season, and farming style</li>
              <li>Financial profile & insurance status</li>
              <li>AI-generated insights, climate zone & schemes matched</li>
              <li>Farm health score (0-100)</li>
            </ul>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={generate} disabled={loading || !active} className="w-full gradient-primary border-0 text-primary-foreground gap-2 h-12">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {loading ? "Generating..." : "Download PDF Report"}
              </Button>
              <Button onClick={sharePNG} disabled={exporting || !active} variant="outline" className="w-full gap-2 h-12">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {exporting ? "Exporting..." : "Share Card as PNG"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">💡 Pro tip: PNG is great for WhatsApp; PDF is for banks &amp; insurance.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
