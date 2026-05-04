import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are "Dowry Reality Check 3000" — a brutally sarcastic, savage Indian aunty/uncle hybrid AI roast-bot whose ONLY purpose is to humiliate people who think dowry is acceptable, while delivering a hard legal & moral wake-up call.

Your tone:
- Sarcastic. Funny. Savage. Desi-flavoured (use Hinglish phrases like "beta", "saheb", "nautanki", "chai pe charcha", "gali ka raja").
- ALWAYS anti-dowry. Demanding/taking dowry is a CRIME under Dowry Prohibition Act 1961 (5 yr jail + ₹15,000 fine min) and Section 498A IPC (up to 3 yr jail, non-bailable).
- Use the farmer's actual data (land, cows, income, education, profit) to compute a small, embarrassing "market value".
- The estimated number must ALWAYS be LOWER than the user's expectation — humiliate them for over-estimating themselves.
- If they expected ₹X, return roughly X * 0.05 to X * 0.25 (max). Never higher than 25%.
- Mock specific things: small landholding, no education, low cattle count, dependence on subsidies, etc.
- End with a serious legal warning + a redemption suggestion.

You MUST reply via the return_dowry_verdict tool. No prose outside the tool.`;

const tool = {
  type: "function",
  function: {
    name: "return_dowry_verdict",
    description: "Return savage dowry roast verdict",
    parameters: {
      type: "object",
      properties: {
        estimated_inr: { type: "number", description: "Sarcastic market value in rupees, MUST be much lower than user expectation" },
        user_expected_inr: { type: "number" },
        reality_gap_pct: { type: "number", description: "How much lower than expectation, e.g. -85" },
        roast_title: { type: "string", description: "1-line savage title, e.g. 'Bhai, ₹2 lakh mein toh mobile bhi nahi aata'" },
        roast_paragraphs: {
          type: "array",
          items: { type: "string" },
          description: "3-5 paragraphs of sarcastic, humiliating breakdown using the user's actual answers. Reference specific numbers (land, cows, income). Cite their over-confidence cruelly."
        },
        breakdown: {
          type: "array",
          description: "Itemised insulting calculation",
          items: {
            type: "object",
            properties: {
              factor: { type: "string", description: "e.g. 'Land area (2 acres)', 'Cattle (1 cow named Lakshmi)'" },
              contribution_inr: { type: "number" },
              snark: { type: "string", description: "1 sarcastic line about this factor" }
            },
            required: ["factor", "contribution_inr", "snark"]
          }
        },
        legal_warning: {
          type: "object",
          properties: {
            sections: { type: "array", items: { type: "string" }, description: "e.g. 'Dowry Prohibition Act 1961 §3', 'IPC §498A', 'IPC §304B'" },
            jail_years: { type: "string", description: "e.g. '5 years minimum, up to life if dowry death'" },
            fine_inr: { type: "string" },
            consequences: { type: "array", items: { type: "string" }, description: "Real-life consequences: criminal record, no govt job, social boycott, divorce, etc." }
          },
          required: ["sections", "jail_years", "fine_inr", "consequences"]
        },
        redemption_path: {
          type: "array",
          items: { type: "string" },
          description: "3 specific things they can do instead — e.g. 'Donate that ₹X to a girls-education NGO and earn karma + 80G tax relief'"
        },
        final_savage_line: { type: "string", description: "One unforgettable closing burn" }
      },
      required: ["estimated_inr", "user_expected_inr", "reality_gap_pct", "roast_title", "roast_paragraphs", "breakdown", "legal_warning", "redemption_path", "final_savage_line"]
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { answers, profile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userMsg = `FARMER PROFILE: ${JSON.stringify(profile || {})}
USER'S ANSWERS TO 30+ QUESTIONS: ${JSON.stringify(answers || {})}

The user expects: ₹${answers?.expected_dowry || "unknown"}.

Compute the SAVAGE roast verdict. The estimated value must be DRAMATICALLY lower than what they expected. Use their real land, cattle, income, education numbers in the roast. Be merciless but legally accurate. Reply ONLY via the tool.`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "return_dowry_verdict" } },
      stream: false,
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("dowry-estimate AI error", r.status, t);
      if (r.status === 429) return new Response(JSON.stringify({ error: "Slow down, dowry-demander. Try again in 30 sec." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits over. Even AI doesn't want to waste rupees on you." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI service down" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = tc?.function?.arguments;
    if (!argsStr) {
      return new Response(JSON.stringify({ error: "No verdict generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const verdict = JSON.parse(argsStr);
    return new Response(JSON.stringify({ verdict }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("dowry-estimate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
