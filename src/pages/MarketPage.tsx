import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketPriceWidget from "@/components/dashboard/MarketPriceWidget";
import MultiMandiCompare from "@/components/market/MultiMandiCompare";
import PriceSparkline from "@/components/market/PriceSparkline";
import FreightArbitrageCalc from "@/components/market/FreightArbitrageCalc";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { MapPin, Navigation, Truck, TrendingUp, Bell, RefreshCw, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useTranslation } from "react-i18next";

const MANDI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mandi-prices`;
const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

const STATE_MANDIS: Record<string, { name: string; baseDist: number }[]> = {
  "Punjab": [{ name: "Karnal APMC", baseDist: 8 }, { name: "Ludhiana Mandi", baseDist: 22 }, { name: "Amritsar Mandi", baseDist: 55 }],
  "Haryana": [{ name: "Karnal APMC", baseDist: 5 }, { name: "Hisar Mandi", baseDist: 30 }, { name: "Sirsa APMC", baseDist: 60 }],
  "Uttar Pradesh": [{ name: "Lucknow Mandi", baseDist: 12 }, { name: "Kanpur APMC", baseDist: 45 }, { name: "Varanasi Mandi", baseDist: 80 }],
  "Bihar": [{ name: "Patna Mandi", baseDist: 10 }, { name: "Gaya APMC", baseDist: 50 }, { name: "Muzaffarpur Mandi", baseDist: 65 }],
  "West Bengal": [{ name: "Kolkata Mandi", baseDist: 15 }, { name: "Burdwan APMC", baseDist: 60 }, { name: "Siliguri Mandi", baseDist: 110 }],
  "Maharashtra": [{ name: "Pune APMC", baseDist: 12 }, { name: "Nashik Mandi", baseDist: 45 }, { name: "Nagpur APMC", baseDist: 90 }],
  "Gujarat": [{ name: "Ahmedabad APMC", baseDist: 10 }, { name: "Rajkot Mandi", baseDist: 60 }, { name: "Surat Mandi", baseDist: 80 }],
  "Rajasthan": [{ name: "Jaipur Mandi", baseDist: 18 }, { name: "Jodhpur APMC", baseDist: 70 }, { name: "Kota Mandi", baseDist: 100 }],
  "Madhya Pradesh": [{ name: "Indore APMC", baseDist: 15 }, { name: "Bhopal Mandi", baseDist: 55 }, { name: "Ujjain Mandi", baseDist: 80 }],
  "Karnataka": [{ name: "Bengaluru APMC", baseDist: 10 }, { name: "Hubli Mandi", baseDist: 80 }, { name: "Mysuru Mandi", baseDist: 50 }],
  "Tamil Nadu": [{ name: "Chennai Koyambedu", baseDist: 15 }, { name: "Coimbatore Mandi", baseDist: 70 }, { name: "Madurai Mandi", baseDist: 100 }],
  "Telangana": [{ name: "Hyderabad Bowenpally", baseDist: 12 }, { name: "Warangal APMC", baseDist: 60 }, { name: "Karimnagar Mandi", baseDist: 90 }],
  "Andhra Pradesh": [{ name: "Vijayawada Mandi", baseDist: 12 }, { name: "Guntur Mirchi Yard", baseDist: 35 }, { name: "Visakhapatnam Mandi", baseDist: 80 }],
  "Jharkhand": [{ name: "Ranchi Mandi", baseDist: 5 }, { name: "Jamshedpur Market", baseDist: 45 }, { name: "Dhanbad APMC", baseDist: 68 }, { name: "Bokaro Mandi", baseDist: 52 }],
  "Odisha": [{ name: "Bhubaneswar Mandi", baseDist: 18 }, { name: "Cuttack APMC", baseDist: 35 }, { name: "Sambalpur Mandi", baseDist: 90 }],
  "Himachal Pradesh": [{ name: "Solan Sabzi Mandi", baseDist: 10 }, { name: "Shimla APMC (Dhalli)", baseDist: 18 }, { name: "Parala Apple Mandi (Theog)", baseDist: 30 }, { name: "Bhuntar Mandi (Kullu)", baseDist: 75 }, { name: "Mandi APMC", baseDist: 90 }],
  "Uttarakhand": [{ name: "Dehradun Mandi", baseDist: 12 }, { name: "Haridwar APMC", baseDist: 35 }, { name: "Haldwani Mandi", baseDist: 70 }],
  "Kerala": [{ name: "Ernakulam Market", baseDist: 14 }, { name: "Thiruvananthapuram Mandi", baseDist: 60 }, { name: "Kozhikode Mandi", baseDist: 85 }],
  "Chhattisgarh": [{ name: "Raipur APMC", baseDist: 10 }, { name: "Bilaspur Mandi", baseDist: 60 }, { name: "Durg Mandi", baseDist: 35 }],
  "Assam": [{ name: "Guwahati Mandi", baseDist: 10 }, { name: "Jorhat APMC", baseDist: 70 }, { name: "Tezpur Mandi", baseDist: 50 }],
  "Goa": [{ name: "Mapusa Market", baseDist: 8 }, { name: "Margao Mandi", baseDist: 30 }],
  "Tripura": [{ name: "Agartala Mandi", baseDist: 10 }, { name: "Udaipur Market", baseDist: 50 }],
  "Manipur": [{ name: "Imphal Khwairamband", baseDist: 8 }, { name: "Bishnupur Mandi", baseDist: 30 }],
  "Meghalaya": [{ name: "Iewduh Bara Bazar (Shillong)", baseDist: 10 }, { name: "Tura Mandi", baseDist: 80 }],
  "Nagaland": [{ name: "Kohima Bazar", baseDist: 10 }, { name: "Dimapur Mandi", baseDist: 70 }],
  "Mizoram": [{ name: "Bara Bazar (Aizawl)", baseDist: 8 }],
  "Arunachal Pradesh": [{ name: "Itanagar Mandi", baseDist: 12 }, { name: "Naharlagun Market", baseDist: 20 }],
  "Sikkim": [{ name: "Gangtok Lal Bazar", baseDist: 10 }, { name: "Singtam Mandi", baseDist: 30 }],
  "Jammu and Kashmir": [{ name: "Narwal Mandi (Jammu)", baseDist: 12 }, { name: "Parimpora Mandi (Srinagar)", baseDist: 80 }],
  "Ladakh": [{ name: "Leh Vegetable Market", baseDist: 8 }],
};

/* ---------- Color scale: gold (low) -> green (high) ---------- */
function priceColor(idx: number | null) {
  // Always return a clearly visible color — no transparent muted no-data fills
  if (idx == null) return "hsl(35, 25%, 78%)"; // warm sand neutral, clearly visible on white & dark
  const t = Math.max(0, Math.min(100, idx)) / 100;
  // interpolate hue 38(gold) -> 142(green), sat 90->75, light 52->32 (slightly darker for contrast)
  const h = 38 + (142 - 38) * t;
  const s = 90 + (75 - 90) * t;
  const l = 52 + (32 - 52) * t;
  return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
}

/* ---------- Simplified India state polygons for 600x560 viewBox ---------- */
const STATE_PATHS: Record<string, string> = {
  "Jammu and Kashmir": "M 178 22 L 248 18 L 268 30 L 282 52 L 265 68 L 238 72 L 212 80 L 192 65 L 175 48 Z",
  "Himachal Pradesh": "M 212 80 L 258 72 L 278 88 L 268 112 L 238 118 L 215 105 Z",
  "Punjab": "M 192 100 L 218 95 L 238 118 L 225 138 L 200 140 L 185 122 Z",
  "Haryana": "M 218 118 L 252 115 L 268 112 L 272 148 L 248 158 L 225 150 L 218 135 Z",
  "Uttarakhand": "M 268 112 L 310 108 L 325 130 L 305 148 L 278 150 L 268 135 Z",
  "Delhi": "M 245 152 L 260 150 L 262 165 L 248 168 Z",
  "Uttar Pradesh": "M 248 158 L 380 150 L 402 175 L 390 215 L 330 228 L 270 220 L 248 195 Z",
  "Rajasthan": "M 118 138 L 195 130 L 225 150 L 248 195 L 230 260 L 185 288 L 130 270 L 100 225 L 105 178 Z",
  "Bihar": "M 390 175 L 448 172 L 460 198 L 445 222 L 398 225 L 385 205 Z",
  "Sikkim": "M 448 152 L 462 148 L 468 162 L 456 168 Z",
  "West Bengal": "M 448 172 L 475 168 L 490 185 L 485 230 L 468 260 L 448 255 L 440 230 L 445 205 Z",
  "Jharkhand": "M 398 225 L 448 222 L 462 245 L 448 268 L 415 272 L 395 252 Z",
  "Odisha": "M 415 272 L 460 265 L 478 285 L 472 325 L 442 342 L 410 330 L 398 305 L 400 280 Z",
  "Madhya Pradesh": "M 175 258 L 330 245 L 355 268 L 358 308 L 318 325 L 220 330 L 175 310 L 162 280 Z",
  "Chhattisgarh": "M 330 255 L 395 252 L 408 280 L 400 328 L 368 348 L 338 338 L 322 308 Z",
  "Gujarat": "M 68 252 L 128 242 L 162 268 L 170 318 L 145 352 L 95 358 L 60 330 L 52 295 Z",
  "Daman and Diu": "M 130 348 L 140 345 L 142 355 L 132 358 Z",
  "Maharashtra": "M 138 325 L 250 315 L 320 320 L 342 352 L 330 395 L 278 415 L 195 412 L 145 385 L 132 355 Z",
  "Telangana": "M 280 388 L 350 378 L 370 400 L 365 440 L 330 455 L 292 448 L 272 425 Z",
  "Andhra Pradesh": "M 295 415 L 370 408 L 398 428 L 402 478 L 372 498 L 330 505 L 295 488 L 278 460 L 282 432 Z",
  "Karnataka": "M 175 415 L 280 408 L 295 435 L 288 488 L 252 508 L 205 510 L 168 488 L 162 455 L 168 428 Z",
  "Goa": "M 158 448 L 178 445 L 182 462 L 165 468 Z",
  "Kerala": "M 195 492 L 235 485 L 248 510 L 240 538 L 215 548 L 195 532 L 188 512 Z",
  "Tamil Nadu": "M 262 492 L 325 498 L 340 525 L 322 548 L 288 555 L 258 538 L 248 515 Z",
};

/* ---------- India price map ---------- */
function IndiaPriceMap({ farmerCrop, farmerState }: { farmerCrop: string; farmerState: string }) {
  const [byState, setByState] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=579b464db66ec23bdd000001cdd3084b34264d06e3aa6bece006ccee&format=json&filters%5Bcommodity%5D=${encodeURIComponent(farmerCrop)}&limit=100`;
        const r = await fetch(url);
        const json = await r.json();
        const recs: any[] = json.records || [];
        const grouped: Record<string, number[]> = {};
        for (const rec of recs) {
          const st = String(rec.state || rec.State || "").trim().toLowerCase();
          const p = parseFloat(rec.modal_price || rec.Modal_Price || "0");
          if (!st || !p) continue;
          (grouped[st] ||= []).push(p);
        }
        const avg: Record<string, number> = {};
        Object.entries(grouped).forEach(([k, arr]) => { avg[k] = arr.reduce((a, b) => a + b, 0) / arr.length; });
        const vals = Object.values(avg);
        const min = Math.min(...vals), max = Math.max(...vals);
        const idx: Record<string, number> = {};
        Object.entries(avg).forEach(([k, v]) => { idx[k] = max === min ? 50 : Math.round(((v - min) / (max - min)) * 100); });
        if (alive) setByState(idx);
      } catch {
        if (alive) setByState({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [farmerCrop]);

  return (
    <div className="glass-card p-5">
      <style>{`
        @keyframes state-pulse { 0%,100% { stroke-opacity:1; stroke-width:2.5; } 50% { stroke-opacity:0.4; stroke-width:4; } }
        @keyframes shimmer-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        .state-shimmer { animation: shimmer-pulse 1.4s ease-in-out infinite; }
        .farmer-ring { stroke: white; animation: state-pulse 1.8s ease-in-out infinite; }
      `}</style>
      <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" /> India Price Heatmap · {farmerCrop}
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        Live state-wise modal prices from Agmarknet. Greener = better price for your crop.
      </p>

      <div className="relative w-full rounded-xl overflow-hidden border border-border/40" style={{ aspectRatio: "600/560", background: "linear-gradient(180deg, hsl(210 30% 96%) 0%, hsl(210 25% 90%) 100%)" }}>
        <svg viewBox="0 0 600 560" className="w-full h-full" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}>
          {Object.entries(STATE_PATHS).map(([st, d]) => {
            const idx = byState?.[st.toLowerCase()] ?? null;
            const isFarmer = st === farmerState;
            return (
              <g key={st}>
                <path
                  d={d}
                  fill={loading ? "hsl(35, 20%, 75%)" : priceColor(idx)}
                  stroke={isFarmer ? "hsl(0 0% 100%)" : "hsl(220 15% 25%)"}
                  strokeWidth={isFarmer ? 3 : 1.2}
                  strokeLinejoin="round"
                  className={`${loading ? "state-shimmer" : ""} ${isFarmer ? "farmer-ring" : ""} transition-opacity hover:opacity-80 cursor-pointer`}
                >
                  <title>{st}{idx != null ? ` · Price Index ${idx}/100` : " · no data"}</title>
                </path>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3">
        <div className="text-[11px] text-muted-foreground mb-1">Price Index: Low → High</div>
        <div className="h-2.5 rounded-full" style={{
          background: "linear-gradient(90deg, hsl(38,85%,55%) 0%, hsl(90,77%,45%) 50%, hsl(142,70%,35%) 100%)",
        }} />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>0</span><span>50</span><span>100</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Price Alerts ---------- */
type Alert = { id: string; crop: string; target: number; direction: "above" | "below"; createdAt: number; triggered: boolean };
const ALERT_KEY = "km.alerts";
const cropEmoji = (c: string) => {
  const k = c.toLowerCase();
  if (k.includes("rice") || k.includes("paddy")) return "🌾";
  if (k.includes("wheat")) return "🌾";
  if (k.includes("maize") || k.includes("corn")) return "🌽";
  if (k.includes("cotton")) return "🧶";
  if (k.includes("soy")) return "🫘";
  if (k.includes("mustard")) return "🌻";
  if (k.includes("onion")) return "🧅";
  if (k.includes("potato")) return "🥔";
  if (k.includes("tomato")) return "🍅";
  return "🌱";
};

function PriceAlertPanel({ farmerCrops }: { farmerCrops: string[] }) {
  const cropOptions = Array.from(new Set([...farmerCrops, "Rice", "Wheat", "Maize", "Cotton", "Soybean"])).filter(Boolean);
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    try { return JSON.parse(localStorage.getItem(ALERT_KEY) || "[]"); } catch { return []; }
  });
  const [crop, setCrop] = useState(cropOptions[0] || "Rice");
  const [target, setTarget] = useState("2500");
  const [direction, setDirection] = useState<"above" | "below">("above");

  const persist = (next: Alert[]) => {
    setAlerts(next);
    localStorage.setItem(ALERT_KEY, JSON.stringify(next));
  };

  // Re-check alerts on mount
  useEffect(() => {
    if (!alerts.length) return;
    const cropsToCheck = Array.from(new Set(alerts.map((a) => a.crop)));
    (async () => {
      const prices: Record<string, number> = {};
      await Promise.all(cropsToCheck.map(async (c) => {
        try {
          const r = await fetch(`${MANDI_URL}?crop=${encodeURIComponent(c)}&limit=20`, {
            headers: { Authorization: `Bearer ${await edgeToken()}` },
          });
          const json = await r.json();
          const recs: any[] = json.records || [];
          const arr = recs.map((rec) => parseFloat(rec.modal_price || rec.Modal_Price || "0")).filter((p) => p > 0);
          if (arr.length) prices[c] = arr.reduce((a, b) => a + b, 0) / arr.length;
        } catch {}
      }));
      let changed = false;
      const next = alerts.map((a) => {
        const p = prices[a.crop];
        if (p == null) return a;
        const hit = a.direction === "above" ? p >= a.target : p <= a.target;
        if (hit && !a.triggered) {
          changed = true;
          toast.success(`🔔 ${a.crop} ${a.direction === "above" ? "crossed" : "dropped below"} ₹${a.target}!`);
          return { ...a, triggered: true };
        }
        if (!hit && a.triggered) {
          changed = true;
          return { ...a, triggered: false };
        }
        return a;
      });
      if (changed) persist(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addAlert = () => {
    const t = parseFloat(target);
    if (!crop || !t) { toast.error("Enter a valid crop and target price"); return; }
    const a: Alert = { id: crypto.randomUUID(), crop, target: t, direction, createdAt: Date.now(), triggered: false };
    persist([a, ...alerts]);
    toast.success(`Alert set for ${crop} ${direction === "above" ? "≥" : "≤"} ₹${t}`);
  };

  const removeAlert = (id: string) => persist(alerts.filter((a) => a.id !== id));

  return (
    <div className="glass-card p-5">
      <style>{`@keyframes alert-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.04);} } .alert-pulse{animation:alert-pulse 1.4s ease-in-out infinite;}`}</style>
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        <Bell className="h-5 w-5 text-krishi-gold" /> Price Alerts
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 items-end">
        <div>
          <Label className="text-xs">Crop</Label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={crop} onChange={(e) => setCrop(e.target.value)}>
            {cropOptions.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Target (₹/qtl)</Label>
          <Input className="h-9" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Direction</Label>
          <div className="flex gap-2">
            <Button size="sm" variant={direction === "above" ? "default" : "outline"} className="flex-1" onClick={() => setDirection("above")}>
              <ArrowUp className="h-3 w-3 mr-1" /> Rises above
            </Button>
            <Button size="sm" variant={direction === "below" ? "default" : "outline"} className="flex-1" onClick={() => setDirection("below")}>
              <ArrowDown className="h-3 w-3 mr-1" /> Falls below
            </Button>
          </div>
        </div>
      </div>
      <Button onClick={addAlert} className="mb-4"><Bell className="h-4 w-4 mr-1" /> Set Alert</Button>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path d="M30 10 C22 10 18 16 18 24 V32 L14 38 H46 L42 32 V24 C42 16 38 10 30 10 Z" fill="hsl(var(--muted))" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
            <circle cx="30" cy="44" r="4" fill="hsl(var(--muted-foreground))" />
            <text x="44" y="18" fontSize="9" fill="hsl(var(--muted-foreground))">z</text>
            <text x="48" y="14" fontSize="7" fill="hsl(var(--muted-foreground))">z</text>
          </svg>
          <p className="text-sm mt-2">No alerts yet — set a target price to get notified.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
              <div className="text-2xl">{cropEmoji(a.crop)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{a.crop}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {a.direction === "above" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  ₹{a.target.toLocaleString("en-IN")}/qtl
                </div>
                <div className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full ${a.triggered ? "bg-green-500/20 text-green-700 dark:text-green-400 alert-pulse" : "bg-muted text-muted-foreground"}`}>
                  {a.triggered ? "🔔 Triggered!" : "Watching 👁"}
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => removeAlert(a.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Today's AI Market Briefing ---------- */
type Briefing = { text: string; action: "SELL" | "WAIT" | "HOLD"; price: number; generatedAt: number };

function TodayMarketBriefing({ farmerCrop, farmerState }: { farmerCrop: string; farmerState: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `km.briefing.${today}.${farmerCrop}.${farmerState}`;
  const [briefing, setBriefing] = useState<Briefing | null>(() => {
    try { const raw = localStorage.getItem(cacheKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      // Fetch latest price
      const r = await fetch(`${MANDI_URL}?crop=${encodeURIComponent(farmerCrop)}&state=${encodeURIComponent(farmerState)}&limit=5`, {
        headers: { Authorization: `Bearer ${await edgeToken()}` },
      });
      const json = await r.json();
      const recs: any[] = json.records || [];
      const arr = recs.map((rec) => parseFloat(rec.modal_price || rec.Modal_Price || "0")).filter((p) => p > 0);
      if (!arr.length) throw new Error("No price data");
      const price = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

      const userMsg = `You are a mandi price analyst for Indian farmers. The farmer grows ${farmerCrop} in ${farmerState}. Today's modal price is ₹${price}/qtl. Give a 3-sentence sell/hold/wait recommendation. Be direct, mention the price trend direction and one seasonal factor relevant to this month. End your response with exactly one of these words on its own line: SELL or WAIT or HOLD.`;

      const aiResp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await edgeToken()}` },
        body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: userMsg }] }),
      });
      if (!aiResp.ok || !aiResp.body) throw new Error("AI failed");

      const reader = aiResp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        const lines = textBuffer.split("\n");
        textBuffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) full += delta;
          } catch {}
        }
      }

      const cleaned = full.trim();
      const lastWord = cleaned.split(/\s+/).slice(-1)[0]?.toUpperCase().replace(/[^A-Z]/g, "") || "";
      const action: Briefing["action"] = lastWord === "SELL" || lastWord === "WAIT" || lastWord === "HOLD" ? (lastWord as any) : "WAIT";
      // strip trailing action word from body
      const body = cleaned.replace(/\n?\s*(SELL|WAIT|HOLD)\s*$/i, "").trim();

      const b: Briefing = { text: body, action, price, generatedAt: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(b));
      setBriefing(b);
    } catch (e: any) {
      toast.error(e?.message || "Could not generate briefing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!briefing && farmerCrop && farmerState) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerCrop, farmerState]);

  const refresh = () => { localStorage.removeItem(cacheKey); setBriefing(null); generate(); };

  const meta = useMemo(() => {
    if (!briefing) return null;
    const map = {
      SELL: { color: "hsl(142, 70%, 40%)", icon: "📈" },
      WAIT: { color: "hsl(38, 90%, 55%)", icon: "⏳" },
      HOLD: { color: "hsl(0, 75%, 55%)", icon: "🛑" },
    } as const;
    return map[briefing.action];
  }, [briefing]);

  return (
    <div className="glass-card p-5 mb-5 relative overflow-hidden"
      style={{ borderLeft: meta ? `4px solid ${meta.color}` : "4px solid hsl(var(--muted))" }}>
      <style>{`@keyframes brief-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.08);} } .brief-icon{animation:brief-pulse 2s ease-in-out infinite;display:inline-block;}`}</style>
      <div className="flex items-start gap-4">
        {meta && <div className="text-4xl brief-icon flex-shrink-0">{meta.icon}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              Today's Market Briefing
              {briefing && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${meta?.color}20`, color: meta?.color }}>
                  {briefing.action}
                </span>
              )}
            </h3>
            <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Refresh</span>
            </Button>
          </div>
          {loading && !briefing && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing today's prices for {farmerCrop}…
            </div>
          )}
          {briefing && (
            <>
              <p className="text-base leading-relaxed text-foreground whitespace-pre-line">{briefing.text}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {farmerCrop} · ₹{briefing.price}/qtl · Generated today at {new Date(briefing.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </>
          )}
          {!briefing && !loading && (
            <p className="text-sm text-muted-foreground">No briefing available. <button onClick={refresh} className="text-primary underline">Generate now</button></p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */
export default function MarketPage() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const { t } = useTranslation();
  const state = ctx?.location.state || active?.farmer_details?.state || "";
  const baseKm = parseFloat(active?.farmer_details?.nearest_mandi_km || "0") || 0;
  const district = ctx?.location.district || active?.farmer_details?.district || "";
  const farmerCrops = ctx?.crops?.current || [];
  const primaryCrop = farmerCrops[0] || ctx?.crops?.suitable?.[0] || "Rice";
  const mandis = STATE_MANDIS[state] || [
    { name: district ? `${district} APMC` : "Local APMC", baseDist: Math.max(5, baseKm) },
    { name: state ? `${state} Wholesale Mandi` : "Regional Mandi", baseDist: Math.max(15, baseKm + 20) },
  ];

  return (
    <AgriPageBackground variant="market">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">📈 {t("market.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("market.subtitle")} · <span className="font-medium text-primary">{state || "India"}</span>
            </p>
          </motion.div>

          <TodayMarketBriefing farmerCrop={primaryCrop} farmerState={state || "India"} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <MarketPriceWidget />
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-krishi-gold" /> Nearest Mandis · {state}
              </h3>
              <div className="space-y-3">
                {mandis.map((m) => {
                  const dist = baseKm > 0 ? Math.max(2, m.baseDist + Math.round((baseKm - 5) * 0.3)) : m.baseDist;
                  const freight = Math.round(dist * 8);
                  return (
                    <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toast.success(`Opening directions to ${m.name}...`)}>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{m.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Truck className="h-3 w-3" /> Est. freight ₹{freight}/quintal
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3 flex-shrink-0">
                        <span className="krishi-badge bg-primary/10 text-primary text-xs">Open</span>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-3 w-3" />{dist} km
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <IndiaPriceMap farmerCrop={primaryCrop} farmerState={state} />
          </div>

          <div className="glass-card p-5 mb-5">
            <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> 7-Day Price Trends · Best Day to Sell
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {["Wheat", "Rice", "Maize", "Soybean", "Cotton", "Mustard"].map((c, i) => (
                <div key={c} className="rounded-xl bg-muted/30 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground text-sm">{c}</div>
                    <div className="text-xs text-muted-foreground">Live Agmarknet</div>
                  </div>
                  <PriceSparkline crop={c} base={2000 + i * 350} />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <PriceAlertPanel farmerCrops={farmerCrops} />
          </div>

          <div className="mb-5">
            <FreightArbitrageCalc mandis={mandis} baseKm={baseKm} />
          </div>

          <MultiMandiCompare />
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
