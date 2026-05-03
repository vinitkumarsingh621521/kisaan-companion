import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// State/UT → climate + capital coords. Covers all 28 states + 8 UTs.
const STATE_CLIMATE: Record<string, { zone: string; rainfall: string; soils: string[]; majorCrops: string[]; lat: number; lon: number }> = {
  "Punjab": { zone: "Sub-tropical semi-arid", rainfall: "400-700mm", soils: ["Alluvial", "Sandy loam"], majorCrops: ["Wheat", "Rice", "Cotton", "Sugarcane"], lat: 30.73, lon: 76.78 },
  "Haryana": { zone: "Semi-arid", rainfall: "350-650mm", soils: ["Alluvial", "Sandy"], majorCrops: ["Wheat", "Rice", "Mustard", "Bajra"], lat: 28.45, lon: 77.02 },
  "Uttar Pradesh": { zone: "Sub-tropical", rainfall: "650-1000mm", soils: ["Alluvial", "Black"], majorCrops: ["Wheat", "Rice", "Sugarcane", "Pulses"], lat: 26.85, lon: 80.95 },
  "Bihar": { zone: "Sub-tropical humid", rainfall: "1000-1500mm", soils: ["Alluvial"], majorCrops: ["Rice", "Wheat", "Maize", "Pulses"], lat: 25.59, lon: 85.14 },
  "West Bengal": { zone: "Tropical humid", rainfall: "1500-2000mm", soils: ["Alluvial", "Laterite"], majorCrops: ["Rice", "Jute", "Tea", "Potato"], lat: 22.57, lon: 88.36 },
  "Maharashtra": { zone: "Semi-arid to sub-humid", rainfall: "600-3000mm", soils: ["Black", "Red"], majorCrops: ["Cotton", "Soybean", "Sugarcane", "Jowar"], lat: 19.07, lon: 72.87 },
  "Gujarat": { zone: "Semi-arid", rainfall: "400-1000mm", soils: ["Black", "Sandy"], majorCrops: ["Cotton", "Groundnut", "Wheat", "Bajra"], lat: 23.02, lon: 72.57 },
  "Rajasthan": { zone: "Arid to semi-arid", rainfall: "150-500mm", soils: ["Sandy", "Saline"], majorCrops: ["Bajra", "Mustard", "Wheat", "Pulses"], lat: 26.91, lon: 75.78 },
  "Madhya Pradesh": { zone: "Sub-tropical", rainfall: "800-1400mm", soils: ["Black", "Red"], majorCrops: ["Soybean", "Wheat", "Pulses", "Rice"], lat: 23.26, lon: 77.41 },
  "Karnataka": { zone: "Tropical to semi-arid", rainfall: "500-3500mm", soils: ["Red", "Black", "Laterite"], majorCrops: ["Ragi", "Rice", "Cotton", "Coffee"], lat: 12.97, lon: 77.59 },
  "Tamil Nadu": { zone: "Tropical", rainfall: "600-1600mm", soils: ["Red", "Black", "Alluvial"], majorCrops: ["Rice", "Sugarcane", "Cotton", "Groundnut"], lat: 13.08, lon: 80.27 },
  "Andhra Pradesh": { zone: "Tropical", rainfall: "500-1500mm", soils: ["Red", "Black", "Alluvial"], majorCrops: ["Rice", "Cotton", "Groundnut", "Chillies"], lat: 16.50, lon: 80.64 },
  "Telangana": { zone: "Semi-arid", rainfall: "700-1100mm", soils: ["Red", "Black"], majorCrops: ["Rice", "Cotton", "Maize", "Turmeric"], lat: 17.38, lon: 78.48 },
  "Kerala": { zone: "Tropical humid", rainfall: "2500-3500mm", soils: ["Laterite", "Coastal alluvium"], majorCrops: ["Rice", "Coconut", "Rubber", "Spices"], lat: 8.52, lon: 76.93 },
  "Odisha": { zone: "Tropical", rainfall: "1200-1600mm", soils: ["Red", "Laterite", "Alluvial"], majorCrops: ["Rice", "Pulses", "Oilseeds", "Jute"], lat: 20.27, lon: 85.84 },
  "Jharkhand": { zone: "Sub-tropical", rainfall: "1200-1500mm", soils: ["Red Laterite", "Sandy"], majorCrops: ["Rice", "Maize", "Pulses", "Oilseeds"], lat: 23.34, lon: 85.31 },
  "Chhattisgarh": { zone: "Sub-tropical", rainfall: "1200-1600mm", soils: ["Red", "Black"], majorCrops: ["Rice", "Pulses", "Oilseeds", "Sugarcane"], lat: 21.25, lon: 81.63 },
  "Assam": { zone: "Sub-tropical humid", rainfall: "2000-3000mm", soils: ["Alluvial", "Laterite"], majorCrops: ["Rice", "Tea", "Jute", "Pulses"], lat: 26.14, lon: 91.74 },
  "Himachal Pradesh": { zone: "Temperate", rainfall: "1000-1500mm", soils: ["Mountain", "Brown"], majorCrops: ["Apple", "Wheat", "Maize", "Potato"], lat: 31.10, lon: 77.17 },
  "Uttarakhand": { zone: "Sub-tropical to temperate", rainfall: "1000-2500mm", soils: ["Alluvial", "Mountain"], majorCrops: ["Rice", "Wheat", "Sugarcane", "Pulses"], lat: 30.32, lon: 78.03 },
  "Goa": { zone: "Tropical humid", rainfall: "2500-3500mm", soils: ["Laterite"], majorCrops: ["Rice", "Coconut", "Cashew", "Areca nut"], lat: 15.49, lon: 73.83 },
  "Manipur": { zone: "Sub-tropical", rainfall: "1500mm", soils: ["Red Loamy"], majorCrops: ["Rice", "Maize", "Pulses"], lat: 24.81, lon: 93.94 },
  "Meghalaya": { zone: "Sub-tropical humid", rainfall: "4000mm+", soils: ["Laterite"], majorCrops: ["Rice", "Maize", "Potato", "Ginger"], lat: 25.57, lon: 91.88 },
  "Mizoram": { zone: "Sub-tropical", rainfall: "2500mm", soils: ["Red Loamy"], majorCrops: ["Rice", "Maize", "Ginger", "Bamboo"], lat: 23.73, lon: 92.71 },
  "Nagaland": { zone: "Sub-tropical", rainfall: "2000mm", soils: ["Forest"], majorCrops: ["Rice", "Maize", "Pulses"], lat: 25.67, lon: 94.11 },
  "Tripura": { zone: "Sub-tropical humid", rainfall: "2000mm", soils: ["Alluvial"], majorCrops: ["Rice", "Jute", "Tea"], lat: 23.84, lon: 91.28 },
  "Arunachal Pradesh": { zone: "Temperate", rainfall: "2800mm", soils: ["Mountain"], majorCrops: ["Rice", "Maize", "Millets"], lat: 27.10, lon: 93.62 },
  "Sikkim": { zone: "Temperate", rainfall: "2500mm", soils: ["Mountain"], majorCrops: ["Cardamom", "Maize", "Rice", "Ginger"], lat: 27.33, lon: 88.61 },
  "Jammu and Kashmir": { zone: "Temperate", rainfall: "650-1100mm", soils: ["Mountain", "Alluvial"], majorCrops: ["Apple", "Saffron", "Rice", "Maize"], lat: 34.08, lon: 74.80 },
  "Ladakh": { zone: "Cold arid", rainfall: "100mm", soils: ["Cold desert"], majorCrops: ["Barley", "Wheat", "Apricot", "Vegetables"], lat: 34.16, lon: 77.58 },
  "Delhi": { zone: "Semi-arid", rainfall: "700mm", soils: ["Alluvial"], majorCrops: ["Wheat", "Vegetables", "Mustard"], lat: 28.61, lon: 77.21 },
  "Chandigarh": { zone: "Sub-tropical", rainfall: "1000mm", soils: ["Alluvial"], majorCrops: ["Wheat", "Rice", "Vegetables"], lat: 30.73, lon: 76.78 },
  "Puducherry": { zone: "Tropical", rainfall: "1300mm", soils: ["Alluvial"], majorCrops: ["Rice", "Sugarcane", "Coconut"], lat: 11.93, lon: 79.83 },
  "Andaman and Nicobar Islands": { zone: "Tropical humid", rainfall: "3000mm", soils: ["Forest"], majorCrops: ["Rice", "Coconut", "Areca nut"], lat: 11.62, lon: 92.72 },
  "Lakshadweep": { zone: "Tropical", rainfall: "1600mm", soils: ["Coral sandy"], majorCrops: ["Coconut"], lat: 10.57, lon: 72.64 },
  "Dadra and Nagar Haveli and Daman and Diu": { zone: "Tropical humid", rainfall: "2000mm", soils: ["Coastal alluvium"], majorCrops: ["Rice", "Ragi", "Pulses"], lat: 20.27, lon: 73.02 },
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

function emojiFromCode(code: number, rainPct: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code) || rainPct > 60) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌤️";
}

