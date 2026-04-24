import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import TeamSection from "@/components/TeamSection";
import { toast } from "sonner";

const SHARE_URL = typeof window !== "undefined" ? window.location.origin : "https://kisaan-companion.lovable.app";
const SHARE_TEXT = "🌾 KrishiMitra — AI-powered farming assistant for India. Crop advice, weather, market prices & schemes in 13 languages. Try it:";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const onShare = (network: "whatsapp" | "twitter" | "linkedin") => {
    const u = encodeURIComponent(SHARE_URL);
    const t = encodeURIComponent(SHARE_TEXT);
    const links = {
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    };
    window.open(links[network], "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(SHARE_URL); toast.success("Link copied!"); }
    catch { toast.error("Copy failed"); }
  };

  // current season pill
  const m = new Date().getMonth() + 1;
  const season = m >= 6 && m <= 10 ? "🌧️ Kharif Season" : m >= 11 || m <= 3 ? "🌾 Rabi Season" : "☀️ Zaid Season";

  return (
    <>
      <TeamSection compact />
      <footer ref={ref} className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="KrishiMitra" className="h-8 w-8 brightness-200" />
                <span className="font-display font-bold text-xl">KrishiMitra</span>
              </div>
              <p className="text-background/60 text-sm leading-relaxed mb-4">
                AI-powered crop recommendation platform for Indian farmers. Built for SIH 2025 — Problem Statement #25030.
              </p>
              <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-background/10 text-background/80">{season}</span>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3">Features</h4>
              <div className="space-y-2 text-sm text-background/60">
                <Link to="/crop-advisor" className="block hover:text-background transition-colors">Crop Advisor</Link>
                <Link to="/market" className="block hover:text-background transition-colors">Market Prices</Link>
                <Link to="/schemes" className="block hover:text-background transition-colors">Govt Schemes</Link>
                <Link to="/community" className="block hover:text-background transition-colors">Community</Link>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3">Tools</h4>
              <div className="space-y-2 text-sm text-background/60">
                <Link to="/tools/field-mapper" className="block hover:text-background transition-colors">Field Mapper</Link>
                <Link to="/tools/reports" className="block hover:text-background transition-colors">Smart Reports</Link>
                <Link to="/tools/satellite" className="block hover:text-background transition-colors">Satellite View</Link>
                <Link to="/tools/iot" className="block hover:text-background transition-colors">IoT Sensors</Link>
                <Link to="/tools/achievements" className="block hover:text-background transition-colors">Achievements</Link>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-3">Contact</h4>
              <div className="space-y-2 text-sm text-background/60 mb-4">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@krishimitra.in</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> 1800-XXX-XXXX</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Ranchi, Jharkhand</div>
              </div>
              <h4 className="font-display font-semibold mb-2 text-sm">Share</h4>
              <div className="flex items-center gap-2">
                <button onClick={() => onShare("whatsapp")} aria-label="Share on WhatsApp" className="w-9 h-9 rounded-full bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                </button>
                <button onClick={() => onShare("twitter")} aria-label="Share on X / Twitter" className="w-9 h-9 rounded-full bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <button onClick={() => onShare("linkedin")} aria-label="Share on LinkedIn" className="w-9 h-9 rounded-full bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </button>
                <button onClick={copyLink} className="text-xs text-background/60 hover:text-background ml-2">Copy link</button>
              </div>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 text-center text-sm text-background/40">
            © 2025 KrishiMitra — SIH 25030 | Built with ❤️ for India's farmers · Press <kbd className="px-1.5 py-0.5 bg-background/10 rounded text-xs">⌘K</kbd> for command menu
          </div>
        </div>
      </footer>
    </>
  );
});
Footer.displayName = "Footer";
export default Footer;
