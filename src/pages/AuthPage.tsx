import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sprout, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { errMsg } from "@/lib/errors";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => { if (session) navigate("/dashboard"); });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate("/dashboard"); });
  }, [navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back! 🙏");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created! Please check your email to verify your account.");
      }
    } catch (error: unknown) {
      toast.error(errMsg(error, "Authentication failed"));
    } finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) toast.error("Google sign-in failed. Please try again.");
      if (result.redirected) return;
    } catch (error: unknown) {
      toast.error(errMsg(error, "Google sign-in failed"));
    } finally { setLoading(false); }
  };

  const stats = [
    { value: "1,50,000+", label: "Farmers helped", emoji: "👨‍🌾" },
    { value: "85+ crops",  label: "AI-analyzed",   emoji: "🌾" },
    { value: "13+",        label: "Languages",     emoji: "🗣️" },
    { value: "200+",       label: "Districts",     emoji: "📍" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* LEFT decorative panel */}
      <div className="hidden lg:flex relative flex-1 overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-emerald-50 p-12 flex-col justify-between">
        {/* Mesh blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-emerald-500/30 blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-20 w-[28rem] h-[28rem] rounded-full bg-amber-400/20 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-teal-400/25 blur-3xl animate-pulse" style={{ animationDelay: "3s" }} />
        </div>
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />

        <div className="relative flex items-center gap-2.5 z-10">
          <img src={logo} alt="" className="h-10 w-10" />
          <span className="font-display text-2xl tracking-tight">KrishiMitra</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold border border-white/20 mb-5">
            ✦ SIH 2025 — Problem #25030
          </div>
          <h1 className="font-display text-5xl xl:text-6xl leading-[1.05] mb-5">
            AI-Powered Farming<br />
            <span className="bg-gradient-to-r from-amber-300 to-amber-100 bg-clip-text text-transparent">for Every Kisaan</span>
          </h1>
          <p className="text-emerald-100/85 text-lg leading-relaxed max-w-md mb-8">
            Science-guided crop advice in 13+ Indian languages. Analyze soil, predict yields, track markets — all from your phone.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {stats.map(({ value, label, emoji }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur border border-white/15"
              >
                <span className="text-2xl">{emoji}</span>
                <div>
                  <div className="font-display text-lg leading-none">{value}</div>
                  <div className="text-[11px] text-emerald-200/80 mt-1">{label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="relative z-10 max-w-md p-5 rounded-2xl bg-white/10 backdrop-blur border border-white/15"
        >
          <p className="text-sm leading-relaxed italic text-emerald-50/95">
            "KrishiMitra told me about stem borer before I even saw it. Saved my entire rice crop. This app is like having a scientist in my pocket."
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-lg">👨‍🌾</div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Ramesh Kumar</div>
              <div className="text-[11px] text-emerald-200/80">Rice farmer, Lucknow</div>
            </div>
            <div className="text-amber-300 text-sm">★★★★★</div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <img src={logo} alt="" className="h-9 w-9" />
          <span className="font-display text-2xl text-foreground">
            Krishi<span className="text-gradient-emerald">Mitra</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-border bg-card shadow-xl p-7">
            {/* Tabs */}
            <div className="flex p-1 rounded-xl bg-muted mb-6">
              {["Sign In", "Sign Up"].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setIsLogin(i === 0)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    (i === 0) === isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <h2 className="font-display text-3xl text-foreground mb-1">
              {isLogin ? "Welcome back 🙏" : "Join 1.5L+ farmers"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isLogin ? "Sign in to your KrishiMitra account" : "Start getting AI-powered crop advice for free"}
            </p>

            <Button
              variant="outline"
              type="button"
              className="w-full h-11 gap-2 rounded-xl mb-5 btn-shine"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or continue with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ramesh Kumar"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">Password</label>
                  {isLogin && <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? "Enter password" : "Create a password"}
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl gradient-primary border-0 text-primary-foreground font-semibold text-base btn-shine"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Please wait...</>
                ) : (
                  <><Sprout className="h-4 w-4 mr-2" /> {isLogin ? "Sign In" : "Create Account"}</>
                )}
              </Button>
            </form>

            {!isLogin && (
              <p className="text-[11px] text-muted-foreground text-center mt-4">
                By creating an account, you agree to our <span className="text-primary underline">Terms of Service</span>.
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {["🔒 Secure", "🆓 Always Free", "🇮🇳 Made for India"].map((b) => (
              <span key={b} className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">{b}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
