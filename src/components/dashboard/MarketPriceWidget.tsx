import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Bell, BellOff, MapPin, Calendar } from "lucide-react";
import { usePersonalization } from "@/hooks/usePersonalization";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ALERT_KEY = "km.priceAlerts";
type LivePrice = {
  crop: string;
  price: string;
  modal: number | null;
  min: number | null;
  max: number | null;
  market: string;
  state: string;
  date: string;
  change: string;
  up: boolean;
  noData: boolean;
};

async function fetchCropPrice(crop: string, state?: string): Promise<LivePrice> {
  try {
    const { data: json, error } = await supabase.functions.invoke("mandi-prices", {
      body: null,
      method: "GET",
    } as any).catch(async () => {
      // Fallback to direct fetch via constructed URL
      const u = new URL(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mandi-prices`);
      u.searchParams.set("crop", crop);
      if (state) u.searchParams.set("state", state);
      const r = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      return { data: await r.json(), error: r.ok ? null : new Error(`HTTP ${r.status}`) };
    });

    // If invoke returned but we need query params, do direct fetch
    let payload: any = json;
    if (!payload || (!payload.records && !payload.error)) {
      const u = new URL(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mandi-prices`);
      u.searchParams.set("crop", crop);
      if (state) u.searchParams.set("state", state);
      const r = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      payload = await r.json();
    }
    if (error) throw error;

    const records: any[] = payload.records || [];
    if (!records.length) throw new Error("no records");

    const r = records[0];
    const modal = Number(r.modal_price) || null;
    const min = Number(r.min_price) || null;
    const max = Number(r.max_price) || null;
    const spread = modal && min ? ((modal - min) / min) * 100 : 0;
    return {
      crop,
      price: modal ? `₹${modal.toLocaleString("en-IN")}` : "--",
      modal,
      min,
      max,
      market: r.market || r.district || "—",
      state: r.state || "",
      date: r.arrival_date || r.date || "",
      change: `${spread >= 0 ? "+" : ""}${spread.toFixed(1)}%`,
      up: spread >= 0,
      noData: !modal,
    };
  } catch (e) {
    console.warn("data.gov.in fetch failed for", crop, e);
    return {
      crop,
      price: "--",
      modal: null,
      min: null,
      max: null,
      market: "No data",
      state: "",
      date: "",
      change: "—",
      up: true,
      noData: true,
    };
  }
}

export default function MarketPriceWidget() {
  const { ctx } = usePersonalization();

  const userCrops = useMemo(() => {
    const raw = (ctx?.crops.current || []).filter(Boolean);
    const norm = raw.map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
    const list = norm.length > 0 ? norm : (ctx?.crops.suitable || ["Rice", "Wheat", "Maize"]).slice(0, 4);
    return list.slice(0, 5);
  }, [ctx?.crops.current, ctx?.crops.suitable]);

  const userState = ctx?.location.state || "";

  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(userCrops.map(c => fetchCropPrice(c, userState)))
      .then(results => {
        if (!cancelled) setLivePrices(results);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userCrops, userState]);

  const toggleAlert = (crop: string) => {
    const cur = JSON.parse(localStorage.getItem(ALERT_KEY) || "{}");
    if (cur[crop]) {
      delete cur[crop];
      toast.info(`Price alert removed for ${crop}`);
    } else {
      cur[crop] = { added: Date.now(), threshold: 5 };
      toast.success(`📢 Alert set: notify if ${crop} moves >5%`);
    }
    localStorage.setItem(ALERT_KEY, JSON.stringify(cur));
  };

  const alerts = JSON.parse(localStorage.getItem(ALERT_KEY) || "{}");

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-foreground">Market Prices</h3>
        <span className="krishi-badge bg-primary/10 text-primary animate-pulse-slow">
          {loading ? "Loading…" : "Live · data.gov.in"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Real mandi prices for {userState || "your region"} · modal price (₹/quintal)
      </p>

      <div className="space-y-2">
        {loading && userCrops.map((c) => (
          <div key={c} className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        ))}

        {!loading && livePrices.map((p) => (
          <div key={p.crop} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-foreground capitalize">{p.crop}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{p.market}{p.state ? `, ${p.state}` : ""}</span>
                </div>
                {p.date && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="h-2.5 w-2.5" /> {p.date}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className={`font-semibold text-sm ${p.noData ? "text-muted-foreground" : "text-foreground"}`}>
                    {p.price}{!p.noData && "/qtl"}
                  </div>
                  {p.noData ? (
                    <div className="text-xs text-muted-foreground">No data</div>
                  ) : (
                    <div className={`text-xs flex items-center gap-0.5 justify-end ${p.up ? "text-primary" : "text-destructive"}`}>
                      {p.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {p.change}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleAlert(p.crop)}
                  title={alerts[p.crop] ? "Remove alert" : "Set price alert"}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  {alerts[p.crop]
                    ? <Bell className="h-4 w-4 text-krishi-gold fill-krishi-gold" />
                    : <BellOff className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            {!p.noData && p.min && p.max && (
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                Range: ₹{p.min.toLocaleString("en-IN")} – ₹{p.max.toLocaleString("en-IN")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
