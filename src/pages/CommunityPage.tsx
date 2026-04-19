import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { useState } from "react";
import { Award, Users, MessageSquare, Heart } from "lucide-react";
import { toast } from "sonner";

const initialPosts = [
  { id: 1, author: "Sunita Devi", location: "Bokaro", avatar: "🧑‍🌾", text: "धान की नई किस्म से 20% ज्यादा उपज मिली! KrishiMitra की सलाह बहुत काम आई।", likes: 48, comments: 12, badge: "Organic Pioneer 🌿", liked: false },
  { id: 2, author: "Mohan Paswan", location: "Jamshedpur", avatar: "👨‍🌾", text: "AI ने मक्के की बीमारी पकड़ ली समय रहते। बहुत धन्यवाद!", likes: 35, comments: 8, badge: "Early Adopter 🚀", liked: false },
  { id: 3, author: "Meera Kumari", location: "Hazaribagh", avatar: "👩‍🌾", text: "PM-KISAN के लिए documents बनाने में मदद मिली। बहुत आसान है ये app!", likes: 62, comments: 15, badge: "Water Saver 💧", liked: false },
];

const leaderboard = [
  { name: "Ramesh Oraon", score: 2850, rank: 1 },
  { name: "Priya Singh", score: 2720, rank: 2 },
  { name: "Vikash Mahto", score: 2580, rank: 3 },
  { name: "Anjali Kumari", score: 2450, rank: 4 },
  { name: "Suresh Munda", score: 2380, rank: 5 },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState(initialPosts);

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">👨‍🌾 Farmer Community</h1>
            <p className="text-muted-foreground mt-1">Share experiences, earn badges, and connect with fellow farmers</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Feed */}
            <div className="lg:col-span-2 space-y-4">
              {posts.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                      {p.avatar}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{p.author}</div>
                      <div className="text-xs text-muted-foreground">{p.location} • 2h ago</div>
                    </div>
                    <span className="ml-auto krishi-badge bg-krishi-gold-light text-krishi-earth text-xs">{p.badge}</span>
                  </div>
                  <p className="text-foreground leading-relaxed mb-3">{p.text}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button
                      className={`flex items-center gap-1 transition-colors ${p.liked ? "text-destructive" : "hover:text-primary"}`}
                      onClick={() => toggleLike(p.id)}
                    >
                      <Heart className={`h-4 w-4 ${p.liked ? "fill-current" : ""}`} /> {p.likes}
                    </button>
                    <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => toast.info("Comments feature coming soon!")}>
                      <MessageSquare className="h-4 w-4" /> {p.comments}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Leaderboard */}
            <div className="space-y-5">
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-krishi-gold" />
                  Leaderboard — Jharkhand
                </h3>
                <div className="space-y-2">
                  {leaderboard.map((l) => (
                    <div key={l.rank} className={`flex items-center justify-between p-2.5 rounded-lg ${l.rank <= 3 ? "bg-krishi-gold-light" : "bg-muted/30"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          l.rank === 1 ? "bg-krishi-gold text-primary-foreground" :
                          l.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                          l.rank === 3 ? "bg-krishi-earth/30 text-krishi-earth" : "bg-muted text-muted-foreground"
                        }`}>
                          {l.rank}
                        </span>
                        <span className="text-sm font-medium text-foreground">{l.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{l.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Monthly Challenge
                </h3>
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🌿</div>
                  <div className="font-display font-semibold text-foreground">Zero Pesticide Month</div>
                  <div className="text-xs text-muted-foreground mt-1">423 farmers participating</div>
                  <div className="text-xs text-primary mt-2 font-medium">12 days remaining</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
