import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDowryUnlock, DOWRY_PASSWORD, DOWRY_ROUTE } from "@/hooks/useDowryUnlock";
import { toast } from "sonner";

type Item = { label: string; path: string; keywords: string; group: string };

const ITEMS: Item[] = [
  { label: "Home", path: "/", keywords: "home landing intro", group: "Pages" },
  { label: "Dashboard", path: "/dashboard", keywords: "dashboard overview farm", group: "Pages" },
  { label: "AI Advisor", path: "/ai-advisor", keywords: "ai advisor chat krishi", group: "Pages" },
  { label: "Crop Advisor", path: "/crop-advisor", keywords: "crop advisor disease scanner", group: "Pages" },
  { label: "Market Intelligence", path: "/market", keywords: "market mandi price prices", group: "Pages" },
  { label: "Government Schemes", path: "/schemes", keywords: "schemes pm-kisan subsidy", group: "Pages" },
  { label: "News", path: "/news", keywords: "news agri", group: "Pages" },
  { label: "Research Lab", path: "/research", keywords: "research papers icar", group: "Pages" },
  { label: "Community", path: "/community", keywords: "community chat farmers", group: "Pages" },
  { label: "Profile", path: "/profile", keywords: "profile settings farmer details", group: "Pages" },
  { label: "Field Mapper", path: "/tools/field-mapper", keywords: "field mapper map zones", group: "Tools" },
  { label: "Smart Reports", path: "/tools/reports", keywords: "reports pdf export", group: "Tools" },
  { label: "Satellite View", path: "/tools/satellite", keywords: "satellite ndvi", group: "Tools" },
  { label: "IoT Sensors", path: "/tools/iot", keywords: "iot sensors moisture", group: "Tools" },
  { label: "Achievements", path: "/tools/achievements", keywords: "achievements badges xp", group: "Tools" },
  { label: "Offline Mode", path: "/tools/offline", keywords: "offline pwa install", group: "Tools" },
];

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { unlocked, unlock } = useDowryUnlock();

  // Detect secret password
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed === DOWRY_PASSWORD) {
      if (!unlocked) {
        unlock();
        toast.success("🔓 Hidden page unlocked: AI Dowry Reality Check 3000", {
          description: "Click the new tab in the navbar, or hit Enter to open.",
          duration: 5000,
        });
      }
    }
  }, [query, unlocked, unlock]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === DOWRY_PASSWORD) return [];
    return ITEMS.filter(i => i.label.toLowerCase().includes(q) || i.keywords.includes(q)).slice(0, 8);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (q === DOWRY_PASSWORD) {
      unlock();
      navigate(DOWRY_ROUTE);
      setQuery("");
      setOpen(false);
      return;
    }
    if (results[0]) {
      navigate(results[0].path);
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search…"
          className="h-8 w-32 lg:w-44 pl-8 pr-7 text-sm rounded-md border border-border bg-muted/40 focus:bg-card focus:w-56 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/70"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </form>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-[60]"
          >
            {results.map((r) => (
              <button
                key={r.path}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { navigate(r.path); setQuery(""); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted text-left"
              >
                <span>
                  <span className="text-foreground">{r.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{r.group}</span>
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
