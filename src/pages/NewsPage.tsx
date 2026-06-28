import ColorfulPageBanner from "@/components/ColorfulPageBanner";
import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { Newspaper, RefreshCw, ExternalLink, Filter, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { errMsg } from "@/lib/errors";
import {
  Bookmark, BookmarkCheck, Zap,
  TrendingUp, Radio, ChevronDown, ChevronUp,
  Share2, Clock, Sparkles,
} from "lucide-react";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

interface Article {
  title: string; summary: string; category: string; date: string;
  source: string; imageEmoji: string; readTime: string; url: string;
  impactLevel?: "high" | "medium" | "low" | null;
  impactReason?: string;
}

const CATEGORIES = ["All", "Technology", "Policy", "Market", "Research", "Climate", "Success"];

const categoryColors: Record<string, string> = {
  Technology: "bg-primary/10 text-primary",
  Policy: "bg-krishi-gold-light text-krishi-gold",
  Market: "bg-krishi-sky-light text-krishi-sky",
  Research: "bg-accent text-accent-foreground",
  Climate: "bg-destructive/10 text-destructive",
  Success: "bg-krishi-green-light text-krishi-green",
  All: "bg-muted text-muted-foreground",
};

function fmtFetchedAt(ts: number | null): string {
  if (!ts) return "";
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)} hr ago`;
}

export default function NewsPage() {
  const { active } = useActiveProfile();
  const { i18n, t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  const [digest, setDigest] = useState<string | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [scoredArticles, setScoredArticles] = useState<Article[]>([]);
  const [scoringDone, setScoringDone] = useState(false);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [articleInsight, setArticleInsight] = useState<Record<string, string>>({});
  const [insightLoading, setInsightLoading] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem("km.news.bookmarks");
      return new Set(s ? JSON.parse(s) : []);
    } catch { return new Set(); }
  });
  const [activeTab, setActiveTab] = useState<"feed" | "saved">("feed");
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchNews = useCallback(
    async (cat: string, force = false) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("agri-news", {
          body: {
            category: cat,
            lang: i18n.language || "en",
            state: active?.farmer_details?.state || "",
            force,
          },
        });
        if (error) throw error;
        const list: Article[] = (data as any)?.articles || [];
        setArticles(list);
        setFetchedAt((data as any)?.fetchedAt || Date.now());
        if (force) toast.success(t("news.refreshed", "Fetched latest headlines"));
        if (!list.length) toast.message(t("news.empty", "No headlines right now — try another category"));
      } catch (e: unknown) {
        toast.error(errMsg(e) || t("news.failed", "Failed to load news"));
      } finally {
        setLoading(false);
      }
    },
    [active?.farmer_details?.state, i18n.language, t],
  );

  useEffect(() => {
    fetchNews(activeCategory, false);
  }, [activeCategory, i18n.language, fetchNews]);

  const openArticle = (a: Article) => window.open(a.url, "_blank", "noopener,noreferrer");
  const openSearch = (e: React.MouseEvent, a: Article) => {
    e.stopPropagation();
    window.open(`https://news.google.com/search?q=${encodeURIComponent(a.title)}`, "_blank", "noopener,noreferrer");
  };

  const parseAiText = (data: any): string => {
    return (
      data.result || data.response ||
      data.choices?.[0]?.message?.content ||
      (Array.isArray(data.content)
        ? data.content.find((c: { type?: string; text?: string }) => c.type === "text")?.text
        : "") || ""
    );
  };

  const fetchDigest = async (arts: Article[]) => {
    if (!arts.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `km.news.digest.${today}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setDigest(cached); return; }
    } catch {}
    setDigestLoading(true);
    try {
      const headlines = arts.slice(0, 8)
        .map((a, i) => `${i + 1}. [${a.category}] ${a.title}`).join("\n");
      const farmerCrop = active?.farmer_details?.primary_crop || "Rice";
      const farmerState = active?.farmer_details?.state || "India";
      const prompt = `You are a personal agriculture intelligence analyst for an Indian farmer.

Farmer profile:
- Crops: ${farmerCrop}
- State: ${farmerState}

Today's top agriculture headlines:
${headlines}

Write a personalized morning briefing in exactly 3 sentences.
Sentence 1: The single most important news for this farmer today — mention their crop or state if relevant.
Sentence 2: A market or policy development they should act on.
Sentence 3: One forward-looking tip based on today's news.

Rules:
- Write in simple, direct language a farmer understands
- Be specific — mention crop names, rupee amounts, state names
- No bullet points. No headers. Just 3 flowing sentences.
- Maximum 80 words total.`;
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await edgeToken()}`,
        },
        body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const trimmed = parseAiText(data).trim();
      if (trimmed) {
        setDigest(trimmed);
        try { localStorage.setItem(cacheKey, trimmed); } catch {}
      }
    } catch (e) {
      console.error("Digest error:", e);
    } finally {
      setDigestLoading(false);
    }
  };

  const batchScoreArticles = async (arts: Article[]) => {
    if (!arts.length) return;
    setScoringDone(false);
    const farmerCrop = active?.farmer_details?.primary_crop || "Rice";
    const farmerState = active?.farmer_details?.state || "India";
    const farmerSoil = active?.soil_type || "Alluvial";
    try {
      const articleList = arts.slice(0, 12)
        .map((a, i) => `${i}: "${a.title.slice(0, 100)}" [${a.category}]`).join("\n");
      const prompt = `You are scoring news articles for relevance to a specific Indian farmer.

Farmer: grows ${farmerCrop} in ${farmerState}, ${farmerSoil} soil.

Articles to score (index: title [category]):
${articleList}

Return ONLY a raw JSON array. No markdown. No explanation.
Each element: {"index": 0, "level": "high", "reason": "..."}
- "level": "high" if directly affects their crop/state/income
- "level": "medium" if somewhat relevant to Indian farmers
- "level": "low" if general news, not specific to their situation
- "reason": max 8 words explaining why this level

Example: [{"index":0,"level":"high","reason":"Rice MSP hike affects your income directly"},...]
Score all ${Math.min(arts.length, 12)} articles.`;
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await edgeToken()}`,
        },
        body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const raw = parseAiText(data);
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array");
      const scores: { index: number; level: "high" | "medium" | "low"; reason: string; }[] = JSON.parse(match[0]);
      const updatedArts = arts.map((a, i) => {
        const score = scores.find(s => s.index === i);
        return score
          ? { ...a, impactLevel: score.level, impactReason: score.reason }
          : a;
      });
      const sorted = [...updatedArts].sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2, null: 3 };
        return (order[a.impactLevel ?? "null"] ?? 3) - (order[b.impactLevel ?? "null"] ?? 3);
      });
      setScoredArticles(sorted);
    } catch (e) {
      console.error("Scoring error:", e);
      setScoredArticles(arts);
    } finally {
      setScoringDone(true);
    }
  };

  const fetchArticleInsight = async (article: Article) => {
    const key = article.url;
    if (articleInsight[key] || insightLoading[key]) return;
    setInsightLoading(prev => ({ ...prev, [key]: true }));
    const farmerCrop = active?.farmer_details?.primary_crop || "Rice";
    const farmerState = active?.farmer_details?.state || "India";
    const farmSize = active?.farm_size || "2";
    try {
      const prompt = `News headline: "${article.title}"
Summary: "${article.summary?.slice(0, 200)}"

Farmer: ${farmerCrop} crop, ${farmerState} state, ${farmSize} acres.

In exactly 2 sentences, explain:
1. What this news means specifically for this farmer (mention rupees, percentages, or dates if known)
2. What action they should take because of this news

Be direct and specific. No filler words.
Maximum 60 words total.`;
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await edgeToken()}`,
        },
        body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const text = parseAiText(data).trim();
      if (text) {
        setArticleInsight(prev => ({ ...prev, [key]: text }));
      }
    } catch {
      setArticleInsight(prev => ({ ...prev, [key]: "Analysis unavailable — try again." }));
    } finally {
      setInsightLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleBookmark = (url: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(url)) { next.delete(url); toast.info("Removed from saved"); }
      else { next.add(url); toast.success("Article saved 🔖"); }
      try { localStorage.setItem("km.news.bookmarks", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const extractTrending = (arts: Article[]) => {
    const stopWords = new Set([
      "the","a","an","in","of","to","and","for",
      "is","on","at","by","with","as","from","that",
      "this","are","india","indian","government","will",
    ]);
    const freq: Record<string, number> = {};
    arts.forEach(a => {
      a.title.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/)
        .filter(w => w.length > 4 && !stopWords.has(w))
        .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    });
    const topics = Object.entries(freq).sort(([,a],[,b]) => b - a)
      .slice(0, 7).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
    setTrendingTopics(topics);
  };

  useEffect(() => {
    if (!articles.length) return;
    extractTrending(articles);
    fetchDigest(articles);
    batchScoreArticles(articles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  return (
    <AgriPageBackground variant="news">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                <Newspaper className="h-8 w-8 text-primary" />
                Agri Intelligence Feed
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Real headlines · AI-personalized for you
                {active?.farmer_details?.state ? ` · ${active.farmer_details.state}` : ""}
                {fetchedAt ? ` · Updated ${fmtFetchedAt(fetchedAt)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab(activeTab === "saved" ? "feed" : "saved")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                  ${activeTab === "saved"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Saved ({bookmarks.size})
              </button>
              <Button variant="outline" size="sm"
                onClick={() => fetchNews(activeCategory, true)}
                disabled={loading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </motion.div>

          <AnimatePresence>
            {(digestLoading || digest) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 relative overflow-hidden rounded-2xl border border-primary/20 p-5"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, hsl(var(--background)) 100%)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-foreground">
                        Your Morning Farm Briefing
                      </span>
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        <Radio className="h-2.5 w-2.5 animate-pulse" />
                        AI · Today
                      </span>
                    </div>
                    {digestLoading ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className={`h-3 rounded-full bg-primary/10 animate-pulse
                            ${i===1?"w-full":i===2?"w-4/5":"w-3/5"}`}/>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed">{digest}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {trendingTopics.length > 0 && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                <TrendingUp className="h-3 w-3" /> Trending:
              </span>
              {trendingTopics.map(topic => (
                <button
                  key={topic}
                  onClick={() => { setActiveCategory("All"); setActiveTab("feed"); }}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50 transition-all"
                >
                  {topic}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setActiveTab("feed"); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${activeCategory === cat && activeTab === "feed"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {cat === "All" && <Filter className="h-3 w-3 inline mr-1" />}
                {cat}
              </button>
            ))}
          </div>

          {articles.length > 0 && !scoringDone && (
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>AI is scoring articles for your farm…</span>
            </div>
          )}
          {articles.length > 0 && scoringDone && (
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>
                Sorted by impact for your{" "}
                {active?.farmer_details?.primary_crop || "farm"}
                {" "}in{" "}
                {active?.farmer_details?.state || "India"}
              </span>
            </div>
          )}

          {(() => {
            const displayList = activeTab === "saved"
              ? (scoredArticles.length ? scoredArticles : articles).filter(a => bookmarks.has(a.url))
              : (scoredArticles.length ? scoredArticles : articles);

            if (loading && !displayList.length) return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="glass-card p-5">
                    <div className="flex justify-between mb-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </div>
            );

            if (!displayList.length) return (
              <div className="text-center py-16 text-muted-foreground">
                {activeTab === "saved"
                  ? "No saved articles yet — bookmark articles to read later"
                  : "No headlines right now — try Refresh"}
              </div>
            );

            const hero = displayList[0];
            return (
              <div className="space-y-5">
                {hero && (() => {
                  const a = hero;
                  const isExpanded = expandedUrl === a.url;
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-2xl border border-border/60 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                      style={{
                        background: a.impactLevel === "high"
                          ? "linear-gradient(135deg, hsl(var(--primary)/0.06), hsl(var(--background)))"
                          : "hsl(var(--card))",
                      }}
                      onClick={() => openArticle(a)}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-5xl">{a.imageEmoji}</span>
                            <div className="flex flex-col gap-1.5">
                              <span className={`krishi-badge ${categoryColors[a.category] || categoryColors.All}`}>
                                {a.category}
                              </span>
                              {a.impactLevel === "high" && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium w-fit flex items-center gap-1">
                                  <Zap className="h-2.5 w-2.5" />
                                  High Impact
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => toggleBookmark(a.url)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                              {bookmarks.has(a.url)
                                ? <BookmarkCheck className="h-4 w-4 text-primary"/>
                                : <Bookmark className="h-4 w-4 text-muted-foreground"/>}
                            </button>
                          </div>
                        </div>
                        <h2 className="text-xl font-display font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-tight">
                          {a.title}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          {a.summary}
                        </p>
                        {a.impactReason && (
                          <div className="flex items-center gap-1.5 mb-4 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            <span className="italic">{a.impactReason}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {a.source} · {a.date} · {a.readTime}
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedUrl(isExpanded ? null : a.url);
                              if (!isExpanded) fetchArticleInsight(a);
                            }}
                            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                          >
                            <Sparkles className="h-3 w-3" />
                            What this means for me
                            {isExpanded
                              ? <ChevronUp className="h-3 w-3"/>
                              : <ChevronDown className="h-3 w-3"/>}
                          </button>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-border/40">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-foreground">
                                    AI Impact Analysis
                                  </span>
                                  {insightLoading[a.url] && (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground"/>
                                  )}
                                </div>
                                {insightLoading[a.url] ? (
                                  <div className="space-y-2">
                                    <div className="h-3 rounded-full bg-muted animate-pulse w-full"/>
                                    <div className="h-3 rounded-full bg-muted animate-pulse w-4/5"/>
                                  </div>
                                ) : articleInsight[a.url] ? (
                                  <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 italic">
                                    {articleInsight[a.url]}
                                  </p>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayList.slice(1).map((a, i) => {
                    const isExpanded = expandedUrl === a.url;
                    return (
                      <motion.div
                        key={a.url + i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.3) }}
                        className="glass-card p-4 hover:shadow-md transition-all group flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-3xl">{a.imageEmoji}</span>
                            <div>
                              <span className={`krishi-badge ${categoryColors[a.category] || categoryColors.All}`}>
                                {a.category}
                              </span>
                              {a.impactLevel === "high" && (
                                <div className="mt-1 text-[10px] text-red-600 flex items-center gap-1">
                                  <Zap className="h-2.5 w-2.5"/>
                                  High Impact
                                </div>
                              )}
                              {a.impactLevel === "medium" && (
                                <div className="mt-1 text-[10px] text-amber-600 flex items-center gap-1">
                                  <Zap className="h-2.5 w-2.5"/>
                                  Relevant
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleBookmark(a.url)}
                            className="p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                          >
                            {bookmarks.has(a.url)
                              ? <BookmarkCheck className="h-4 w-4 text-primary"/>
                              : <Bookmark className="h-4 w-4 text-muted-foreground"/>}
                          </button>
                        </div>
                        <h3
                          onClick={() => openArticle(a)}
                          className="font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 cursor-pointer text-sm leading-snug"
                        >
                          {a.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
                          {a.summary}
                        </p>
                        {a.impactReason && (
                          <div className="text-[10px] text-muted-foreground italic mb-2 flex items-center gap-1">
                            <Zap className="h-2.5 w-2.5 text-amber-500 flex-shrink-0"/>
                            {a.impactReason}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3"/>
                            {a.readTime}
                          </div>
                          <button
                            onClick={() => {
                              setExpandedUrl(isExpanded ? null : a.url);
                              if (!isExpanded) fetchArticleInsight(a);
                            }}
                            className="flex items-center gap-1 text-[11px] text-primary font-medium"
                          >
                            <Sparkles className="h-3 w-3"/>
                            For me
                            {isExpanded
                              ? <ChevronUp className="h-3 w-3"/>
                              : <ChevronDown className="h-3 w-3"/>}
                          </button>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-border/30">
                                {insightLoading[a.url] ? (
                                  <div className="space-y-1.5">
                                    <div className="h-2.5 rounded-full bg-muted animate-pulse w-full"/>
                                    <div className="h-2.5 rounded-full bg-muted animate-pulse w-3/4"/>
                                  </div>
                                ) : articleInsight[a.url] ? (
                                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-2 italic">
                                    {articleInsight[a.url]}
                                  </p>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
