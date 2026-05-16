// agri-news — real Indian agriculture news from Google News RSS (no API key needed)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_QUERY: Record<string, string> = {
  All: "Indian agriculture farmers",
  Technology: "Indian agriculture technology agritech",
  Policy: "Indian agriculture policy government scheme",
  Market: "Indian agriculture mandi market price",
  Research: "Indian agriculture research ICAR",
  Climate: "Indian agriculture climate weather monsoon",
  Success: "Indian farmer success story",
};

const CATEGORY_EMOJI: Record<string, string> = {
  All: "🌾", Technology: "💡", Policy: "📜", Market: "📈",
  Research: "🔬", Climate: "🌧️", Success: "🏆",
};

// hl/gl/ceid hints for Google News in user's language
const LANG_MAP: Record<string, { hl: string; ceid: string }> = {
  en: { hl: "en-IN", ceid: "IN:en" },
  hi: { hl: "hi", ceid: "IN:hi" },
  bn: { hl: "bn", ceid: "IN:bn" },
  ta: { hl: "ta", ceid: "IN:ta" },
  te: { hl: "te", ceid: "IN:te" },
};

interface Article {
  title: string; summary: string; category: string; date: string;
  source: string; imageEmoji: string; readTime: string; url: string;
}

// In-memory cache (per isolate, 10 min)
const cache = new Map<string, { at: number; articles: Article[] }>();
const TTL_MS = 10 * 60 * 1000;

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}
function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}
function readTime(text: string): string {
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
}
function relDate(pub: string): string {
  const d = new Date(pub);
  if (isNaN(d.getTime())) return pub;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

async function fetchOne(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function parseRss(xml: string, category: string, fallbackSource: string): Article[] {
  const items = [...xml.matchAll(/<item[\s\S]*?>([\s\S]*?)<\/item>/g)].map(m => m[1]);
  const out: Article[] = [];
  for (const item of items.slice(0, 14)) {
    const title = stripTags((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
    const link = decode((item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "")
      || decode((item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1] || "");
    const pubDate = decode((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "");
    const desc = stripTags((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "");
    const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const source = sourceMatch ? stripTags(sourceMatch[1]) : fallbackSource;
    if (!title || !link) continue;
    let summary = desc.replace(title, "").trim();
    if (summary.length < 40) summary = desc;
    if (summary.length > 220) summary = summary.slice(0, 217) + "…";
    out.push({
      title,
      summary: summary || title,
      category,
      date: relDate(pubDate),
      source,
      imageEmoji: CATEGORY_EMOJI[category] || "🌾",
      readTime: readTime(desc || title),
      url: link,
    });
  }
  return out;
}

async function fetchRss(category: string, lang: string, state?: string): Promise<Article[]> {
  const base = CATEGORY_QUERY[category] || CATEGORY_QUERY.All;
  const q = state ? `${base} ${state}` : base;
  const { hl, ceid } = LANG_MAP[lang] || LANG_MAP.en;

  const attempts: { url: string; src: string }[] = [
    { url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=IN&ceid=${ceid}`, src: "Google News" },
    { url: `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&cc=IN`, src: "Bing News" },
    // r.jina.ai proxy as last resort — fetches any URL and returns text
    { url: `https://r.jina.ai/https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=IN&ceid=${ceid}`, src: "Google News" },
  ];

  for (const { url, src } of attempts) {
    try {
      const xml = await fetchOne(url);
      const items = parseRss(xml, category, src);
      if (items.length) return items;
    } catch (_e) {
      // try next
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }
    const category = String(body.category || url.searchParams.get("category") || "All");
    const lang = String(body.lang || url.searchParams.get("lang") || "en");
    const state = (body.state || url.searchParams.get("state") || "") as string;
    const force = body.force === true || url.searchParams.get("force") === "1";

    const key = `${category}|${lang}|${state || ""}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (!force && hit && now - hit.at < TTL_MS) {
      return new Response(JSON.stringify({ articles: hit.articles, fetchedAt: hit.at, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const articles = await fetchRss(category, lang, state);
    cache.set(key, { at: now, articles });
    return new Response(JSON.stringify({ articles, fetchedAt: now, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Failed to fetch news", articles: [] }), {
      status: 200, // soft-fail so UI can show empty state
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
