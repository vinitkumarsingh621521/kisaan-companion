import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple state → climate zone + monsoon stage mapping
const STATE_CLIMATE: Record<string, { zone: string; rainfall: string; soils: string[]; majorCrops: string[] }> = {
  "Punjab": { zone: "Sub-tropical semi-arid", rainfall: "400-700mm", soils: ["Alluvial", "Sandy loam"], majorCrops: ["Wheat", "Rice", "Cotton", "Sugarcane"] },
  "Haryana": { zone: "Semi-arid", rainfall: "350-650mm", soils: ["Alluvial", "Sandy"], majorCrops: ["Wheat", "Rice", "Mustard", "Bajra"] },
  "Uttar Pradesh": { zone: "Sub-tropical", rainfall: "650-1000mm", soils: ["Alluvial", "Black"], majorCrops: ["Wheat", "Rice", "Sugarcane", "Pulses"] },
  "Bihar": { zone: "Sub-tropical humid", rainfall: "1000-1500mm", soils: ["Alluvial"], majorCrops: ["Rice", "Wheat", "Maize", "Pulses"] },
  "West Bengal": { zone: "Tropical humid", rainfall: "1500-2000mm", soils: ["Alluvial", "Laterite"], majorCrops: ["Rice", "Jute", "Tea", "Potato"] },
  "Maharashtra": { zone: "Semi-arid to sub-humid", rainfall: "600-3000mm", soils: ["Black", "Red"], majorCrops: ["Cotton", "Soybean", "Sugarcane", "Jowar"] },
  "Gujarat": { zone: "Semi-arid", rainfall: "400-1000mm", soils: ["Black", "Sandy"], majorCrops: ["Cotton", "Groundnut", "Wheat", "Bajra"] },
  "Rajasthan": { zone: "Arid to semi-arid", rainfall: "150-500mm", soils: ["Sandy", "Saline"], majorCrops: ["Bajra", "Mustard", "Wheat", "Pulses"] },
  "Madhya Pradesh": { zone: "Sub-tropical", rainfall: "800-1400mm", soils: ["Black", "Red"], majorCrops: ["Soybean", "Wheat", "Pulses", "Rice"] },
  "Karnataka": { zone: "Tropical to semi-arid", rainfall: "500-3500mm", soils: ["Red", "Black", "Laterite"], majorCrops: ["Ragi", "Rice", "Cotton", "Coffee"] },
  "Tamil Nadu": { zone: "Tropical", rainfall: "600-1600mm", soils: ["Red", "Black", "Alluvial"], majorCrops: ["Rice", "Sugarcane", "Cotton", "Groundnut"] },
  "Andhra Pradesh": { zone: "Tropical", rainfall: "500-1500mm", soils: ["Red", "Black", "Alluvial"], majorCrops: ["Rice", "Cotton", "Groundnut", "Chillies"] },
  "Telangana": { zone: "Semi-arid", rainfall: "700-1100mm", soils: ["Red", "Black"], majorCrops: ["Rice", "Cotton", "Maize", "Turmeric"] },
  "Kerala": { zone: "Tropical humid", rainfall: "2500-3500mm", soils: ["Laterite", "Coastal alluvium"], majorCrops: ["Rice", "Coconut", "Rubber", "Spices"] },
  "Odisha": { zone: "Tropical", rainfall: "1200-1600mm", soils: ["Red", "Laterite", "Alluvial"], majorCrops: ["Rice", "Pulses", "Oilseeds", "Jute"] },
  "Jharkhand": { zone: "Sub-tropical", rainfall: "1200-1500mm", soils: ["Red Laterite", "Sandy"], majorCrops: ["Rice", "Maize", "Pulses", "Oilseeds"] },
  "Chhattisgarh": { zone: "Sub-tropical", rainfall: "1200-1600mm", soils: ["Red", "Black"], majorCrops: ["Rice", "Pulses", "Oilseeds", "Sugarcane"] },
  "Assam": { zone: "Sub-tropical humid", rainfall: "2000-3000mm", soils: ["Alluvial", "Laterite"], majorCrops: ["Rice", "Tea", "Jute", "Pulses"] },
  "Himachal Pradesh": { zone: "Temperate", rainfall: "1000-1500mm", soils: ["Mountain", "Brown"], majorCrops: ["Apple", "Wheat", "Maize", "Potato"] },
  "Uttarakhand": { zone: "Sub-tropical to temperate", rainfall: "1000-2500mm", soils: ["Alluvial", "Mountain"], majorCrops: ["Rice", "Wheat", "Sugarcane", "Pulses"] },
  "Goa": { zone: "Tropical humid", rainfall: "2500-3500mm", soils: ["Laterite"], majorCrops: ["Rice", "Coconut", "Cashew", "Areca nut"] },
};

