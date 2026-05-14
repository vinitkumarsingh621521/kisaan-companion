import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Search a place name → returns lat/lon. Tries Bhuvan (ISRO) village geocoder first
// (uses Bhuvan API token from Supabase secrets), falls back to Nominatim (OSM).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query } = await req.json().catch(() => ({}));
    const q = String(query || "").trim();
    if (!q) {
      return new Response(JSON.stringify({ error: "Provide 'query'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const out: any = { query: q, results: [], providers: [] };
    const BHUVAN = Deno.env.get("bhuvanisroapikey");

    // 1) Bhuvan village geocoder (best for India village/district granularity)
    if (BHUVAN) {
      try {
        const url = `https://bhuvan-app1.nrsc.gov.in/api/proximity/curl_proximity_villname.php?villname=${encodeURIComponent(q)}&token=${BHUVAN}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
        if (r.ok) {
          const text = await r.text();
          // Bhuvan often returns JSON-as-text or csv; try parse loosely
          try {
            const j = JSON.parse(text);
            const arr = Array.isArray(j) ? j : (j.results || j.records || []);
            for (const row of arr.slice(0, 5)) {
              const lat = parseFloat(row.lat || row.latitude || row.LAT);
              const lon = parseFloat(row.lon || row.lng || row.long || row.longitude || row.LON);
              if (isFinite(lat) && isFinite(lon)) {
                out.results.push({
                  label: row.village || row.name || row.placename || q,
                  state: row.state || row.STATE || "",
                  district: row.district || row.DISTRICT || "",
                  lat, lon, source: "bhuvan",
                });
              }
            }
            out.providers.push({ provider: "bhuvan", count: out.results.length });
          } catch {
            out.providers.push({ provider: "bhuvan", count: 0, note: "non-JSON response" });
          }
        } else {
          out.providers.push({ provider: "bhuvan", error: `HTTP ${r.status}` });
        }
      } catch (e: any) {
        out.providers.push({ provider: "bhuvan", error: e?.message || "fetch failed" });
      }
    } else {
      out.providers.push({ provider: "bhuvan", error: "BHUVAN api key not set" });
    }

    // 2) Fallback to Nominatim
    if (out.results.length === 0) {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`,
          { headers: { "User-Agent": "KrishiMitra/1.0" }, signal: AbortSignal.timeout(7000) }
        );
        if (r.ok) {
          const arr = await r.json();
          for (const row of arr) {
            out.results.push({
              label: row.display_name,
              state: "", district: "",
              lat: parseFloat(row.lat), lon: parseFloat(row.lon), source: "nominatim",
            });
          }
          out.providers.push({ provider: "nominatim", count: arr.length });
        }
      } catch (e: any) {
        out.providers.push({ provider: "nominatim", error: e?.message || "fetch failed" });
      }
    }

    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "geocode failed", results: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
