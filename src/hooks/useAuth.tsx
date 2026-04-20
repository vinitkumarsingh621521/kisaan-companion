import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

/**
 * Single auth subscriber for the entire app.
 * Avoids the "every component subscribes to onAuthStateChange" thrash that
 * caused tab-switch re-fetches and protected-route remount spinners.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Synchronous listener — fires INITIAL_SESSION immediately on subscribe
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      // Only meaningful events flip loading off; ignore TOKEN_REFRESHED noise
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setLoading(false);
      }
    });

    // Belt-and-suspenders: if INITIAL_SESSION never fires (rare), resolve manually
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession((cur) => cur ?? s);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
