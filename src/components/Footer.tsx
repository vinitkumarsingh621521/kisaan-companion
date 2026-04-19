import { Link } from "react-router-dom";
import { Sprout, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

import TeamSection from "@/components/TeamSection";

export default function Footer() {
  return (
    <>
    <TeamSection compact />
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="KrishiMitra" className="h-8 w-8 brightness-200" />
              <span className="font-display font-bold text-xl">KrishiMitra</span>
            </div>
            <p className="text-background/60 text-sm leading-relaxed">
              AI-powered crop recommendation platform for Indian farmers. 
              Built for SIH 2025 — Problem Statement #25030.
            </p>
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
            <h4 className="font-display font-semibold mb-3">Resources</h4>
            <div className="space-y-2 text-sm text-background/60">
              <a href="#" className="block hover:text-background transition-colors">Documentation</a>
              <a href="#" className="block hover:text-background transition-colors">API Reference</a>
              <a href="#" className="block hover:text-background transition-colors">Support</a>
              <a href="#" className="block hover:text-background transition-colors">Privacy Policy</a>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3">Contact</h4>
            <div className="space-y-2 text-sm text-background/60">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> support@krishimitra.in</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> 1800-XXX-XXXX</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Ranchi, Jharkhand</div>
            </div>
          </div>
        </div>
        <div className="border-t border-background/10 pt-6 text-center text-sm text-background/40">
          © 2025 KrishiMitra — SIH 25030 | Built with ❤️ for India's farmers
        </div>
      </div>
    </footer>
    </>
  );
}
