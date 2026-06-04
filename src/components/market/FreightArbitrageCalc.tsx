import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useMemo, useState } from "react";
import { Calculator, Truck, TrendingUp, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePersonalization } from "@/hooks/usePersonalization";

interface MandiRow { name: string; baseDist: number }

const MANDI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mandi-prices`;

export default function FreightArbitrageCalc({ mandis, baseKm }: { mandis: MandiRow[]; baseKm: number }) {
  const { ctx } = usePersonalization();
  const defaultCrop = ctx?.crops?.current?.[0] || ctx?.crops?.suitable?.[0] || "Rice";
  const [crop, setCrop] = useState(defaultCrop);
  const [qtl, setQtl] = useState("20");
  const [pricePerQtl, setPricePerQtl] = useState("2200");
  const [freightRate, setFreightRate] = useState("8");

  // Map: lowercase mandi-key -> modal price from Agmarknet
  const [priceMap, setPriceMap] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPriceMap(null);
    (async () => {
      try {
        const r = await fetch(`${MANDI_URL}?crop=${encodeURIComponent(crop)}&limit=100`, {
          headers: { Authorization: `Bearer ${await edgeToken()}` },
        });
        const json = await r.json();
        const recs: any[] = json.records || [];
        const map: Record<string, number[]> = {};
        for (const rec of recs) {
          const market = String(rec.market || rec.Market || "").toLowerCase();
          const district = String(rec.district || rec.District || "").toLowerCase();
          const price = parseFloat(rec.modal_price || rec.Modal_Price || "0");
          if (!price) continue;
          for (const key of [market, district].filter(Boolean)) {
            (map[key] ||= []).push(price);
          }
        }
        const avg: Record<string, number> = {};
        for (const [k, arr] of Object.entries(map)) avg[k] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        if (alive) setPriceMap(avg);
      } catch {
        if (alive) setPriceMap({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [crop]);

  const rows = useMemo(() => {
    const q = parseFloat(qtl) || 0;
    const fr = parseFloat(freightRate) || 0;
    return mandis.map((m) => {
      const dist = baseKm > 0 ? Math.max(2, m.baseDist + Math.round((baseKm - 5) * 0.3)) : m.baseDist;
      const lc = m.name.toLowerCase();
      let localPrice: number | null = null;
      if (priceMap) {
        const found = Object.keys(priceMap).find((k) => lc.includes(k) || k.includes(lc.split(" ")[0]));
        if (found) localPrice = priceMap[found];
      }
      const freight = Math.round(dist * fr);
      if (localPrice == null) {
        return { mandi: m.name, dist, localPrice: null, freight, net: null as number | null, netPerQtl: null as number | null };
      }
      const netPerQtl = localPrice - freight;
      return { mandi: m.name, dist, localPrice, freight, net: netPerQtl * q, netPerQtl };
    }).sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity));
  }, [mandis, baseKm, qtl, freightRate, priceMap]);

  const valid = rows.filter((r) => r.net != null);
  const best = valid[0];
  const worst = valid[valid.length - 1];
  const gain = best && worst ? (best.net! - worst.net!) : 0;
  const maxNet = best ? Math.max(...valid.map((r) => r.netPerQtl!)) : 1;
  const minNet = worst ? Math.min(...valid.map((r) => r.netPerQtl!)) : 0;
  const range = Math.max(1, maxNet - minNet);

  return (
    <div className="glass-card p-5">
      <style>{`
        @keyframes bar-grow { from { width: 0%; } to { width: var(--bw); } }
        .bar-anim { animation: bar-grow 600ms ease-out forwards; }
      `}</style>
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" /> Freight & Profit Arbitrage Calculator
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Real Agmarknet modal prices · net ₹/quintal after transport tells you the most profitable mandi.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div><Label className="text-xs">Crop</Label><Input className="h-9" value={crop} onChange={(e) => setCrop(e.target.value)} /></div>
        <div><Label className="text-xs">Quantity (qtl)</Label><Input className="h-9" type="number" value={qtl} onChange={(e) => setQtl(e.target.value)} /></div>
        <div><Label className="text-xs">Fallback price (₹/qtl)</Label><Input className="h-9" type="number" value={pricePerQtl} onChange={(e) => setPricePerQtl(e.target.value)} /></div>
        <div><Label className="text-xs">Freight (₹/km/qtl)</Label><Input className="h-9" type="number" value={freightRate} onChange={(e) => setFreightRate(e.target.value)} /></div>
      </div>

      {loading && <div className="text-xs text-muted-foreground mb-3">Fetching live mandi prices…</div>}

      {best && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-krishi-gold/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Best net: {best.mandi} — ₹{best.net!.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-sm font-bold text-[hsl(142,70%,35%)]">
            You save ₹{gain.toLocaleString("en-IN")} vs worst option ({worst?.mandi}).
          </p>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r, i) => {
          const isBest = best && r.mandi === best.mandi && r.net != null;
          const pct = r.netPerQtl != null ? Math.max(8, ((r.netPerQtl - minNet) / range) * 92 + 8) : 0;
          return (
            <div key={r.mandi} className="flex items-center gap-3">
              <div className="w-32 sm:w-40 text-xs sm:text-sm text-foreground truncate flex-shrink-0">
                {isBest && <span className="mr-1">🏆</span>}{r.mandi}
              </div>
              <div className="flex-1 h-7 bg-muted/30 rounded-md overflow-hidden relative">
                {r.netPerQtl != null ? (
                  <div
                    className="bar-anim h-full rounded-md flex items-center justify-end pr-2"
                    style={{
                      ['--bw' as any]: `${pct}%`,
                      background: isBest ? "hsl(142,70%,40%)" : "hsl(var(--muted-foreground) / 0.45)",
                    }}
                  >
                    {isBest && (
                      <span className="text-[10px] font-bold text-white bg-black/20 px-1.5 py-0.5 rounded mr-1 flex items-center gap-0.5">
                        <Trophy className="h-3 w-3" /> Best
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center pl-2 text-xs text-muted-foreground">— no data</div>
                )}
              </div>
              <div className="w-24 text-right text-xs sm:text-sm font-mono flex-shrink-0">
                {r.netPerQtl != null ? (
                  <span className={isBest ? "text-[hsl(142,70%,35%)] font-bold" : "text-foreground"}>
                    ₹{r.netPerQtl}/qtl
                  </span>
                ) : <span className="text-muted-foreground">—</span>}
              </div>
              <div className="hidden sm:block w-16 text-right text-[11px] text-muted-foreground flex-shrink-0">
                <Truck className="h-3 w-3 inline" /> {r.dist}km
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
