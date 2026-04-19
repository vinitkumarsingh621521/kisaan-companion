import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Loader2, Newspaper, RefreshCw, ExternalLink, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Skeleton } from "@/components/ui/skeleton";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

interface Article { title: string; summary: string; category: string; date: string; source: string; imageEmoji: string; readTime: string; url?: string }

const CATEGORY_ALIASES: Record<string, string> = {
  technology: "Technology", tech: "Technology", innovation: "Technology",
  policy: "Policy", government: "Policy", scheme: "Policy",
  market: "Market", price: "Market", trade: "Market",
  research: "Research", science: "Research", study: "Research",
  climate: "Climate", weather: "Climate", environment: "Climate",
  success: "Success", story: "Success", farmer: "Success",
};
function normalizeCategory(c?: string): string {
  if (!c) return "Other";
  const k = c.toLowerCase().trim();
  return CATEGORY_ALIASES[k] || c.charAt(0).toUpperCase() + c.slice(1).toLowerCase().trim();
}

const categoryColors: Record<string, string> = {
  Technology: "bg-primary/10 text-primary",
  Policy: "bg-krishi-gold-light text-krishi-gold",
  Market: "bg-krishi-sky-light text-krishi-sky",
  Research: "bg-accent text-accent-foreground",
  Climate: "bg-destructive/10 text-destructive",
  Success: "bg-krishi-green-light text-krishi-green",
  Other: "bg-muted text-muted-foreground",
};

const categories = ["All", "Technology", "Policy", "Market", "Research", "Climate", "Success"];

export default function NewsPage() {
  const { active } = useActiveProfile();
  const [articlesByCategory, setArticlesByCategory] = useState<Record<string, Article[]>>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchNews = async (cat: string) => {
    setLoading(true);
    try {
      const action = cat === "All" ? "news" : "category_news";
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ action, category: cat, profile: active }),
      });
      if (!resp.ok) throw new Error("Failed to fetch news");
      const data = await resp.json();
      const cleaned = (data.result || "{}").replace(/```json\s*|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.articles) {
        const normalized = parsed.articles.map((a: Article) => ({ ...a, category: normalizeCategory(a.category) }));
        setArticlesByCategory(prev => ({ ...prev, [cat]: normalized }));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!articlesByCategory[activeCategory]) fetchNews(activeCategory);
  }, [activeCategory]);

  const articles = articlesByCategory[activeCategory] || [];
  const filtered = activeCategory === "All"
    ? articles
    : articles.filter(a => normalizeCategory(a.category) === activeCategory);

  const openArticle = (article: Article) => {
    const url = article.url || `https://news.google.com/search?q=${encodeURIComponent(article.title + " agriculture India")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const openSearch = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    window.open(`https://news.google.com/search?q=${encodeURIComponent(article.title)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-4 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                <Newspaper className="h-8 w-8 text-primary" /> Agri News
              </h1>
              <p className="text-muted-foreground mt-1">
                Latest from Indian agriculture {active?.farmer_details?.state ? `· focused on ${active.farmer_details.state}` : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchNews(activeCategory)} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {cat === "All" && <Filter className="h-3 w-3 inline mr-1" />}{cat}
              </button>
            ))}
          </div>

          {loading && filtered.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="glass-card p-5">
                  <div className="flex justify-between mb-3"><Skeleton className="h-10 w-10" /><Skeleton className="h-5 w-20" /></div>
                  <Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground italic">
              No articles in this category yet — emptier than a fallow field 😄. Hit Refresh!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((article, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 hover:shadow-lg transition-all group cursor-pointer" onClick={() => openArticle(article)}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{article.imageEmoji}</span>
                    <span className={`krishi-badge ${categoryColors[normalizeCategory(article.category)] || categoryColors.Other}`}>
                      {normalizeCategory(article.category)}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{article.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">{article.summary}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                    <span className="truncate">{article.source} • {article.date}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={(e) => openSearch(e, article)} className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5">
                        <Search className="h-3 w-3" />
                      </button>
                      <span className="flex items-center gap-1 text-primary">
                        Source <ExternalLink className="h-3 w-3" />
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
