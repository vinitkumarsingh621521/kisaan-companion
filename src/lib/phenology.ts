// Realistic phenology curve generator for the Satellite page.
// Builds a 12-month NDVI series adjusted to the user's primary crops, sowing
// season and rainfall regime — then derives stress alerts.

export interface PhenoPoint { month: string; val: number; stage: string; alert?: string }

const CROP_PHENO: Record<string, { peak: number[]; baseline: number; max: number; stages: Record<number, string> }> = {
  // peak = months of canopy peak (1=Jan), baseline = NDVI without crop, max = healthy peak
  Rice:       { peak: [8, 9],  baseline: 0.18, max: 0.82, stages: { 6:"Sowing", 7:"Tillering", 8:"Panicle", 9:"Grain-fill", 10:"Harvest" } },
  Wheat:      { peak: [2, 3],  baseline: 0.16, max: 0.78, stages: { 11:"Sowing", 12:"Tillering", 1:"Jointing", 2:"Heading", 3:"Grain-fill", 4:"Harvest" } },
  Maize:      { peak: [8, 9],  baseline: 0.20, max: 0.80, stages: { 6:"Sowing", 8:"Tasseling", 9:"Grain-fill", 10:"Harvest" } },
  Cotton:     { peak: [9, 10], baseline: 0.18, max: 0.72, stages: { 6:"Sowing", 8:"Squaring", 9:"Bolling", 11:"Harvest" } },
  Vegetables: { peak: [3, 4, 10, 11], baseline: 0.22, max: 0.75, stages: { 1:"Veg I", 4:"Harvest I", 7:"Veg II", 10:"Harvest II" } },
  Sugarcane:  { peak: [7, 8, 9, 10], baseline: 0.30, max: 0.85, stages: { 2:"Planting", 6:"Tillering", 9:"Grand growth", 12:"Harvest" } },
  Pulses:     { peak: [11, 12], baseline: 0.18, max: 0.65, stages: { 9:"Sowing", 11:"Pod-fill", 1:"Harvest" } },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function buildPhenology(crops: string[], rainfall_mm: number = 900): PhenoPoint[] {
  const active = crops.length ? crops : ["Rice", "Wheat"];
  const profiles = active.map((c) => CROP_PHENO[c]).filter(Boolean);
  if (!profiles.length) profiles.push(CROP_PHENO.Rice);

  const rainFactor = Math.max(0.7, Math.min(1.1, rainfall_mm / 1000));

  return MONTHS.map((m, i) => {
    const month = i + 1;
    let val = 0;
    profiles.forEach((p) => {
      const dist = Math.min(...p.peak.map(pm => Math.min(Math.abs(pm - month), 12 - Math.abs(pm - month))));
      // Gaussian around peak
      const v = p.baseline + (p.max - p.baseline) * Math.exp(-(dist*dist) / 4);
      val = Math.max(val, v);
    });
    val = Math.min(0.92, val * rainFactor);

    // stage label from first matching crop profile
    let stage = "—";
    for (const p of profiles) {
      if (p.stages[month]) { stage = p.stages[month]; break; }
    }

    let alert: string | undefined;
    if (val < 0.25 && month >= 6 && month <= 10) alert = "Bare-soil signature during kharif — possible crop failure";
    if (val < 0.30 && stage.includes("fill")) alert = "Below-norm canopy at grain-fill — irrigate + N top-dress";

    return { month: m, val: +val.toFixed(2), stage, alert };
  });
}

// Vegetation index reference table for the side panel
export const VI_REFERENCE = [
  { code: "NDVI",  formula: "(NIR − RED) / (NIR + RED)",        range: "−1 to +1", use: "Greenness / biomass" },
  { code: "NDWI",  formula: "(GREEN − NIR) / (GREEN + NIR)",    range: "−1 to +1", use: "Crop water content" },
  { code: "NDMI",  formula: "(NIR − SWIR) / (NIR + SWIR)",      range: "−1 to +1", use: "Soil moisture" },
  { code: "EVI",   formula: "2.5 · (NIR−RED)/(NIR+6·RED−7.5·BLUE+1)", range: "−1 to +1", use: "Dense canopy" },
  { code: "GNDVI", formula: "(NIR − GREEN) / (NIR + GREEN)",    range: "−1 to +1", use: "Chlorophyll / N status" },
  { code: "SAVI",  formula: "1.5 · (NIR−RED)/(NIR+RED+0.5)",    range: "−1 to +1", use: "Sparse canopy / arid" },
];
