import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, unauthorized } from "../_shared/auth.ts";

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

  soil: `You are KrishiMitra Soil Scientist — an expert pedologist for Indian agriculture. Analyze the provided soil photo. Return ONLY valid JSON, no markdown fences:
{"soilType":"Sandy Loam","phEstimate":"6.5-7.0","phMidpoint":6.7,"organicMatter":"Low","organicPct":1.2,"color":"Light Brown","hexColor":"#8B6914","texture":"loose and gritty","drainage":"Good","fertility":"Moderate","nitrogen":"Deficient","recommendations":[{"priority":1,"action":"Add 3 tons FYM per acre","reason":"boost organic carbon","cost":"₹1200"},{"priority":2,"action":"Apply urea 50kg/acre before sowing","reason":"fix nitrogen deficiency","cost":"₹550"},{"priority":3,"action":"Mulch with crop residue 5cm","reason":"reduce moisture loss","cost":"₹0"}],"cropSuitability":["Groundnut","Millets","Sorghum"],"avoidCrops":["Rice","Sugarcane"],"urgentAction":"Test soil moisture before next irrigation","confidence":72}`,

  crop_photo: `You are KrishiMitra Crop Vision AI. Analyze the provided crop photo. Return ONLY valid JSON:
{"cropDetected":"Rice","growthStage":"Vegetative","stagePercent":40,"healthScore":78,"healthStatus":"Healthy","visibleIssues":[],"nextAction":"Apply top-dress urea 20kg/acre within 7 days","daysToHarvest":55,"aiCaption":"Young paddy stands in rows, reaching upward with quiet determination."}`,

  pest_alert: `You are KrishiMitra Pest Intelligence AI. Generate a pest early warning report for an Indian farmer. Return ONLY valid JSON:
{"alerts":[{"pest":"Brown Plant Hopper","emoji":"🦟","risk":"High","riskScore":82,"cropAffected":"Rice","symptom":"yellowing at plant base, hopper burn patches","preventiveSpray":"Imidacloprid 17.8 SL @ 125ml in 200L water per acre","nextCheckDays":3}],"weeklyAdvisory":"paragraph of 2 sentences","weatherRiskNote":"one sentence about weather risk"}`,

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

  market_decision: `You are KrishiMitra Market Intelligence AI — an expert commodity analyst for Indian agriculture. Given crop, price, quantity and farmer context, determine optimal sell timing. Return ONLY valid JSON, no markdown:
{"decision":"SELL_NOW","decisionLabel":"Sell Within 3 Days","urgency":"high","confidence":78,"totalEarnings":237500,"netAfterFreight":231000,"reasons":["reason 1","reason 2","reason 3"],"risks":["risk 1","risk 2"],"bestMandi":"Lucknow APMC","optimalWindow":"Sell in next 3-4 days","alternativeOption":"Sell 60% now, hold 40% for possible 5% uptick","marketSentiment":"Bullish","adviceHindi":"वर्तमान कीमत MSP से 12% अधिक है।"}
decision MUST be one of: SELL_NOW, WAIT_3_DAYS, WAIT_WEEK, SELL_HALF, HOLD. marketSentiment MUST be Bullish, Bearish, or Neutral.`,

  prescription: `You are KrishiMitra Crop Scientist — an ICAR-certified agronomist. Generate a complete, precise, scientifically accurate farm prescription for Indian conditions using ICAR/KVK extension bulletins. Return ONLY valid JSON, no markdown fences, no explanation text:
{
  "prescriptionNumber": "KM-2026-001",
  "diagnosisSummary": "2-sentence diagnosis of current farm condition and main limiting factor",
  "overallHealthScore": 72,
  "severity": "Moderate",
  "fertilizer": {
    "baseApplication": [{"product": "DAP (18-46-0)", "dosePerAcre": "50 kg", "timing": "Basal — before sowing", "method": "Broadcast and incorporate to 5cm depth", "purpose": "Phosphorus + starter nitrogen for root establishment", "costPerAcre": "₹1,400"}],
    "topDressing": [{"product": "Urea (46-0-0)", "dosePerAcre": "25 kg", "timing": "21 DAS at CRI stage", "method": "Ring placement between rows, avoid leaf contact", "purpose": "Main nitrogen dose to support tillering", "costPerAcre": "₹275"}],
    "micronutrients": [{"product": "Zinc Sulphate 21%", "dosePerAcre": "5 kg", "timing": "Basal with DAP", "purpose": "Zinc deficiency very common in rice paddy soils", "costPerAcre": "₹180"}],
    "weeklySchedule": [{"week": 1, "label": "Basal", "nKg": 12, "pKg": 23, "kKg": 10, "action": "DAP + MOP broadcast before sowing"}],
    "totalCostPerAcre": "₹2,855"
  },
  "irrigation": {
    "totalWaterMm": 850,
    "criticalStages": ["Germination DAT 1-7", "CRI DAT 21"],
    "schedule": [{"week": "Week 1–2", "frequency": "Daily", "amountMm": 30, "stage": "Germination", "note": "Critical establishment"}],
    "waterSavingTip": "SRI method reduces water use 30%",
    "irrigationCostPerAcre": "₹1,200"
  },
  "pestControl": [{"pest": "Stem Borer", "riskLevel": "High", "timing": "25–30 DAS", "product": "Cartap Hydrochloride 4G", "dose": "8 kg/acre", "method": "Broadcast in standing water", "costPerAcre": "₹320"}],
  "harvestPlan": {
    "estimatedHarvestDate": "October 15–22",
    "harvestSignal": "When 85% grains turn golden yellow, moisture 20–22%",
    "postHarvestAction": "Dry to below 14% moisture within 72 hours",
    "expectedYieldRange": "18–22 quintal/acre",
    "recommendedMSP": "₹2,300/quintal"
  },
  "economics": {
    "totalInputCostPerAcre": "₹14,255",
    "expectedRevenuePerAcre": "₹46,000",
    "estimatedProfitPerAcre": "₹31,745",
    "roiPercent": 223,
    "breakEvenYield": "6.2 quintal/acre"
  },
  "dealerShoppingList": [{"item": "DAP (18-46-0)", "quantity": "50 kg", "estimatedCost": "₹1,400", "notes": "Buy ISI-marked bag only"}],
  "validForDays": 30,
  "aiConfidence": 84
}
Provide ALL fields. Use real Indian ICAR-recommended product names, doses per acre, and DAS timing. Adjust to crop, state, season, and reported issues.`,

  crop_compare: `You are KrishiMitra Crop Scientist — an ICAR-certified agronomist and agricultural economist. Compare two crops for a specific Indian farmer's context. Score each crop on exactly 6 scientific dimensions (0-100 scale) and give a verdict. Return ONLY valid JSON, no markdown:
{
  "cropA": {
    "name": "Rice", "emoji": "🌾",
    "scores": { "waterEfficiency": 35, "profitability": 82, "climateMatch": 91, "pestResistance": 42, "easeOfGrowing": 55, "marketStability": 88 },
    "totalScore": 66,
    "expectedIncomePerAcre": "₹42,000–₹48,000",
    "investmentPerAcre": "₹14,000",
    "netProfitPerAcre": "₹28,000–₹34,000",
    "waterRequirementMm": 1200,
    "laborDaysPerAcre": 45,
    "growthDays": 120,
    "msp": "₹2,300/qtl",
    "bestSeason": "Kharif (Jun–Nov)",
    "keyStrengths": ["Guaranteed MSP procurement", "Ideal for clay soil", "Strong buyer demand"],
    "keyRisks": ["High water need", "Stem borer risk", "Post-harvest loss if rain"],
    "soilVerdict": "Excellent — clay loam retains water ideal for paddy"
  },
  "cropB": {
    "name": "Maize", "emoji": "🌽",
    "scores": { "waterEfficiency": 72, "profitability": 61, "climateMatch": 78, "pestResistance": 68, "easeOfGrowing": 76, "marketStability": 52 },
    "totalScore": 68,
    "expectedIncomePerAcre": "₹28,000–₹34,000",
    "investmentPerAcre": "₹9,500",
    "netProfitPerAcre": "₹18,500–₹24,500",
    "waterRequirementMm": 500,
    "laborDaysPerAcre": 27,
    "growthDays": 90,
    "msp": "₹2,090/qtl",
    "bestSeason": "Kharif or Rabi",
    "keyStrengths": ["Water-efficient", "Lower labor cost", "Shorter growing period"],
    "keyRisks": ["Private buyer dependence", "Price volatile", "Aflatoxin risk in storage"],
    "soilVerdict": "Good — drains well in sandy loam"
  },
  "verdict": {
    "winner": "Rice", "winnerEmoji": "🌾", "loser": "Maize",
    "confidence": 76, "winMarginLabel": "Moderate advantage",
    "reasoning": "Context-specific 2-3 sentence reasoning",
    "bestForShortTerm": "Maize", "bestForShortTermReason": "Lower investment, faster harvest",
    "bestForLongTerm": "Rice", "bestForLongTermReason": "MSP-backed income security",
    "smartMix": "Grow Rice on 70% of land; Maize on 30% as a water-saving hedge",
    "financialGap": "Rice earns ₹8,000–₹12,000 more per acre",
    "breakEvenNote": "Rice breaks even at 6.2 qtl/acre vs Maize 12 qtl/acre"
  },
  "dimensionInsights": [
    { "dimension": "Water Efficiency", "icon": "💧", "cropALabel": "...", "cropBLabel": "...", "insight": "..." },
    { "dimension": "Profitability", "icon": "💰", "cropALabel": "...", "cropBLabel": "...", "insight": "..." },
    { "dimension": "Climate Match", "icon": "🌡️", "cropALabel": "...", "cropBLabel": "...", "insight": "..." },
    { "dimension": "Pest Resistance", "icon": "🐛", "cropALabel": "...", "cropBLabel": "...", "insight": "..." },
    { "dimension": "Ease of Growing", "icon": "👷", "cropALabel": "...", "cropBLabel": "...", "insight": "..." },
    { "dimension": "Market Stability", "icon": "📈", "cropALabel": "...", "cropBLabel": "...", "insight": "..." }
  ]
}
Score honestly based on the farmer's exact state, soil, water source, and season. Do not favor the more famous crop. Use real Indian mandi prices and state-specific schemes.`,
};

