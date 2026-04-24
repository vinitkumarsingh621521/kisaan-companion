import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface XPRow {
  xp: number;
  level: number;
  streak_days: number;
  last_active_date: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

export function useXP() {
  const { user } = useAuth();
  const [data, setData] = useState<XPRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setData(null); setLoading(false); return; }
    const { data: row } = await supabase
      .from("user_xp")
      .select("xp, level, streak_days, last_active_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row) {
      const seed = { user_id: user.id, xp: 0, level: 1, streak_days: 1, last_active_date: today() };
      await supabase.from("user_xp").insert(seed);
      setData({ xp: 0, level: 1, streak_days: 1, last_active_date: today() });
    } else {
      // streak update on first load each day
      let { xp, level, streak_days, last_active_date } = row;
      if (last_active_date !== today()) {
        if (last_active_date === yesterday()) streak_days += 1;
        else streak_days = 1;
        last_active_date = today();
        await supabase.from("user_xp").update({ streak_days, last_active_date }).eq("user_id", user.id);
      }
      setData({ xp, level, streak_days, last_active_date });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addXP = useCallback(async (amount: number) => {
    if (!user || !data) return;
    const newXp = data.xp + amount;
    const newLevel = Math.floor(newXp / 100) + 1;
    await supabase.from("user_xp").update({ xp: newXp, level: newLevel }).eq("user_id", user.id);
    setData({ ...data, xp: newXp, level: newLevel });
    return { leveledUp: newLevel > data.level, newLevel };
  }, [user, data]);

  return { data, loading, addXP, reload: load };
}
