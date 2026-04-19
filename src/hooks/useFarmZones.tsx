import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveProfile } from "./useActiveProfile";
import type { Zone } from "@/components/tools/FieldMap";
import { toast } from "sonner";

type SyncStatus = "idle" | "syncing" | "synced" | "local" | "error";

/**
 * useFarmZones — single source of truth for Field Mapper polygons.
 * - Reads/writes Supabase `farm_zones` for the currently active profile.
 * - Falls back to localStorage when offline or unauthenticated.
 * - Optimistic UI: updates local state immediately, syncs in background.
 */
export function useFarmZones() {
  const { active } = useActiveProfile();
  const profileId = active?.id || "guest";
  const cacheKey = `fieldmapper.zones.${profileId}`;

  const [zones, setZones] = useState<Zone[]>([]);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  // Hydrate from cache instantly
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      setZones(raw ? JSON.parse(raw) : []);
    } catch { setZones([]); }
  }, [cacheKey]);

  // Cache locally on every change
  useEffect(() => {
    localStorage.setItem(cacheKey, JSON.stringify(zones));
  }, [zones, cacheKey]);

  // Fetch from cloud when profile changes
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef.current = user?.id || null;

      if (!user || !active?.id) {
        setStatus("local");
        setLoading(false);
        return;
      }

      setStatus("syncing");
      const { data, error } = await supabase
        .from("farm_zones")
        .select("*")
        .eq("profile_id", active.id)
        .order("created_at", { ascending: true });

      if (cancel) return;
      if (error) {
        console.error("[farm_zones] fetch error", error);
        setStatus("error");
      } else if (data) {
        const mapped: Zone[] = data.map((r: any) => ({
          id: r.id,
          crop: r.crop,
          color: r.color,
          hectares: Number(r.hectares),
          acres: Number(r.acres),
          latlngs: r.latlngs as { lat: number; lng: number }[],
        }));
        setZones(mapped);
        setStatus("synced");
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [active?.id]);

  const addZone = useCallback(async (zone: Omit<Zone, "id">) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Zone = { ...zone, id: tempId };
    setZones((prev) => [...prev, optimistic]);

    if (!userIdRef.current || !active?.id) {
      setStatus("local");
      return optimistic;
    }

    setStatus("syncing");
    const { data, error } = await supabase
      .from("farm_zones")
      .insert({
        user_id: userIdRef.current,
        profile_id: active.id,
        crop: zone.crop,
        color: zone.color,
        hectares: zone.hectares,
        acres: zone.acres,
        latlngs: zone.latlngs as any,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("[farm_zones] insert error", error);
      setStatus("error");
      toast.error("Saved locally — cloud sync failed");
      return optimistic;
    }

    setZones((prev) => prev.map((z) => z.id === tempId ? { ...z, id: data.id } : z));
    setStatus("synced");
    return { ...zone, id: data.id };
  }, [active?.id]);

  const removeZones = useCallback(async (ids: string[]) => {
    setZones((prev) => prev.filter((z) => !ids.includes(z.id)));
    const cloudIds = ids.filter((i) => !i.startsWith("tmp-"));
    if (!userIdRef.current || !cloudIds.length) return;
    const { error } = await supabase.from("farm_zones").delete().in("id", cloudIds);
    if (error) {
      console.error("[farm_zones] delete error", error);
      setStatus("error");
    } else {
      setStatus("synced");
    }
  }, []);

  const clearAll = useCallback(async () => {
    const ids = zones.map((z) => z.id);
    if (!ids.length) return;
    await removeZones(ids);
  }, [zones, removeZones]);

  return { zones, addZone, removeZones, clearAll, status, loading };
}
