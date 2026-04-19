import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sprout, Globe, LogOut, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import logo from "@/assets/logo.png";
import type { Session } from "@supabase/supabase-js";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Dashboard", path: "/dashboard" },
  { label: "Crop Advisor", path: "/crop-advisor" },
  { label: "Market", path: "/market" },
  { label: "Schemes", path: "/schemes" },
  { label: "News", path: "/news" },
  { label: "Research Lab", path: "/research" },
  { label: "Community", path: "/community" },
  { label: "Field Mapper", path: "/tools/field-mapper" },
  { label: "Smart Reports", path: "/tools/reports" },
  { label: "Satellite", path: "/tools/satellite" },
  { label: "IoT Sensors", path: "/tools/iot" },
  { label: "Achievements", path: "/tools/achievements" },
  { label: "Offline Mode", path: "/tools/offline" },
  { label: "Team", path: "/team" },
];

const languages = ["English", "हिंदी", "বাংলা", "தமிழ்", "తెలుగు", "ಕನ್ನಡ"];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langIdx, setLangIdx] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const [showScrollRight, setShowScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setShowScrollLeft(el.scrollLeft > 4);
      setShowScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => { el.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };
  const scroll = (dir: "left" | "right") => scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src={logo} alt="KrishiMitra" className="h-9 w-9" />
          <span className="font-display font-bold text-xl text-foreground hidden sm:inline">
            Krishi<span className="text-primary">Mitra</span>
          </span>
        </Link>

        {/* Scrollable nav */}
        <div className="hidden md:flex items-center flex-1 min-w-0 relative">
          {showScrollLeft && (
            <button onClick={() => scroll("left")} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-card border border-border shadow-sm hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div ref={scrollRef} className="flex items-center gap-0.5 overflow-x-auto scroll-smooth snap-x scrollbar-hide px-6" style={{ scrollbarWidth: "none" }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors snap-start flex-shrink-0 ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="navUnderline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary"
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
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLangIdx((i) => (i + 1) % languages.length)}
            className="gap-1.5 text-muted-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden lg:inline">{languages[langIdx]}</span>
          </Button>

          {session ? (
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gradient-primary border-0 text-primary-foreground font-semibold">
                <Sprout className="h-4 w-4 mr-1" /> Get Started
              </Button>
            </Link>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2 ml-auto">
          <ThemeToggle />
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
              <div className="pt-2 border-t border-border">
                {session ? (
                  <Button variant="outline" className="w-full text-destructive" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                    <LogOut className="h-4 w-4 mr-1" /> Logout
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full gradient-primary border-0 text-primary-foreground">Get Started</Button>
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
