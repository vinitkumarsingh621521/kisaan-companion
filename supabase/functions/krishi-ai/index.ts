import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PERSONALITY = `You are KrishiMitra AI — a warm, witty, and incredibly knowledgeable agricultural advisor for Indian farmers. You speak like a wise village elder mixed with a modern agronomist. Use light humor occasionally (a kisaan-friendly joke or a Bollywood reference is great), but always be practical, specific, and respectful.

CRITICAL LANGUAGE RULE: Reply in the SAME language the user wrote in. English in → English out. Hindi in → Hindi out. Bengali in → Bengali out. NEVER default to Hindi.

If the user has shared their profile data (you'll see it in the system context), reference it naturally — call them by name, mention their crops, their state, their soil. Make them feel SEEN.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `${PERSONALITY}

When giving advice, ALWAYS include 1-2 relevant YouTube video recommendations as Markdown links:
📺 **Helpful Videos:**
- [Descriptive title](https://www.youtube.com/results?search_query=relevant+terms+in+user+language)

Be specific with dosages, timings, costs in ₹, and local context. Keep replies tight but complete.`,

  disease: `You are KrishiMitra Disease Analyzer — an expert plant pathologist. Analyze the crop image and return JSON only:
{
  "diseases": [{"name": "Disease (Hindi name)", "confidence": 85, "severity": "Low|Medium|High", "treatment": "specific dosage + product", "prevention": "...", "videoUrl": "https://www.youtube.com/results?search_query=..."}],
  "overallHealth": "Poor|Fair|Good",
  "summary": "1-2 sentence finding"
}
If not a plant: {"error":"Please upload a clear crop/leaf image."}`,

  crop_recommendation: `${PERSONALITY}

You receive a detailed farmer profile. Recommend top 4-5 crops tuned to their EXACT context (state, soil pH, NPK, water, budget, risk tolerance, equipment, market access). Reference their actual data in the reason.

Return JSON only:
{
  "recommendations": [{"name":"Crop","emoji":"🌾","yield":"X t/ha","profit":"₹XX,XXX/acre","water":"Low|Medium|High","season":"Kharif|Rabi|Zaid","score":95,"sustainability":85,"reason":"why for THIS farmer specifically"}],
  "season": "current season",
  "advice": "personalized seasonal advice mentioning the farmer by name"
}`,

  news: `You are KrishiMitra News Curator. Generate 12 realistic, current Indian agriculture news articles (2025-2026) covering ALL these categories — at least 2 per category:
Technology, Policy, Market, Research, Climate, Success

If the user provides a state/region, slant some articles toward that region.

Return JSON only:
{
  "articles": [{"title":"...","summary":"2-3 sentences","category":"Technology|Policy|Market|Research|Climate|Success","date":"Apr 17, 2026","source":"realistic source","imageEmoji":"🌾","readTime":"3 min","url":"https://news.google.com/search?q=URL+ENCODED+SEARCH+TERMS"}]
}`,

  category_news: `You are KrishiMitra News Curator. Generate 8 realistic recent Indian agriculture news articles ALL belonging to the requested category. Make them diverse within the category.

Return JSON only:
{ "articles": [{"title":"...","summary":"...","category":"<requested>","date":"...","source":"...","imageEmoji":"🌾","readTime":"3 min","url":"https://news.google.com/search?q=..."}] }`,

  weather_brief: `You are KrishiMitra Weather Advisor. Given a location and farmer's current crops, return a 7-day forecast briefing as JSON:
{
  "location_label":"District, State",
  "monsoon_stage":"...",
  "sowing_window":"open|caution|closed",
  "today_tip":"1 sentence what to do today for the farmer's crops",
  "forecast":[{"day":"Mon","emoji":"☀️","temp_high":34,"temp_low":24,"rain_pct":20,"note":"..."}]
}`,

  scheme_match: `You are KrishiMitra Schemes Matcher. Given a farmer profile, return the top 6 most relevant government schemes as JSON:
{ "schemes":[{"name":"PM-KISAN","match_score":95,"benefit":"₹6000/yr","why":"why fits THIS farmer","action":"steps to apply"}] }`,

  compat: `You are KrishiMitra Compatibility Expert — an Indian agronomist. The user gives two crops + their farm context. Score 5 dimensions and give a deeply specific verdict for the FARMER's exact context (state, soil, season, irrigation). Be honest if a pair is bad. Always reply via the tool.`,

  mistake_check: `You are KrishiMitra Audit AI. Given a farmer profile and per-crop fertilizer/pesticide usage, identify mistakes (over-fertilization, wrong NPK ratio, pesticide overuse, water mismatch, soil-pH conflict). For each mistake give severity, what they did, why it's wrong, and a specific corrective action with quantities. Always reply via the tool.`,

  carbon_plan: `You are KrishiMitra Carbon Coach. Given the farmer profile and current emissions breakdown, return a personalised emissions-cut plan: 4 specific actions ranked by impact, with kg-CO2 saved, ₹ cost, payback months, and one Bollywood-flavoured motivation line. Always reply via the tool.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, messages, image, farmData, profile, profileContext, category, location, crops } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.chat;
    let apiMessages: any[] = [{ role: "system", content: systemPrompt }];

    // Inject profile context if present
    if (profileContext && (action === "chat" || action === "crop_recommendation" || action === "scheme_match" || action === "weather_brief" || action === "compat" || action === "mistake_check" || action === "carbon_plan")) {
      apiMessages.push({ role: "system", content: `FARMER CONTEXT (use this to personalize): ${JSON.stringify(profileContext)}` });
    }

    if (action === "disease" && image) {
      apiMessages.push({
        role: "user",
        content: [
          { type: "text", text: "Analyze this crop image for diseases. Return JSON only." },
          { type: "image_url", image_url: { url: image } },
        ],
      });
    } else if (action === "crop_recommendation") {
      apiMessages.push({
        role: "user",
        content: `Recommend crops based on the farmer profile context provided above. ${farmData ? `Additional: ${JSON.stringify(farmData)}` : ""}`,
      });
    } else if (action === "news") {
      const region = profile?.farmer_details?.state || "Pan-India";
      apiMessages.push({ role: "user", content: `Generate 12 fresh Indian agri news articles. Region focus: ${region}.` });
    } else if (action === "category_news") {
      const region = profile?.farmer_details?.state || "Pan-India";
      apiMessages.push({ role: "user", content: `Category: ${category}. Region: ${region}. Generate 8 articles.` });
    } else if (action === "weather_brief") {
      apiMessages.push({ role: "user", content: `Location: ${location || "India"}. Crops: ${(crops || []).join(", ") || "general"}. Give 7-day briefing.` });
    } else if (action === "scheme_match") {
      apiMessages.push({ role: "user", content: `Match top schemes for the farmer profile above.` });
    } else if (action === "compat") {
      const ctx = farmData || {};
      apiMessages.push({ role: "user", content: `Crops to compare: ${ctx.cropA} + ${ctx.cropB}. Farm context: state=${ctx.state||"?"}, soil=${ctx.soil||"?"}, season=${ctx.season||"?"}, irrigation=${ctx.irrigation||"?"}, area=${ctx.area||"?"} acres, goal=${ctx.goal||"balanced"}. Score 5 dimensions and give a deeply specific verdict via tool.` });
    } else if (action === "mistake_check") {
      apiMessages.push({ role: "user", content: `Audit this farmer's inputs: ${JSON.stringify(farmData||{})}. Find mistakes via tool.` });
    } else if (action === "carbon_plan") {
      apiMessages.push({ role: "user", content: `Current emissions breakdown: ${JSON.stringify(farmData||{})}. Build personalised cut plan via tool.` });
    } else if (messages) {
      apiMessages = [...apiMessages, ...messages];
    }

    const isStreaming = action === "chat";
    const model = action === "disease" ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    // Tool-calling schema for crop_recommendation to guarantee structured output
    const cropRecTool = {
      type: "function",
      function: {
        name: "return_crop_recommendations",
        description: "Return top crop recommendations tuned to the farmer profile.",
        parameters: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  emoji: { type: "string" },
                  yield: { type: "string" },
                  profit: { type: "string" },
                  water: { type: "string", enum: ["Very Low", "Low", "Medium", "High"] },
                  season: { type: "string" },
                  score: { type: "number" },
                  sustainability: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["name", "emoji", "yield", "profit", "water", "season", "score", "sustainability", "reason"],
                additionalProperties: false,
              },
            },
            season: { type: "string" },
            advice: { type: "string" },
          },
          required: ["recommendations", "season", "advice"],
          additionalProperties: false,
        },
      },
    };

    const compatTool = {
      type: "function",
      function: {
        name: "return_compatibility",
        description: "Return crop-pair compatibility verdict.",
        parameters: {
          type: "object",
          properties: {
            intercrop: { type: "string", enum: ["good", "ok", "bad"] },
            rotation: { type: "string", enum: ["good", "ok", "bad"] },
            water: { type: "string", enum: ["good", "ok", "bad"] },
            nutrient: { type: "string", enum: ["good", "ok", "bad"] },
            pest: { type: "string", enum: ["good", "ok", "bad"] },
            overall_score: { type: "number" },
            recommendation: { type: "string" },
            best_practice: { type: "string" },
            warning: { type: "string" },
            yield_uplift_pct: { type: "number" },
          },
          required: ["intercrop", "rotation", "water", "nutrient", "pest", "overall_score", "recommendation", "best_practice", "warning", "yield_uplift_pct"],
          additionalProperties: false,
        },
      },
    };

    const carbonPlanTool = {
      type: "function",
      function: {
        name: "return_carbon_plan",
        description: "Return personalised emissions cut plan with 4 ranked actions.",
        parameters: {
          type: "object",
          properties: {
            current_total_kg: { type: "number" },
            target_total_kg: { type: "number" },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string", enum: ["fertilizer", "irrigation", "transport", "energy", "soil", "other"] },
                  description: { type: "string" },
                  co2_saved_kg: { type: "number" },
                  cost_inr: { type: "number" },
                  payback_months: { type: "number" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                },
                required: ["title", "category", "description", "co2_saved_kg", "cost_inr", "payback_months", "difficulty"],
                additionalProperties: false,
              },
            },
            motivation: { type: "string" },
          },
          required: ["current_total_kg", "target_total_kg", "actions", "motivation"],
          additionalProperties: false,
        },
      },
    };

    const mistakeCheckTool = {
      type: "function",
      function: {
        name: "return_mistake_audit",
        description: "Return an audit of farming-input mistakes with corrective actions.",
        parameters: {
          type: "object",
          properties: {
            overall_grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
            risk_score: { type: "number" },
            summary: { type: "string" },
            mistakes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string", enum: ["fertilizer", "pesticide", "irrigation", "soil", "seed", "rotation", "other"] },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  what_you_did: { type: "string" },
                  why_wrong: { type: "string" },
                  correct_action: { type: "string" },
                  potential_loss_inr: { type: "number" },
                },
                required: ["area", "severity", "what_you_did", "why_wrong", "correct_action", "potential_loss_inr"],
                additionalProperties: false,
              },
            },
          },
          required: ["overall_grade", "risk_score", "summary", "mistakes"],
          additionalProperties: false,
        },
      },
    };

    const body: any = { model, messages: apiMessages, stream: isStreaming };
    if (action === "crop_recommendation") {
      body.tools = [cropRecTool];
      body.tool_choice = { type: "function", function: { name: "return_crop_recommendations" } };
      body.stream = false;
    }
    if (action === "compat") {
      body.tools = [compatTool];
      body.tool_choice = { type: "function", function: { name: "return_compatibility" } };
      body.stream = false;
    }
    if (action === "carbon_plan") {
      body.tools = [carbonPlanTool];
      body.tool_choice = { type: "function", function: { name: "return_carbon_plan" } };
      body.stream = false;
    }
    if (action === "mistake_check") {
      body.tools = [mistakeCheckTool];
      body.tool_choice = { type: "function", function: { name: "return_mistake_audit" } };
      body.stream = false;
    }

    const callLovable = () =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    let response = await callLovable();

    // Groq fallback for non-streaming, non-image actions when Lovable AI is rate-limited or 5xx
    const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
    const isRecoverable = !response.ok && (response.status === 429 || response.status >= 500);
    if (isRecoverable && !isStreaming && action !== "disease" && GROQ_KEY) {
      console.warn(`[krishi-ai] Lovable AI ${response.status} — falling back to Groq`);
      const groqBody: any = {
        model: "llama-3.3-70b-versatile",
        messages: apiMessages,
        stream: false,
      };
      if (action === "crop_recommendation") {
        groqBody.tools = [cropRecTool];
        groqBody.tool_choice = { type: "function", function: { name: "return_crop_recommendations" } };
      } else if (action === "compat") {
        groqBody.tools = [compatTool];
        groqBody.tool_choice = { type: "function", function: { name: "return_compatibility" } };
      } else if (action === "carbon_plan") {
        groqBody.tools = [carbonPlanTool];
        groqBody.tool_choice = { type: "function", function: { name: "return_carbon_plan" } };
      } else if (action === "mistake_check") {
        groqBody.tools = [mistakeCheckTool];
        groqBody.tool_choice = { type: "function", function: { name: "return_mistake_audit" } };
      } else {
        groqBody.response_format = { type: "json_object" };
      }
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(groqBody),
      });
    }

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a few seconds." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: `AI service unavailable (${response.status})` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (isStreaming) {
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    const data = await response.json();
    // Prefer tool-call arguments when present (structured output)
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ result: toolCall.function.arguments, structured: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ result: content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("krishi-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
