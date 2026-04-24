import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { language = "en", profile } = await req.json().catch(() => ({}));
    const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
    if (!GROQ_KEY) throw new Error("Groq API key missing");

    const farmerLine = profile
      ? `Farmer ${profile.full_name || ""}, ${profile.farm_location || "India"}, soil: ${profile.soil_type || "?"}, crops: ${profile?.farmer_details?.current_crops || "?"}.`
      : "Indian smallholder farmer.";

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Give ONE short practical farming tip (1 sentence, max 18 words) tailored for the user. Reply in language code: ${language}. No prefix, no emoji, just the tip.`,
          },
          { role: "user", content: farmerLine },
        ],
        temperature: 0.8,
        max_tokens: 80,
      }),
    });

    const j = await r.json();
    const tip = j.choices?.[0]?.message?.content?.trim() || "Check soil moisture before sunset for best irrigation timing.";

    return new Response(JSON.stringify({ tip }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ tip: "Rotate crops every 2 seasons to keep soil nitrogen healthy." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
