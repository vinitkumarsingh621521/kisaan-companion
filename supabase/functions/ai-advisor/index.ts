import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ───── Crop reference table (per-acre baseline; sources: ICAR, KVK extension) ─────
type CropRef = {
  emoji: string;
  seasons: ("Kharif" | "Rabi" | "Zaid")[];
  seed_kg_acre: [number, number];
  water_mm: number;            // total crop water requirement
  N_kg_acre: number; P_kg_acre: number; K_kg_acre: number;
  pesticide_lt_acre: [number, number];
  ph_low: number; ph_high: number;
  duration_d: number;
  yield_qtl_acre: [number, number];
  msp_per_qtl: number;
  sowing_months: number[];     // month numbers 1-12
  notes: string;
};

const CROPS: Record<string, CropRef> = {
  rice:       { emoji: "🌾", seasons: ["Kharif"], seed_kg_acre: [8, 12], water_mm: 1200, N_kg_acre: 48, P_kg_acre: 24, K_kg_acre: 24, pesticide_lt_acre: [1.5, 2.5], ph_low: 5.5, ph_high: 7.0, duration_d: 120, yield_qtl_acre: [18, 25], msp_per_qtl: 2300, sowing_months: [6, 7], notes: "Needs standing water; SRI saves 30% water." },
  wheat:      { emoji: "🌾", seasons: ["Rabi"],   seed_kg_acre: [40, 50], water_mm: 500,  N_kg_acre: 48, P_kg_acre: 24, K_kg_acre: 16, pesticide_lt_acre: [0.8, 1.2], ph_low: 6.0, ph_high: 7.5, duration_d: 130, yield_qtl_acre: [15, 22], msp_per_qtl: 2275, sowing_months: [11, 12], notes: "First irrigation 21 DAS (CRI stage) is critical." },
  maize:      { emoji: "🌽", seasons: ["Kharif", "Rabi"], seed_kg_acre: [8, 10], water_mm: 600, N_kg_acre: 60, P_kg_acre: 30, K_kg_acre: 20, pesticide_lt_acre: [1.0, 1.8], ph_low: 5.8, ph_high: 7.0, duration_d: 110, yield_qtl_acre: [22, 32], msp_per_qtl: 2090, sowing_months: [6, 7, 11], notes: "Watch for fall armyworm at 15-30 DAS." },
  cotton:     { emoji: "🌿", seasons: ["Kharif"], seed_kg_acre: [1.5, 2], water_mm: 800, N_kg_acre: 48, P_kg_acre: 24, K_kg_acre: 24, pesticide_lt_acre: [3, 5], ph_low: 6.0, ph_high: 8.0, duration_d: 180, yield_qtl_acre: [6, 10], msp_per_qtl: 7100, sowing_months: [5, 6], notes: "Bt cotton needs refugia row of non-Bt." },
  sugarcane:  { emoji: "🎋", seasons: ["Rabi"],   seed_kg_acre: [3000, 4000], water_mm: 2000, N_kg_acre: 100, P_kg_acre: 37, K_kg_acre: 37, pesticide_lt_acre: [2, 3], ph_low: 6.5, ph_high: 7.5, duration_d: 365, yield_qtl_acre: [300, 400], msp_per_qtl: 340, sowing_months: [10, 11, 2, 3], notes: "Drip cuts water 40% vs flood." },
  pulses:     { emoji: "🫘", seasons: ["Rabi", "Zaid"], seed_kg_acre: [8, 12], water_mm: 400, N_kg_acre: 8, P_kg_acre: 24, K_kg_acre: 16, pesticide_lt_acre: [0.6, 1.0], ph_low: 6.0, ph_high: 7.5, duration_d: 100, yield_qtl_acre: [4, 7], msp_per_qtl: 6600, sowing_months: [10, 3], notes: "Rhizobium seed treatment fixes 40-60 kg N/ha free." },
  soybean:    { emoji: "🫛", seasons: ["Kharif"], seed_kg_acre: [25, 32], water_mm: 500, N_kg_acre: 12, P_kg_acre: 30, K_kg_acre: 16, pesticide_lt_acre: [0.8, 1.2], ph_low: 6.0, ph_high: 7.5, duration_d: 105, yield_qtl_acre: [8, 12], msp_per_qtl: 4892, sowing_months: [6, 7], notes: "Must inoculate seed with Rhizobium." },
  mustard:    { emoji: "🌼", seasons: ["Rabi"],   seed_kg_acre: [1.5, 2.5], water_mm: 350, N_kg_acre: 32, P_kg_acre: 16, K_kg_acre: 16, pesticide_lt_acre: [0.5, 1.0], ph_low: 6.0, ph_high: 7.5, duration_d: 130, yield_qtl_acre: [6, 10], msp_per_qtl: 5650, sowing_months: [10, 11], notes: "Sulphur 10 kg/acre boosts oil content." },
  potato:     { emoji: "🥔", seasons: ["Rabi"],   seed_kg_acre: [800, 1000], water_mm: 500, N_kg_acre: 60, P_kg_acre: 32, K_kg_acre: 50, pesticide_lt_acre: [2, 3], ph_low: 5.5, ph_high: 6.5, duration_d: 100, yield_qtl_acre: [80, 120], msp_per_qtl: 1200, sowing_months: [10, 11], notes: "Late blight risk Dec-Jan; spray mancozeb prophylactically." },
  onion:      { emoji: "🧅", seasons: ["Rabi", "Kharif"], seed_kg_acre: [3, 4], water_mm: 450, N_kg_acre: 48, P_kg_acre: 24, K_kg_acre: 32, pesticide_lt_acre: [1.5, 2.5], ph_low: 6.0, ph_high: 7.5, duration_d: 130, yield_qtl_acre: [80, 130], msp_per_qtl: 1500, sowing_months: [11, 12, 6], notes: "Stop irrigation 15 days before harvest for storage." },
  vegetables: { emoji: "🥬", seasons: ["Kharif", "Rabi", "Zaid"], seed_kg_acre: [0.2, 1], water_mm: 450, N_kg_acre: 60, P_kg_acre: 32, K_kg_acre: 40, pesticide_lt_acre: [1, 2], ph_low: 6.0, ph_high: 7.5, duration_d: 90, yield_qtl_acre: [70, 200], msp_per_qtl: 1800, sowing_months: [6, 10, 2], notes: "Drip + mulch cuts water 50%." },
  millet:     { emoji: "🌾", seasons: ["Kharif"], seed_kg_acre: [3, 4], water_mm: 350, N_kg_acre: 24, P_kg_acre: 12, K_kg_acre: 12, pesticide_lt_acre: [0.3, 0.6], ph_low: 5.5, ph_high: 8.0, duration_d: 100, yield_qtl_acre: [8, 14], msp_per_qtl: 2625, sowing_months: [6, 7], notes: "Climate-resilient, low input — perfect for dryland." },
};

