import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, FileText, Download, Eye, Loader2, BookOpen } from "lucide-react";
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
    setPapers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    load();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to upload papers"); return; }
    if (!file || !title) { toast.error("Title and PDF required"); return; }
    if (file.type !== "application/pdf") { toast.error("Only PDFs allowed"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }

    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("research-papers").upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("research-papers").getPublicUrl(path);

      const { error: insErr } = await supabase.from("research_papers").insert({
        uploader_id: user.id,
        title,
        abstract: abstract || null,
        authors: authors || null,
        file_url: urlData.publicUrl,
        file_size_kb: Math.round(file.size / 1024),
      });
      if (insErr) throw insErr;

      toast.success("Paper uploaded! 📄");
      setTitle(""); setAuthors(""); setAbstract(""); setFile(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const trackView = async (p: Paper) => {
    await supabase.from("research_papers").update({ views: p.views + 1 }).eq("id", p.id);
    window.open(p.file_url, "_blank");
    load();
  };

  const trackDownload = async (p: Paper) => {
    await supabase.from("research_papers").update({ downloads: p.downloads + 1 }).eq("id", p.id);
    const a = document.createElement("a");
    a.href = p.file_url;
    a.download = `${p.title}.pdf`;
    a.click();
    load();
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-primary" /> Upload a Research Paper
        </h3>
        {!user ? (
          <p className="text-sm text-muted-foreground">🔒 Sign in to upload papers to the public library.</p>
        ) : (
          <form onSubmit={handleUpload} className="space-y-3">
            <Input placeholder="Paper title *" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input placeholder="Authors (comma-separated)" value={authors} onChange={(e) => setAuthors(e.target.value)} />
            <textarea
              placeholder="Abstract (optional)"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            <Button type="submit" disabled={uploading} className="gradient-primary border-0 text-primary-foreground gap-2">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload PDF</>}
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
            <p className="text-muted-foreground">📚 No papers yet — be the first to share research! Upload a PDF above.</p>
          </div>
        ) : (
          papers.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-semibold text-foreground">{p.title}</h4>
                  {p.authors && <p className="text-xs text-muted-foreground mt-0.5">By {p.authors}</p>}
                  {p.abstract && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.abstract}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {p.views} views</span>
                    <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {p.downloads} downloads</span>
                    {p.file_size_kb && <span>{(p.file_size_kb / 1024).toFixed(1)} MB</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => trackView(p)}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button size="sm" className="gradient-primary border-0 text-primary-foreground" onClick={() => trackDownload(p)}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
