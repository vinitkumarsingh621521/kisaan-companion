import { defineMcp } from "@lovable.dev/mcp-js";
import getMandiPrices from "./tools/get-mandi-prices";
import getDailyTip from "./tools/get-daily-tip";
import getAgriNews from "./tools/get-agri-news";

export default defineMcp({
  name: "krishimate-mcp",
  title: "KrishiMate Hub MCP",
  version: "0.1.0",
  instructions:
    "Tools for Indian agriculture: fetch live mandi (wholesale) prices, get a personalized daily farming tip, and read recent Indian agriculture news headlines. Use these when the user asks about crop prices, market rates, farming advice, or agri news in India.",
  tools: [getMandiPrices, getDailyTip, getAgriNews],
});
