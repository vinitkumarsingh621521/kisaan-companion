import { edgeToken } from "@/lib/edgeAuth";
import PageGuide from "@/components/PageGuide";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgriPageBackground from "@/components/backgrounds/AgriPageBackground";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Award, Users, MessageSquare, Heart, Image as ImageIcon, Send, Loader2, Trash2, ChevronDown, ChevronUp, Sparkles, Tag, Trophy, Flame, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { errMsg } from "@/lib/errors";

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

const POST_TAGS = [
  { id: "disease",  label: "Disease Alert", emoji: "🦠", color: "bg-red-500/10 text-red-600" },
  { id: "market",   label: "Market Query",  emoji: "💰", color: "bg-amber-500/10 text-amber-600" },
  { id: "weather",  label: "Weather",       emoji: "🌧️", color: "bg-blue-500/10 text-blue-600" },
  { id: "tip",      label: "Farming Tip",   emoji: "💡", color: "bg-green-500/10 text-green-600" },
  { id: "question", label: "Question",      emoji: "❓", color: "bg-purple-500/10 text-purple-600" },
  { id: "success",  label: "Success Story", emoji: "🎉", color: "bg-primary/10 text-primary" },
];

function getTagForPost(tagId: string | null) {
  return POST_TAGS.find(t => t.id === tagId) || null;
}

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
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [countdown, setCountdown] = useState({ d: 12, h: 0, m: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Comments
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [commentPosting, setCommentPosting] = useState<Record<string, boolean>>({});

  // AI reply suggestions
  const [aiReplies, setAiReplies] = useState<Record<string, string[]>>({});
  const [aiRepliesLoading, setAiRepliesLoading] = useState<Record<string, boolean>>({});

  // Post tags (ai-generated)
  const [postTags, setPostTags] = useState<Record<string, string>>({});

  // Challenge participation
  const [joined, setJoined] = useState(() => {
    try { return localStorage.getItem("km.challenge.joined") === "true"; } catch { return false; }
  });
  const [participants, setParticipants] = useState(423);

  // Live leaderboard
  const [liveLeaders, setLiveLeaders] = useState<{name:string;score:number;rank:number}[]>([]);
  const [leadersLoading, setLeadersLoading] = useState(true);

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

  // Load comments for a post
  const loadComments = async (postId: string) => {
    setCommentLoading(prev => ({ ...prev, [postId]: true }));
    try {
      const { data } = await supabase
        .from("community_comments" as any)
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      setComments(prev => ({ ...prev, [postId]: (data as any) || [] }));
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const postComment = async (postId: string) => {
    if (!user) { toast.error("Sign in to comment"); return; }
    const content = (commentText[postId] || "").trim();
    if (!content) return;
    setCommentPosting(prev => ({ ...prev, [postId]: true }));
    try {
      const author_name = active?.full_name || user.email?.split("@")[0] || "Farmer";
      const { error } = await supabase
        .from("community_comments" as any)
        .insert({
          post_id: postId,
          user_id: user.id,
          author_name,
          author_avatar: active?.avatar_url || null,
          content,
        } as any);
      if (error) throw error;
      setCommentText(prev => ({ ...prev, [postId]: "" }));
      await loadComments(postId);
      toast.success("Comment posted 💬");
    } catch (e: unknown) {
      toast.error("Failed: " + errMsg(e));
    } finally {
      setCommentPosting(prev => ({ ...prev, [postId]: false }));
    }
  };

  const fetchAiReplies = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post?.content) return;
    setAiRepliesLoading(prev => ({ ...prev, [postId]: true }));
    try {
      const prompt = `A farmer posted this message in a community forum:
"${post.content}"

Generate exactly 3 short, helpful reply suggestions that another farmer could send. Each reply should be practical and specific.
Return ONLY a JSON array of 3 strings. No markdown. No explanation.
Example format: ["Reply 1 text", "Reply 2 text", "Reply 3 text"]
Each reply must be under 120 characters. Write in simple English that a farmer would use. If the post mentions a disease or pest, suggest a treatment. If it mentions price, suggest market action.`;

      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await edgeToken()}`,
        },
        body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const raw: string = data.result || data.response ||
        data.choices?.[0]?.message?.content ||
        (Array.isArray(data.content) ? data.content.find((c: { type?: string; text?: string }) => c.type === "text")?.text : "") || "";
      const cleaned = raw.replace(/```json|```/gi,"").trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        const replies: string[] = JSON.parse(match[0]);
        setAiReplies(prev => ({ ...prev, [postId]: replies.slice(0,3) }));
      }
    } catch {
      // silent
    } finally {
      setAiRepliesLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    if (!comments[postId]) {
      await loadComments(postId);
      fetchAiReplies(postId);
    }
  };

  const tagPost = async (postId: string, content: string) => {
    if (!content.trim()) return;
    try {
      const prompt = `Classify this farmer community post into exactly one category. Post: "${content.slice(0, 200)}"
Categories: disease, market, weather, tip, question, success
Return ONLY one word — the category id. Nothing else.`;
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await edgeToken()}`,
        },
        body: JSON.stringify({ action: "chat", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await resp.json();
      const raw: string = data.result || data.response || data.choices?.[0]?.message?.content || "";
      const tagId = raw.trim().toLowerCase().replace(/[^a-z]/g,"");
      const valid = POST_TAGS.map(t => t.id);
      if (valid.includes(tagId)) {
        setPostTags(prev => ({ ...prev, [postId]: tagId }));
      }
    } catch { /* silent */ }
  };

  const loadLeaderboard = async () => {
    setLeadersLoading(true);
    try {
      const { data } = await supabase
        .from("community_posts")
        .select("user_id, author_name, likes_count, comments_count")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!data || data.length === 0) {
        setLiveLeaders(leaderboard);
        return;
      }
      const scores: Record<string, { name: string; pts: number }> = {};
      for (const p of data as any[]) {
        if (!p.user_id) continue;
        if (!scores[p.user_id]) scores[p.user_id] = { name: p.author_name, pts: 0 };
        scores[p.user_id].pts += 10 + (p.likes_count || 0) * 5 + (p.comments_count || 0) * 3;
      }
      const ranked = Object.values(scores)
        .sort((a,b) => b.pts - a.pts)
        .slice(0, 5)
        .map((v, i) => ({ name: v.name, score: v.pts, rank: i+1 }));
      setLiveLeaders(ranked.length ? ranked : leaderboard);
    } catch {
      setLiveLeaders(leaderboard);
    } finally {
      setLeadersLoading(false);
    }
  };

  useEffect(() => { loadLeaderboard(); /* eslint-disable-next-line */ }, [posts.length]);

  // Tag first few posts on load
  useEffect(() => {
    posts.slice(0, 5).forEach(p => {
      if (p.content && !postTags[p.id]) tagPost(p.id, p.content);
    });
    // eslint-disable-next-line
  }, [posts.length]);

  const joinChallenge = () => {
    if (joined) return;
    setJoined(true);
    setParticipants(n => n + 1);
    try { localStorage.setItem("km.challenge.joined","true"); } catch {}
    toast.success("You joined the Zero Pesticide Month challenge! 🌿");
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
      const submittedText = text.trim();
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        author_name,
        author_avatar: active?.avatar_url || null,
        district,
        content: submittedText,
        photo_url,
        badge,
      });
      if (error) throw error;
      setText(""); setPhotoFile(null); setPhotoPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Posted to the community 🌾");

      // AI tag the new post after a short delay
      const newPosts2 = await supabase
        .from("community_posts")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const newId = newPosts2.data?.[0]?.id;
      if (newId && submittedText) {
        setTimeout(() => tagPost(newId, submittedText), 1500);
      }
    } catch (e: unknown) {
      toast.error("Post failed: " + errMsg(e));
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!user) { toast.error("Sign in to like"); return; }
    const liked = likedIds.has(post.id);
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
          <PageGuide
            pageId="community"
            title="Kisaan Community"
            subtitle="Connect and share knowledge with farmers across India"
            description="Post farming questions, share your successes, and learn from farmers across India. AI suggests helpful replies to others' questions. Tag your posts by topic. The leaderboard shows the most active and helpful community members."
            gradient="from-blue-900 to-indigo-700"
            aiContext="Community page: farmers post questions and updates, AI suggests reply drafts, posts tagged by category, real-time updates, leaderboard."
            features={[
              { icon: "📝", title: "Post Questions", desc: "Ask anything about farming — community and AI will help" },
              { icon: "🤖", title: "AI Reply Suggestions", desc: "AI drafts helpful replies to community questions for you" },
              { icon: "🏷️", title: "Topic Tags", desc: "Browse posts by disease, market, weather, or technique" },
              { icon: "🏆", title: "Leaderboard", desc: "See the most helpful farmers in the community" },
              { icon: "💬", title: "Comments", desc: "Reply to posts and start discussions" },
              { icon: "🔴", title: "Live Updates", desc: "New posts appear instantly without refreshing" },
            ]}
          />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">👨‍🌾 {t("community.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("community.subtitle")}</p>
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
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
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
                        {postTags[p.id] && (() => {
                          const tag = getTagForPost(postTags[p.id]);
                          return tag ? (
                            <span className={`krishi-badge text-[10px] whitespace-nowrap inline-flex items-center gap-1 ${tag.color}`}>
                              <Tag className="h-2.5 w-2.5" /> {tag.emoji} {tag.label}
                            </span>
                          ) : null;
                        })()}
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
                        <button
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                          onClick={() => toggleComments(p.id)}
                        >
                          <MessageSquare className="h-4 w-4" /> {p.comments_count}
                          {expandedPost === p.id
                            ? <ChevronUp className="h-3.5 w-3.5" />
                            : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        {user?.id === p.user_id && (
                          <button className="ml-auto hover:text-destructive" onClick={() => deletePost(p)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <AnimatePresence>
                        {expandedPost === p.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-border space-y-3">
                              {/* AI Reply Suggestions */}
                              {(aiRepliesLoading[p.id] || (aiReplies[p.id]?.length || 0) > 0) && (
                                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    <span className="text-[11px] font-semibold text-primary">AI Reply Suggestions</span>
                                    {aiRepliesLoading[p.id] && <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />}
                                  </div>
                                  {aiRepliesLoading[p.id] ? (
                                    <div className="space-y-1.5">
                                      {[1,2,3].map(i => <Skeleton key={i} className="h-6 w-3/4 rounded-full" />)}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {(aiReplies[p.id] || []).map((r, ri) => (
                                        <button
                                          key={ri}
                                          onClick={() => setCommentText(prev => ({ ...prev, [p.id]: r }))}
                                          className="text-[11px] px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors text-left max-w-[200px] truncate"
                                          title={r}
                                        >
                                          {r}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Existing comments */}
                              {commentLoading[p.id] ? (
                                <div className="space-y-2">
                                  {[1,2].map(i => (
                                    <div key={i} className="flex gap-2">
                                      <Skeleton className="w-7 h-7 rounded-full" />
                                      <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3 w-24" />
                                        <Skeleton className="h-3 w-full" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (comments[p.id] || []).length > 0 ? (
                                <div className="space-y-2.5">
                                  {(comments[p.id] || []).map((c: any) => (
                                    <div key={c.id} className="flex gap-2">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
                                        {c.author_avatar
                                          ? <img src={c.author_avatar} alt={c.author_name} className="w-full h-full object-cover" />
                                          : c.author_name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0 bg-muted/40 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                                          </span>
                                        </div>
                                        <p className="text-xs text-foreground whitespace-pre-wrap">{c.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground text-center py-3">
                                  No comments yet. Be first to reply 👆
                                </div>
                              )}

                              {/* Comment input */}
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <textarea
                                    value={commentText[p.id] || ""}
                                    onChange={e => setCommentText(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    onKeyDown={e => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        postComment(p.id);
                                      }
                                    }}
                                    placeholder={user ? "Write a reply… (Enter to send)" : "Sign in to reply"}
                                    disabled={!user || commentPosting[p.id]}
                                    rows={2}
                                    className="w-full text-xs rounded-xl border border-border bg-background/70 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  disabled={!user || commentPosting[p.id] || !(commentText[p.id]?.trim())}
                                  onClick={() => postComment(p.id)}
                                  className="h-9 px-3 gap-1 gradient-primary border-0 text-primary-foreground flex-shrink-0"
                                >
                                  {commentPosting[p.id]
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Send className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Leaderboard */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-krishi-gold" /> Top Farmers
                </h3>
                <p className="text-[11px] text-muted-foreground mb-4">Ranked by posts + likes received</p>
                <div className="space-y-2">
                  {leadersLoading ? (
                    [1,2,3,4,5].map(i => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                        <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 h-3 bg-muted animate-pulse rounded" />
                        <div className="w-12 h-3 bg-muted animate-pulse rounded" />
                      </div>
                    ))
                  ) : (liveLeaders.length ? liveLeaders : leaderboard).map((l, idx) => (
                    <motion.div
                      key={l.rank}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${l.rank <= 3 ? "bg-krishi-gold-light" : "bg-muted/30"}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          l.rank === 1 ? "bg-krishi-gold text-primary-foreground" :
                          l.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                          l.rank === 3 ? "bg-krishi-earth/30 text-krishi-earth" : "bg-muted text-muted-foreground"
                        }`}>
                          {l.rank === 1 ? "🥇" : l.rank === 2 ? "🥈" : l.rank === 3 ? "🥉" : l.rank}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">{l.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Flame className="h-3 w-3 text-amber-500" />
                        <span className="text-sm font-semibold text-foreground">{l.score.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Monthly Challenge */}
              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-primary" /> Monthly Challenge
                </h3>
                <div className={`border rounded-xl p-4 transition-all ${joined ? "bg-green-500/5 border-green-500/20" : "bg-primary/5 border-primary/10"}`}>
                  <div className="text-2xl mb-2 text-center">🌿</div>
                  <div className="font-display font-semibold text-foreground text-center">Zero Pesticide Month</div>
                  <p className="text-xs text-muted-foreground mt-1 text-center leading-relaxed">
                    Go chemical-free for one month and share your experience
                  </p>

                  <div className="mt-3 mb-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{participants} farmers joined</span>
                      <span>Goal: 500</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((participants / 500) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full rounded-full bg-green-500"
                      />
                    </div>
                  </div>

                  {joined ? (
                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4" /> You're participating!
                    </div>
                  ) : (
                    <Button onClick={joinChallenge} className="w-full gap-2 mt-1" size="sm" variant="outline">
                      <Flame className="h-3.5 w-3.5" /> Join Challenge
                    </Button>
                  )}

                  <div className="text-xs text-primary text-center mt-2 font-medium">
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
