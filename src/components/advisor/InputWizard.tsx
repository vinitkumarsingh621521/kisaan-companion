import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, MapPin, Mountain, Leaf, FlaskConical, IndianRupee, Target, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { AdvisorInput } from "@/lib/aiAdvisorSchema";

const DRAFT_KEY = "km.advisor.draft";

interface Props {
  initial: AdvisorInput;
  onSubmit: (v: AdvisorInput) => void;
  loading: boolean;
}

type SectionId = "loc" | "soil" | "crops" | "inputs" | "econ" | "goals";

const SECTIONS: { id: SectionId; label: string; icon: any; accent: string }[] = [
  { id: "loc", label: "Location & Climate", icon: MapPin, accent: "from-sky-500/20 to-cyan-400/10" },
  { id: "soil", label: "Soil & Land", icon: Mountain, accent: "from-amber-500/20 to-orange-400/10" },
  { id: "crops", label: "Crops & History", icon: Leaf, accent: "from-green-500/20 to-emerald-400/10" },
  { id: "inputs", label: "Inputs & Practices", icon: FlaskConical, accent: "from-violet-500/20 to-fuchsia-400/10" },
  { id: "econ", label: "Economics & Risk", icon: IndianRupee, accent: "from-yellow-500/20 to-amber-400/10" },
  { id: "goals", label: "Goals", icon: Target, accent: "from-pink-500/20 to-rose-400/10" },
];

