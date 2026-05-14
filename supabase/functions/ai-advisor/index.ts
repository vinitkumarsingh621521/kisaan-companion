import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are KrishiMitra AI Advisor — the most comprehensive agri-consultant for Indian farmers. You receive a deep farmer profile (location, soil, crops, crop-wise acres, inputs, finance, goals) and return specific, actionable insights in STRUCTURED output via the provided tool. No prose. Use ₹ for money, t/ha or q/acre for yield, kg/acre for fertilizer/pesticide, and litres or mm for water. For every selected/planned crop, calculate seed need per acre + total seed, water need per acre, fertilizer dosage per acre, pesticide/IPM dosage per acre, season compatibility, and land-allocation advice. Reference the farmer's own numbers (district, soil pH, budget, acres) inside reason fields. Be honest about incompatibility and red flags.`;

const INSIGHT_TOOL = {
  type: "function",
  function: {
    name: "return_full_advisory",
    description: "Return 25 comprehensive farm insights.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ok", "partial"] },
        summary: { type: "string", description: "2-3 sentence personalized headline" },
        crop_suitability: {
          type: "object",
          properties: {
            chosen_crop: { type: "string" },
            score: { type: "number", description: "0-100" },
            verdict: { type: "string", enum: ["excellent", "good", "marginal", "poor"] },
            reason: { type: "string" },
          },
          required: ["chosen_crop", "score", "verdict", "reason"],
        },
        alternative_crops: {
          type: "array",
          description: "Top 5 alternatives",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              emoji: { type: "string" },
              score: { type: "number" },
              profit_per_acre: { type: "string" },
              reason: { type: "string" },
            },
            required: ["name", "emoji", "score", "profit_per_acre", "reason"],
          },
        },
        climate_risk: {
          type: "object",
          properties: {
            overall: { type: "string", enum: ["low", "medium", "high"] },
            heat: { type: "string" },
            frost: { type: "string" },
            flood: { type: "string" },
            drought: { type: "string" },
          },
          required: ["overall", "heat", "frost", "flood", "drought"],
        },
        input_requirements: {
          type: "array",
          description: "For every planned/current crop: exact per-acre and total input requirements.",
          items: {
            type: "object",
            properties: {
              crop: { type: "string" },
              area_acres: { type: "number" },
              seed_per_acre: { type: "string" },
              total_seed: { type: "string" },
              water_per_acre: { type: "string" },
              fertilizer_per_acre: { type: "string" },
              pesticide_per_acre: { type: "string" },
              irrigation_schedule: { type: "string" },
              notes: { type: "string" },
            },
            required: ["crop", "area_acres", "seed_per_acre", "total_seed", "water_per_acre", "fertilizer_per_acre", "pesticide_per_acre", "irrigation_schedule", "notes"],
          },
        },
        land_allocation_review: {
          type: "object",
          properties: {
            total_planned_acres: { type: "number" },
            unallocated_acres: { type: "number" },
            summary: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["total_planned_acres", "unallocated_acres", "summary", "recommendations"],
        },
        compatibility_notes: { type: "array", description: "Season, soil, water and rotation compatibility warnings or confirmations.", items: { type: "string" } },
        soil_plan: { type: "object", properties: { action: { type: "string" }, dosage: { type: "string" }, why: { type: "string" } }, required: ["action", "dosage", "why"] },
        irrigation_plan: { type: "object", properties: { method: { type: "string" }, schedule: { type: "string" }, water_saving_pct: { type: "number" } }, required: ["method", "schedule", "water_saving_pct"] },
        fertilizer_plan: { type: "object", properties: { npk_kg_per_acre: { type: "string" }, timing: { type: "string" }, brands: { type: "array", items: { type: "string" } }, organic_alt: { type: "string" } }, required: ["npk_kg_per_acre", "timing", "brands", "organic_alt"] },
        pesticide_plan: { type: "object", properties: { needed: { type: "boolean" }, products: { type: "array", items: { type: "string" } }, ipm_alternative: { type: "string" } }, required: ["needed", "products", "ipm_alternative"] },
        cost_breakdown: {
          type: "object",
          properties: {
            seed: { type: "string" },
            labour: { type: "string" },
            machinery: { type: "string" },
            transport: { type: "string" },
            total_per_acre: { type: "string" },
            total: { type: "string" },
          },
          required: ["seed", "labour", "machinery", "transport", "total_per_acre", "total"],
        },
        yield_forecast: { type: "object", properties: { low: { type: "string" }, expected: { type: "string" }, high: { type: "string" } }, required: ["low", "expected", "high"] },
        revenue_forecast: { type: "object", properties: { gross: { type: "string" }, net_profit: { type: "string" }, roi_pct: { type: "number" }, break_even_per_quintal: { type: "string" } }, required: ["gross", "net_profit", "roi_pct", "break_even_per_quintal"] },
        sowing_window: { type: "string" },
        harvest_window: { type: "string" },
        market_strategy: { type: "object", properties: { channel: { type: "string" }, best_month: { type: "string" }, reason: { type: "string" } }, required: ["channel", "best_month", "reason"] },
        schemes: { type: "array", items: { type: "object", properties: { name: { type: "string" }, benefit: { type: "string" }, fit_reason: { type: "string" } }, required: ["name", "benefit", "fit_reason"] } },
        insurance: { type: "object", properties: { recommended: { type: "string" }, sum_insured: { type: "string" }, premium: { type: "string" } }, required: ["recommended", "sum_insured", "premium"] },
        sustainability: { type: "object", properties: { score: { type: "number" }, improvement: { type: "string" } }, required: ["score", "improvement"] },
        water_footprint: { type: "string" },
        tips: { type: "array", description: "5 ranked actionable tips", items: { type: "string" } },
        red_flags: { type: "array", items: { type: "string" } },
      },
      required: [
        "status", "summary", "crop_suitability", "alternative_crops", "climate_risk", "input_requirements", "land_allocation_review", "compatibility_notes", "soil_plan",
        "irrigation_plan", "fertilizer_plan", "pesticide_plan", "cost_breakdown", "yield_forecast",
        "revenue_forecast", "sowing_window", "harvest_window", "market_strategy", "schemes",
        "insurance", "sustainability", "water_footprint", "tips", "red_flags",
      ],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { inputs, profileContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "system", content: `FARMER CONTEXT: ${JSON.stringify(profileContext || {})}` },
      { role: "user", content: `Generate the full 25-field advisory for this farmer. USER INPUTS: ${JSON.stringify(inputs || {})}` },
    ];

    const callLovable = (model: string) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          tools: [INSIGHT_TOOL],
          tool_choice: { type: "function", function: { name: "return_full_advisory" } },
        }),
      });

    const callGroq = () =>
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          tools: [INSIGHT_TOOL],
          tool_choice: { type: "function", function: { name: "return_full_advisory" } },
        }),
      });

    // Try Lovable AI primary → secondary, then Groq fallback
    let resp = await callLovable("google/gemini-2.5-pro");
    if (!resp.ok && resp.status !== 402) {
      console.warn(`[ai-advisor] gemini-2.5-pro ${resp.status} — trying gpt-5-mini`);
      resp = await callLovable("openai/gpt-5-mini");
    }
    if (!resp.ok && resp.status !== 402 && GROQ_KEY) {
      console.warn(`[ai-advisor] Lovable AI ${resp.status} — falling back to Groq`);
      resp = await callGroq();
    }

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("ai-advisor gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: `AI service unavailable (${resp.status})` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      // Last resort: try to use raw content if it's already JSON
      const content = data.choices?.[0]?.message?.content || "";
      try {
        JSON.parse(content);
        return new Response(content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        throw new Error("No structured output returned");
      }
    }
    return new Response(args, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
