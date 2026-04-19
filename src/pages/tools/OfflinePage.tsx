import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Smartphone, WifiOff, Download, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const offlineGuides = [
  { title: "Rice cultivation guide", size: "2.4 MB" },
  { title: "Wheat sowing calendar", size: "1.1 MB" },
  { title: "Top 50 pest treatments", size: "3.8 MB" },
  { title: "Government schemes 2025-26", size: "0.9 MB" },
  { title: "Soil pH correction", size: "0.6 MB" },
  { title: "Drip irrigation setup", size: "1.7 MB" },
];

export default function OfflinePage() {
  const [online, setOnline] = useState(navigator.onLine);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const download = (title: string) => {
    setDownloaded(prev => { const s = new Set(prev); s.add(title); return s; });
    toast.success(`✓ Downloaded: ${title}`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Smartphone className="h-7 w-7 text-primary" /> Offline Mode
            </h1>
            <p className="text-muted-foreground mt-1">Use KrishiMitra in low-connectivity areas. Sync when you're back online.</p>
          </motion.div>

          <div className={`glass-card p-5 mb-5 ${online ? "border-primary/30" : "border-destructive/30"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${online ? "bg-primary/10" : "bg-destructive/10"}`}>
                {online ? <RefreshCw className="h-6 w-6 text-primary" /> : <WifiOff className="h-6 w-6 text-destructive" />}
              </div>
              <div>
                <div className="font-display font-semibold text-foreground">{online ? "🟢 You're Online" : "🔴 You're Offline"}</div>
                <div className="text-xs text-muted-foreground">{online ? "All features active" : "Cached guides still work — promise! 🌾"}</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 mb-5">
            <h3 className="font-display font-semibold text-foreground mb-3">📦 Cache Crop Guides for Offline Use</h3>
            <div className="space-y-2">
              {offlineGuides.map(g => {
                const got = downloaded.has(g.title);
                return (
                  <div key={g.title} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium text-sm text-foreground">{g.title}</div>
                      <div className="text-xs text-muted-foreground">{g.size}</div>
                    </div>
                    {got ? (
                      <span className="text-primary text-sm flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Saved</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => download(g.title)}><Download className="h-3 w-3 mr-1" /> Download</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-display font-semibold text-foreground mb-2">📱 Install as App (PWA)</h3>
            <p className="text-sm text-muted-foreground mb-3">Add KrishiMitra to your phone's home screen for one-tap access — works in 2G areas too.</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li><strong>Android (Chrome):</strong> Menu → "Add to Home Screen"</li>
              <li><strong>iPhone (Safari):</strong> Share → "Add to Home Screen"</li>
              <li>Open from home screen — works without browser bar</li>
            </ol>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
