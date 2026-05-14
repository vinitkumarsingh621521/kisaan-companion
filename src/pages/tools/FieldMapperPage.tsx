import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Map as MapIcon, Trash2, Sprout, MapPin, Loader2, FileDown, Share2, Cloud, CloudOff, Satellite, Search, Locate } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useFarmZones } from "@/hooks/useFarmZones";
import { NDVILegend } from "@/components/tools/NDVIOverlay";
import FieldZoneAnalytics from "@/components/tools/FieldZoneAnalytics";
import type { LatLng } from "leaflet";

const FieldMap = lazy(() => import("@/components/tools/FieldMap"));

const CROPS = ["Rice", "Wheat", "Maize", "Cotton", "Vegetables", "Sugarcane", "Pulses", "Fallow"];
const COLORS: Record<string, string> = {
  Rice: "#22c55e", Wheat: "#eab308", Maize: "#f59e0b", Cotton: "#f0abfc",
  Vegetables: "#3b82f6", Sugarcane: "#10b981", Pulses: "#a855f7", Fallow: "#64748b",
};
const INDIA_CENTER: [number, number] = [22.97, 78.65];
const GEOCODE_CACHE_KEY = "fieldmapper.geocache.v1";

function polygonAreaM2(latlngs: { lat: number; lng: number }[]): number {
  if (latlngs.length < 3) return 0;
  const R = 6378137;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let area = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % latlngs.length];
    area += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs((area * R * R) / 2);
}

async function geocodeDistrict(query: string): Promise<[number, number] | null> {
  try {
    const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
    if (cache[query]) return cache[query];
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data?.[0]) {
      const c: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      cache[query] = c;
      localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
      return c;
    }
  } catch (e) { /* ignore */ }
  return null;
}

