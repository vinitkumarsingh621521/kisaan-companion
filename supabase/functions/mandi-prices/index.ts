import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";
const PUBLIC_FALLBACK = "579b464db66ec23bdd000001cdd3084b34264d06e3aa6bece006ccee";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const crop = url.searchParams.get("crop") || "";
    const state = url.searchParams.get("state") || "";
    const limit = url.searchParams.get("limit") || "5";

    if (!crop) {
      return new Response(JSON.stringify({ error: "crop required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("DATA_GOV_API_KEY") || PUBLIC_FALLBACK;

    async function call(withState: boolean) {
      const u = new URL(`https://api.data.gov.in/resource/${RESOURCE_ID}`);
      u.searchParams.set("api-key", apiKey);
      u.searchParams.set("format", "json");
      u.searchParams.set("limit", limit);
      u.searchParams.set("filters[commodity]", crop);
      if (withState && state) u.searchParams.set("filters[state]", state);
      const r = await fetch(u.toString());
      if (!r.ok) throw new Error(`data.gov.in ${r.status}`);
      return r.json();
    }

    let data = await call(true);
    if (!data.records?.length && state) data = await call(false);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mandi-prices error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
