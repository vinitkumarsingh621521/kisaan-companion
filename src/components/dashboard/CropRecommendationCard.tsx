import { edgeToken } from "@/lib/edgeAuth";
import { useEffect, useRef, useState } from "react";
import { TrendingUp, Droplets, Calendar, IndianRupee, ChevronRight, X, Leaf, BarChart3, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { toArray } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { errMsg } from "@/lib/errors";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

const SEASON_MONTHS: Record<string, string[]> = {
  Kharif: ["Jun", "Jul", "Aug", "Sep", "Oct"],
  Rabi: ["Nov", "Dec", "Jan", "Feb", "Mar"],
  Zaid: ["Mar", "Apr", "May", "Jun", "Jul"],
};
const STAGE_NAMES = ["Sowing", "Germination", "Vegetative", "Flowering", "Harvest"];

function GrowingSeasonTimeline({ season }: { season?: string }) {
  const key = (season || "").match(/Kharif|Rabi|Zaid/i)?.[0];
  const normalized = key ? key[0].toUpperCase() + key.slice(1).toLowerCase() : "Kharif";
  const months = SEASON_MONTHS[normalized] || SEASON_MONTHS.Kharif;
  const currentMonth = new Date().toLocaleString("en-US", { month: "short" });
  const currentIdx = months.findIndex((m) => m === currentMonth);

  return (
    <div className="mb-5 p-4 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Growing Season Timeline</span>
        <span className="text-[10px] text-muted-foreground">{normalized} · {months[0]}–{months[months.length - 1]}</span>
      </div>
      <div className="relative flex items-center justify-between">
        <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-border -translate-y-1/2" />
        {STAGE_NAMES.map((stage, i) => {
          const isCurrent = i === currentIdx;
          return (
            <div key={stage} className="relative flex flex-col items-center flex-1 z-10">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                isCurrent ? "bg-primary text-primary-foreground border-primary animate-pulse" :
                i <= (currentIdx === -1 ? -1 : currentIdx) ? "bg-primary/30 border-primary/50 text-primary" :
                "bg-card border-border text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <div className="text-[10px] font-medium text-foreground mt-1.5 text-center leading-tight">{stage}</div>
              <div className="text-[9px] text-muted-foreground">{months[i]}</div>
              {isCurrent && (
                <div className="absolute -bottom-5 text-[9px] font-semibold text-primary whitespace-nowrap">You are here</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CropType = {
  name: string;
  emoji?: string;
  yield: string;
  profit: string;
  water: string;
  season: string;
  score: number;
  sustainability: number;
  reason?: string;
};

interface CropRecommendationCardProps {
  profile?: {
    farm_location: string | null;
    farm_size: string | null;
    soil_type: string | null;
  } | null;
}

export default function CropRecommendationCard({ profile }: CropRecommendationCardProps) {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [crops, setCrops] = useState<CropType[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<CropType | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>("");
  const autoFetchedRef = useRef<string | null>(null);

  const getAIRecommendations = async () => {
    setIsLoadingAI(true);
    try {
      const fd: any = active?.farmer_details || {};
      const prevCrops = toArray(fd.current_crops);
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await edgeToken()}`,
        },
        body: JSON.stringify({
          action: "crop_recommendation",
          profileContext: ctx,
          profile: active,
          farmData: {
            location: profile?.farm_location || fd.state || "Not specified",
            soilType: profile?.soil_type || fd.soil_type || "Not specified",
            farmSize: profile?.farm_size || fd.farm_size_acres || "Not specified",
            season: ctx?.climate?.current_season || "Kharif",
            previousCrops: prevCrops.length ? prevCrops.join(", ") : "Rice, Maize",
            waterAvailability: fd.water_availability || "Medium",
          },
        }),
      });

      if (!resp.ok) {
        let msg = `AI failed (${resp.status})`;
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch {}
        if (resp.status === 429) throw new Error("AI is busy — please try again in 30 seconds.");
        if (resp.status === 402) throw new Error("AI credits exhausted. Please top up in Settings → Usage.");
        throw new Error(msg);
      }

      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const content: string = data.result || "";

      const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
      let parsed: any = data.structured ? tryParse(content) : null;
      if (!parsed) {
        const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced) parsed = tryParse(fenced[1].trim());
      }
      if (!parsed) parsed = tryParse(content.trim());
      if (!parsed) {
        const block = content.match(/\{[\s\S]*\}/);
        if (block) parsed = tryParse(block[0]);
      }

      if (parsed?.recommendations?.length) {
        setCrops(parsed.recommendations);
        setAiAdvice(parsed.advice || "");
        toast.success("AI recommendations updated! 🌾");
      } else {
        setAiAdvice(content || "AI returned no structured data — try again.");
        toast.message("AI analysis complete");
      }
    } catch (e: unknown) {
      toast.error(errMsg(e, "Failed to get AI recommendations"));
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Auto-fetch real AI recommendations once profile + context are ready
  useEffect(() => {
    if (!active?.id || !ctx) return;
    if (autoFetchedRef.current === active.id) return;
    autoFetchedRef.current = active.id;
    getAIRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, ctx?.farmer_name]);

  return (
    <div className="glass-card p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">AI Crop Recommendations</h3>
        <span className="krishi-badge bg-krishi-gold-light text-krishi-gold">Season: Kharif</span>
      </div>

      {aiAdvice && (
        <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{aiAdvice}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="space-y-3">

        {isLoadingAI && crops.length === 0 ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : crops.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            Complete your profile to get personalized AI crop recommendations 🌾
          </p>
        ) : crops.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl p-4 border transition-all hover:shadow-md cursor-pointer ${
              i === 0
                ? "bg-primary/5 border-primary/20"
                : "bg-muted/30 border-border/50 hover:border-primary/20"
            }`}
            onClick={() => setSelectedCrop(c)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{c.emoji}</span>
                <div>
                  <div className="font-display font-semibold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> {c.season}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-display font-bold ${i === 0 ? "text-primary" : "text-foreground"}`}>
                  {c.score}%
                </div>
                <div className="text-xs text-muted-foreground">Match</div>
              </div>
            </div>
            {c.reason && (
              <p className="text-xs text-muted-foreground mb-2 italic">{c.reason}</p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center bg-background/50 rounded-lg p-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
                <div className="text-xs text-muted-foreground">Yield</div>
                <div className="text-sm font-semibold text-foreground">{c.yield}</div>
              </div>
              <div className="text-center bg-background/50 rounded-lg p-2">
                <IndianRupee className="h-3.5 w-3.5 text-krishi-gold mx-auto mb-0.5" />
                <div className="text-xs text-muted-foreground">Profit</div>
                <div className="text-sm font-semibold text-foreground">{c.profit}</div>
              </div>
              <div className="text-center bg-background/50 rounded-lg p-2">
                <Droplets className="h-3.5 w-3.5 text-krishi-sky mx-auto mb-0.5" />
                <div className="text-xs text-muted-foreground">Water</div>
                <div className="text-sm font-semibold text-foreground">{c.water}</div>
              </div>
            </div>
          </motion.div>
        ))}

      </div>

      <Button
        className="w-full mt-4 gradient-primary border-0 text-primary-foreground gap-2"
        onClick={getAIRecommendations}
        disabled={isLoadingAI}
      >
        {isLoadingAI ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Getting AI Recommendations...</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Get AI Recommendations</>
        )}
      </Button>

      <AnimatePresence>
        {selectedCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
            onClick={() => setSelectedCrop(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedCrop.emoji}</span>
                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground">{selectedCrop.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedCrop.season} Season</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCrop(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-primary/5 rounded-xl p-4 text-center">
                  <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
                  <div className="text-lg font-display font-bold text-primary">{selectedCrop.score}%</div>
                  <div className="text-xs text-muted-foreground">Match Score</div>
                </div>
                <div className="bg-primary/5 rounded-xl p-4 text-center">
                  <Leaf className="h-5 w-5 text-primary mx-auto mb-1" />
                  <div className="text-lg font-display font-bold text-primary">{selectedCrop.sustainability}%</div>
                  <div className="text-xs text-muted-foreground">Sustainability</div>
                </div>
              </div>

              {selectedCrop.reason && (
                <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg italic">{selectedCrop.reason}</p>
              )}

              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Expected Yield</span>
                  <span className="font-semibold text-foreground">{selectedCrop.yield}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Estimated Profit</span>
                  <span className="font-semibold text-foreground">{selectedCrop.profit}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Droplets className="h-4 w-4" /> Water Requirement</span>
                  <span className="font-semibold text-foreground">{selectedCrop.water}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Best Sowing</span>
                  <span className="font-semibold text-foreground">{selectedCrop.season}</span>
                </div>
              </div>

              <GrowingSeasonTimeline season={selectedCrop.season} />

              <div className="flex gap-3">
                <Button className="flex-1 gradient-primary border-0 text-primary-foreground" onClick={() => { toast.success(`${selectedCrop.name} added to your crop plan! 🌾`); setSelectedCrop(null); }}>
                  Add to Plan <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button variant="outline" onClick={() => setSelectedCrop(null)}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
