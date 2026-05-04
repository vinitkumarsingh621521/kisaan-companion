import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sprout, Globe, LogOut, ChevronLeft, ChevronRight, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationCenter from "@/components/NotificationCenter";
import logo from "@/assets/logo.png";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useDowryUnlock } from "@/hooks/useDowryUnlock";
import SearchBar from "@/components/SearchBar";
import { toast } from "sonner";

const NAV_SCROLL_KEY = "km.nav.scroll";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { session, signOut } = useAuth();
  const { canInstall, installed, promptInstall } = usePWAInstall();
  const { unlocked: dowryUnlocked } = useDowryUnlock();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.dashboard"), path: "/dashboard" },
    { label: t("nav.aiAdvisor", "AI Advisor"), path: "/ai-advisor", badge: "NEW" },
    { label: t("nav.cropAdvisor"), path: "/crop-advisor" },
    { label: t("nav.market"), path: "/market" },
    { label: t("nav.schemes"), path: "/schemes" },
    { label: t("nav.news"), path: "/news" },
    { label: t("nav.research"), path: "/research" },
    { label: t("nav.community"), path: "/community" },
    { label: t("nav.fieldMapper"), path: "/tools/field-mapper" },
    { label: t("nav.reports"), path: "/tools/reports" },
    { label: t("nav.satellite"), path: "/tools/satellite" },
    { label: t("nav.iot"), path: "/tools/iot" },
    { label: t("nav.achievements"), path: "/tools/achievements" },
    { label: t("nav.offline"), path: "/tools/offline" },
    { label: t("nav.team"), path: "/team" },
    ...(dowryUnlocked ? [{ label: "🤡 Dowry Reality Check", path: "/dowry-estimator", badge: "🔓" }] : []),
  ] as { label: string; path: string; badge?: string }[];

  // Online/offline LED
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

  // Document title per route
  useEffect(() => {
    const item = navItems.find((n) => n.path === location.pathname);
    const title = item ? `${item.label} · KrishiMitra` : "KrishiMitra — AI Farming Companion";
    document.title = title;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, i18n.language]);

  const updateScrollIndicators = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollLeft(el.scrollLeft > 4);
    setShowScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    sessionStorage.setItem(NAV_SCROLL_KEY, String(el.scrollLeft));
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Restore prior scroll
    const saved = sessionStorage.getItem(NAV_SCROLL_KEY);
    if (saved) el.scrollLeft = parseFloat(saved);
    updateScrollIndicators();
    el.addEventListener("scroll", updateScrollIndicators);
    window.addEventListener("resize", updateScrollIndicators);
    return () => {
      el.removeEventListener("scroll", updateScrollIndicators);
      window.removeEventListener("resize", updateScrollIndicators);
    };
  }, []);

  // Auto-scroll active item into view on route change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLAnchorElement>("a[data-active='true']");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [location.pathname]);

  // Drag-to-scroll with cursor + horizontal mouse wheel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      moved = false;
      startX = e.pageX - el.offsetLeft;
      startScroll = el.scrollLeft;
      el.style.cursor = "grabbing";
    };
    const onMouseLeave = () => { isDown = false; el.style.cursor = ""; };
    const onMouseUp = () => { isDown = false; el.style.cursor = ""; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = x - startX;
      if (Math.abs(walk) > 4) moved = true;
      el.scrollLeft = startScroll - walk;
    };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    };
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.style.cursor = "grab";
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const handleLogout = async () => { await signOut(); navigate("/"); };
  const scroll = (dir: "left" | "right") => scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  const handleInstall = async () => {
    const r = await promptInstall();
    if (r === "accepted") toast.success("Installing KrishiMitra…");
    else if (r === "unavailable") toast.message("Install not available here", { description: "Open the Offline page for instructions." });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <img src={logo} alt="KrishiMitra" className="h-9 w-9" />
            {/* Online LED */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                online ? "bg-primary animate-pulse" : "bg-destructive"
              }`}
              title={online ? "Online" : "Offline"}
            />
          </div>
          <span className="font-display font-bold text-xl text-foreground hidden sm:inline">
            Krishi<span className="text-primary">Mitra</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center flex-1 min-w-0 relative">
          {showScrollLeft && (
            <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-card border border-border shadow-sm hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-[5] bg-gradient-to-r from-card to-transparent transition-opacity ${showScrollLeft ? "opacity-100" : "opacity-0"}`} />
          <div className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-[5] bg-gradient-to-l from-card to-transparent transition-opacity ${showScrollRight ? "opacity-100" : "opacity-0"}`} />
          <div
            ref={scrollRef}
            className="flex items-center gap-0.5 overflow-x-auto scroll-smooth snap-x scrollbar-hide px-6 select-none"
            style={{ scrollbarWidth: "none" }}
          >
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-active={active}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors snap-start flex-shrink-0 flex items-center gap-1.5 ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <motion.div
                      layoutId="navUnderline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary shadow-[0_0_10px_hsl(var(--primary))]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
          {showScrollRight && (
            <button onClick={() => scroll("right")} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-card border border-border shadow-sm hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {/* ⌘K hint */}
          <kbd className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] text-muted-foreground bg-muted/30">
            <span className="text-xs">⌘</span>K
          </kbd>

          {canInstall && !installed && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleInstall}
              className="gap-1.5 text-primary hidden lg:inline-flex"
              title="Install KrishiMitra as an app"
            >
              <Download className="h-4 w-4" /> Install
            </Button>
          )}

          <NotificationCenter />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span className="hidden lg:inline">{currentLang.native}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card">
              {SUPPORTED_LANGUAGES.map((lng) => (
                <DropdownMenuItem
                  key={lng.code}
                  onClick={() => i18n.changeLanguage(lng.code)}
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
              <Button size="sm" className="gradient-primary border-0 text-primary-foreground font-semibold">
                <Sprout className="h-4 w-4 mr-1" /> {t("nav.getStarted")}
              </Button>
            </Link>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2 ml-auto">
          <NotificationCenter />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card">
              {SUPPORTED_LANGUAGES.map((lng) => (
                <DropdownMenuItem key={lng.code} onClick={() => i18n.changeLanguage(lng.code)}>
                  {lng.native}
                  {i18n.language === lng.code && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border max-h-[70vh] overflow-y-auto"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                    location.pathname === item.path ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border space-y-2">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