const ALIASES: Record<string, string> = {
  paddy: "rice", basmati: "rice",
  bajra: "millet", jowar: "millet", "finger millet": "millet", ragi: "millet",
  arhar: "pulses", tur: "pulses", chana: "pulses", gram: "pulses", moong: "pulses", urad: "pulses", masur: "pulses", "moong dal": "pulses",
  "sarson": "mustard", rai: "mustard",
  brinjal: "vegetables", tomato: "vegetables", chilli: "vegetables", okra: "vegetables", cauliflower: "vegetables", cabbage: "vegetables",
  ganna: "sugarcane",
  kapas: "cotton",
};

function normalizeCrop(name: string): { key: string; ref: CropRef } | null {
  if (!name) return null;
  const k = name.trim().toLowerCase();
  const direct = CROPS[k];
  if (direct) return { key: k, ref: direct };
  const alias = ALIASES[k];
  if (alias && CROPS[alias]) return { key: alias, ref: CROPS[alias] };
  // partial match
  for (const [crop, ref] of Object.entries(CROPS)) {
    if (k.includes(crop) || crop.includes(k)) return { key: crop, ref };
  }
  for (const [a, target] of Object.entries(ALIASES)) {
    if (k.includes(a)) return { key: target, ref: CROPS[target] };
  }
  return null;
}

function inferSeason(sowing?: string, harvest?: string): "Kharif" | "Rabi" | "Zaid" | "Unknown" {
  if (!sowing) return "Unknown";
  const m = new Date(sowing).getMonth() + 1;
  if (m >= 6 && m <= 9) return "Kharif";
  if (m >= 10 || m <= 2) return "Rabi";
  if (m >= 3 && m <= 5) return "Zaid";
  return "Unknown";
}

