import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Approx state-level annual rainfall (mm) and dominant soil type for autofill hints
const STATE_HINTS: Record<string, { rainfall: number; soil: string; zone: string }> = {
  "Punjab": { rainfall: 600, soil: "Alluvial", zone: "Sub-tropical semi-arid" },
  "Haryana": { rainfall: 550, soil: "Alluvial", zone: "Semi-arid" },
  "Uttar Pradesh": { rainfall: 900, soil: "Alluvial", zone: "Sub-tropical" },
  "Bihar": { rainfall: 1200, soil: "Alluvial", zone: "Sub-tropical humid" },
  "West Bengal": { rainfall: 1700, soil: "Alluvial", zone: "Tropical humid" },
  "Maharashtra": { rainfall: 1100, soil: "Black", zone: "Semi-arid to sub-humid" },
  "Gujarat": { rainfall: 800, soil: "Black", zone: "Semi-arid" },
  "Rajasthan": { rainfall: 350, soil: "Sandy", zone: "Arid" },
  "Madhya Pradesh": { rainfall: 1100, soil: "Black", zone: "Sub-tropical" },
  "Karnataka": { rainfall: 1100, soil: "Red", zone: "Tropical to semi-arid" },
  "Tamil Nadu": { rainfall: 950, soil: "Red", zone: "Tropical" },
  "Andhra Pradesh": { rainfall: 950, soil: "Red", zone: "Tropical" },
  "Telangana": { rainfall: 900, soil: "Red", zone: "Semi-arid" },
  "Kerala": { rainfall: 3000, soil: "Laterite", zone: "Tropical humid" },
  "Odisha": { rainfall: 1500, soil: "Red", zone: "Tropical" },
  "Jharkhand": { rainfall: 1300, soil: "Red Laterite", zone: "Sub-tropical" },
  "Chhattisgarh": { rainfall: 1400, soil: "Red", zone: "Sub-tropical" },
  "Assam": { rainfall: 2500, soil: "Alluvial", zone: "Sub-tropical humid" },
  "Himachal Pradesh": { rainfall: 1250, soil: "Mountain", zone: "Temperate" },
  "Uttarakhand": { rainfall: 1800, soil: "Mountain", zone: "Sub-tropical to temperate" },
  "Goa": { rainfall: 3000, soil: "Laterite", zone: "Tropical humid" },
  "Manipur": { rainfall: 1500, soil: "Red Loamy", zone: "Sub-tropical" },
  "Meghalaya": { rainfall: 4000, soil: "Laterite", zone: "Sub-tropical humid" },
  "Mizoram": { rainfall: 2500, soil: "Red Loamy", zone: "Sub-tropical" },
  "Nagaland": { rainfall: 2000, soil: "Forest", zone: "Sub-tropical" },
  "Tripura": { rainfall: 2000, soil: "Alluvial", zone: "Sub-tropical humid" },
  "Arunachal Pradesh": { rainfall: 2800, soil: "Mountain", zone: "Temperate" },
  "Sikkim": { rainfall: 2500, soil: "Mountain", zone: "Temperate" },
  "Jammu and Kashmir": { rainfall: 700, soil: "Mountain", zone: "Temperate" },
  "Ladakh": { rainfall: 100, soil: "Cold desert", zone: "Cold arid" },
  "Delhi": { rainfall: 700, soil: "Alluvial", zone: "Semi-arid" },
  "Chandigarh": { rainfall: 1000, soil: "Alluvial", zone: "Sub-tropical" },
  "Puducherry": { rainfall: 1300, soil: "Alluvial", zone: "Tropical" },
  "Andaman and Nicobar Islands": { rainfall: 3000, soil: "Forest", zone: "Tropical humid" },
  "Lakshadweep": { rainfall: 1600, soil: "Coral sandy", zone: "Tropical" },
  "Dadra and Nagar Haveli and Daman and Diu": { rainfall: 2000, soil: "Coastal alluvium", zone: "Tropical humid" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { pincode } = await req.json();
    const pin = String(pincode || "").trim();
    if (!/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: "Invalid PIN — must be 6 digits" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. India Post API (no key)
    const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const j = await r.json();
    const post = j?.[0]?.PostOffice?.[0];
    if (!post) {
      return new Response(JSON.stringify({ error: "PIN not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const state = post.State as string;
    const district = post.District as string;
    const village = post.Block || post.Name;
    const offices = (j[0].PostOffice as any[]).map((p) => p.Name).slice(0, 8);

    // 2. Get coords via Open-Meteo geocoder
    let lat = 0, lon = 0;
    try {
      const g = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(`${district}, ${state}, India`)}&count=1&language=en&format=json`
      );
      const gj = await g.json();
      if (gj?.results?.[0]) {
        lat = gj.results[0].latitude;
        lon = gj.results[0].longitude;
      }
    } catch { /* ignore */ }

    const hint = STATE_HINTS[state] || { rainfall: 1000, soil: "Mixed", zone: "Sub-tropical" };

    return new Response(JSON.stringify({
      pincode: pin,
      state,
      district,
      village,
      nearby: offices,
      lat, lon,
      annual_rainfall: hint.rainfall,
      soil_hint: hint.soil,
      climate_zone: hint.zone,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "lookup failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
