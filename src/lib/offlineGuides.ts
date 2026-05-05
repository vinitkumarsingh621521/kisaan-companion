// Personalised offline guide generator. Builds a list of guide bundles based on the
// active farmer's profile (crops, soil, pesticides, location, income, etc.) and
// renders each one as a self-contained downloadable text/markdown file at click-time.

import type { FarmerProfile } from "@/hooks/useActiveProfile";

export interface OfflineGuide {
  id: string;
  title: string;
  emoji: string;
  size: string;          // approximate, for UI
  category: "crop" | "soil" | "input" | "scheme" | "weather" | "finance" | "livestock" | "tech";
  reason: string;        // why this guide is in YOUR list
  build: () => string;   // returns full markdown content
}

const cropGuide = (crop: string, state: string) => `# ${crop} Cultivation Guide — tuned for ${state}

## 1. Climate window
- Sowing: see seasonal calendar overleaf
- Temperature band: 18 – 35 °C
- Critical rainfall: 600 – 1100 mm spread across the crop cycle

## 2. Soil preparation
1. 2 deep ploughings + 1 harrowing
2. Apply 8–10 t/acre well-rotted FYM
3. Levelling with laser-leveller (saves 25% water)

## 3. Seed & sowing
| Parameter | Value |
|-----------|-------|
| Seed rate | crop-specific (see ICAR) |
| Spacing   | 20 × 15 cm typical |
| Depth     | 3–5 cm |
| Treatment | Trichoderma + Carbendazim |

## 4. Nutrient schedule (per acre)
- Basal: N 25 kg + P 25 kg + K 20 kg
- Top dress 1 (30 DAS): N 25 kg
- Top dress 2 (55 DAS): N 15 kg + K 10 kg
- Foliar (75 DAS): KNO₃ 1% spray

## 5. Water management
- Critical stages: tillering, flowering, grain-filling
- Avoid water stress > 7 days at flowering
- Switch to AWD (alternate wet-dry) once panicle initiates

## 6. Pest & disease watchlist
- Scout twice weekly from 30 DAS
- Use yellow sticky traps @ 10 / acre
- Threshold-based spraying only — see IPM table

## 7. Harvest
- Harvest at 80% grain maturity
- Moisture target 14% before storage
- Sun-dry for 2–3 days on tarpaulin

— Generated offline by KrishiMitra. Always cross-check with your local KVK.
`;

const soilGuide = (ph: string, soil: string) => `# Soil Health & pH Correction — your farm

Reported pH: **${ph || "not set"}**
Soil type: **${soil || "not set"}**

## A. Diagnostic
- pH < 5.5 → strongly acidic. Limits P, Ca, Mg uptake
- pH 5.5 – 6.5 → mildly acidic, ideal for most crops
- pH 6.5 – 7.5 → neutral, ideal
- pH > 8.0 → alkaline / sodic, limits Fe, Zn, P

## B. Correction tables
### Lime requirement (acidic soils)
| Current pH | Lime t/acre |
|-----------|-------------|
| 4.5–5.0   | 1.6 |
| 5.0–5.5   | 1.0 |
| 5.5–6.0   | 0.4 |

### Gypsum requirement (alkaline / sodic)
| ESP %     | Gypsum t/acre |
|-----------|---------------|
| 15–20     | 1.0 |
| 20–30     | 1.6 |
| > 30      | 2.4 |

## C. Long-term restoration
1. Green manure crop (dhaincha / sunhemp) every 3rd season
2. 8–10 t FYM every kharif
3. Vermicompost @ 2 t/acre top-dressed before flowering
4. Biofertilizers: Azospirillum + PSB seed treatment

## D. When to re-test
- Every 18 months
- After any major amendment (lime/gypsum)
- After flooding events
`;

