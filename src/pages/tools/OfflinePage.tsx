import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Smartphone, WifiOff, Download, CheckCircle2, RefreshCw, Share2, Copy, QrCode, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { buildPersonalisedGuides, downloadGuide, type OfflineGuide } from "@/lib/offlineGuides";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function OfflinePage() {
  const { active } = useActiveProfile();
  const [online, setOnline] = useState(navigator.onLine);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://kisaan-companion.lovable.app";

  const guides = useMemo<OfflineGuide[]>(() => buildPersonalisedGuides(active), [active]);

  // Restore previously cached guides
  useEffect(() => {
    const set = new Set<string>();
    guides.forEach((g) => {
      if (localStorage.getItem(`offline.guide.${g.id}`)) set.add(g.id);
    });
    setDownloaded(set);
  }, [guides]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const onBIP = (e: Event) => { e.preventDefault(); setInstallEvent(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); toast.success("✓ KrishiMitra installed!"); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleDownload = (g: OfflineGuide) => {
    try {
      downloadGuide(g);
      setDownloaded((prev) => { const s = new Set(prev); s.add(g.id); return s; });
      toast.success(`✓ ${g.title}`, { description: "Saved to your downloads & cached for offline reading" });
    } catch (e) {
      console.error(e);
      toast.error("Download failed — please try again");
    }
  };

  const downloadAll = () => {
    let i = 0;
    guides.forEach((g) => {
      setTimeout(() => handleDownload(g), i * 250);
      i++;
    });
    toast.message(`📦 Downloading ${guides.length} guides…`);
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
    const data = { title: "KrishiMitra — AI Farming Companion", text: "Smart, free farming advice in your language. Try KrishiMitra:", url: shareUrl };
    if (navigator.share) {
      try { await navigator.share(data); toast.success("Shared! 🌾"); return; } catch {}
    }
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied! Paste it in WhatsApp 📱"); }
    catch { toast.error("Could not copy link"); }
    setShowQR(true);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); }
    catch { toast.error("Could not copy link"); }
  };

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

  const totalMB = guides.reduce((s, g) => s + parseFloat(g.size), 0).toFixed(1);

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

          {/* Install + Share */}
          <div className="glass-card p-5 mb-5">
            <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">📱 Install KrishiMitra on your phone</h3>
            <p className="text-sm text-muted-foreground mb-4">One tap to install. Works in 2G areas. Share with fellow farmers via WhatsApp.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button className="gradient-primary border-0 text-primary-foreground gap-2 h-12" onClick={handleInstall} disabled={installed}>
                <Download className="h-4 w-4" />
                {installed ? "Already installed ✓" : "Install App"}
              </Button>
              <Button variant="outline" className="gap-2 h-12" onClick={handleShare}>
                <Share2 className="h-4 w-4" /> Share App
              </Button>
            </div>

            {showQR && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img src={qrSrc} alt="Scan to open KrishiMitra" className="w-[180px] h-[180px] rounded-lg bg-background p-2" loading="lazy" />
                  <div className="flex-1 text-center sm:text-left">
                    <div className="font-display font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                      <QrCode className="h-4 w-4 text-primary" /> Scan to open
                    </div>
                    <div className="text-xs text-muted-foreground break-all mb-3">{shareUrl}</div>
                    <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5"><Copy className="h-3.5 w-3.5" /> Copy link</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Personalised guides */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Your Personalised Library
              </h3>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadAll} disabled={downloaded.size === guides.length}>
                <Download className="h-3.5 w-3.5" /> Download all ({totalMB} MB)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {guides.length} guides built from <strong>{active?.full_name || "your"}</strong> profile
              {active?.farmer_details?.state ? ` in ${active.farmer_details.district || ""} ${active.farmer_details.state}` : ""}.
              Each download is a real Markdown file you can open in any reader, share on WhatsApp, or print.
            </p>

            <div className="space-y-2">
              {guides.map((g) => {
                const got = downloaded.has(g.id);
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="text-xl shrink-0" aria-hidden>{g.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-foreground truncate">{g.title}</div>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>{g.size}</span>
                          <span className="text-primary/80">• {g.reason}</span>
                        </div>
                      </div>
                    </div>
                    {got ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-primary text-xs flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Saved</span>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => handleDownload(g)} title="Re-download">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleDownload(g)} className="shrink-0 gap-1">
                        <Download className="h-3 w-3" /> Download
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground flex items-start gap-2">
              <FileText className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                Files save to your phone's <strong>Downloads</strong> folder as <code>.md</code> (Markdown).
                Open with any text app, Google Docs, or share via WhatsApp. Update your profile to refresh this library.
              </span>
            </div>

            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4 mt-4">
              <li><strong>Android (Chrome):</strong> tap "Install App" above, or menu → "Add to Home Screen"</li>
              <li><strong>iPhone (Safari):</strong> Share button → "Add to Home Screen"</li>
              <li>Open from home screen — works without browser bar, even on slow connections</li>
            </ol>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
