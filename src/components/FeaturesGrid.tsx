import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sprout, Cloud, BarChart3, MessageSquare, Map, Shield,
  Smartphone, Award, FileText, Satellite, Bot, Zap,
  ArrowUpRight, Sparkles,
} from "lucide-react";

const BENTO = [
  {
    icon: Bot,
    title: "AI Crop Advisor",
    desc: "Science-guided crop recommendations based on your exact soil, weather forecast, and mandi prices. Powered by Gemini 2.5 Flash.",
    tag: "Most Used",
    gradient: "from-green-900 via-emerald-800 to-teal-900",
    glow: "shadow-emerald-500/20",
    iconBg: "bg-emerald-400/20",
    link: "/crop-advisor",
    span: "md:col-span-2 md:row-span-2",
    hero: true,
  },
  {
    icon: Cloud, title: "Weather Intelligence",
    desc: "Hyper-local 7-day forecasts with farm-specific alerts.",
    gradient: "from-sky-900 to-blue-900", glow: "shadow-sky-500/20",
    iconBg: "bg-sky-400/20", link: "/dashboard",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    icon: BarChart3, title: "Market Prices",
    desc: "Live mandi prices with AI-predicted trend arrows.",
    gradient: "from-amber-900 to-orange-900", glow: "shadow-amber-500/20",
    iconBg: "bg-amber-400/20", link: "/market",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Shield, title: "Disease Detection",
    desc: "Upload any plant photo — AI identifies diseases and gives precise spray protocol with dosage in seconds.",
    tag: "AI Vision",
    gradient: "from-red-900 via-rose-900 to-pink-900", glow: "shadow-rose-500/20",
    iconBg: "bg-rose-400/20", link: "/crop-advisor",
    span: "md:col-span-2 md:row-span-1", wide: true,
  },
  {
    icon: Map, title: "Field Mapper",
    desc: "Draw your farm on satellite map, get instant acreage, zone analytics and AI field intelligence.",
    gradient: "from-teal-900 to-green-900", glow: "shadow-teal-500/20",
    iconBg: "bg-teal-400/20", link: "/tools/field-mapper",
    span: "md:col-span-1 md:row-span-2", tall: true,
  },
  {
    icon: MessageSquare, title: "13 Languages",
    desc: "Voice & text in Hindi, Tamil, Bengali, Telugu, Marathi and 8 more.",
    gradient: "from-violet-900 to-purple-900", glow: "shadow-violet-500/20",
    iconBg: "bg-violet-400/20", link: "/crop-advisor",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Award, title: "Gamification",
    desc: "Earn XP badges for sustainable farming. Compete on the leaderboard.",
    gradient: "from-yellow-900 to-amber-900", glow: "shadow-yellow-500/20",
    iconBg: "bg-yellow-400/20", link: "/tools/achievements",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Zap, title: "Govt Schemes",
    desc: "AI auto-matches 50+ subsidies from PM-KISAN, PMFBY, KCC to your exact profile — with application links.",
    tag: "Free Money",
    gradient: "from-orange-900 to-red-900", glow: "shadow-orange-500/20",
    iconBg: "bg-orange-400/20", link: "/schemes",
    span: "md:col-span-2 md:row-span-1", wide: true,
  },
  {
    icon: FileText, title: "Smart Reports",
    desc: "One-click PDF reports for bank loans, crop insurance, and subsidy applications.",
    gradient: "from-indigo-900 to-blue-900", glow: "shadow-indigo-500/20",
    iconBg: "bg-indigo-400/20", link: "/tools/reports",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Satellite, title: "Satellite View",
    desc: "Live NDVI overlay with AI crop stress detection for your district.",
    gradient: "from-slate-900 to-gray-900", glow: "shadow-slate-500/20",
    iconBg: "bg-slate-400/20", link: "/tools/satellite",
    span: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Sprout, title: "Prescription",
    desc: "ICAR-standard fertilizer, irrigation & pest control prescription. Dealer shopping list included.",
    tag: "Scientific",
    gradient: "from-green-900 to-lime-900", glow: "shadow-green-500/20",
    iconBg: "bg-green-400/20", link: "/prescription",
    span: "md:col-span-2 md:row-span-1", wide: true,
  },
  {
    icon: Smartphone, title: "Works Offline",
    desc: "Full PWA — all core features work without internet in rural areas.",
    gradient: "from-zinc-900 to-neutral-900", glow: "shadow-zinc-500/20",
    iconBg: "bg-zinc-400/20", link: "/tools/offline",
    span: "md:col-span-1 md:row-span-1",
  },
];

const dotPatternUrl =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='2' cy='2' r='1' fill='white' fill-opacity='0.12'/%3E%3C/svg%3E\")";

export default function FeaturesGrid() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="krishi-badge bg-primary/10 text-primary mb-4 inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            50+ Premium Features
          </span>
          <h2 className="section-title text-foreground">
            Everything a Farmer Needs,{" "}
            <span className="text-gradient-green">In One Place</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
            From soil analysis to market intelligence — powered by AI, designed for simplicity.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[180px] gap-4">
          {BENTO.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              whileHover={{ y: -4 }}
              onClick={() => navigate(f.link)}
              className={`
                relative overflow-hidden rounded-2xl cursor-pointer group
                bg-gradient-to-br ${f.gradient}
                shadow-xl ${f.glow}
                border border-white/5
                ${f.span}
                transition-shadow duration-300 hover:shadow-2xl
              `}
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute -inset-x-full top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-[400%] transition-transform duration-1000" />
              </div>

              {/* Corner glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Dot pattern */}
              <div
                className="absolute inset-0 opacity-40"
                style={{ backgroundImage: dotPatternUrl }}
                aria-hidden
              />

              <div className="relative h-full p-5 flex flex-col justify-between text-white">
                <div>
                  {f.tag && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-3">
                      <Sparkles className="h-2.5 w-2.5" />
                      {f.tag}
                    </span>
                  )}
                  <div className={`w-11 h-11 rounded-xl ${f.iconBg} backdrop-blur-sm flex items-center justify-center mb-3 border border-white/10 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className={`font-display font-bold text-white leading-tight ${f.hero ? "text-2xl mb-2" : f.wide || f.tall ? "text-xl mb-2" : "text-lg mb-1"}`}>
                    {f.title}
                  </h3>
                  <p className={`text-white/70 leading-snug ${f.hero ? "text-sm" : "text-xs"} ${f.hero || f.wide || f.tall ? "" : "line-clamp-2"}`}>
                    {f.desc}
                  </p>
                </div>
                <div className="flex items-center justify-end mt-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/25 group-hover:rotate-45 transition-all duration-300">
                    <ArrowUpRight className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
