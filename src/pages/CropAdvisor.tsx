import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/dashboard/AIChatWidget";
import CropRecommendationCard from "@/components/dashboard/CropRecommendationCard";
import SoilHealthCard from "@/components/dashboard/SoilHealthCard";
import MultiImageDiseaseScanner from "@/components/cropAdvisor/MultiImageDiseaseScanner";
import CropCompatibilityMatrix from "@/components/cropAdvisor/CropCompatibilityMatrix";
import { Camera, Upload, X, AlertTriangle, Loader2, ShieldAlert, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

const _personalizationOn = true;

type DiseaseResult = {
  name: string;
  confidence: number;
  severity: "Low" | "Medium" | "High";
  treatment: string;
  prevention: string;
};

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

export default function CropAdvisor() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [diseaseResults, setDiseaseResults] = useState<DiseaseResult[] | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setDiseaseResults(null);
      setSummary("");
      toast.success("Image uploaded! Click 'Analyze' to detect diseases.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const runAnalysis = async () => {
    if (!uploadedImage) return;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setDiseaseResults(null);
    setSummary("");

    // Progress animation
    const progressInterval = setInterval(() => {
      setAnalysisProgress((p) => Math.min(p + 5, 90));
    }, 300);

    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "disease", image: uploadedImage, profileContext: ctx, profile: active }),
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }

      const data = await resp.json();
      const content = data.result || "";

      // Try to parse JSON from the response
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const parsed = JSON.parse(jsonMatch[1] || content);
        if (parsed.diseases) {
          setDiseaseResults(parsed.diseases);
          setSummary(parsed.summary || "");
          toast.success(`Analysis complete! ${parsed.diseases.length} issue(s) detected.`);
        } else if (parsed.error) {
          toast.error(parsed.error);
          setSummary(parsed.error);
        }
      } catch {
        // If not JSON, display as markdown
        setSummary(content);
        toast.success("Analysis complete!");
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      toast.error(e.message || "Disease analysis failed");
      setSummary("Analysis failed. Please try again with a clearer image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setDiseaseResults(null);
    setSummary("");
    setAnalysisProgress(0);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              🌾 AI Crop Advisor {active?.full_name ? <span className="text-base font-normal text-muted-foreground">— for {active.full_name}</span> : null}
            </h1>
            <p className="text-muted-foreground mt-1">
              {ctx ? `Personalized for your ${ctx.climate?.zone || "region"} farm in ${ctx.location?.state || "India"}.` : "Real AI-powered disease detection & crop recommendations"}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5">
              <AIChatWidget />
            </div>
            <div className="lg:col-span-4">
              <CropRecommendationCard />
            </div>
            <div className="lg:col-span-3 space-y-5">
              {/* Disease Scanner */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                  </div>
                  AI Disease Scanner
                </h3>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <input
                  id="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                {!uploadedImage ? (
                  <div
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                      isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">
                      {isDragging ? "Drop your image here!" : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground/60">JPG, PNG up to 10MB</p>
                    <div className="flex gap-2 justify-center mt-3">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        <Upload className="h-4 w-4 mr-1" /> Upload
                      </Button>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); document.getElementById("cameraInput")?.click(); }}>
                        <Camera className="h-4 w-4 mr-1" /> Camera
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={uploadedImage} alt="Uploaded crop" className="w-full h-40 object-cover" />
                      <button
                        className="absolute top-2 right-2 p-1 bg-foreground/60 rounded-full text-background hover:bg-foreground/80 transition-colors"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {isAnalyzing && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI is analyzing your image...
                        </div>
                        <Progress value={analysisProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {analysisProgress < 30 && "Preprocessing image..."}
                          {analysisProgress >= 30 && analysisProgress < 60 && "Running AI disease detection..."}
                          {analysisProgress >= 60 && analysisProgress < 90 && "Generating diagnosis report..."}
                          {analysisProgress >= 90 && "Finalizing results..."}
                        </p>
                      </div>
                    )}

                    {!isAnalyzing && !diseaseResults && !summary && (
                      <Button className="w-full gradient-primary border-0 text-primary-foreground" onClick={runAnalysis}>
                        <Bug className="h-4 w-4 mr-1" /> Analyze with AI
                      </Button>
                    )}
                  </div>
                )}

                {/* Disease Results */}
                <AnimatePresence>
                  {(diseaseResults || summary) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 space-y-3"
                    >
                      {summary && !diseaseResults && (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{summary}</ReactMarkdown>
                        </div>
                      )}

                      {diseaseResults && (
                        <>
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-krishi-gold" />
                            AI Detected Issues
                          </h4>
                          {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
                          {diseaseResults.map((d, i) => (
                            <motion.div
                              key={d.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.15 }}
                              className={`rounded-lg p-3 border text-sm ${
                                d.severity === "High"
                                  ? "bg-destructive/5 border-destructive/20"
                                  : d.severity === "Medium"
                                  ? "bg-krishi-gold-light border-krishi-gold/20"
                                  : "bg-primary/5 border-primary/20"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-foreground">{d.name}</span>
                                <span className={`krishi-badge text-xs ${
                                  d.severity === "High" ? "bg-destructive/10 text-destructive"
                                  : d.severity === "Medium" ? "bg-krishi-gold/10 text-krishi-gold"
                                  : "bg-primary/10 text-primary"
                                }`}>{d.confidence}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                <span className="font-medium">Treatment:</span> {d.treatment}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Prevention:</span> {d.prevention}
                              </p>
                            </motion.div>
                          ))}
                        </>
                      )}
                      <Button variant="outline" size="sm" className="w-full" onClick={clearImage}>
                        Scan Another Image
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <SoilHealthCard />
            </div>
          </div>

          {/* New Phase 2 mounts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
            <MultiImageDiseaseScanner />
            <CropCompatibilityMatrix />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
