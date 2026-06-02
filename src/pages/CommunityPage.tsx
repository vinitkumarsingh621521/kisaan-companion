import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Award, Users, MessageSquare, Heart, Image as ImageIcon, Send, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

interface Post {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
  district: string | null;
  content: string;
  photo_url: string | null;
  badge: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

const seedBadges = ["Organic Pioneer 🌿", "Early Adopter 🚀", "Water Saver 💧", "Tech Ninja 📡", "Soil Master 🌱"];
const leaderboard = [
  { name: "Ramesh Oraon", score: 2850, rank: 1 },
  { name: "Priya Singh", score: 2720, rank: 2 },
  { name: "Vikash Mahto", score: 2580, rank: 3 },
  { name: "Anjali Kumari", score: 2450, rank: 4 },
  { name: "Suresh Munda", score: 2380, rank: 5 },
];

export default function CommunityPage() {
  const { user } = useAuth();
  const { active } = useActiveProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [countdown, setCountdown] = useState({ d: 12, h: 0, m: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Monthly challenge countdown
  useEffect(() => {
    const target = new Date();
    target.setDate(target.getDate() + 12);
    target.setHours(23, 59, 59, 0);
    const tick = () => {
      const ms = target.getTime() - Date.now();
      if (ms <= 0) return;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setCountdown({ d, h, m });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Failed to load posts");
    } else {
      setPosts(data || []);
      // load my likes
      if (user) {
        const ids = (data || []).map((p) => p.id);
        if (ids.length) {
          const { data: likes } = await supabase
            .from("community_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", ids);
          setLikedIds(new Set((likes || []).map((l: any) => l.post_id)));
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadPosts(); /* eslint-disable-next-line */ }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("community-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
        setPosts((prev) => [payload.new as Post, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_posts" }, (payload) => {
        setPosts((prev) => prev.map((p) => (p.id === (payload.new as Post).id ? (payload.new as Post) : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_posts" }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user) { toast.error("Sign in to post"); return; }
    if (!text.trim() && !photoFile) { toast.error("Write something or add a photo"); return; }
    setPosting(true);
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community-photos").upload(path, photoFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("community-photos").getPublicUrl(path);
        photo_url = publicUrl;
      }
      const district = active?.farmer_details?.district || active?.farm_location?.split(",")[0] || "India";
      const author_name = active?.full_name || user.email?.split("@")[0] || "Farmer";
      const badge = seedBadges[Math.floor(Math.random() * seedBadges.length)];
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        author_name,
        author_avatar: active?.avatar_url || null,
        district,
        content: text.trim(),
        photo_url,
        badge,
      });
      if (error) throw error;
      setText(""); setPhotoFile(null); setPhotoPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Posted to the community 🌾");
    } catch (e: any) {
      toast.error("Post failed: " + e.message);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) { toast.error("Sign in to like"); return; }
    const liked = likedIds.has(post.id);
    // optimistic
    setLikedIds((prev) => {
      const next = new Set(prev);
      liked ? next.delete(post.id) : next.add(post.id);
      return next;
    });
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likes_count: p.likes_count + (liked ? -1 : 1) } : p));

    if (liked) {
      await supabase.from("community_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("community_likes").insert({ post_id: post.id, user_id: user.id });
      if (error && !error.message.includes("duplicate")) toast.error("Like failed");
    }
  };

  const deletePost = async (post: Post) => {
    if (!user || post.user_id !== user.id) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) toast.error("Delete failed"); else toast.success("Post removed");
  };

  return (
    <AgriPageBackground variant="community">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">👨‍🌾 Farmer Community</h1>
            <p className="text-muted-foreground mt-1">Real posts from real farmers · likes update live</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Composer + feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Composer */}
              <div className="glass-card p-5">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={user ? "Share an update, question, or success from your farm…" : "Sign in to post"}
                  disabled={!user || posting}
                  rows={3}
                  className="resize-none border-0 focus-visible:ring-0 bg-transparent p-0 text-foreground"
                />
                {photoPreview && (
                  <div className="relative mt-2 inline-block">
                    <img src={photoPreview} alt="preview" className="rounded-lg max-h-40 object-cover" />
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 text-xs"
                    >×</button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
                  <Button variant="ghost" size="sm" disabled={!user || posting} onClick={() => fileRef.current?.click()} className="gap-2">
                    <ImageIcon className="h-4 w-4" /> Add photo
                  </Button>
                  <Button onClick={submit} disabled={!user || posting} className="gap-2 gradient-primary border-0 text-primary-foreground">
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Post
                  </Button>
                </div>
              </div>

              {/* Feed */}
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))
              ) : posts.length === 0 ? (
                <div className="glass-card p-10 text-center text-muted-foreground">
                  No posts yet. Be the first to share something! 🌱
                </div>
              ) : (
                <AnimatePresence>
                  {posts.map((p, i) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      className="glass-card p-5"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg overflow-hidden">
                          {p.author_avatar ? (
                            <img src={p.author_avatar} alt={p.author_name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{p.author_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{p.author_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.district || "India"} • {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        {p.badge && (
                          <span className="ml-auto krishi-badge bg-krishi-gold-light text-krishi-earth text-xs whitespace-nowrap">{p.badge}</span>
                        )}
                      </div>
                      {p.content && <p className="text-foreground leading-relaxed mb-3 whitespace-pre-wrap">{p.content}</p>}
                      {p.photo_url && (
                        <img src={p.photo_url} alt="post" className="rounded-lg w-full max-h-96 object-cover mb-3" loading="lazy" />
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <button
                          className={`flex items-center gap-1 transition-colors ${likedIds.has(p.id) ? "text-destructive" : "hover:text-primary"}`}
                          onClick={() => toggleLike(p)}
                        >
                          <Heart className={`h-4 w-4 ${likedIds.has(p.id) ? "fill-current" : ""}`} /> {p.likes_count}
                        </button>
                        <button className="flex items-center gap-1 hover:text-primary transition-colors" onClick={() => toast.info("Comments coming soon")}>
                          <MessageSquare className="h-4 w-4" /> {p.comments_count}
                        </button>
                        {user?.id === p.user_id && (
                          <button className="ml-auto hover:text-destructive" onClick={() => deletePost(p)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-krishi-gold" /> Leaderboard — Jharkhand
                </h3>
                <div className="space-y-2">
                  {leaderboard.map((l, idx) => (
                    <motion.div
                      key={l.rank}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${l.rank <= 3 ? "bg-krishi-gold-light" : "bg-muted/30"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          l.rank === 1 ? "bg-krishi-gold text-primary-foreground" :
                          l.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                          l.rank === 3 ? "bg-krishi-earth/30 text-krishi-earth" : "bg-muted text-muted-foreground"
                        }`}>{l.rank}</span>
                        <span className="text-sm font-medium text-foreground">{l.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{l.score} pts</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Monthly Challenge
                </h3>
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🌿</div>
                  <div className="font-display font-semibold text-foreground">Zero Pesticide Month</div>
                  <div className="text-xs text-muted-foreground mt-1">423 farmers participating</div>
                  <div className="text-xs text-primary mt-2 font-medium">
                    {countdown.d}d {countdown.h}h {countdown.m}m remaining
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </AgriPageBackground>
  );
}
