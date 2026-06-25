import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface XPRow {
  xp: number;
  level: number;
  streak_days: number;
  last_active_date: string | null;
}

export function useXP() {
  const { user } = useAuth();
  const [data, setData] = useState<XPRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setData(null); setLoading(false); return; }
    // Server-side seed + daily streak bump (no direct table writes allowed)
    const { data: bumped } = await supabase.rpc("bump_streak");
    if (bumped && typeof bumped === "object") {
      const r = bumped as Partial<XPRow>;
      setData({
        xp: r.xp ?? 0,
        level: r.level ?? 1,
        streak_days: r.streak_days ?? 1,
        last_active_date: r.last_active_date ?? null,
      });
    } else {
      const { data: row } = await supabase
        .from("user_xp")
        .select("xp, level, streak_days, last_active_date")
        .eq("user_id", user.id)
        .maybeSingle();
      if (row) setData(row as XPRow);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // XP can only be granted via award_badge RPC. This helper reloads after awards.
  const addXP = useCallback(async (_amount: number) => {
    await load();
    return { leveledUp: false, newLevel: data?.level ?? 1 };
  }, [load, data?.level]);

  return { data, loading, addXP, reload: load };
}