const pestGuide = (crops: string[]) => `# IPM Playbook — top 50 pest treatments

Tuned for: ${crops.join(", ") || "your selected crops"}

## Scouting protocol
- 2 × weekly walks in W-pattern across the field
- 5 spots, 10 plants each → average pest count
- Compare against ETL (economic threshold level) below

## Universal IPM ladder
1. **Cultural** — crop rotation, trap crops, resistant varieties
2. **Mechanical** — pheromone traps (8/acre), light traps, hand-picking
3. **Biological** — Trichogramma cards, NPV, neem oil 5 ml/L
4. **Chemical** (last resort) — rotate modes of action; observe PHI

## Common pests & treatments
| Pest | Crop | ETL | First-line | Last-resort |
|------|------|-----|------------|-------------|
| Stem borer | Rice | 1 EM/m² | Trichogramma | Cartap 4G |
| BPH | Rice | 5/hill | Neem 5ml/L | Pymetrozine |
| Aphids | Wheat/Mustard | 5/plant | Lady-bird release | Imidacloprid |
| Fall armyworm | Maize | 5% damage | NPV @ 250 LE | Spinetoram |
| Whitefly | Cotton | 6/leaf | Yellow traps | Diafenthiuron |
| Pink bollworm | Cotton | 8% rosette | Pheromones | Profenofos |

## Spray hygiene
- Spray after 4 PM, low wind
- Calibrate nozzle: 200 L water/acre
- Wear PPE; keep livestock off field 48 h

## Resistance prevention
- Never spray same MoA twice in a row
- Maintain 5% refuge area for natural enemies
`;

const schemesGuide = (state: string) => `# Government Schemes 2025–26 — applicable to ${state || "your state"}

## Central schemes (apply via PM Kisan portal)
1. **PM-KISAN** — ₹6 000 / year direct benefit
2. **PMFBY** — Crop insurance, premium 1.5% kharif / 2% rabi
3. **KCC** — Kisan Credit Card, up to ₹3 lakh @ 7% (4% on prompt repayment)
4. **PM Krishi Sinchayee Yojana** — 55% subsidy on drip / sprinkler
5. **Soil Health Card** — free testing every 2 years
6. **PMFME** — ₹10 lakh subsidy for food-processing micro-units
7. **AIF** — 3% interest subvention on infrastructure loans up to ₹2 cr

## Documents you need
- Aadhaar (linked to bank)
- Land record (RoR / 7-12 / Khasra)
- Bank passbook
- Mobile linked to Aadhaar
- Soil Health Card (for input subsidies)

## Where to apply
- Online: pmkisan.gov.in, pmfby.gov.in, agrimachinery.nic.in
- Offline: nearest CSC / Krishi Vibhag office
`;

const fertilizerGuide = (n: string, p: string, k: string) => `# Custom Fertilizer Schedule

Reported soil test (kg/ha): N=${n || "-"}  P=${p || "-"}  K=${k || "-"}

## Step 1 — interpret
- N < 240 → Low. P < 22 → Low. K < 110 → Low.
- N 240–480 → Medium. P 22–56 → Medium. K 110–280 → Medium.
- N > 480 → High. P > 56 → High. K > 280 → High.

## Step 2 — gap-filling (per acre)
| Status | Urea (kg) | DAP (kg) | MOP (kg) |
|--------|-----------|----------|----------|
| All Low    | 110 | 55 | 35 |
| All Medium | 75  | 35 | 20 |
| All High   | 35  | 15 | 10 |

## Step 3 — split application
- 50% N + 100% P + 50% K basal
- 25% N at tillering / vegetative
- 25% N + 50% K at flowering

## Step 4 — micronutrients
- Zn deficiency very common in IGP — apply ZnSO₄ 10 kg/acre once in 3 yr
- Boron for oilseeds — borax 4 kg/acre
- Foliar Fe-EDTA 0.5% if interveinal chlorosis
`;

const dripGuide = () => `# Drip Irrigation Setup

## What you need (per acre)
- 16 mm laterals: ~600 m
- 4 LPH inline drippers: ~1 600
- Filter (screen 120 mesh): 1
- Venturi for fertigation: 1
- Pressure gauge: 1

## Cost & subsidy
- Total: ₹40 000 – ₹55 000 / acre
- PMKSY subsidy: 55% (small/marginal), 45% others

## Layout
1. Mainline along high edge of plot
2. Sub-mains every 25 m
3. Laterals at row spacing of crop
4. Operating pressure: 1.0 kg/cm²

## Schedule
- Veg crops: 30 min daily
- Fruits: 60 min, alternate days
- Field crops: 45 min, every 3rd day

## Maintenance
- Weekly: flush laterals
- Monthly: acid wash (HCl 30%, 2 L per system)
- Yearly: replace filter element
`;

