import { useState } from "react";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n";

const HERO_COPY: Record<string, { title: string; sub: string; cta: string }> = {
  en: { title: "AI-Powered Crop Recommendations for Every Farmer", sub: "Hyper-localized advice in your language. Soil, weather, market — all in one app.", cta: "Open Dashboard" },
  hi: { title: "हर किसान के लिए AI-संचालित फसल सिफारिशें", sub: "आपकी भाषा में स्थानीय सलाह। मिट्टी, मौसम, बाज़ार — एक ही ऐप में।", cta: "डैशबोर्ड खोलें" },
  bn: { title: "প্রতিটি কৃষকের জন্য AI-চালিত ফসলের সুপারিশ", sub: "আপনার ভাষায় হাইপারলোকাল পরামর্শ। মাটি, আবহাওয়া, বাজার - একটি অ্যাপে।", cta: "ড্যাশবোর্ড খুলুন" },
  ta: { title: "ஒவ்வொரு விவசாயிக்கும் AI-இயங்கும் பயிர் பரிந்துரைகள்", sub: "உங்கள் மொழியில் உள்ளூர் ஆலோசனை. மண், வானிலை, சந்தை — ஒரே செயலியில்.", cta: "டாஷ்போர்டை திறக்க" },
  te: { title: "ప్రతి రైతుకు AI-ఆధారిత పంట సిఫార్సులు", sub: "మీ భాషలో హైపర్-లోకలైజ్డ్ సలహా. నేల, వాతావరణం, మార్కెట్ — ఒకే యాప్‌లో.", cta: "డ్యాష్‌బోర్డ్ తెరవండి" },
};

export default function LanguageHeroSwitcher({
  onChange,
}: {
  onChange?: (lang: string) => void;
}) {
  const { i18n } = useTranslation();
  const [active, setActive] = useState(i18n.language || "en");

  const pick = (code: string) => {
    setActive(code);
    i18n.changeLanguage(code);
    onChange?.(code);
  };

  const copy = HERO_COPY[active] || HERO_COPY.en;

  return (
    <div className="mt-8 max-w-2xl">
      <div className="flex items-center gap-2 mb-3 text-krishi-wheat/70 text-sm">
        <Globe className="h-4 w-4" /> Try in your language:
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => pick(l.code)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              active === l.code
                ? "bg-krishi-gold text-krishi-soil shadow-lg scale-105"
                : "bg-krishi-wheat/10 text-krishi-wheat hover:bg-krishi-wheat/20"
            }`}
          >
            {l.native}
          </button>
        ))}
      </div>
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-card/10 backdrop-blur border border-krishi-wheat/10"
      >
        <p className="font-display font-bold text-krishi-wheat text-lg leading-tight mb-1">{copy.title}</p>
        <p className="text-krishi-wheat/70 text-sm">{copy.sub}</p>
      </motion.div>
    </div>
  );
}
