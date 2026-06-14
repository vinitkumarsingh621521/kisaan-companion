import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const user = await requireUser(req);
  if (!user) return unauthorized(corsHeaders);

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

    const apiKey = Deno.env.get("DATA_GOV_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Mandi data service is not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    async function call(withState: boolean) {
      const u = new URL(`https://api.data.gov.in/resource/${RESOURCE_ID}`);
      u.searchParams.set("api-key", apiKey!);
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
    return new Response(JSON.stringify({ error: "Failed to fetch mandi prices" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