const weatherGuide = (rain: string) => `# Weather-Smart Farming

Annual rainfall on record for your farm: **${rain || "unknown"} mm**

## Monsoon prep checklist
1. Clear field drains 2 weeks before onset
2. Stockpile 60 days of fertilizer + seed
3. Cover storage with tarpaulin
4. Charge IoT sensor batteries

## Dry-spell management
- Mulch with paddy straw / sugarcane trash @ 4 t/acre
- Switch to short-duration cultivars (90 d rice, 65 d millet)
- Foliar KCl 2% during stress

## Heat-wave SOP (>40 °C)
- Irrigate before 9 AM
- Spray kaolin clay 3% on fruit crops
- Delay urea top-dressing

## Hailstorm / cyclone alert
- Listen to KrishiMitra alerts daily
- Harvest mature crop within 48 h of warning
- Anti-hail nets on horticulture (subsidy 50%)
`;

const financeGuide = (income: string) => `# Farm Finance Planner

Reported annual income bracket: **${income || "not set"}**

## Cash-flow blueprint
| Bucket | % of income | Use |
|--------|-------------|-----|
| Inputs (seed/fert/pest) | 35 | Pre-season working cap |
| Labour                  | 20 | Sowing + harvest |
| Irrigation + power      | 10 | Pump diesel / electricity |
| Equipment EMI           | 10 | Tractor / sprayer |
| Insurance + savings     | 15 | PMFBY + RD |
| Household reserve       | 10 | Emergency |

## Credit ladder
1. KCC ₹3 lakh @ 4% — start here
2. SHG / FPO loan ₹50 k – ₹2 lakh
3. AIF infra loan up to ₹2 cr @ 3% subvention

## Insurance must-haves
- PMFBY (crop)
- PMSBY (life ₹2 lakh @ ₹20)
- PMJJBY (life ₹2 lakh @ ₹436)

## Tax tips
- Agricultural income: tax-free
- Form 1A required if leasing land
- Keep all invoices for input GST refund (FPO)
`;

const livestockGuide = () => `# Integrated Livestock Care

## Cattle
- Deworming: every 3 months (Albendazole 7.5 mg/kg)
- FMD vaccine: every 6 months
- Mineral mixture 50 g/day in feed
- Green fodder 30 kg + dry 6 kg + concentrate 1 kg per 2 L milk

## Poultry (backyard 25 birds)
- Brooding: 95 °F week 1, drop 5 °F weekly
- Vaccinate Marek's day 1, Ranikhet day 7
- Coccidiostat in feed first 6 weeks

## Goat
- 1 buck per 25 does
- Kid weaning at 90 days
- Deworm every 60 days

## Manure value
- 1 cow → 5 t FYM/year → ₹6 000 input savings
- Vermicompost premium: 4× regular FYM price
`;

const techGuide = () => `# Smartphone & Internet Survival Guide

## Apps that work in 2G
- KrishiMitra (this app — works offline)
- WhatsApp Business
- mKisan
- IFFCO Kisan
- Plantix (lite)

## Save data
- Turn on data-saver in browser
- Disable auto-play videos
- Use 'Lite' versions

## Battery tips
- Solar 10 W panel + 10 000 mAh power bank ≈ ₹1 800
- Charge during fieldwork — never while sleeping
- Replace battery every 2 yr (₹600)

## Cyber-safety
- Never share OTP — bank/govt never ask
- Verify mandi prices on official AGMARKNET only
- Lock screen with PIN
`;