export default function FieldMapperPage() {
  const { t } = useTranslation();
  const { active } = useActiveProfile();
  const { zones, addZone, removeZones, clearAll, status } = useFarmZones();

  const [selectedCrop, setSelectedCrop] = useState("Rice");
  const [center, setCenter] = useState<[number, number]>(INDIA_CENTER);
  const [locating, setLocating] = useState(true);
  const [ndvi, setNdvi] = useState(false);
  const [ndviOpacity, setNdviOpacity] = useState(0.6);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ label: string; lat: number; lon: number; source: string }[]>([]);

  const runSearch = async () => {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true); setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("bhuvan-geocode", { body: { query: q } });
      if (error) throw error;
      const results = (data as any)?.results || [];
      if (!results.length) { toast.error("No location matched. Try district, state."); }
      else { setSearchResults(results); setCenter([results[0].lat, results[0].lon]); toast.success(`Centered on ${results[0].label}`); }
    } catch (e: any) { toast.error(e?.message || "Search failed"); }
    finally { setSearching(false); }
  };
  const useGPS = () => {
    if (!navigator.geolocation) return toast.error("GPS not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCenter([pos.coords.latitude, pos.coords.longitude]); toast.success("Centered on your location"); },
      () => toast.error("Could not get GPS — check browser permission"),
    );
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLocating(true);
      const district = active?.farmer_details?.district;
      const state = active?.farmer_details?.state;
      const loc = active?.farm_location;
      const query = [district, state].filter(Boolean).join(", ") || loc || "India";
      const c = await geocodeDistrict(query);
      if (!cancel) {
        setCenter(c || INDIA_CENTER);
        setLocating(false);
      }
    })();
    return () => { cancel = true; };
  }, [active?.id, active?.farm_location, active?.farmer_details?.district, active?.farmer_details?.state]);

  const handleCreate = async (latlngs: LatLng[]) => {
    const pts = latlngs.map((p) => ({ lat: p.lat, lng: p.lng }));
    const m2 = polygonAreaM2(pts);
    const hectares = m2 / 10000;
    const acres = hectares * 2.47105;
    await addZone({
      crop: selectedCrop,
      color: COLORS[selectedCrop] || "#22c55e",
      hectares,
      acres,
      latlngs: pts,
    });
    toast.success(`✓ ${selectedCrop} — ${hectares.toFixed(3)} ha (${acres.toFixed(2)} ac)`);
  };

  const handleDeleteIds = (ids: string[]) => {
    removeZones(ids);
    toast.info(`Removed ${ids.length} zone${ids.length > 1 ? "s" : ""}`);
  };

  const removeZone = (id: string) => removeZones([id]);

  const onClearAll = () => {
    if (!zones.length) return;
    clearAll();
    toast.info("All zones cleared");
  };

  const totalAcres = Number((active?.farmer_details as any)?.total_land ?? (active?.farmer_details as any)?.land_size_acres) || 0;

  const totals = useMemo(() => {
    const ha = zones.reduce((s, z) => s + z.hectares, 0);
    const ac = zones.reduce((s, z) => s + z.acres, 0);
    return { ha, ac };
  }, [zones]);

  const exportGeoJSON = () => {
    if (!zones.length) { toast.error("Draw at least one zone first"); return; }
    const fc = {
      type: "FeatureCollection",
      features: zones.map(z => ({
        type: "Feature",
        properties: { crop: z.crop, hectares: z.hectares, acres: z.acres, color: z.color },
        geometry: {
          type: "Polygon",
          coordinates: [[...z.latlngs.map(p => [p.lng, p.lat]), [z.latlngs[0].lng, z.latlngs[0].lat]]],
        },
      })),
    };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `farm-zones-${active?.full_name || "map"}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GeoJSON exported");
  };

  const shareSummary = async () => {
    const text = `🌾 My farm — ${zones.length} zones, ${totals.ac.toFixed(2)} acres mapped on KrishiMitra`;
    if (navigator.share) {
      try { await navigator.share({ title: "My Farm Map", text, url: window.location.href }); } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      toast.success("Copied summary to clipboard");
    }
  };

  const SyncBadge = () => {
    if (status === "syncing") return <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> {t("fieldMapper.syncing")}</span>;
    if (status === "synced") return <span className="inline-flex items-center gap-1 text-[11px] text-primary"><Cloud className="h-3 w-3" /> {t("fieldMapper.synced")}</span>;
    if (status === "local") return <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"><CloudOff className="h-3 w-3" /> {t("fieldMapper.localOnly")}</span>;
    if (status === "error") return <span className="inline-flex items-center gap-1 text-[11px] text-destructive"><CloudOff className="h-3 w-3" /> Sync error</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <MapIcon className="h-7 w-7 text-primary" /> {t("fieldMapper.title")}
              <span className="ml-2"><SyncBadge /></span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("fieldMapper.subtitle")}{" "}
              <span className="font-medium text-foreground">Plot total: {totalAcres} acres</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Map */}
            <div className="lg:col-span-2 glass-card p-3">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {CROPS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCrop(c)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selectedCrop === c
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                      style={selectedCrop === c ? { background: COLORS[c], borderColor: COLORS[c], color: "#fff" } : {}}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={exportGeoJSON} disabled={!zones.length}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> {t("common.export")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={shareSummary} disabled={!zones.length}>
                    <Share2 className="h-3.5 w-3.5 mr-1" /> {t("common.share")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onClearAll} disabled={!zones.length}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("common.clear")}
                  </Button>
                </div>
              </div>

              {/* NDVI controls */}
              <div className="flex items-center justify-between gap-3 mb-3 px-2 py-2 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">{t("fieldMapper.ndvi")}</span>
                  <Switch checked={ndvi} onCheckedChange={setNdvi} aria-label="Toggle NDVI overlay" />
                </div>
                {ndvi && (
                  <div className="flex items-center gap-3 flex-1 max-w-xs">
                    <span className="text-[10px] text-muted-foreground">Opacity</span>
                    <Slider
                      value={[Math.round(ndviOpacity * 100)]}
                      onValueChange={(v) => setNdviOpacity(v[0] / 100)}
                      min={20}
                      max={95}
                      step={5}
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
              {ndvi && (
                <div className="flex items-center justify-between mb-3 text-xs px-1">
                  <NDVILegend />
                  <span className="text-[10px] text-muted-foreground">NASA GIBS · MODIS 16-day</span>
                </div>
              )}

              <div className="relative rounded-xl overflow-hidden border border-border" style={{ minHeight: 480 }}>
                {locating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/40 z-[1000] backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Finding your farm location…
                    </div>
                  </div>
                )}
                <Suspense fallback={<Skeleton className="w-full" style={{ height: 480 }} />}>
                  <FieldMap
                    center={center}
                    zones={zones}
                    selectedCrop={selectedCrop}
                    cropColor={COLORS[selectedCrop] || "#22c55e"}
                    onCreate={handleCreate}
                    onDelete={handleDeleteIds}
                    ndvi={ndvi}
                    ndviOpacity={ndviOpacity}
                  />
                </Suspense>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Use the polygon tool (top-left) to draw a zone.
                Centered near {active?.farmer_details?.district || active?.farm_location || "India"}.
                {ndvi && <span className="ml-1">{t("fieldMapper.ndviHint")}</span>}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="glass-card p-4">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-primary" /> Crop Zones
                </h3>
                {zones.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">{t("fieldMapper.noZones")} 🎨</p>
                ) : (
                  <div className="space-y-2">
                    {zones.map((z) => (
                      <div key={z.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded shrink-0" style={{ background: z.color }} />
                          <span className="font-medium truncate">{z.crop}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-medium">{z.acres.toFixed(2)} ac</div>
                            <div className="text-[10px] text-muted-foreground">{z.hectares.toFixed(3)} ha</div>
                          </div>
                          <button
                            onClick={() => removeZone(z.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                            aria-label="Delete zone"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 mt-1 border-t border-border space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Mapped</span>
                        <span className="font-medium">{totals.ac.toFixed(2)} ac · {totals.ha.toFixed(3)} ha</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Plot total</span>
                        <span className="font-medium">{totalAcres.toFixed(2)} ac</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Coverage</span>
                        <span className={`font-medium ${totals.ac > totalAcres ? "text-destructive" : "text-primary"}`}>
                          {totalAcres ? ((totals.ac / totalAcres) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <FieldZoneAnalytics zones={zones} profile={active} />

              <div className="glass-card p-4 text-xs text-muted-foreground space-y-2">
                <p>☁️ <strong>Cloud sync:</strong> Zones sync to your account across devices.</p>
                <p>🛰️ <strong>NDVI:</strong> Toggle satellite crop-health overlay (NASA MODIS, 16-day).</p>
                <p>🧪 <strong>Agronomy panel:</strong> uses your soil pH ({active?.farmer_details?.soil_ph || "default 6.5"}) + irrigation type to compute live water/NPK/yield.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