function fmtINR(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function buildBaseline(inputs: any) {
  const allocations: { crop: string; acres: number; season?: string; variety?: string; sowing_date?: string; expected_harvest?: string }[] = inputs.crop_allocations?.length
    ? inputs.crop_allocations
    : (inputs.intended_crop ? [{ crop: inputs.intended_crop, acres: inputs.land_size_acres || 1, sowing_date: inputs.sowing_date, expected_harvest: inputs.expected_harvest }]
       : (inputs.current_crops || []).map((c: string) => ({ crop: c, acres: (inputs.land_size_acres || 1) / Math.max(inputs.current_crops.length, 1) })));

  const ph = Number(inputs.soil_ph) || 6.5;
  const irrig = (inputs.irrigation_source || "rainfed").toLowerCase();
  const irrigEff = irrig.includes("drip") ? 0.9 : irrig.includes("sprinkler") ? 0.75 : irrig.includes("rainfed") ? 0.35 : 0.45;

  const compatibility_notes: string[] = [];
  const red_flags: string[] = [];

  const requirements = allocations.map((a) => {
    const norm = normalizeCrop(a.crop || "");
    const acres = Math.max(0.1, Number(a.acres) || 1);
    if (!norm) {
      red_flags.push(`Unknown crop "${a.crop}" — cannot compute exact baseline; using mixed-vegetable defaults.`);
      const ref = CROPS.vegetables;
      return crunch(a, ref, "vegetables", acres, ph, irrigEff, compatibility_notes, red_flags);
    }
    return crunch(a, norm.ref, norm.key, acres, ph, irrigEff, compatibility_notes, red_flags);
  });

  const totalAcres = requirements.reduce((s, r) => s + r.area_acres, 0);
  const land = Number(inputs.land_size_acres) || totalAcres;
  const totalCost = requirements.reduce((s, r) => s + r._cost, 0);
  const totalRevenue = requirements.reduce((s, r) => s + r._revenue, 0);
  const totalYieldT = requirements.reduce((s, r) => s + r._yieldT, 0);
  const totalWaterKL = requirements.reduce((s, r) => s + r._waterKL, 0);
  const totalNPK = requirements.reduce((s, r) => s + r._N + r._P + r._K, 0);
  const netProfit = totalRevenue - totalCost;

  const top = requirements[0];
  const baseline = {
    status: "ok" as const,
    summary: top
      ? `Baseline plan for ${top.crop} on ${top.area_acres} acres in ${inputs.district || inputs.state || "your area"} — soil pH ${ph}, ${irrig}. Estimated net ${fmtINR(netProfit)} from ${requirements.length} crop${requirements.length > 1 ? "s" : ""}.`
      : "Add at least one crop with acres to see a personalized agronomy plan.",
    crop_suitability: top ? {
      chosen_crop: top.crop,
      score: top._fitScore,
      verdict: top._fitScore >= 85 ? "excellent" : top._fitScore >= 70 ? "good" : top._fitScore >= 50 ? "marginal" : "poor",
      reason: top._fitReason,
    } : { chosen_crop: "—", score: 0, verdict: "marginal", reason: "No crop selected." },
    alternative_crops: suggestAlternatives(top?.crop, ph, requirements.map(r => r.crop)),
    climate_risk: {
      overall: irrig.includes("rainfed") ? "high" : "medium",
      heat: "Mulching + early irrigation reduces heat stress.",
      frost: inputs.frost_risk || "low",
      flood: inputs.drainage === "poor" ? "Drainage poor — install field drains" : "moderate",
      drought: irrig.includes("rainfed") ? "Plan for 1 protective irrigation at flowering" : "low",
    },
    input_requirements: requirements.map((r) => ({
      crop: r.crop, area_acres: r.area_acres,
      seed_per_acre: r.seed_per_acre, total_seed: r.total_seed,
      water_per_acre: r.water_per_acre, fertilizer_per_acre: r.fertilizer_per_acre,
      pesticide_per_acre: r.pesticide_per_acre, irrigation_schedule: r.irrigation_schedule, notes: r.notes,
    })),
    land_allocation_review: {
      total_planned_acres: Number(totalAcres.toFixed(2)),
      unallocated_acres: Math.max(0, Number((land - totalAcres).toFixed(2))),
      summary: !land || land <= 0
        ? "Add your total land size (acres) to see allocation coverage."
        : totalAcres > land
          ? `You allocated ${totalAcres.toFixed(2)} ac but your land is ${land} ac — ${(totalAcres - land).toFixed(2)} ac extra. Reduce one crop.`
          : totalAcres < land * 0.9
            ? `${(land - totalAcres).toFixed(2)} acres unused. Consider adding a short-cycle crop like moong (Zaid) or fodder.`
            : `Good allocation — ${Math.round((totalAcres / land) * 100)}% of your land is planted.`,
      recommendations: [
        totalAcres > land ? "Drop the smallest crop or reduce its acres." : "Add a legume on unused land to fix nitrogen.",
        "Keep ≥10% of land for crop rotation flexibility.",
        "Group same-water-need crops into adjacent plots to save irrigation cost.",
      ],
    },
    compatibility_notes,
    soil_plan: phPlan(ph, top?.crop || ""),
    irrigation_plan: {
      method: irrig.includes("drip") ? "Drip with mulch" : irrig.includes("sprinkler") ? "Sprinkler" : "Furrow / flood",
      schedule: top ? top.irrigation_schedule : "Stage-wise based on crop",
      water_saving_pct: irrig.includes("drip") ? 45 : irrig.includes("sprinkler") ? 25 : 0,
    },
    fertilizer_plan: {
      npk_kg_per_acre: top ? `${Math.round(top._N / top.area_acres)}-${Math.round(top._P / top.area_acres)}-${Math.round(top._K / top.area_acres)} kg N-P-K/acre` : "—",
      timing: "Basal: 50% N + full P+K at sowing. Top-dress 25% N at tillering, 25% N at flowering.",
      brands: ["IFFCO Urea + DAP + MOP", "Coromandel Gromor", "Nano-DAP (foliar)"],
      organic_alt: "FYM 4-5 t/acre + vermicompost 250 kg/acre + Azotobacter seed treatment.",
    },
    pesticide_plan: {
      needed: requirements.some(r => r.crop === "rice" || r.crop === "cotton" || r.crop === "vegetables"),
      products: top && top.crop === "rice" ? ["Cartap hydrochloride 4G (stem borer)", "Tricyclazole (blast)"]
        : top && top.crop === "cotton" ? ["Imidacloprid (sucking pests)", "Emamectin benzoate (bollworm)"]
        : ["Need-based spray after scouting; avoid prophylactic use."],
      ipm_alternative: "Yellow sticky traps + neem oil 5 ml/L + Trichogramma releases at 7-day intervals.",
    },
    cost_breakdown: {
      seed: fmtINR(requirements.reduce((s, r) => s + r._seedCost, 0)),
      labour: fmtINR(totalAcres * 8000),
      machinery: fmtINR(totalAcres * 3500),
      transport: fmtINR(totalAcres * 1500),
      total_per_acre: totalAcres > 0 ? fmtINR(totalCost / totalAcres) : "—",
      total: fmtINR(totalCost),
    },
    yield_forecast: top ? {
      low: `${(top._yieldT * 0.8).toFixed(1)} t`,
      expected: `${top._yieldT.toFixed(1)} t`,
      high: `${(top._yieldT * 1.2).toFixed(1)} t`,
    } : { low: "—", expected: "—", high: "—" },
    revenue_forecast: {
      gross: fmtINR(totalRevenue),
      net_profit: fmtINR(netProfit),
      roi_pct: totalCost > 0 ? Math.round((netProfit / totalCost) * 100) : 0,
      break_even_per_quintal: top ? fmtINR(totalCost / Math.max(top._yieldT * 10 * top.area_acres, 1)) : "—",
    },
    sowing_window: top ? `${monthName(top._ref.sowing_months[0])} – ${monthName(top._ref.sowing_months[top._ref.sowing_months.length - 1])}` : "—",
    harvest_window: top ? `${top._ref.duration_d} days from sowing (~${monthName(((top._ref.sowing_months[0] + Math.round(top._ref.duration_d / 30)) - 1) % 12 + 1)})` : "—",
    market_strategy: {
      channel: inputs.market_preference === "fpo" ? "Sell through FPO for better aggregation price"
        : inputs.market_preference === "contract" ? "Lock contract price before sowing"
        : "Local mandi + online (eNAM)",
      best_month: top ? monthName(((top._ref.sowing_months[0] + Math.round(top._ref.duration_d / 30) + 1) - 1) % 12 + 1) : "Post-harvest",
      reason: "Prices typically firm 4-6 weeks after peak arrivals — store if possible.",
    },
    schemes: [
      { name: "PM-KISAN", benefit: "₹6,000/year direct cash", fit_reason: "Eligible for all landholding farmers." },
      { name: "PMFBY (Crop Insurance)", benefit: "Premium 1.5-5% only", fit_reason: "Covers ${top?.crop || 'your crop'} against weather + pest losses." },
      { name: "KCC (Kisan Credit Card)", benefit: "4% interest crop loan", fit_reason: "For input financing this season." },
      { name: "Soil Health Card", benefit: "Free soil testing", fit_reason: "Tunes your NPK doses to your actual soil." },
    ],
    insurance: { recommended: "PMFBY", sum_insured: fmtINR(totalRevenue), premium: fmtINR(totalRevenue * 0.02) },
    sustainability: {
      score: irrig.includes("drip") ? 80 : irrig.includes("rainfed") ? 50 : 65,
      improvement: "Adopt drip + cover cropping + Rhizobium seed treatment to gain 15-20 sustainability points.",
    },
    water_footprint: `${(totalWaterKL / 1000).toFixed(1)} ML this season (≈ ${Math.round(totalWaterKL / Math.max(totalYieldT, 0.1))} kL per tonne).`,
    tips: buildTips(requirements, ph, irrig, inputs),
    red_flags,
  };
  return baseline;

  function crunch(a: any, ref: CropRef, key: string, acres: number, ph: number, irrigEff: number, compatNotes: string[], reds: string[]) {
    const seedMin = ref.seed_kg_acre[0], seedMax = ref.seed_kg_acre[1];
    const yMin = ref.yield_qtl_acre[0], yMax = ref.yield_qtl_acre[1];
    const phFit = ph >= ref.ph_low && ph <= ref.ph_high ? 1 : Math.max(0.55, 1 - Math.min(Math.abs(ph - ref.ph_low), Math.abs(ph - ref.ph_high)) / 2.5);
    const inferredSeason = inferSeason(a.sowing_date || inputs.sowing_date, a.expected_harvest || inputs.expected_harvest);
    const declared = (a.season || inputs.monsoon_stage || "").toString();
    const fitsSeason = inferredSeason !== "Unknown" ? ref.seasons.includes(inferredSeason as any) : true;
    if (inferredSeason !== "Unknown" && !fitsSeason) {
      const allowed = ref.seasons.join(" / ");
      reds.push(`⚠ ${a.crop}: your sowing date implies ${inferredSeason} season, but this crop is best in ${allowed}.`);
      compatNotes.push(`Change either the sowing date (use ${ref.seasons.map(s => seasonMonths(s)).join(" or ")}) or pick a ${inferredSeason}-suitable crop instead.`);
    } else if (inferredSeason !== "Unknown") {
      compatNotes.push(`✓ ${a.crop} fits the ${inferredSeason} season based on your sowing date.`);
    }
    if (phFit < 0.85) compatNotes.push(`Soil pH ${ph} is sub-optimal for ${a.crop} (best ${ref.ph_low}-${ref.ph_high}). Apply ${ph < ref.ph_low ? "lime 200 kg/acre" : "gypsum 250 kg/acre"} 30 days before sowing.`);

    const fitScore = Math.round((phFit * 60) + (fitsSeason ? 30 : 10) + (irrigEff * 10));
    const seedKg = ((seedMin + seedMax) / 2);
    const totalSeedKg = seedKg * acres;
    const waterKL = (ref.water_mm * 10 * acres) / irrigEff;     // 1mm × 1ha = 10 kL
    const N = ref.N_kg_acre * acres, P = ref.P_kg_acre * acres, K = ref.K_kg_acre * acres;
    const pestLt = ((ref.pesticide_lt_acre[0] + ref.pesticide_lt_acre[1]) / 2) * acres;
    const yieldQtl = ((yMin + yMax) / 2) * acres * phFit;
    const yieldT = yieldQtl / 10;
    const revenue = yieldQtl * ref.msp_per_qtl;
    const seedCost = totalSeedKg * (key === "sugarcane" ? 4 : key === "potato" ? 12 : 80);
    const fertCost = (N + P + K) * 35;
    const pestCost = pestLt * 600;
    const labourCost = acres * 8000;
    const cost = seedCost + fertCost + pestCost + labourCost + acres * 5000;

    return {
      crop: a.crop, area_acres: acres,
      seed_per_acre: `${seedMin}-${seedMax} kg/acre`,
      total_seed: `${totalSeedKg.toFixed(1)} kg`,
      water_per_acre: `${(ref.water_mm * 10 / irrigEff).toFixed(0)} kL/acre (${ref.water_mm} mm CWR @ ${Math.round(irrigEff * 100)}% efficiency)`,
      fertilizer_per_acre: `N ${ref.N_kg_acre} · P ${ref.P_kg_acre} · K ${ref.K_kg_acre} kg/acre (Urea ${Math.round(ref.N_kg_acre / 0.46)} kg + DAP ${Math.round(ref.P_kg_acre / 0.46)} kg + MOP ${Math.round(ref.K_kg_acre / 0.6)} kg)`,
      pesticide_per_acre: `${ref.pesticide_lt_acre[0]}-${ref.pesticide_lt_acre[1]} L/acre (scout-based, IPM preferred)`,
      irrigation_schedule: irrigationSchedule(key, ref.duration_d),
      notes: ref.notes,
      _ref: ref, _fitScore: fitScore,
      _fitReason: `pH fit ${(phFit * 100).toFixed(0)}%, ${fitsSeason ? "season OK" : "WRONG SEASON"}, irrigation efficiency ${Math.round(irrigEff * 100)}%.`,
      _N: N, _P: P, _K: K, _waterKL: waterKL, _yieldT: yieldT, _revenue: revenue, _cost: cost, _seedCost: seedCost,
    };
  }
}

function seasonMonths(s: string) {
  return s === "Kharif" ? "Jun-Jul sowing" : s === "Rabi" ? "Oct-Dec sowing" : "Mar-May sowing";
}
function monthName(m: number) { return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][((m - 1) % 12 + 12) % 12]; }
function phPlan(ph: number, crop: string) {
  if (ph < 6) return { action: "Apply lime", dosage: "200-300 kg/acre 30 days before sowing", why: `pH ${ph} is acidic — limits P availability for ${crop || "most crops"}.` };
  if (ph > 8) return { action: "Apply gypsum + organic matter", dosage: "250 kg gypsum/acre + FYM 4 t/acre", why: `pH ${ph} is alkaline — micronutrient deficiencies likely.` };
  return { action: "Maintain pH with organic matter", dosage: "FYM 4 t/acre annually", why: `pH ${ph} is in good range — protect with organic inputs.` };
}
function irrigationSchedule(crop: string, duration: number) {
  if (crop === "rice") return "Maintain 5 cm standing water from transplant to milk stage; drain 10 days before harvest.";
  if (crop === "wheat") return "6 irrigations: CRI (21 DAS), tillering (40), jointing (60), flowering (80), milk (100), dough (115).";
  if (crop === "cotton") return "Critical at squaring (45 DAS) and boll formation (90-120 DAS); avoid stress.";
  return `Stage-based: pre-sowing, vegetative, flowering, grain-fill — typically ${Math.round(duration / 25)} irrigations.`;
}
function suggestAlternatives(current: string | undefined, ph: number, used: string[]) {
  const out: { name: string; emoji: string; score: number; profit_per_acre: string; reason: string }[] = [];
  for (const [k, ref] of Object.entries(CROPS)) {
    if (used.includes(k)) continue;
    const phFit = ph >= ref.ph_low && ph <= ref.ph_high ? 1 : 0.7;
    const profit = ((ref.yield_qtl_acre[0] + ref.yield_qtl_acre[1]) / 2) * ref.msp_per_qtl - 25000;
    out.push({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      emoji: ref.emoji,
      score: Math.round(phFit * 70 + (profit > 30000 ? 25 : 15)),
      profit_per_acre: fmtINR(profit) + "/acre",
      reason: `Suits pH ${ref.ph_low}-${ref.ph_high}; ${ref.notes}`,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}
function buildTips(reqs: any[], ph: number, irrig: string, inputs: any): string[] {
  const tips: string[] = [];
  if (irrig.includes("flood")) tips.push("Switch from flood to drip — saves 40-50% water and boosts yield 10-15%.");
  if (ph < 6) tips.push(`Soil pH ${ph} is acidic — apply lime 200 kg/acre to unlock locked-up phosphorus.`);
  if (ph > 7.8) tips.push(`Soil pH ${ph} is alkaline — apply gypsum + green manure to improve micronutrient uptake.`);
  if (reqs.some(r => r.crop === "rice")) tips.push("Try SRI / DSR for rice — saves 25-30% water and reduces methane.");
  tips.push("Get free soil testing every 3 years through your nearest KVK to fine-tune your NPK doses.");
  return tips.slice(0, 5);
}

// ───── AI enrichment (best-effort; never fails the response) ─────
async function enrichWithAI(baseline: any, inputs: any, profileContext: any): Promise<any> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return baseline;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are KrishiMitra. Improve the SUMMARY and TIPS of a baseline farm advisory using the farmer's actual context. Reply with strict JSON: {summary: string, tips: string[5], extra_notes: string[]}." },
          { role: "user", content: `BASELINE:\n${JSON.stringify({ summary: baseline.summary, requirements: baseline.input_requirements, allocation: baseline.land_allocation_review, red_flags: baseline.red_flags })}\n\nINPUTS:\n${JSON.stringify(inputs)}\n\nCONTEXT:\n${JSON.stringify(profileContext || {})}` },
        ],
        temperature: 0.5,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return baseline;
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt);
    if (parsed.summary) baseline.summary = parsed.summary;
    if (Array.isArray(parsed.tips) && parsed.tips.length) baseline.tips = parsed.tips.slice(0, 5);
    if (Array.isArray(parsed.extra_notes)) baseline.compatibility_notes = [...(baseline.compatibility_notes || []), ...parsed.extra_notes];
  } catch (e) {
    console.warn("[ai-advisor] enrichment skipped:", e);
  }
  return baseline;
}

