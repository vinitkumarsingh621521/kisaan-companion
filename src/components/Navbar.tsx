import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Sprout, Globe, LogOut, Check, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationCenter from "@/components/NotificationCenter";
import logo from "@/assets/logo.png";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import SearchBar from "@/components/SearchBar";
import { toast } from "sonner";

type NavItem = { label: string; path: string; icon: string; desc: string };
type NavGroup = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  activeBg: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "farm", label: "Farm AI", emoji: "🌱",
    color: "text-emerald-700 dark:text-emerald-300",
    activeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    items: [
      { label: "AI Advisor",     path: "/ai-advisor",     icon: "🤖", desc: "Personalized crop recommendations" },
      { label: "Crop Advisor",   path: "/crop-advisor",   icon: "🌿", desc: "Disease scanner & soil advice" },
      { label: "Farm Vision",    path: "/vision",         icon: "🔍", desc: "AI photo analysis for soil & pests" },
      { label: "Prescription",   path: "/prescription",   icon: "💊", desc: "ICAR-standard farm prescriptions" },
      { label: "Crop Compare",   path: "/compare",        icon: "⚖️", desc: "Compare any 2 crops scientifically" },
      { label: "Beej→Bazaar",    path: "/beej-se-bazaar", icon: "🌾", desc: "Seed-to-market crop planner" },
      { label: "Krishi Cosmos",  path: "/cosmos",         icon: "✦", desc: "Mandala · Yantra · Swapna · Raag · Aakash — all in one" },
    ],
  },
  {
    id: "markets", label: "Markets", emoji: "💰",
    color: "text-amber-700 dark:text-amber-300",
    activeBg: "bg-amber-50 dark:bg-amber-950/40",
    items: [
      { label: "Market Intel", path: "/market",          icon: "📈", desc: "Live mandi prices & AI sell timing" },
      { label: "Govt Schemes", path: "/schemes",         icon: "🏛️", desc: "AI-matched subsidies & benefits" },
      { label: "Arth Niti",    path: "/dowry-estimator", icon: "💹", desc: "Farm financial planner & ROI" },
      { label: "Agri News",    path: "/news",            icon: "📰", desc: "AI-curated farming news digest" },
    ],
  },
  {
    id: "community", label: "Community", emoji: "👥",
    color: "text-sky-700 dark:text-sky-300",
    activeBg: "bg-sky-50 dark:bg-sky-950/40",
    items: [
      { label: "Community",    path: "/community", icon: "🤝", desc: "Connect with 1.5L+ farmers" },
      { label: "Research Lab", path: "/research",  icon: "🔬", desc: "Agricultural science & studies" },
      { label: "Our Team",     path: "/team",      icon: "👋", desc: "Meet the KrishiMitra team" },
    ],
  },
  {
    id: "tools", label: "Tools", emoji: "🛠️",
    color: "text-violet-700 dark:text-violet-300",
    activeBg: "bg-violet-50 dark:bg-violet-950/40",
    items: [
      { label: "Field Mapper",   path: "/tools/field-mapper", icon: "🗺️", desc: "GPS mapping & zone analytics" },
      { label: "Satellite View", path: "/tools/satellite",    icon: "🛰️", desc: "NDVI crop stress detection" },
      { label: "IoT Sensors",    path: "/tools/iot",          icon: "📡", desc: "Live soil & weather sensors" },
      { label: "Smart Reports",  path: "/tools/reports",      icon: "📊", desc: "PDF reports for loans & insurance" },
      { label: "Achievements",   path: "/tools/achievements", icon: "🏆", desc: "XP badges & farmer leaderboard" },
      { label: "Offline Mode",   path: "/tools/offline",      icon: "📱", desc: "Works without internet" },
    ],
  },
];

