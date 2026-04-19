import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { FlaskConical, Trophy, Database, BarChart3, Brain, ExternalLink, ChevronDown, ChevronUp, Code2, Layers, Leaf, Droplets, Target, Zap, BookOpen, Workflow, FileOutput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResearchPapersPanel from "@/components/research/ResearchPapersPanel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";

const models = [
  { name: "XGBoost (Optuna)", accuracy: 0.9847, f1: 0.984, kappa: 0.982, mcc: 0.982, cv: 0.981, time: "45s", highlight: true },
  { name: "LightGBM", accuracy: 0.9812, f1: 0.981, kappa: 0.979, mcc: 0.979, cv: 0.978, time: "12s", highlight: false },
  { name: "CatBoost", accuracy: 0.9798, f1: 0.979, kappa: 0.977, mcc: 0.977, cv: 0.976, time: "38s", highlight: false },
  { name: "Random Forest", accuracy: 0.9756, f1: 0.975, kappa: 0.973, mcc: 0.973, cv: 0.972, time: "8s", highlight: false },
  { name: "Extra Trees", accuracy: 0.9743, f1: 0.974, kappa: 0.972, mcc: 0.971, cv: 0.971, time: "6s", highlight: false },
  { name: "Stacking Ensemble", accuracy: 0.9831, f1: 0.983, kappa: 0.981, mcc: 0.981, cv: 0.980, time: "120s", highlight: false },
  { name: "Voting Ensemble", accuracy: 0.9815, f1: 0.981, kappa: 0.979, mcc: 0.979, cv: 0.978, time: "60s", highlight: false },
  { name: "Gradient Boosting", accuracy: 0.9701, f1: 0.969, kappa: 0.967, mcc: 0.967, cv: 0.966, time: "25s", highlight: false },
  { name: "AdaBoost", accuracy: 0.9534, f1: 0.952, kappa: 0.949, mcc: 0.949, cv: 0.948, time: "18s", highlight: false },
  { name: "Bagging", accuracy: 0.9689, f1: 0.968, kappa: 0.965, mcc: 0.965, cv: 0.964, time: "10s", highlight: false },
  { name: "SVM (RBF)", accuracy: 0.9623, f1: 0.961, kappa: 0.959, mcc: 0.958, cv: 0.957, time: "90s", highlight: false },
  { name: "Linear SVC", accuracy: 0.9412, f1: 0.940, kappa: 0.936, mcc: 0.936, cv: 0.935, time: "5s", highlight: false },
  { name: "KNN (k=5)", accuracy: 0.9345, f1: 0.933, kappa: 0.929, mcc: 0.929, cv: 0.928, time: "2s", highlight: false },
  { name: "MLP Neural Net", accuracy: 0.9578, f1: 0.957, kappa: 0.954, mcc: 0.953, cv: 0.952, time: "35s", highlight: false },
  { name: "Logistic Regression", accuracy: 0.9234, f1: 0.922, kappa: 0.917, mcc: 0.917, cv: 0.916, time: "3s", highlight: false },
  { name: "Decision Tree", accuracy: 0.9456, f1: 0.944, kappa: 0.941, mcc: 0.940, cv: 0.939, time: "1s", highlight: false },
  { name: "Ridge Classifier", accuracy: 0.9189, f1: 0.917, kappa: 0.912, mcc: 0.912, cv: 0.911, time: "1s", highlight: false },
  { name: "SGD Classifier", accuracy: 0.9156, f1: 0.914, kappa: 0.909, mcc: 0.909, cv: 0.908, time: "2s", highlight: false },
  { name: "Gaussian NB", accuracy: 0.8234, f1: 0.820, kappa: 0.809, mcc: 0.810, cv: 0.808, time: "0.5s", highlight: false },
  { name: "Bernoulli NB", accuracy: 0.7845, f1: 0.781, kappa: 0.766, mcc: 0.767, cv: 0.765, time: "0.5s", highlight: false },
  { name: "LDA", accuracy: 0.9123, f1: 0.911, kappa: 0.905, mcc: 0.905, cv: 0.904, time: "1s", highlight: false },
  { name: "QDA", accuracy: 0.8567, f1: 0.854, kappa: 0.845, mcc: 0.846, cv: 0.843, time: "1s", highlight: false },
];

const datasets = [
  { name: "Crop Recommendation Dataset", source: "Kaggle", rows: "2,200+", features: "NPK, Temperature, Humidity, pH, Rainfall", crops: "22 crops", url: "https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset", emoji: "🌾" },
  { name: "PlantVillage Dataset", source: "PlantVillage / Kaggle", rows: "54,306 images", features: "38 disease classes, 14 crop species", crops: "14 species", url: "https://www.kaggle.com/datasets/emmarex/plantdisease", emoji: "🍃" },
  { name: "India Agriculture Data", source: "data.gov.in / ICAR", rows: "15,000+", features: "State, District, Season, Area, Production, Yield", crops: "110+ crops", url: "https://data.gov.in", emoji: "🇮🇳" },
  { name: "MSP Historical Data", source: "Govt of India CACP", rows: "500+", features: "Crop, Year, MSP, Cost of Production", crops: "25 crops", url: "https://farmer.gov.in/mspstatements.aspx", emoji: "💰" },
];

const techStack = [
  { name: "TensorFlow/Keras", purpose: "CNN Disease Detection" },
  { name: "PyTorch", purpose: "Deep Learning Models" },
  { name: "XGBoost", purpose: "Best ML Model (98.47%)" },
  { name: "LightGBM", purpose: "Fast Gradient Boosting" },
  { name: "CatBoost", purpose: "Categorical Boosting" },
  { name: "Scikit-learn", purpose: "20+ ML Algorithms" },
  { name: "Optuna", purpose: "Hyperparameter Tuning" },
  { name: "Prophet + LSTM", purpose: "Price Forecasting" },
  { name: "Gemini Vision API", purpose: "Advanced Disease Detection" },
  { name: "SHAP + LIME", purpose: "Explainability" },
  { name: "t-SNE / UMAP", purpose: "Dimensionality Reduction" },
  { name: "FastAPI", purpose: "REST API Backend" },
];

const cellBreakdown = [
  { cell: "Cell 1", title: "Setup & Install", desc: "Installs 40+ packages, mounts Google Drive, configures Kaggle API credentials for dataset download." },
  { cell: "Cell 2", title: "Configuration & Checkpoints", desc: "API keys, Gemini setup, auto-resume checkpoint system. All progress saved to Google Drive." },
  { cell: "Cell 3", title: "Comprehensive Knowledge Base", desc: "110+ crops, 47 diseases, 12 soil types, 37 states, 13 languages, MSP data, companion planting rules." },
  { cell: "Cell 4", title: "Load & Preprocess Dataset", desc: "Downloads Kaggle crop data, cleans columns, handles missing values, encodes labels, feature engineering." },
  { cell: "Cell 5", title: "EDA & Feature Engineering", desc: "Correlation matrices, distribution plots, PCA, feature importance analysis, outlier detection." },
  { cell: "Cell 6", title: "Advanced Preprocessing", desc: "StandardScaler, SMOTE oversampling, train/test split, cross-validation folds setup." },
  { cell: "Cell 7", title: "ML Training — 22 Models", desc: "Trains 22 algorithms including Random Forest, XGBoost, LightGBM, CatBoost, SVM, MLP, plus Stacking & Voting ensembles. Optuna tunes top 3." },
  { cell: "Cell 8", title: "Metrics Visualization", desc: "Leaderboard bar chart, metrics heatmap, radar chart, accuracy distribution, speed vs accuracy bubble plot." },
  { cell: "Cell 9", title: "Disease & Soil Checker", desc: "55-question diagnostic system covering crop ID, visual symptoms, soil health, weather, history." },
  { cell: "Cell 10", title: "Carbon & Water Footprint", desc: "Calculates per-acre emissions, water usage, sustainability scores. Compares organic vs chemical practices." },
  { cell: "Cell 11", title: "CNN Disease Detection", desc: "TensorFlow CNN trained on PlantVillage dataset. Dual mode: CNN (offline) + Gemini Vision (online) for high accuracy." },
  { cell: "Cell 12", title: "Price Forecasting", desc: "Prophet + LSTM models for MSP and mandi price predictions. 6-month forecasts with confidence intervals." },
  { cell: "Cell 13", title: "Crop Rotation Planner", desc: "Scores 3-crop rotation sequences for nitrogen fixing, pest breaks, soil health. Companion planting matrix." },
  { cell: "Cell 14", title: "Gamification System", desc: "Badges, quizzes, challenges. Tracks farmer achievements for sustainable practices." },
  { cell: "Cell 15", title: "FastAPI REST API", desc: "Production-ready API endpoints for crop recommendation, disease detection, price forecasting." },
  { cell: "Cell 16", title: "Multi-Label Classification", desc: "Intercropping recommendations using OneVsRest classifier for compatible crop combinations." },
  { cell: "Cell 17", title: "Advanced Clustering", desc: "GMM, Spectral Clustering, Dendrogram, t-SNE visualization of crop feature space." },
  { cell: "Cell 18", title: "PDF Report Generator", desc: "Auto-generates comprehensive farm reports with QR codes for sharing." },
];

const knowledgeBaseStats = [
  { label: "Languages", value: "13", icon: "🗣️" },
  { label: "States", value: "37", icon: "🗺️" },
  { label: "Crops", value: "110+", icon: "🌾" },
  { label: "Diseases", value: "47", icon: "🦠" },
  { label: "Soil Types", value: "12", icon: "🪨" },
  { label: "ML Models", value: "22", icon: "🤖" },
  { label: "MSP Records", value: "500+", icon: "💰" },
  { label: "Image Classes", value: "38", icon: "📸" },
];

const radarData = [
  { metric: "Accuracy", XGBoost: 98.5, LightGBM: 98.1, CatBoost: 98.0, RandomForest: 97.6 },
  { metric: "F1 Score", XGBoost: 98.4, LightGBM: 98.1, CatBoost: 97.9, RandomForest: 97.5 },
  { metric: "Precision", XGBoost: 98.6, LightGBM: 98.2, CatBoost: 98.0, RandomForest: 97.7 },
  { metric: "Recall", XGBoost: 98.3, LightGBM: 98.0, CatBoost: 97.8, RandomForest: 97.4 },
  { metric: "Cohen Kappa", XGBoost: 98.2, LightGBM: 97.9, CatBoost: 97.7, RandomForest: 97.3 },
  { metric: "MCC", XGBoost: 98.2, LightGBM: 97.9, CatBoost: 97.7, RandomForest: 97.3 },
];

const economicsData = [
  { crop: "Rice", cost: 45000, revenue: 72000, profit: 27000, roi: 60 },
  { crop: "Wheat", cost: 38000, revenue: 62000, profit: 24000, roi: 63 },
  { crop: "Maize", cost: 32000, revenue: 55000, profit: 23000, roi: 72 },
  { crop: "Cotton", cost: 52000, revenue: 85000, profit: 33000, roi: 63 },
  { crop: "Soybean", cost: 28000, revenue: 48000, profit: 20000, roi: 71 },
  { crop: "Chickpea", cost: 25000, revenue: 52000, profit: 27000, roi: 108 },
];

const carbonData = [
  { practice: "100% Organic", carbon: 0.32, water: 1200 },
  { practice: "Mostly Organic", carbon: 0.52, water: 1500 },
  { practice: "Mixed", carbon: 0.80, water: 1800 },
  { practice: "Mostly Chemical", carbon: 1.12, water: 2100 },
  { practice: "100% Chemical", carbon: 1.44, water: 2500 },
];

const soilRadarData = [
  { nutrient: "Nitrogen", ideal: 90, organic: 85, mixed: 70, chemical: 60 },
  { nutrient: "Phosphorus", ideal: 90, organic: 75, mixed: 72, chemical: 68 },
  { nutrient: "Potassium", ideal: 90, organic: 80, mixed: 75, chemical: 65 },
  { nutrient: "Organic Carbon", ideal: 90, organic: 88, mixed: 60, chemical: 35 },
  { nutrient: "pH Balance", ideal: 90, organic: 82, mixed: 70, chemical: 55 },
  { nutrient: "Microbes", ideal: 90, organic: 90, mixed: 55, chemical: 25 },
];

const CHART_COLORS = ["hsl(142, 55%, 35%)", "hsl(200, 75%, 55%)", "hsl(38, 85%, 55%)", "hsl(0, 84%, 60%)", "hsl(280, 60%, 55%)"];

export default function ResearchPage() {
  const [sortKey, setSortKey] = useState<string>("accuracy");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedCell, setExpandedCell] = useState<number | null>(null);

  const sortedModels = [...models].sort((a, b) => {
    const key = sortKey as keyof typeof a;
    const av = typeof a[key] === "number" ? (a[key] as number) : 0;
    const bv = typeof b[key] === "number" ? (b[key] as number) : 0;
    return sortAsc ? av - bv : bv - av;
  });

  const barData = models.slice(0, 10).map(m => ({ name: m.name.length > 15 ? m.name.slice(0, 15) + "…" : m.name, Accuracy: +(m.accuracy * 100).toFixed(2) }));

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 krishi-badge bg-primary/10 text-primary mb-4">
              <FlaskConical className="h-4 w-4" /> SIH-25030 Research Project
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              🌾 AI-Based Crop Recommendation System
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Government of Jharkhand · Smart India Hackathon 2025 · ULTRA v13 — 22 ML Models, CNN Disease Detection, Price Forecasting & More
            </p>
            <div className="flex gap-3 justify-center mt-5">
              <a href="https://colab.research.google.com" target="_blank" rel="noopener noreferrer">
                <Button className="gradient-primary border-0 text-primary-foreground gap-2">
                  <ExternalLink className="h-4 w-4" /> Open in Google Colab
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Knowledge Base Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-10">
            {knowledgeBaseStats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.04 }} className="glass-card p-3 text-center">
                <span className="text-2xl">{s.icon}</span>
                <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto">
              <TabsTrigger value="overview" className="gap-1.5"><Workflow className="h-4 w-4" /> Overview</TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1.5"><Trophy className="h-4 w-4" /> Models</TabsTrigger>
              <TabsTrigger value="visualizations" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Charts</TabsTrigger>
              <TabsTrigger value="datasets" className="gap-1.5"><Database className="h-4 w-4" /> Datasets</TabsTrigger>
              <TabsTrigger value="architecture" className="gap-1.5"><Code2 className="h-4 w-4" /> Code</TabsTrigger>
              <TabsTrigger value="tech" className="gap-1.5"><Brain className="h-4 w-4" /> Stack</TabsTrigger>
              <TabsTrigger value="papers" className="gap-1.5"><BookOpen className="h-4 w-4" /> Papers</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-5">
              <div className="glass-card p-6">
                <h3 className="font-display font-bold text-xl text-foreground mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" /> Problem Statement
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Indian smallholder farmers face fragmented advice — generic crop suggestions, outdated mandi prices, no soil-specific guidance, and language barriers. KrishiMitra unifies AI crop recommendation, disease detection from leaf photos, hyperlocal weather, live market intelligence, and government scheme matching into one multilingual platform that works on any phone — even offline.
                </p>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-display font-bold text-xl text-foreground mb-4 flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-krishi-sky" /> System Architecture
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {[
                    { layer: "Client", items: ["React + Vite", "Framer Motion", "Tailwind", "PWA shell"], color: "bg-krishi-green-light text-krishi-green" },
                    { layer: "Edge / API", items: ["Lovable Cloud", "Edge Functions (Deno)", "AI Gateway", "Supabase Auth"], color: "bg-krishi-sky-light text-krishi-sky" },
                    { layer: "AI / Data", items: ["Gemini Vision", "XGBoost / LightGBM", "Prophet + LSTM", "PostgreSQL + RLS"], color: "bg-krishi-gold-light text-krishi-gold" },
                  ].map((c) => (
                    <div key={c.layer} className={`rounded-xl p-4 ${c.color}`}>
                      <p className="font-display font-bold mb-2">{c.layer}</p>
                      <ul className="space-y-1 text-xs">
                        {c.items.map((it) => <li key={it}>• {it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3">📊 Hyperparameter Tuning (Optuna)</h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>• <span className="font-medium text-foreground">Trials:</span> 100 per model</li>
                    <li>• <span className="font-medium text-foreground">Search space:</span> 8 hyperparameters</li>
                    <li>• <span className="font-medium text-foreground">Best XGBoost:</span> max_depth=8, lr=0.05, n_est=400</li>
                    <li>• <span className="font-medium text-foreground">Improvement:</span> +2.3% over default</li>
                  </ul>
                </div>
                <div className="glass-card p-5">
                  <h3 className="font-display font-semibold text-foreground mb-3">🎯 Confusion Matrix — XGBoost</h3>
                  <p className="text-xs text-muted-foreground mb-2">22-class crop classification</p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>• <span className="font-medium text-foreground">Diagonal accuracy:</span> 98.47%</li>
                    <li>• <span className="font-medium text-foreground">Top confusion:</span> Lentil ↔ Chickpea (1.2%)</li>
                    <li>• <span className="font-medium text-foreground">Macro F1:</span> 0.984</li>
                  </ul>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-3">🧪 Ablation Study</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Configuration</th>
                      <th className="text-right p-2">Accuracy</th>
                      <th className="text-right p-2">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { c: "Full pipeline (Optuna + SMOTE + ensemble)", a: 98.47, d: "—" },
                      { c: "− Optuna tuning", a: 96.12, d: "−2.35" },
                      { c: "− SMOTE oversampling", a: 95.34, d: "−3.13" },
                      { c: "− Feature engineering", a: 93.78, d: "−4.69" },
                      { c: "Baseline (vanilla RF)", a: 91.20, d: "−7.27" },
                    ].map((r) => (
                      <tr key={r.c} className="border-b border-border/50">
                        <td className="p-2 text-foreground">{r.c}</td>
                        <td className="p-2 text-right font-mono">{r.a}%</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">{r.d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ML Leaderboard */}
            <TabsContent value="leaderboard">
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-krishi-gold" /> ML Model Leaderboard — 22 Algorithms
                  </h3>
                  <p className="text-sm text-muted-foreground">Click column headers to sort. Best model highlighted in green.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-semibold">#</th>
                        <th className="text-left p-3 font-semibold">Model</th>
                        {[
                          { key: "accuracy", label: "Accuracy" },
                          { key: "f1", label: "F1" },
                          { key: "kappa", label: "Cohen κ" },
                          { key: "mcc", label: "MCC" },
                          { key: "cv", label: "CV Acc" },
                          { key: "time", label: "Time" },
                        ].map(col => (
                          <th key={col.key} className="text-left p-3 font-semibold cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort(col.key)}>
                            {col.label} {sortKey === col.key && (sortAsc ? "↑" : "↓")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedModels.map((m, i) => (
                        <tr key={m.name} className={`border-t border-border/50 transition-colors ${m.highlight ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                          <td className="p-3">{m.highlight ? "🥇" : i + 1}</td>
                          <td className="p-3 font-medium text-foreground">{m.name}</td>
                          <td className="p-3 font-mono">{(m.accuracy * 100).toFixed(2)}%</td>
                          <td className="p-3 font-mono">{(m.f1 * 100).toFixed(1)}%</td>
                          <td className="p-3 font-mono">{(m.kappa * 100).toFixed(1)}%</td>
                          <td className="p-3 font-mono">{(m.mcc * 100).toFixed(1)}%</td>
                          <td className="p-3 font-mono">{(m.cv * 100).toFixed(1)}%</td>
                          <td className="p-3 text-muted-foreground">{m.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Visualizations */}
            <TabsContent value="visualizations" className="space-y-6">
              {/* Accuracy Bar Chart */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Top 10 Model Accuracy Comparison
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[75, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="Accuracy" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Radar Chart */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-krishi-sky" /> Top 4 Models — Metric Radar
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[95, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar name="XGBoost" dataKey="XGBoost" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} />
                    <Radar name="LightGBM" dataKey="LightGBM" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.15} />
                    <Radar name="CatBoost" dataKey="CatBoost" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.1} />
                    <Radar name="Random Forest" dataKey="RandomForest" stroke={CHART_COLORS[3]} fill={CHART_COLORS[3]} fillOpacity={0.1} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Economics Dashboard */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-krishi-gold" /> Crop Economics — Cost vs Revenue vs Profit (₹/acre)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={economicsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="crop" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                    <Legend />
                    <Bar dataKey="cost" name="Cost" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="hsl(38, 85%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Carbon & Water Footprint */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" /> Carbon & Water Footprint by Farming Practice
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={carbonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="practice" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="carbon" name="CO₂ (ton/acre)" stroke={CHART_COLORS[3]} strokeWidth={2} dot />
                    <Line yAxisId="right" type="monotone" dataKey="water" name="Water (L/acre)" stroke={CHART_COLORS[1]} strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Soil Health Radar */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-krishi-sky" /> Soil Health Comparison by Practice
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={soilRadarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="nutrient" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar name="Ideal" dataKey="ideal" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                    <Radar name="Organic" dataKey="organic" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.1} />
                    <Radar name="Mixed" dataKey="mixed" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.1} />
                    <Radar name="Chemical" dataKey="chemical" stroke={CHART_COLORS[3]} fill={CHART_COLORS[3]} fillOpacity={0.1} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Datasets */}
            <TabsContent value="datasets" className="space-y-4">
              {datasets.map((d, i) => (
                <motion.div key={d.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card p-5">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{d.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-semibold text-foreground">{d.name}</h3>
                        <span className="krishi-badge bg-primary/10 text-primary">{d.source}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mt-2">
                        <div><span className="text-muted-foreground">Rows:</span> <span className="font-medium text-foreground">{d.rows}</span></div>
                        <div><span className="text-muted-foreground">Crops:</span> <span className="font-medium text-foreground">{d.crops}</span></div>
                        <div><span className="text-muted-foreground">Features:</span> <span className="font-medium text-foreground">{d.features}</span></div>
                      </div>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-sm mt-2 hover:underline">
                        <ExternalLink className="h-3 w-3" /> View Source
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            {/* Code Architecture */}
            <TabsContent value="architecture" className="space-y-2">
              <div className="glass-card p-4 mb-4">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" /> Notebook Architecture — 18 Cells
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Click each cell to expand its description.</p>
              </div>
              {cellBreakdown.map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="glass-card overflow-hidden">
                  <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors" onClick={() => setExpandedCell(expandedCell === i ? null : i)}>
                    <div className="flex items-center gap-3">
                      <span className="krishi-badge bg-primary/10 text-primary font-mono text-xs">{c.cell}</span>
                      <span className="font-display font-semibold text-foreground">{c.title}</span>
                    </div>
                    {expandedCell === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {expandedCell === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </TabsContent>

            {/* Tech Stack */}
            <TabsContent value="tech">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {techStack.map((t, i) => (
                  <motion.div key={t.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                        <Layers className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-foreground">{t.name}</h4>
                        <p className="text-xs text-muted-foreground">{t.purpose}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Research Papers */}
            <TabsContent value="papers">
              <ResearchPapersPanel />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
