import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TeamSection from "@/components/TeamSection";
import { motion } from "framer-motion";
import { Heart, Lightbulb, Rocket, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const journey = [
  { icon: Lightbulb, title: "The Idea", desc: "Tackle SIH-25030 with real impact for Indian farmers", color: "text-krishi-gold" },
  { icon: Rocket, title: "The Build", desc: "22 ML models, 110+ crops, 13 languages, 8000+ lines of code", color: "text-primary" },
  { icon: Heart, title: "The Mission", desc: "Make agriculture profitable, sustainable, and AI-powered", color: "text-destructive" },
  { icon: Trophy, title: "The Goal", desc: "Win SIH-25030 and ship to 1.5L+ farmers across 200 districts", color: "text-krishi-sky" },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground">The Team Behind KrishiMitra 🌾</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Four students. One mentor. Building India's most personalized AI farming assistant for SIH 2025 — Problem Statement #25030.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {journey.map((j, i) => (
              <motion.div
                key={j.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5 text-center"
              >
                <j.icon className={`h-8 w-8 mx-auto mb-2 ${j.color}`} />
                <h3 className="font-display font-semibold text-foreground text-sm">{j.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{j.desc}</p>
              </motion.div>
            ))}
          </div>

          <TeamSection compact />

          <div className="text-center mt-10">
            <Link to="/admin/team"><Button variant="outline">Manage My Team</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
