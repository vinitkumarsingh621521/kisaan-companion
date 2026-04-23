import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BackToTop() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, (scrolled / max) * 100) : 0;
      setShow(scrolled > 400);
      setProgress(pct);
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 flex items-center justify-center group"
          aria-label="Back to top"
        >
          {/* Progress ring */}
          <svg className="absolute inset-0 -rotate-90" width="48" height="48">
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.2s" }}
            />
          </svg>
          <span className="absolute inset-1 rounded-full gradient-primary text-primary-foreground shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowUp className="h-4 w-4" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
