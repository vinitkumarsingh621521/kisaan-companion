import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CATEGORY_QUERY: Record<string, string> = {
  All: "Indian agriculture farmers",
  Technology: "Indian agriculture technology agritech",
  Policy: "Indian agriculture policy government scheme",
  Market: "Indian agriculture mandi market price",
  Research: "Indian agriculture research ICAR",
  Climate: "Indian agriculture climate weather monsoon",
  Success: "Indian farmer success story",
};

const LANG_MAP: Record<string, { hl: string; ceid: string }> = {
  en: { hl: "en-IN", ceid: "IN:en" },
  hi: { hl: "hi", ceid: "IN:hi" },
  bn: { hl: "bn", ceid: "IN:bn" },
  ta: { hl: "ta", ceid: "IN:ta" },
  te: { hl: "te", ceid: "IN:te" },
};

function extract(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  return m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
}

export default defineTool({
  name: "get_agri_news",
  title: "Get Indian agriculture news",
  description:
    "Fetch recent Indian agriculture news headlines from Google News RSS, filtered by category and language.",
  inputSchema: {
    category: z
      .enum(["All", "Technology", "Policy", "Market", "Research", "Climate", "Success"])
      .default("All")
      .describe("News category."),
    language: z.enum(["en", "hi", "bn", "ta", "te"]).default("en").describe("Language code."),
    limit: z.number().int().min(1).max(20).default(8).describe("Max articles to return."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ category, language, limit }) => {
    const q = CATEGORY_QUERY[category] ?? CATEGORY_QUERY.All;
    const lang = LANG_MAP[language] ?? LANG_MAP.en;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${lang.hl}&gl=IN&ceid=${lang.ceid}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Google News ${r.status}`);
      const xml = await r.text();
      const items = xml.split("<item>").slice(1, limit + 1).map((chunk) => {
        const raw = "<item>" + chunk;
        return {
          title: extract(raw, "title"),
          url: extract(raw, "link"),
          date: extract(raw, "pubDate"),
          source: extract(raw, "source"),
        };
      });
      const summary = items.length
        ? items.map((a, i) => `${i + 1}. ${a.title} — ${a.source} (${a.date})\n   ${a.url}`).join("\n")
        : "No news articles found.";
      return { content: [{ type: "text", text: summary }], structuredContent: { category, language, articles: items } };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed to fetch news: ${(e as Error).message}` }], isError: true };
    }
  },
});
