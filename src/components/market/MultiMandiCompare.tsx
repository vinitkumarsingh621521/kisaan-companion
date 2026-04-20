import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, MapPin, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ALL_CROPS = ["Rice", "Wheat", "Maize", "Soybean", "Cotton", "Sugarcane", "Mustard", "Groundnut", "Bajra", "Pulses", "Onion", "Potato", "Tomato"];

const STATE_MANDIS: Record<string, string[]> = {
  "Punjab": ["Karnal APMC", "Ludhiana Mandi", "Amritsar Mandi", "Patiala APMC"],
  "Haryana": ["Karnal APMC", "Hisar Mandi", "Sirsa APMC", "Panipat Mandi"],
  "Uttar Pradesh": ["Lucknow Mandi", "Kanpur APMC", "Varanasi Mandi", "Meerut APMC"],
  "Bihar": ["Patna Mandi", "Gaya APMC", "Muzaffarpur Mandi"],
  "West Bengal": ["Kolkata Mandi", "Burdwan APMC", "Siliguri Mandi"],
  "Maharashtra": ["Pune APMC", "Nashik Mandi", "Nagpur APMC", "Aurangabad Mandi"],
  "Gujarat": ["Ahmedabad APMC", "Rajkot Mandi", "Surat APMC"],
  "Rajasthan": ["Jaipur Mandi", "Jodhpur APMC", "Kota Mandi"],
  "Madhya Pradesh": ["Indore APMC", "Bhopal Mandi", "Gwalior APMC"],
  "Karnataka": ["Bengaluru APMC", "Hubli Mandi", "Mysuru APMC"],
  "Tamil Nadu": ["Chennai Koyambedu", "Coimbatore Mandi", "Madurai APMC"],
  "Andhra Pradesh": ["Vijayawada Mandi", "Guntur APMC", "Kurnool Mandi"],
  "Telangana": ["Hyderabad Bowenpally", "Warangal APMC", "Nizamabad Mandi"],
  "Kerala": ["Kochi Mandi", "Thiruvananthapuram Market"],
  "Odisha": ["Bhubaneswar Mandi", "Cuttack APMC"],
  "Jharkhand": ["Ranchi Mandi", "Jamshedpur Market", "Dhanbad APMC", "Bokaro Mandi"],
  "Chhattisgarh": ["Raipur Mandi", "Bilaspur APMC"],
  "Assam": ["Guwahati Mandi", "Dibrugarh APMC"],
};

interface Row { crop: string; mandi: string; price: number; trend: "up" | "down" | "flat"; change_pct: number }