async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    const j = await r.json();
    const hit = j?.results?.[0];
    if (hit) return { lat: hit.latitude, lon: hit.longitude };
  } catch (e) { console.warn("geocode fail", e); }
  return null;
}

async function fetchWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&forecast_days=7&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const days = (j.daily?.time || []).map((iso: string, i: number) => {
      const d = new Date(iso);
      const code = j.daily.weather_code[i];
      const rain_pct = j.daily.precipitation_probability_max?.[i] ?? 0;
      return {
        date: iso,
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        emoji: emojiFromCode(code, rain_pct),
        temp_high: Math.round(j.daily.temperature_2m_max[i]),
        temp_low: Math.round(j.daily.temperature_2m_min[i]),
        rain_mm: +(j.daily.precipitation_sum[i] || 0).toFixed(1),
        rain_pct,
        wind_kph: Math.round(j.daily.wind_speed_10m_max[i] || 0),
      };
    });
    return {
      current_temp: Math.round(j.current?.temperature_2m ?? 0),
      current_humidity: Math.round(j.current?.relative_humidity_2m ?? 0),
      current_wind: Math.round(j.current?.wind_speed_10m ?? 0),
      today_rain_pct: j.current?.precipitation_probability ?? days[0]?.rain_pct ?? 0,
      forecast: days,
      source: "Open-Meteo",
    };
  } catch (e) {
    console.warn("weather fail", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile } = await req.json();
    const d = profile?.farmer_details || {};
    const state = d.state || "";
    const climate = STATE_CLIMATE[state] || { zone: "Unknown", rainfall: "Unknown", soils: [], majorCrops: [], lat: 0, lon: 0 };

    // Resolve coords: try geocode of district→state, fallback to state capital coords
    let lat = climate.lat, lon = climate.lon;
    const district = d.district || "";
    const farmLoc = profile?.farm_location || "";
    const queries = [farmLoc, district && state ? `${district}, ${state}, India` : "", state ? `${state}, India` : ""].filter(Boolean);
    for (const q of queries) {
      const hit = await geocode(q);
      if (hit) { lat = hit.lat; lon = hit.lon; break; }
    }

    const weather = (lat && lon) ? await fetchWeather(lat, lon) : null;

    const incomeMap: Record<string, string> = {
      "Below ₹1 lakh": "low", "₹1-3 lakh": "low-mid", "₹3-5 lakh": "mid", "₹5-10 lakh": "upper-mid", "Above ₹10 lakh": "high"
    };
    const financialBucket = incomeMap[d.annual_income] || "unknown";

    const risk = (d.risk_tolerance || "").toLowerCase().includes("high") ? "high" :
                 (d.risk_tolerance || "").toLowerCase().includes("medium") ? "medium" : "low";

    const schemes: string[] = ["PM-KISAN"];
    if (d.insurance_status?.includes("PMFBY") || d.insurance_status?.includes("Planning")) schemes.push("PMFBY");
    if (d.bank_account?.includes("KCC") || d.existing_loans?.includes("KCC")) schemes.push("KCC enhancement");
    if (d.bank_account?.includes("Jan Dhan")) schemes.push("PMJDY-linked subsidies");
    if (d.farming_type?.includes("Organic")) schemes.push("PKVY (Paramparagat Krishi Vikas Yojana)");
    if (d.water_source?.includes("Bore") || d.irrigation_type?.includes("Drip")) schemes.push("PMKSY (Per Drop More Crop)");

    const suitableCrops = climate.majorCrops.slice(0, 6);
    const districtSafe = d.district || "your district";
    const nearestMandi = `APMC ${districtSafe}`;
    const mandiKm = d.nearest_mandi_km || "unknown";

    const ph = parseFloat(d.soil_ph) || 7;
    const phScore = Math.max(0, 100 - Math.abs(ph - 6.5) * 20);
    const oc = parseFloat(d.organic_carbon) || 0.5;
    const ocScore = Math.min(100, oc * 100);
    const n = parseFloat(d.nitrogen) || 0;
    const p = parseFloat(d.phosphorus) || 0;
    const k = parseFloat(d.potassium) || 0;
    const npkScore = Math.min(100, ((n/280) + (p/50) + (k/280)) / 3 * 100);
    const soilHealth = Math.round((phScore + ocScore + npkScore) / 3);

    const cropList = (d.current_crops || "").split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    const diversification = Math.min(100, cropList.length * 25);

    const techPoints = (d.smartphone?.includes("Yes") ? 30 : 0) +
                       (d.internet_access && !d.internet_access.includes("No") ? 30 : 0) +
                       (d.equipment_owned ? 20 : 0) +
                       (d.tech_comfort?.includes("Very") ? 20 : d.tech_comfort?.includes("Somewhat") ? 10 : 0);

    const farmHealthScore = Math.round((soilHealth * 0.4 + diversification * 0.2 + techPoints * 0.2 + (financialBucket === "high" ? 100 : financialBucket === "upper-mid" ? 75 : financialBucket === "mid" ? 50 : 30) * 0.2));

    const context = {
      farmer_name: profile.full_name,
      location: { state, district: districtSafe, village: d.village, lat, lon },
      climate: { zone: climate.zone, rainfall: climate.rainfall, soils: climate.soils, majorCrops: climate.majorCrops, monsoon_stage: monsoonStage(), current_season: currentSeason() },
      crops: { current: cropList, suitable: suitableCrops },
      financial: { bucket: financialBucket, income: d.annual_income, monthly_investment: d.monthly_investment },
      risk_profile: risk,
      schemes_matched: schemes,
      nearest_mandi: { name: nearestMandi, distance_km: mandiKm },
      scores: { soil_health: soilHealth, diversification, tech_readiness: techPoints, farm_health: farmHealthScore },
      weather,
      ai_summary_seed: `${profile.full_name} farms ${d.total_land || "?"} acres of ${d.soil_type || climate.soils[0] || "soil"} in ${districtSafe}, growing ${cropList.join(", ") || "crops"}, water from ${d.water_source || "?"}, ${d.irrigation_type || "?"} irrigation, equipment: ${d.equipment_owned || "basic"}, livestock: ${d.livestock || "none"}, risk tolerance: ${risk}, primary goal: ${d.crop_priority || "balanced"}.`,
    };

    return new Response(JSON.stringify(context), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" },
    });
  } catch (e) {
    console.error("farmer-context error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