async function streamFollowup(body: any): Promise<Response> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) {
    return new Response(JSON.stringify({ error: "AI key missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { question, result, messages } = body || {};
  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "question required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const history = Array.isArray(messages) ? messages.slice(-10) : [];
  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      stream: true,
      messages: [
        { role: "system", content: "You are KrishiMitra, a follow-up assistant. The user already received a 25-point farm advisory (JSON below). Answer their follow-up questions clearly and concisely (markdown ok), grounded in this analysis. If something isn't in the analysis, say so and give general best-practice guidance." },
        { role: "system", content: `ADVISORY_JSON:\n${JSON.stringify(result || {}).slice(0, 12000)}` },
        ...history.map((m: any) => ({ role: m.role, content: String(m.content || "") })),
        { role: "user", content: question },
      ],
      temperature: 0.6,
    }),
  });
  if (!upstream.ok || !upstream.body) {
    const errTxt = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({ error: `AI error ${upstream.status}: ${errTxt.slice(0, 200)}` }), {
      status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Pass SSE through as plain text stream of content deltas
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const data = l.slice(5).trim();
            if (data === "[DONE]") { controller.close(); return; }
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(new TextEncoder().encode(delta));
            } catch {}
          }
        }
        controller.close();
      } catch (e) { controller.error(e); }
    },
  });
  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const user = await requireUser(req);
  if (!user) return unauthorized(corsHeaders);
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === "followup") return await streamFollowup(body);
    // Accept either { inputs, profileContext } or a flat payload
    const inputs = body?.inputs ?? body ?? {};
    const profileContext = body?.profileContext;
    const baseline = buildBaseline(inputs);
    const enriched = await enrichWithAI(baseline, inputs, profileContext);
    return new Response(JSON.stringify(enriched), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("ai-advisor fatal:", e);
    return new Response(JSON.stringify({ error: e?.message || "advisor failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
