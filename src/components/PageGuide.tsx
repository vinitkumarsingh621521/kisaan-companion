import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, HelpCircle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { edgeToken } from "@/lib/edgeAuth";

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

interface PageGuideProps {
  pageId: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  gradient?: string;
  aiContext?: string;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

export default function PageGuide({
  pageId,
  title,
  subtitle,
  description,
  features,
  gradient = "from-green-800 to-emerald-700",
  aiContext = "",
}: PageGuideProps) {
  const lsKey = `km.pageguide.${pageId}`;
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(lsKey) === "open";
    } catch {
      return false;
    }
  });
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(lsKey, expanded ? "open" : "closed");
    } catch {}
  }, [expanded, lsKey]);

  const askAI = async () => {
    if (aiReply) {
      setAiReply(null);
      return;
    }
    setAiLoading(true);
    try {
      const token = await edgeToken();
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "saarthi_guide",
          messages: [
            {
              role: "user",
              content: `You are Saarthi, the KisaanCompanion AI guide. Explain this page to an Indian farmer in simple, friendly language (mix Hindi and English, keep it brief — 2-3 sentences max). Page: "${title}". Context: ${aiContext || description}. Start with "Namaste Kisan! 🙏"`,
            },
          ],
        }),
      });

      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();
      const clean = (
        data.result ||
        data.choices?.[0]?.message?.content ||
        ""
      ).replace(/```[^`]*```/g, "").trim();
      setAiReply(
        clean ||
        "Namaste Kisan! 🙏 Yeh page aapke farm ke liye helpful features rakhta hai. Koi bhi feature click karke try karein!"
      );
    } catch (e: any) {
      setAiReply(
        "Namaste Kisan! 🙏 Is page par aapko powerful AI farming tools milenge. Koi bhi feature tap karke start karein!"
      );
      toast.error("Saarthi is busy — try again", { description: e?.message });

    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-primary/15 bg-card shadow-sm mb-4">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r ${gradient} text-white text-left`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <HelpCircle className="h-4 w-4 flex-shrink-0" />
          <div className="text-sm min-w-0 truncate">
            <span className="font-semibold">{title}</span>
            <span className="text-white/80 ml-1">— {subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="hidden sm:inline text-[11px] text-white/80">
            {expanded ? "Hide guide" : "What does this page do?"}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-4 bg-card">
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {features.map((f, i) => (
                  <div
                    key={i}
                    className="flex gap-2 p-3 rounded-lg bg-muted/40 border border-border/50"
                  >
                    <span className="text-xl flex-shrink-0">{f.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border/50">
                <button
                  onClick={askAI}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-60"
                >
                  {aiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {aiReply ? "Hide Saarthi explanation" : "🙏 Ask Saarthi to explain this page"}
                </button>

                <AnimatePresence>
                  {aiReply && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground leading-relaxed"
                    >
                      <span className="mr-1.5">🤖</span>
                      {aiReply}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