function MegaDropdown({ group, currentPath }: { group: NavGroup; currentPath: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const groupActive = group.items.some((i) => i.path === currentPath);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 select-none ${
          groupActive ? `${group.activeBg} ${group.color} shadow-sm` : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <span>{group.emoji}</span>
        {group.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-[560px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className={`px-4 py-2 ${group.activeBg} border-b border-border`}>
              <div className={`text-[11px] font-bold tracking-wider ${group.color}`}>
                {group.emoji} {group.label.toUpperCase()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 p-3">
              {group.items.map((item) => {
                const isCurrent = item.path === currentPath;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setOpen(false); }}
                    className={`nav-item-hover flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 w-full ${
                      isCurrent ? `${group.activeBg} ${group.color}` : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <span className="text-xl leading-none mt-0.5">{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">{item.label}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{item.desc}</span>
                    </span>
                    {isCurrent && <Check className="h-4 w-4 mt-1 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { session, signOut } = useAuth();
  const { canInstall, installed, promptInstall } = usePWAInstall();
  const { isAdmin: _isAdmin } = useIsAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const all = NAV_GROUPS.flatMap((g) => g.items);
    const item = all.find((n) => n.path === location.pathname);
    document.title = item ? `${item.label} · KrishiMitra` : "KrishiMitra — AI Farming Companion";
  }, [location.pathname, i18n.language]);

  const handleLogout = async () => { await signOut(); navigate("/"); };
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const handleInstall = async () => {
    const r = await promptInstall();
    if (r === "accepted") toast.success("Installing KrishiMitra…");
    else if (r === "unavailable") toast.message("Install not available here", { description: "Open the Offline page for instructions." });
  };

  const directLinks = [
    { path: "/", label: t("nav.home") },
    { path: "/dashboard", label: t("nav.dashboard") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_0_0_hsl(var(--secondary)/0.15)]">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 h-16 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="relative">
            <img src={logo} alt="KrishiMitra" className="h-9 w-9 transition-transform group-hover:rotate-[-6deg] group-hover:scale-105" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                online ? "bg-primary animate-pulse" : "bg-destructive"
              }`}
              title={online ? "Online" : "Offline"}
            />
          </div>
          <span className="font-display text-2xl tracking-tight text-foreground hidden sm:inline leading-none">
            Krishi<span className="text-gradient-emerald">Mitra</span>
          </span>
        </Link>

        {/* Desktop: direct links + grouped dropdowns */}
        <div className="hidden lg:flex items-center gap-1 flex-1 min-w-0">
          {directLinks.map((l) => {
            const active = location.pathname === l.path;
            return (
              <Link
                key={l.path}
                to={l.path}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active ? "bg-primary/10 text-primary shadow-sm" : "text-foreground/70 hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {NAV_GROUPS.map((g) => (
            <MegaDropdown key={g.id} group={g} currentPath={location.pathname} />
          ))}
        </div>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 ml-auto">
          <SearchBar />
          {canInstall && !installed && (
            <Button size="sm" variant="ghost" onClick={handleInstall} className="gap-1.5 text-primary hidden xl:inline-flex" title="Install KrishiMitra as an app">
              <Download className="h-4 w-4" /> Install
            </Button>
          )}
          <NotificationCenter />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span className="hidden xl:inline">{currentLang.native}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card">
              {SUPPORTED_LANGUAGES.map((lng) => (
                <DropdownMenuItem
                  key={lng.code}
                  onClick={() => { i18n.changeLanguage(lng.code); setTimeout(() => window.location.reload(), 80); }}
                  className="flex items-center justify-between gap-3"
                >
                  <span>{lng.native}</span>
                  {i18n.language === lng.code && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {session ? (
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gradient-primary border-0 text-primary-foreground font-semibold btn-shine">
                <Sprout className="h-4 w-4 mr-1" /> {t("nav.getStarted")}
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile right */}
        <div className="md:hidden flex items-center gap-2 ml-auto">
          <NotificationCenter />
          <ThemeToggle />
          <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-card z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-emerald-700 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="" className="h-7 w-7" />
                  <span className="font-display text-lg">KrishiMitra</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <div className="px-3 pb-2"><SearchBar /></div>
                {directLinks.map((l) => (
                  <Link
                    key={l.path} to={l.path} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold ${
                      location.pathname === l.path ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-border" />
                {NAV_GROUPS.map((group) => (
                  <div key={group.id} className="mb-2">
                    <div className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-wider ${group.color}`}>
                      <span>{group.emoji}</span>{group.label.toUpperCase()}
                    </div>
                    {group.items.map((item) => (
                      <Link
                        key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                          location.pathname === item.path ? `${group.activeBg} ${group.color} font-semibold` : "text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 space-y-2">
                {canInstall && !installed && (
                  <Button variant="outline" className="w-full gap-2" onClick={handleInstall}>
                    <Download className="h-4 w-4" /> Install App
                  </Button>
                )}
                {session ? (
                  <Button variant="outline" className="w-full text-destructive" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-1" /> {t("nav.logout")}
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full gradient-primary border-0 text-primary-foreground">{t("nav.getStarted")}</Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
