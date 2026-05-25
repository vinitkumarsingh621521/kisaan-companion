import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { Newspaper, RefreshCw, ExternalLink, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface Article {
  title: string; summary: string; category: string; date: string;
  source: string; imageEmoji: string; readTime: string; url: string;
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

  // Re-render the "x min ago" label every 30 s
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
      } catch (e: any) {
        toast.error(e?.message || t("news.failed", "Failed to load news"));
      } finally {
        setLoading(false);
      }
    },
    [active?.farmer_details?.state, i18n.language, t],
  );

  // Always refetch on mount, category change, or language change
  useEffect(() => {
    fetchNews(activeCategory, false);
  }, [activeCategory, i18n.language, fetchNews]);

  const openArticle = (a: Article) => window.open(a.url, "_blank", "noopener,noreferrer");
  const openSearch = (e: React.MouseEvent, a: Article) => {
    e.stopPropagation();
    window.open(`https://news.google.com/search?q=${encodeURIComponent(a.title)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <AgriPageBackground variant="news">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                <Newspaper className="h-8 w-8 text-primary" /> {t("news.title", "Agri News")}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("news.subtitle", "Real headlines from Indian agriculture")}
                {active?.farmer_details?.state ? ` · ${active.farmer_details.state}` : ""}
                {fetchedAt ? ` · ${t("news.updated", "Updated")} ${fmtFetchedAt(fetchedAt)}` : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNews(activeCategory, true)}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("common.refresh", "Refresh")}
            </Button>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "All" && <Filter className="h-3 w-3 inline mr-1" />}
                {t(`news.cat.${cat}`, cat)}
              </button>
            ))}
          </div>

          {loading && articles.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card p-5">
                  <div className="flex justify-between mb-3">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground italic">
              {t("news.emptyLong", "No headlines available right now. Try Refresh in a moment.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {articles.map((article, i) => (
                <motion.div
                  key={`${article.url}-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className="glass-card p-5 hover:shadow-lg transition-all group cursor-pointer"
                  onClick={() => openArticle(article)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{article.imageEmoji}</span>
                    <span className={`krishi-badge ${categoryColors[article.category] || categoryColors.All}`}>
                      {t(`news.cat.${article.category}`, article.category)}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                    <span className="truncate">
                      {article.source} • {article.date}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => openSearch(e, article)}
                        className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5"
                        aria-label="Search related"
                      >
                        <Search className="h-3 w-3" />
                      </button>
                      <span className="flex items-center gap-1 text-primary">
                        {t("news.source", "Source")} <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