export default function MultiMandiCompare() {
  const { ctx } = usePersonalization();
  const state = ctx?.location.state || "";
  const district = ctx?.location.district && ctx.location.district !== "your district" ? ctx.location.district : "";

  // Build mandis: nearest (district-derived) first, then state mandis, then nearby states as fallback
  const stateMandis = state && STATE_MANDIS[state] ? STATE_MANDIS[state] : [];
  const districtMandi = district ? `${district} Mandi` : "";
  const nearbyMandis = !state
    ? Object.values(STATE_MANDIS).flat().slice(0, 6)
    : [];
  const allMandis = Array.from(new Set([
    ...(districtMandi ? [districtMandi] : []),
    ...stateMandis,
    ...nearbyMandis,
  ]));
  const stateLabel = state || "your region";

  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [selectedMandis, setSelectedMandis] = useState<string[]>(allMandis.slice(0, 3));
  const [rows, setRows] = useState<Row[]>([]);
  const [bestDeal, setBestDeal] = useState<{ crop: string; mandi: string; reason: string } | null>(null);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ctx?.crops.current && ctx.crops.current.length > 0) {
      const matched = ctx.crops.current
        .map(c => ALL_CROPS.find(a => a.toLowerCase() === c.toLowerCase()) || c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
        .filter(c => ALL_CROPS.includes(c));
      if (matched.length > 0) setSelectedCrops(matched.slice(0, 4));
      else setSelectedCrops(["Rice", "Wheat"]);
    } else {
      setSelectedCrops(["Rice", "Wheat"]);
    }
    setSelectedMandis(allMandis.slice(0, 3));
  }, [ctx?.location.state, ctx?.location.district, ctx?.crops.current]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  const fetchCompare = async () => {
    if (selectedCrops.length === 0 || selectedMandis.length === 0) {
      toast.error("Pick at least one crop and one mandi");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ crops: selectedCrops, mandis: selectedMandis, state }),
      });
      if (!resp.ok) throw new Error("Compare failed");
      const data = await resp.json();
      setRows(data.rows || []);
      setBestDeal(data.best_deal || null);
      setAdvice(data.advice || "");
    } catch (e: any) {
      toast.error(e.message || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = selectedMandis.map(mandi => {
    const row: any = { mandi: mandi.replace(/Mandi|APMC|Market/g, "").trim() };
    selectedCrops.forEach(crop => {
      const r = rows.find(x => x.crop === crop && x.mandi === mandi);
      row[crop] = r?.price || 0;
    });
    return row;
  });

  const colors = ["hsl(142, 55%, 35%)", "hsl(38, 85%, 55%)", "hsl(200, 75%, 55%)", "hsl(0, 84%, 60%)", "hsl(280, 60%, 55%)"];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Multi-Mandi Compare
        </h3>
        <span className="krishi-badge bg-primary/10 text-primary text-[10px]">
          <MapPin className="h-3 w-3" /> {district ? `${district}, ${stateLabel}` : stateLabel}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">Crops {ctx?.crops.current.length ? "(your crops auto-pinned)" : ""}</div>
          <div className="flex gap-1.5 flex-wrap">
            {ALL_CROPS.map(c => (
              <button
                key={c}
                onClick={() => toggle(selectedCrops, setSelectedCrops, c)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  selectedCrops.includes(c) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >{c}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">
            Mandis near {stateLabel} {districtMandi && <span className="text-primary">• nearest first</span>}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {allMandis.map(m => (
              <button
                key={m}
                onClick={() => toggle(selectedMandis, setSelectedMandis, m)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  selectedMandis.includes(m) ? "bg-krishi-gold text-foreground border-krishi-gold" : "border-border text-muted-foreground hover:border-krishi-gold/40"
                }`}
              >{m}</button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={fetchCompare} disabled={loading} className="w-full gradient-primary border-0 text-primary-foreground mb-4">
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Comparing…</> : <>Compare Prices</>}
      </Button>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {bestDeal && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-krishi-gold/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-krishi-gold" />
                <span className="text-sm font-semibold text-foreground">Best deal: {bestDeal.crop} @ {bestDeal.mandi}</span>
              </div>
              <p className="text-xs text-muted-foreground">{bestDeal.reason}</p>
              {advice && <p className="text-xs text-primary mt-1.5 font-medium">💡 {advice}</p>}
            </div>
          )}

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mandi" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `₹${v}/qtl`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selectedCrops.map((c, i) => <Bar key={c} dataKey={c} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground">
                  <th className="text-left p-2">Crop</th>
                  <th className="text-left p-2">Mandi</th>
                  <th className="text-right p-2">Price (₹/qtl)</th>
                  <th className="text-right p-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-2 font-medium text-foreground">{r.crop}</td>
                    <td className="p-2 text-muted-foreground">{r.mandi}</td>
                    <td className="p-2 text-right font-mono text-foreground">₹{r.price.toLocaleString()}</td>
                    <td className={`p-2 text-right font-mono ${r.trend === "up" ? "text-primary" : r.trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                      <span className="inline-flex items-center gap-0.5">
                        {r.trend === "up" ? <TrendingUp className="h-3 w-3" /> : r.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {r.change_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground italic">
          Hit "Compare Prices" to see live mandi rates 📈
        </div>
      )}
    </div>
  );
}