export default function InputWizard({ initial, onSubmit, loading }: Props) {
  const asArr = (x: any): string[] => {
    if (Array.isArray(x)) return x.map(String);
    if (typeof x === "string" && x.trim()) return x.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  const [v, setV] = useState<AdvisorInput>(() => ({
    ...initial,
    current_crops: asArr(initial.current_crops),
    previous_crops: asArr(initial.previous_crops),
    machinery_owned: asArr(initial.machinery_owned),
  }));
  const [open, setOpen] = useState<Record<SectionId, boolean>>({ loc: true, soil: false, crops: false, inputs: false, econ: false, goals: false });

  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        parsed.current_crops = asArr(parsed.current_crops);
        parsed.previous_crops = asArr(parsed.previous_crops);
        parsed.machinery_owned = asArr(parsed.machinery_owned);
        setV((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch {}
  }, [v]);

  const set = <K extends keyof AdvisorInput>(k: K, val: AdvisorInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const toggle = (id: SectionId) => setOpen((p) => ({ ...p, [id]: !p[id] }));

  const getGPS = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => { set("lat", pos.coords.latitude); set("lon", pos.coords.longitude); toast.success("Location captured"); },
      () => toast.error("Could not get location"),
    );
  };

  const filled = Object.values(v).filter((x) => x !== undefined && x !== "" && !(Array.isArray(x) && x.length === 0)).length;

  return (
    <div className="space-y-3">
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Inputs filled</div>
          <div className="text-2xl font-display font-bold text-foreground">{filled}<span className="text-sm text-muted-foreground">/50+</span></div>
        </div>
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold">
          {Math.min(100, Math.round((filled / 50) * 100))}%
        </div>
      </div>

      {SECTIONS.map(({ id, label, icon: Icon, accent }) => (
        <Collapsible key={id} open={open[id]} onOpenChange={() => toggle(id)}>
          <div className={`rounded-2xl border border-border bg-gradient-to-br ${accent} backdrop-blur-sm overflow-hidden`}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between hover:bg-card/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-card/70 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="font-semibold text-foreground">{label}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open[id] ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {id === "loc" && (
                  <>
                    <Field label="State"><Input value={v.state || ""} onChange={(e) => set("state", e.target.value)} /></Field>
                    <Field label="District"><Input value={v.district || ""} onChange={(e) => set("district", e.target.value)} /></Field>
                    <Field label="Village"><Input value={v.village || ""} onChange={(e) => set("village", e.target.value)} /></Field>
                    <Field label="Lat / Lon">
                      <div className="flex gap-2">
                        <Input placeholder="lat" value={v.lat ?? ""} onChange={(e) => set("lat", parseFloat(e.target.value) || undefined)} />
                        <Input placeholder="lon" value={v.lon ?? ""} onChange={(e) => set("lon", parseFloat(e.target.value) || undefined)} />
                        <Button type="button" variant="outline" size="icon" onClick={getGPS}><Locate className="h-4 w-4" /></Button>
                      </div>
                    </Field>
                    <Field label="Altitude (m)"><Input type="number" value={v.altitude_m ?? ""} onChange={(e) => set("altitude_m", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="Climate zone"><Input placeholder="tropical, semi-arid…" value={v.climate_zone || ""} onChange={(e) => set("climate_zone", e.target.value)} /></Field>
                    <Field label="Avg rainfall (mm)"><Input type="number" value={v.avg_rainfall_mm ?? ""} onChange={(e) => set("avg_rainfall_mm", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="Monsoon stage"><Input placeholder="pre / active / withdrawal" value={v.monsoon_stage || ""} onChange={(e) => set("monsoon_stage", e.target.value)} /></Field>
                    <Field label="Frost risk">
                      <SelectBox value={v.frost_risk} onChange={(x) => set("frost_risk", x as any)} options={["none", "low", "medium", "high"]} />
                    </Field>
                  </>
                )}
                {id === "soil" && (
                  <>
                    <Field label="Soil type"><Input placeholder="alluvial, black, red…" value={v.soil_type || ""} onChange={(e) => set("soil_type", e.target.value)} /></Field>
                    <Field label="Soil pH"><Input type="number" step="0.1" value={v.soil_ph ?? ""} onChange={(e) => set("soil_ph", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="N (kg/ha)"><Input type="number" value={v.nitrogen ?? ""} onChange={(e) => set("nitrogen", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="P (kg/ha)"><Input type="number" value={v.phosphorus ?? ""} onChange={(e) => set("phosphorus", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="K (kg/ha)"><Input type="number" value={v.potassium ?? ""} onChange={(e) => set("potassium", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="Organic carbon %"><Input type="number" step="0.1" value={v.organic_carbon_pct ?? ""} onChange={(e) => set("organic_carbon_pct", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="Texture"><Input placeholder="sandy loam, clay…" value={v.soil_texture || ""} onChange={(e) => set("soil_texture", e.target.value)} /></Field>
                    <Field label="Drainage">
                      <SelectBox value={v.drainage} onChange={(x) => set("drainage", x as any)} options={["poor", "moderate", "good"]} />
                    </Field>
                    <Field label="Land size (acres)"><Input type="number" step="0.1" value={v.land_size_acres ?? ""} onChange={(e) => set("land_size_acres", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="Slope">
                      <SelectBox value={v.slope} onChange={(x) => set("slope", x as any)} options={["flat", "gentle", "steep"]} />
                    </Field>
                    <Field label="Irrigation source">
                      <SelectBox value={v.irrigation_source} onChange={(x) => set("irrigation_source", x as any)} options={["borewell", "canal", "rainfed", "drip", "river", "pond"]} />
                    </Field>
                    <Field label={`Water availability: ${v.water_availability ?? 5}/10`}>
                      <Slider value={[v.water_availability ?? 5]} min={1} max={10} step={1} onValueChange={([x]) => set("water_availability", x)} />
                    </Field>
                  </>
                )}
                {id === "crops" && (
                  <>
                    <Field label="Current crops (comma-separated)" full><Input value={asArr(v.current_crops).join(", ")} onChange={(e) => set("current_crops", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
                    <Field label="Previous crops" full><Input value={asArr(v.previous_crops).join(", ")} onChange={(e) => set("previous_crops", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
                    <Field label="Intended crop"><Input value={v.intended_crop || ""} onChange={(e) => set("intended_crop", e.target.value)} /></Field>
                    <Field label="Sowing date"><Input type="date" value={v.sowing_date || ""} onChange={(e) => set("sowing_date", e.target.value)} /></Field>
                    <Field label="Expected harvest"><Input type="date" value={v.expected_harvest || ""} onChange={(e) => set("expected_harvest", e.target.value)} /></Field>
                    <Field label="Rotation pattern"><Input placeholder="rice-wheat, legume-cereal…" value={v.rotation_pattern || ""} onChange={(e) => set("rotation_pattern", e.target.value)} /></Field>
                    <SwitchField label="Intercropping" checked={!!v.intercropping} onChange={(x) => set("intercropping", x)} />
                    <Field label="Seed source"><Input placeholder="govt / private / saved" value={v.seed_source || ""} onChange={(e) => set("seed_source", e.target.value)} /></Field>
                  </>
                )}
                {id === "inputs" && (
                  <>
                    <SwitchField label="Uses fertilizer" checked={!!v.uses_fertilizer} onChange={(x) => set("uses_fertilizer", x)} />
                    <Field label="Fertilizer brand"><Input value={v.fertilizer_brand || ""} onChange={(e) => set("fertilizer_brand", e.target.value)} /></Field>
                    <Field label="NPK ratio"><Input placeholder="10-26-26" value={v.npk_ratio || ""} onChange={(e) => set("npk_ratio", e.target.value)} /></Field>
                    <SwitchField label="Uses pesticide" checked={!!v.uses_pesticide} onChange={(x) => set("uses_pesticide", x)} />
                    <Field label="Pesticide type"><Input value={v.pesticide_type || ""} onChange={(e) => set("pesticide_type", e.target.value)} /></Field>
                    <Field label="Farming style">
                      <SelectBox value={v.farming_style} onChange={(x) => set("farming_style", x as any)} options={["organic", "chemical", "mixed"]} />
                    </Field>
                    <SwitchField label="Mulching" checked={!!v.mulching} onChange={(x) => set("mulching", x)} />
                    <Field label="Machinery owned" full><Input placeholder="tractor, rotavator…" value={asArr(v.machinery_owned).join(", ")} onChange={(e) => set("machinery_owned", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
                    <Field label="Labour availability">
                      <SelectBox value={v.labour_availability} onChange={(x) => set("labour_availability", x as any)} options={["scarce", "moderate", "abundant"]} />
                    </Field>
                    <SwitchField label="Compost use" checked={!!v.compost_use} onChange={(x) => set("compost_use", x)} />
                    <Field label="Tillage type">
                      <SelectBox value={v.tillage_type} onChange={(x) => set("tillage_type", x as any)} options={["conventional", "minimum", "zero"]} />
                    </Field>
                  </>
                )}
                {id === "econ" && (
                  <>
                    <Field label="Budget per acre (₹)"><Input type="number" value={v.budget_per_acre ?? ""} onChange={(e) => set("budget_per_acre", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="Expected yield (t/acre)"><Input type="number" step="0.1" value={v.expected_yield_ton_acre ?? ""} onChange={(e) => set("expected_yield_ton_acre", parseFloat(e.target.value) || undefined)} /></Field>
                    <Field label="Mandi distance (km)"><Input type="number" value={v.mandi_distance_km ?? ""} onChange={(e) => set("mandi_distance_km", parseFloat(e.target.value) || undefined)} /></Field>
                    <SwitchField label="Cold storage access" checked={!!v.cold_storage} onChange={(x) => set("cold_storage", x)} />
                    <SwitchField label="Insured" checked={!!v.insurance} onChange={(x) => set("insurance", x)} />
                    <SwitchField label="Loan taken" checked={!!v.loan_taken} onChange={(x) => set("loan_taken", x)} />
                    <Field label="Risk appetite">
                      <SelectBox value={v.risk_appetite} onChange={(x) => set("risk_appetite", x as any)} options={["conservative", "balanced", "aggressive"]} />
                    </Field>
                    <Field label="Target profit (₹)"><Input type="number" value={v.target_profit ?? ""} onChange={(e) => set("target_profit", parseFloat(e.target.value) || undefined)} /></Field>
                  </>
                )}
                {id === "goals" && (
                  <>
                    <Field label="Primary goal">
                      <SelectBox value={v.primary_goal} onChange={(x) => set("primary_goal", x as any)} options={["profit", "sustainability", "food_security", "export"]} />
                    </Field>
                    <SwitchField label="Open to new crops" checked={!!v.open_to_new_crops} onChange={(x) => set("open_to_new_crops", x)} />
                    <Field label="Market preference">
                      <SelectBox value={v.market_preference} onChange={(x) => set("market_preference", x as any)} options={["local_mandi", "contract", "export", "fpo"]} />
                    </Field>
                    <SwitchField label="Organic certification" checked={!!v.organic_cert} onChange={(x) => set("organic_cert", x)} />
                    <Field label="Time horizon">
                      <SelectBox value={v.time_horizon} onChange={(x) => set("time_horizon", x as any)} options={["1_season", "1_year", "3_years"]} />
                    </Field>
                    <Field label={`Tech comfort: ${v.tech_comfort ?? 3}/5`}>
                      <Slider value={[v.tech_comfort ?? 3]} min={1} max={5} step={1} onValueChange={([x]) => set("tech_comfort", x)} />
                    </Field>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <Button
          onClick={() => onSubmit(v)}
          disabled={loading}
          className="w-full h-12 gradient-primary border-0 text-primary-foreground font-semibold text-base"
        >
          {loading ? "Analyzing…" : "✨ Generate 25 Insights"}
        </Button>
      </motion.div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-card/50">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SelectBox({ value, onChange, options }: { value: string | undefined; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent className="bg-card">
        {options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
