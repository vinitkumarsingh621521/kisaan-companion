import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_daily_farming_tip",
  title: "Get daily farming tip",
  description:
    "Return a short, practical daily farming tip for an Indian smallholder farmer, optionally personalized by location, soil, and current crops.",
  inputSchema: {
    language: z
      .enum(["en", "hi", "bn", "ta", "te"])
      .default("en")
      .describe("Response language code."),
    location: z.string().optional().describe("Farm location (city / district / state)."),
    soil_type: z.string().optional().describe("Soil type, e.g. 'black cotton', 'alluvial'."),
    current_crops: z.string().optional().describe("Comma-separated list of crops currently grown."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ language, location, soil_type, current_crops }) => {
    const key = process.env.Groq_api_key_Rahul;
    const fallback = "Rotate crops every 2 seasons to keep soil nitrogen healthy.";
    if (!key) {
      return { content: [{ type: "text", text: fallback }], structuredContent: { tip: fallback, fallback: true } };
    }
    const farmerLine = `Indian smallholder farmer${location ? ` in ${location}` : ""}${soil_type ? `, soil: ${soil_type}` : ""}${current_crops ? `, crops: ${current_crops}` : ""}.`;
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: `Give ONE short practical farming tip (1 sentence, max 18 words) tailored for the user. Reply in language code: ${language}. No prefix, no emoji, just the tip.` },
            { role: "user", content: farmerLine },
          ],
          temperature: 0.8,
          max_tokens: 80,
        }),
      });
      const j = await r.json();
      const tip = j.choices?.[0]?.message?.content?.trim() || fallback;
      return { content: [{ type: "text", text: tip }], structuredContent: { tip } };
    } catch (e) {
      return { content: [{ type: "text", text: fallback }], structuredContent: { tip: fallback, fallback: true, error: (e as Error).message } };
    }
  },
});
