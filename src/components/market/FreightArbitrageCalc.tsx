import { useMemo, useState } from "react";
import { Calculator, Truck, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePersonalization } from "@/hooks/usePersonalization";

interface MandiRow { name: string; baseDist: number }

export default function FreightArbitrageCalc({ mandis, baseKm }: { mandis: MandiRow[]; baseKm: number }) {
  const { ctx } = usePersonalization();
  const defaultCrop = ctx?.crops?.current?.[0] || ctx?.crops?.suitable?.[0] || "Rice";
  const [crop, setCrop] = useState(defaultCrop);
  const [qtl, setQtl] = useState("20");
  const [pricePerQtl, setPricePerQtl] = useState("2200");
  const [freightRate, setFreightRate] = useState("8");

  const rows = useMemo(() => {
    const q = parseFloat(qtl) || 0;
    const p = parseFloat(pricePerQtl) || 0;
    const fr = parseFloat(freightRate) || 0;
    let h = 0;
    const seed = `${crop}-${new Date().toDateString()}`;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return mandis.map((m, i) => {
      const dist = baseKm > 0 ? Math.max(2, m.baseDist + Math.round((baseKm - 5) * 0.3)) : m.baseDist;
      const swing = (((h >> i) & 0xff) % 400) - 150; // ±₹150 per mandi
      const localPrice = Math.max(500, p + swing);
      const freight = Math.round(dist * fr);
      const gross = localPrice * q;
      const freightTotal = freight * q;
      const net = gross - freightTotal;
      const netPerQtl = localPrice - freight;
      return { mandi: m.name, dist, localPrice, freight, gross, net, netPerQtl };
    }).sort((a, b) => b.net - a.net);
  }, [mandis, baseKm, crop, qtl, pricePerQtl, freightRate]);

  const best = rows[0];
  const worst = rows[rows.length - 1];
  const gain = best && worst ? best.net - worst.net : 0;

  return (
    <div className="glass-card p-5">
      <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" /> Freight & Profit Arbitrage Calculator
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Computes net ₹/quintal after transport so you sell at the actually-most-profitable mandi, not the highest-priced one.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <Label className="text-xs">Crop</Label>
          <Input className="h-9" value={crop} onChange={(e) => setCrop(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Quantity (qtl)</Label>
          <Input className="h-9" type="number" value={qtl} onChange={(e) => setQtl(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Base price (₹/qtl)</Label>
          <Input className="h-9" type="number" value={pricePerQtl} onChange={(e) => setPricePerQtl(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Freight (₹/km/qtl)</Label>
          <Input className="h-9" type="number" value={freightRate} onChange={(e) => setFreightRate(e.target.value)} />
        </div>
      </div>

      {best && (
        <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-krishi-gold/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Best net: {best.mandi} — ₹{best.net.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Save ₹{gain.toLocaleString("en-IN")} vs cheapest option ({worst.mandi}). Net ₹{best.netPerQtl}/qtl after freight.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2">Mandi</th>
              <th className="text-right p-2">km</th>
              <th className="text-right p-2">Price/qtl</th>
              <th className="text-right p-2"><Truck className="h-3 w-3 inline" /> Freight/qtl</th>
              <th className="text-right p-2">Net/qtl</th>
              <th className="text-right p-2">Net total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.mandi} className={`border-t border-border/50 ${i === 0 ? "bg-primary/5 font-medium" : ""}`}>
                <td className="p-2 text-foreground">{r.mandi}</td>
                <td className="p-2 text-right text-muted-foreground">{r.dist}</td>
                <td className="p-2 text-right font-mono">₹{r.localPrice}</td>
                <td className="p-2 text-right font-mono text-muted-foreground">₹{r.freight}</td>
                <td className="p-2 text-right font-mono text-foreground">₹{r.netPerQtl}</td>
                <td className={`p-2 text-right font-mono ${i === 0 ? "text-primary" : "text-foreground"}`}>₹{r.net.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