// ----------------------------------------------------------------------------
// Personalisation engine
// ----------------------------------------------------------------------------
export function buildPersonalisedGuides(profile: FarmerProfile | null): OfflineGuide[] {
  const d = profile?.farmer_details || {};
  const fullName = profile?.full_name || "Farmer";
  const state = d.state || "India";
  const district = d.district || "your area";
  const crops: string[] = Array.isArray(d.current_crops)
    ? d.current_crops
    : typeof d.current_crops === "string"
      ? d.current_crops.split(",").map((s: string) => s.trim()).filter(Boolean)
      : ["Rice", "Wheat"];
  const soil = profile?.soil_type || d.soil_type || "loamy";
  const ph = d.soil_ph || "";
  const n = d.nitrogen || "";
  const p = d.phosphorus || "";
  const k = d.potassium || "";
  const rainfall = d.annual_rainfall || "";
  const income = d.annual_income || "";
  const livestock = d.livestock || "";
  const insurance = d.insurance_status || "";

  const list: OfflineGuide[] = [];

  // 1. one guide per crop the farmer grows (max 4)
  crops.slice(0, 4).forEach((c, i) => {
    list.push({
      id: `crop-${i}`,
      title: `${c} cultivation guide — ${state}`,
      emoji: "🌾",
      size: `${(2 + Math.random() * 2).toFixed(1)} MB`,
      category: "crop",
      reason: `You grow ${c}`,
      build: () => `_Personalised for ${fullName}, ${district}, ${state}_\n\n` + cropGuide(c, state),
    });
  });

  // 2. soil
  list.push({
    id: "soil",
    title: `Soil pH correction — your ${soil} soil`,
    emoji: "🧪",
    size: "0.9 MB",
    category: "soil",
    reason: ph ? `Your reported pH is ${ph}` : "Soil profile on file",
    build: () => `_Personalised for ${fullName}_\n\n` + soilGuide(ph, soil),
  });

  // 3. fertilizer (only if NPK or nothing — useful default)
  list.push({
    id: "fert",
    title: "Fertilizer schedule (NPK calculator)",
    emoji: "💊",
    size: "0.7 MB",
    category: "input",
    reason: n || p || k ? "Custom-built from your soil-test values" : "Standard NPK plan",
    build: () => `_Personalised for ${fullName}_\n\n` + fertilizerGuide(n, p, k),
  });

  // 4. pest IPM
  list.push({
    id: "pest",
    title: `Top IPM treatments — ${crops.slice(0, 2).join(" & ")}`,
    emoji: "🐛",
    size: "1.4 MB",
    category: "input",
    reason: `Tuned to ${crops.slice(0, 2).join(" + ")}`,
    build: () => `_Personalised for ${fullName}_\n\n` + pestGuide(crops),
  });

  // 5. schemes
  list.push({
    id: "schemes",
    title: `Government schemes — ${state}`,
    emoji: "🏛️",
    size: "1.1 MB",
    category: "scheme",
    reason: `Filtered to ${state}`,
    build: () => `_Personalised for ${fullName}_\n\n` + schemesGuide(state),
  });

  // 6. drip — only if irrigated land or irrigation type set
  if (d.irrigated_land || d.irrigation_type) {
    list.push({
      id: "drip",
      title: "Drip irrigation setup & subsidy",
      emoji: "💧",
      size: "1.0 MB",
      category: "tech",
      reason: `You have ${d.irrigated_land || "some"} irrigated land`,
      build: () => `_Personalised for ${fullName}_\n\n` + dripGuide(),
    });
  }

  // 7. weather
  list.push({
    id: "weather",
    title: "Weather-smart playbook",
    emoji: "⛅",
    size: "0.8 MB",
    category: "weather",
    reason: rainfall ? `Calibrated to ${rainfall} mm rainfall` : `${state} climate`,
    build: () => `_Personalised for ${fullName}_\n\n` + weatherGuide(rainfall),
  });

  // 8. finance — always useful
  list.push({
    id: "finance",
    title: "Farm finance + KCC + insurance",
    emoji: "💰",
    size: "0.6 MB",
    category: "finance",
    reason: insurance ? `Your insurance: ${insurance}` : "Cash-flow blueprint",
    build: () => `_Personalised for ${fullName}_\n\n` + financeGuide(income),
  });

  // 9. livestock — only if owned
  if (livestock && String(livestock).toLowerCase() !== "none") {
    list.push({
      id: "livestock",
      title: `Livestock care — ${livestock}`,
      emoji: "🐄",
      size: "0.8 MB",
      category: "livestock",
      reason: `You keep ${livestock}`,
      build: () => `_Personalised for ${fullName}_\n\n` + livestockGuide(),
    });
  }

  // 10. tech — only if low tech-comfort or no smartphone listed
  if (!d.smartphone || d.tech_comfort === "Low" || d.internet_access === "2G") {
    list.push({
      id: "tech",
      title: "Smartphone & 2G survival guide",
      emoji: "📱",
      size: "0.4 MB",
      category: "tech",
      reason: "Low-bandwidth tips",
      build: () => `_Personalised for ${fullName}_\n\n` + techGuide(),
    });
  }

  return list;
}

// Trigger an actual file download in the browser.
export function downloadGuide(g: OfflineGuide) {
  const md = g.build();
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${g.id}-${g.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  // Also persist into localStorage cache so the page truly works offline
  try {
    const cacheKey = `offline.guide.${g.id}`;
    localStorage.setItem(cacheKey, md);
  } catch { /* quota — ignore */ }
}
