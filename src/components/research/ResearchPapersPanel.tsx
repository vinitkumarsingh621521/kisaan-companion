import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, FileText, Download, Eye, Loader2, BookOpen, ExternalLink, NotebookPen } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

type Paper = {
  id: string;
  title: string;
  abstract: string | null;
  authors: string | null;
  file_url: string;
  file_size_kb: number | null;
  downloads: number;
  views: number;
  tags: string[];
  created_at: string;
  uploader_id: string;
};

const isNotebook = (p: Paper) =>
  /\.ipynb($|\?)/i.test(p.file_url) || p.tags?.includes("notebook");

const colabUrl = (publicUrl: string) =>
  `https://colab.research.google.com/?url=${encodeURIComponent(publicUrl)}`;

export default function ResearchPapersPanel() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [abstract, setAbstract] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("research_papers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load papers");
    setPapers((data || []) as Paper[]);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    load();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to upload"); return; }
    if (!file || !title) { toast.error("Title and file required"); return; }

    const isPdf = file.type === "application/pdf";
    const isIpynb = file.name.toLowerCase().endsWith(".ipynb");
    if (!isPdf && !isIpynb) { toast.error("Only PDF or .ipynb files allowed"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }

    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const contentType = isPdf ? "application/pdf" : "application/x-ipynb+json";
      const { error: upErr } = await supabase.storage.from("research-papers").upload(path, file, { contentType });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("research-papers").getPublicUrl(path);

      const tags = isIpynb ? ["notebook"] : [];
      const { error: insErr } = await (supabase.from("research_papers") as any).insert({
        uploader_id: user.id,
        title,
        abstract: abstract || null,
        authors: authors || null,
        file_url: urlData.publicUrl,
        file_size_kb: Math.round(file.size / 1024),
        tags,
      });
      if (insErr) throw insErr;

      toast.success(isIpynb ? "Notebook uploaded! Open in Colab from the list." : "Paper uploaded! 📄");
      setTitle(""); setAuthors(""); setAbstract(""); setFile(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const trackView = async (p: Paper) => {
    await (supabase.from("research_papers") as any).update({ views: p.views + 1 }).eq("id", p.id);
    window.open(p.file_url, "_blank");
    load();
  };

  const trackDownload = async (p: Paper) => {
    await (supabase.from("research_papers") as any).update({ downloads: p.downloads + 1 }).eq("id", p.id);
    const a = document.createElement("a");
    a.href = p.file_url;
    a.download = p.title;
    a.click();
    load();
  };

  const openInColab = async (p: Paper) => {
    await (supabase.from("research_papers") as any).update({ views: p.views + 1 }).eq("id", p.id);
    window.open(colabUrl(p.file_url), "_blank");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-primary" /> Upload Paper or Jupyter Notebook
        </h3>
        {!user ? (
          <p className="text-sm text-muted-foreground">🔒 Sign in to upload papers or notebooks to the public library.</p>
        ) : (
          <form onSubmit={handleUpload} className="space-y-3">
            <Input placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input placeholder="Authors (comma-separated)" value={authors} onChange={(e) => setAuthors(e.target.value)} />
            <textarea
              placeholder="Abstract (optional)"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Input
              type="file"
              accept="application/pdf,.ipynb,application/x-ipynb+json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <p className="text-xs text-muted-foreground">📄 PDF papers · 📓 .ipynb notebooks (auto-opens in Google Colab)</p>
            <Button type="submit" disabled={uploading} className="gradient-primary border-0 text-primary-foreground gap-2">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload</>}
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> Community Library ({papers.length})
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : papers.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground">📚 No uploads yet — be the first to share research! Upload a PDF or notebook above.</p>
          </div>
        ) : (
          papers.map((p, i) => {
            const notebook = isNotebook(p);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${notebook ? "bg-krishi-gold/15" : "bg-primary/10"}`}>
                    {notebook ? <NotebookPen className="h-5 w-5 text-krishi-gold" /> : <FileText className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display font-semibold text-foreground">{p.title}</h4>
                      {notebook && <span className="krishi-badge bg-krishi-gold/15 text-krishi-gold text-[10px]">Jupyter</span>}
                    </div>
                    {p.authors && <p className="text-xs text-muted-foreground mt-0.5">By {p.authors}</p>}
                    {p.abstract && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.abstract}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {p.views} views</span>
                      <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {p.downloads} downloads</span>
                      {p.file_size_kb && <span>{(p.file_size_kb / 1024).toFixed(1)} MB</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {notebook && (
                      <Button size="sm" className="gradient-primary border-0 text-primary-foreground" onClick={() => openInColab(p)}>
                        <ExternalLink className="h-4 w-4 mr-1" /> Colab
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => trackView(p)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => trackDownload(p)}>
                      <Download className="h-4 w-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