function monsoonStage(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 9) return "South-West Monsoon (active)";
  if (m === 10 || m === 11) return "Post-monsoon / North-East monsoon";
  if (m === 12 || m <= 2) return "Winter (Rabi sowing window)";
  return "Pre-monsoon (Zaid / harvest season)";
}

function currentSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 10) return "Kharif";
  if (m >= 11 || m <= 3) return "Rabi";
  return "Zaid";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile } = await req.json();
    const d = profile?.farmer_details || {};
    const state = d.state || "";
    const climate = STATE_CLIMATE[state] || { zone: "Unknown", rainfall: "Unknown", soils: [], majorCrops: [] };

    // Financial bucket
    const incomeMap: Record<string, string> = {
      "Below ₹1 lakh": "low", "₹1-3 lakh": "low-mid", "₹3-5 lakh": "mid", "₹5-10 lakh": "upper-mid", "Above ₹10 lakh": "high"
    };
    const financialBucket = incomeMap[d.annual_income] || "unknown";

    // Risk profile
    const risk = (d.risk_tolerance || "").toLowerCase().includes("high") ? "high" :
                 (d.risk_tolerance || "").toLowerCase().includes("medium") ? "medium" : "low";

    // Recommended schemes
    const schemes: string[] = ["PM-KISAN"];
    if (d.insurance_status?.includes("PMFBY") || d.insurance_status?.includes("Planning")) schemes.push("PMFBY");
    if (d.bank_account?.includes("KCC") || d.existing_loans?.includes("KCC")) schemes.push("KCC enhancement");
    if (d.bank_account?.includes("Jan Dhan")) schemes.push("PMJDY-linked subsidies");
    if (d.farming_type?.includes("Organic")) schemes.push("PKVY (Paramparagat Krishi Vikas Yojana)");
    if (d.water_source?.includes("Bore") || d.irrigation_type?.includes("Drip")) schemes.push("PMKSY (Per Drop More Crop)");

    // Suitable crops shortlist
    const suitableCrops = climate.majorCrops.slice(0, 6);

    // Nearest mandi inference
    const district = d.district || "your district";
    const nearestMandi = `APMC ${district}`;
    const mandiKm = d.nearest_mandi_km || "unknown";

    // Computed health score (0-100)
    const ph = parseFloat(d.soil_ph) || 7;
    const phScore = Math.max(0, 100 - Math.abs(ph - 6.5) * 20);
    const oc = parseFloat(d.organic_carbon) || 0.5;
    const ocScore = Math.min(100, oc * 100);
    const n = parseFloat(d.nitrogen) || 0;
    const p = parseFloat(d.phosphorus) || 0;
    const k = parseFloat(d.potassium) || 0;
    const npkScore = Math.min(100, ((n/280) + (p/50) + (k/280)) / 3 * 100);
    const soilHealth = Math.round((phScore + ocScore + npkScore) / 3);

    // Diversification score
    const cropList = (d.current_crops || "").split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    const diversification = Math.min(100, cropList.length * 25);

    // Tech readiness
    const techPoints = (d.smartphone?.includes("Yes") ? 30 : 0) +
                       (d.internet_access && !d.internet_access.includes("No") ? 30 : 0) +
                       (d.equipment_owned ? 20 : 0) +
                       (d.tech_comfort?.includes("Very") ? 20 : d.tech_comfort?.includes("Somewhat") ? 10 : 0);

    const farmHealthScore = Math.round((soilHealth * 0.4 + diversification * 0.2 + techPoints * 0.2 + (financialBucket === "high" ? 100 : financialBucket === "upper-mid" ? 75 : financialBucket === "mid" ? 50 : 30) * 0.2));

    const context = {
      farmer_name: profile.full_name,
      location: { state, district, village: d.village },
      climate: { ...climate, monsoon_stage: monsoonStage(), current_season: currentSeason() },
      crops: { current: cropList, suitable: suitableCrops },
      financial: { bucket: financialBucket, income: d.annual_income, monthly_investment: d.monthly_investment },
      risk_profile: risk,
      schemes_matched: schemes,
      nearest_mandi: { name: nearestMandi, distance_km: mandiKm },
      scores: { soil_health: soilHealth, diversification, tech_readiness: techPoints, farm_health: farmHealthScore },
      ai_summary_seed: `${profile.full_name} farms ${d.total_land || "?"} acres of ${d.soil_type || climate.soils[0] || "soil"} in ${d.district || state || "India"}, growing ${cropList.join(", ") || "crops"}, water from ${d.water_source || "?"}, ${d.irrigation_type || "?"} irrigation, equipment: ${d.equipment_owned || "basic"}, livestock: ${d.livestock || "none"}, risk tolerance: ${risk}, primary goal: ${d.crop_priority || "balanced"}.`,
    };

    return new Response(JSON.stringify(context), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("farmer-context error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
