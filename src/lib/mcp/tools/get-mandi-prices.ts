import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

export default defineTool({
  name: "get_mandi_prices",
  title: "Get mandi prices",
  description:
    "Fetch latest wholesale (mandi) prices for a crop from the Government of India data.gov.in API. Returns recent price records across mandis, optionally filtered by state.",
  inputSchema: {
    crop: z.string().min(1).describe("Commodity name, e.g. 'Onion', 'Wheat', 'Tomato'."),
    state: z.string().optional().describe("Optional Indian state name to filter by, e.g. 'Maharashtra'."),
    limit: z.number().int().min(1).max(50).default(10).describe("Max records to return (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ crop, state, limit }) => {
    const apiKey = process.env.DATA_GOV_API_KEY;
    if (!apiKey) {
      return { content: [{ type: "text", text: "Mandi data service is not configured (missing DATA_GOV_API_KEY)." }], isError: true };
    }
    const call = async (withState: boolean) => {
      const u = new URL(`https://api.data.gov.in/resource/${RESOURCE_ID}`);
      u.searchParams.set("api-key", apiKey);
      u.searchParams.set("format", "json");
      u.searchParams.set("limit", String(limit));
      u.searchParams.set("filters[commodity]", crop);
      if (withState && state) u.searchParams.set("filters[state]", state);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(u.toString(), { signal: ctrl.signal });
        if (!r.ok) throw new Error(`data.gov.in ${r.status}`);
        return await r.json();
      } finally {
        clearTimeout(t);
      }
    };
    try {
      let data = await call(true);
      if (!data.records?.length && state) {
        try { data = await call(false); } catch { /* keep */ }
      }
      const records = (data.records ?? []) as Array<Record<string, unknown>>;
      const summary = records.length
        ? records
            .map((r) => `${r.market ?? "?"} (${r.state ?? "?"}) — ${r.commodity ?? crop} ${r.variety ?? ""}: modal ₹${r.modal_price ?? "?"} / min ₹${r.min_price ?? "?"} / max ₹${r.max_price ?? "?"} on ${r.arrival_date ?? "?"}`)
            .join("\n")
        : `No mandi records found for ${crop}${state ? ` in ${state}` : ""}.`;
      return {
        content: [{ type: "text", text: summary }],
        structuredContent: { crop, state: state ?? null, count: records.length, records },
      };
    } catch (e) {
      return { content: [{ type: "text", text: `Failed to fetch mandi prices: ${(e as Error).message}` }], isError: true };
    }
  },
});