const DIRECT_GEMINI_ACTIONS = new Set(["mistake_check", "carbon_plan"]);

function toGeminiSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  const out: any = {};
  if (schema.type) out.type = String(schema.type).toUpperCase();
  if (schema.enum) out.enum = schema.enum;
  if (schema.description) out.description = schema.description;
  if (schema.required) out.required = schema.required;
  if (schema.items) out.items = toGeminiSchema(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }
  return out;
}

function contentToText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part?.text || "").filter(Boolean).join("\n");
  return JSON.stringify(content ?? "");
}

function extractJson(text: string): string {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

async function callGeminiStructured(apiMessages: any[], schema: any) {
  const key = Deno.env.get("GOOGLE_AI_STUDIO_API_KEY") || Deno.env.get("Gemini_API_Key_Rahul");
  if (!key) return null;

  const prompt = `${apiMessages.map((m) => `${String(m.role || "user").toUpperCase()}: ${contentToText(m.content)}`).join("\n\n")}\n\nReturn ONLY valid JSON matching this schema:\n${JSON.stringify(schema)}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.25,
      response_mime_type: "application/json",
      response_schema: toGeminiSchema(schema),
    },
  };

  for (const model of ["gemini-2.0-flash", "gemini-1.5-flash-latest"]) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.warn(`[krishi-ai] Gemini fallback ${model} failed:`, response.status, await response.text());
        continue;
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
      const json = extractJson(text);
      JSON.parse(json);
      return json;
    } catch (error) {
      console.warn(`[krishi-ai] Gemini fallback ${model} parse/call failed:`, error);
    }
  }
  return null;
}

async function callOpenAIStructured(apiMessages: any[], schema: any, schemaName: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: apiMessages,
      temperature: 0.25,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    console.warn("[krishi-ai] OpenAI fallback failed:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const json = extractJson(data?.choices?.[0]?.message?.content || "");
  JSON.parse(json);
  return json;
}

async function callHuggingFaceStructured(apiMessages: any[], schema: any) {
  const key = Deno.env.get("Hugging_face_token");
  if (!key) return null;

  const messages = [
    ...apiMessages,
    { role: "user", content: `Return ONLY valid JSON. Do not use markdown. JSON schema: ${JSON.stringify(schema)}` },
  ];

  for (const model of ["Qwen/Qwen2.5-7B-Instruct", "meta-llama/Llama-3.1-8B-Instruct"]) {
    try {
      const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 1200 }),
      });
      if (!response.ok) {
        console.warn(`[krishi-ai] Hugging Face fallback ${model} failed:`, response.status, await response.text());
        continue;
      }
      const data = await response.json();
      const json = extractJson(data?.choices?.[0]?.message?.content || "");
      JSON.parse(json);
      return json;
    } catch (error) {
      console.warn(`[krishi-ai] Hugging Face fallback ${model} parse/call failed:`, error);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const user = await requireUser(req);
  if (!user) return unauthorized(corsHeaders);

  try {
    const { action, messages, image, farmData, profile, profileContext, category, location, crops, cropHint } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
    } else if (action === "soil" && image) {
      apiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
          { type: "text", text: "Analyze this Indian farm soil photo. Return JSON only as specified." },
        ],
      });
    } else if (action === "crop_photo" && image) {
      const _cropHint = cropHint || "crop";
      apiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
          { type: "text", text: `Analyze this ${_cropHint} farm photo. Return JSON only.` },
        ],
      });
    } else if (action === "pest_alert") {
      apiMessages.push({ role: "user", content: messages?.[0]?.content || "Generate pest warning." });
    } else if (action === "market_decision") {
      apiMessages.push({ role: "user", content: messages?.[0]?.content || "Analyze sell decision." });
    } else if (action === "prescription") {
      apiMessages.push({ role: "user", content: messages?.[0]?.content || "Generate farm prescription." });
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
    const model = (action === "disease" || action === "soil" || action === "crop_photo")
      ? "google/gemini-2.5-flash"
      : "google/gemini-3-flash-preview";

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

    if (DIRECT_GEMINI_ACTIONS.has(action)) {
      const schema = action === "carbon_plan" ? carbonPlanTool.function.parameters : mistakeCheckTool.function.parameters;
      const geminiResult = await callGeminiStructured(apiMessages, schema);
      if (geminiResult) {
        return new Response(JSON.stringify({ result: geminiResult, structured: true, provider: "gemini" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const openAIResult = await callOpenAIStructured(apiMessages, schema, action === "carbon_plan" ? "carbon_plan" : "mistake_audit");
      if (openAIResult) {
        return new Response(JSON.stringify({ result: openAIResult, structured: true, provider: "openai" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const hfResult = await callHuggingFaceStructured(apiMessages, schema);
      if (hfResult) {
        return new Response(JSON.stringify({ result: hfResult, structured: true, provider: "huggingface" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const callLovable = () =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Lovable-API-Key": LOVABLE_API_KEY, "X-Lovable-AIG-SDK": "custom-fetch", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    let response = await callLovable();

    // Groq fallback for non-streaming, non-image actions when Lovable AI is out of credits, rate-limited, or 5xx
    const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
    const isRecoverable = !response.ok && (response.status === 402 || response.status === 429 || response.status >= 500);
    if (isRecoverable && !isStreaming && action !== "disease" && action !== "soil" && action !== "crop_photo" && GROQ_KEY) {
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
