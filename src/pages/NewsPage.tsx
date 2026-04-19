import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Loader2, Newspaper, RefreshCw, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

interface Article {
  title: string;
  summary: string;
  category: string;
  date: string;
  source: string;
  imageEmoji: string;
  readTime: string;
  url?: string;
}

const categoryColors: Record<string, string> = {
  Technology: "bg-primary/10 text-primary",
  Policy: "bg-krishi-gold-light text-krishi-gold",
  Market: "bg-krishi-sky-light text-krishi-sky",
  Research: "bg-accent text-accent-foreground",
  Climate: "bg-destructive/10 text-destructive",
  Success: "bg-krishi-green-light text-krishi-green",
};

const categories = ["All", "Technology", "Policy", "Market", "Research", "Climate", "Success"];

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchNews = async () => {
    setLoading(true);
    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "news" }),
      });

      if (!resp.ok) throw new Error("Failed to fetch news");

      const data = await resp.json();
      const content = data.result || "";

      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const parsed = JSON.parse(jsonMatch[1] || content);
        if (parsed.articles) {
          setArticles(parsed.articles);
        }
      } catch {
        toast.error("Failed to parse news data");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  const filtered = activeCategory === "All" ? articles : articles.filter(a => a.category === activeCategory);

  const openArticle = (article: Article) => {
    const url = article.url || `https://news.google.com/search?q=${encodeURIComponent(article.title + " agriculture India")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                <Newspaper className="h-8 w-8 text-primary" />
                Agri News & Updates
              </h1>
              <p className="text-muted-foreground mt-1">
                Latest advancements, policies, and trends in Indian agriculture
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchNews} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </motion.div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
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
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading latest agriculture news...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((article, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass-card p-5 hover:shadow-lg transition-all group cursor-pointer"
                  onClick={() => openArticle(article)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-4xl">{article.imageEmoji}</span>
                    <span className={`krishi-badge ${categoryColors[article.category] || "bg-muted text-muted-foreground"}`}>
                      {article.category}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{article.source} • {article.date}</span>
                    <span className="flex items-center gap-1 text-primary">
                      Read more <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No articles found in this category. Try another filter or refresh.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
