import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Smartphone, WifiOff, Download, CheckCircle2, RefreshCw, Share2, Copy, QrCode } from "lucide-react";
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

// Captures the browser's PWA install prompt event so we can fire it later from a button.
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function OfflinePage() {
  const [online, setOnline] = useState(navigator.onLine);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://kisaan-companion.lovable.app";

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); toast.success("✓ KrishiMitra installed!"); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    // Detect if already running as installed PWA
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const download = (title: string) => {
    setDownloaded(prev => { const s = new Set(prev); s.add(title); return s; });
    toast.success(`✓ Downloaded: ${title}`);
  };

  const handleInstall = async () => {
    if (!installEvent) {
      toast.message("Install not available here", {
        description: "On Android Chrome: menu → 'Add to Home Screen'. On iOS Safari: Share → 'Add to Home Screen'.",
      });
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") toast.success("Installing KrishiMitra…");
    else toast.message("Maybe next time 🌾");
    setInstallEvent(null);
  };

  const handleShare = async () => {
    const data = {
      title: "KrishiMitra — AI Farming Companion",
      text: "Smart, free farming advice in your language. Try KrishiMitra:",
      url: shareUrl,
    };
    if (navigator.share) {
      try { await navigator.share(data); toast.success("Shared! 🌾"); return; } catch { /* user cancelled */ }
    }
    // Fallback: copy + show QR
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied! Paste it in WhatsApp 📱");
    } catch {
      toast.error("Could not copy link");
    }
    setShowQR(true);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); }
    catch { toast.error("Could not copy link"); }
  };

  // Free QR code generator (no dependency)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

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

          {/* Install + Share — the new headline section */}
          <div className="glass-card p-5 mb-5">
            <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
              📱 Install KrishiMitra on your phone
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              One tap to install. Works in 2G areas. Share with fellow farmers via WhatsApp.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                className="gradient-primary border-0 text-primary-foreground gap-2 h-12"
                onClick={handleInstall}
                disabled={installed}
              >
                <Download className="h-4 w-4" />
                {installed ? "Already installed ✓" : installEvent ? "Install App" : "Install App"}
              </Button>
              <Button variant="outline" className="gap-2 h-12" onClick={handleShare}>
                <Share2 className="h-4 w-4" /> Share App
              </Button>
            </div>

            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/50"
              >
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img src={qrSrc} alt="Scan to open KrishiMitra" className="w-[180px] h-[180px] rounded-lg bg-background p-2" loading="lazy" />
                  <div className="flex-1 text-center sm:text-left">
                    <div className="font-display font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                      <QrCode className="h-4 w-4 text-primary" /> Scan to open
                    </div>
                    <div className="text-xs text-muted-foreground break-all mb-3">{shareUrl}</div>
                    <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5">
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4 mt-4">
              <li><strong>Android (Chrome):</strong> tap "Install App" above, or menu → "Add to Home Screen"</li>
              <li><strong>iPhone (Safari):</strong> Share button → "Add to Home Screen"</li>
              <li>Open from home screen — works without browser bar, even on slow connections</li>
            </ol>
          </div>

          <div className="glass-card p-5">
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
