import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FarmerProfile {
  id: string;
  user_id: string;
  full_name: string;
  farm_location: string | null;
  farm_size: string | null;
  soil_type: string | null;
  preferred_language: string | null;
  avatar_url: string | null;
  farmer_details: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Ctx {
  profiles: FarmerProfile[];
  active: FarmerProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  createProfile: (full_name: string) => Promise<FarmerProfile | null>;
  updateProfile: (id: string, patch: Partial<FarmerProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  completionPct: number;
}

const ActiveProfileContext = createContext<Ctx | null>(null);

const TRACKED_FIELDS = [
  "age", "gender", "education", "family_size", "farming_experience",
  "state", "district", "village", "total_land", "cultivable_land", "irrigated_land", "ownership_type",
  "soil_ph", "nitrogen", "phosphorus", "potassium", "organic_carbon", "water_source", "irrigation_type", "annual_rainfall",
  "current_crops", "previous_crops", "preferred_season", "farming_type", "livestock", "crop_area_distribution",
  "annual_income", "monthly_investment", "existing_loans", "bank_account", "insurance_status", "budget_per_acre",
  "equipment_owned", "storage_facility", "nearest_mandi_km", "internet_access", "smartphone", "transport",
  "risk_tolerance", "crop_priority", "notification_pref", "market_preference", "tech_comfort",
  "main_goal", "biggest_challenge", "climate_concern", "training_received",
];

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<FarmerProfile[]>([]);
  const [active, setActive] = useState<FarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfiles([]); setActive(null); setLoading(false); return; }

    const { data: profs } = await supabase
      .from("farmer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const list = (profs || []) as FarmerProfile[];

    // Auto-create one if none
    if (list.length === 0) {
      const { data: created } = await supabase
        .from("farmer_profiles")
        .insert({ user_id: user.id, full_name: user.email?.split("@")[0] || "My Farm", is_active: true })
        .select()
        .single();
      if (created) list.push(created as FarmerProfile);
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("active_profile_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const activeId = settings?.active_profile_id;
    const activeP = list.find(p => p.id === activeId) || list.find(p => p.is_active) || list[0] || null;

    setProfiles(list);
    setActive(activeP);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refresh());
    return () => subscription.unsubscribe();
  }, [refresh]);

  const switchProfile = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_settings").upsert({ user_id: user.id, active_profile_id: id }, { onConflict: "user_id" });
    const p = profiles.find(x => x.id === id) || null;
    setActive(p);
  };

  const createProfile = async (full_name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("farmer_profiles")
      .insert({ user_id: user.id, full_name })
      .select()
      .single();
    if (error || !data) return null;
    await refresh();
    await switchProfile(data.id);
    return data as FarmerProfile;
  };

  const updateProfile = async (id: string, patch: Partial<FarmerProfile>) => {
    await supabase.from("farmer_profiles").update(patch).eq("id", id);
    await refresh();
  };

  const deleteProfile = async (id: string) => {
    await supabase.from("farmer_profiles").delete().eq("id", id);
    await refresh();
  };

  const details = active?.farmer_details || {};
  const filled = TRACKED_FIELDS.filter(f => details[f] && String(details[f]).trim().length > 0).length;
  const completionPct = Math.round((filled / TRACKED_FIELDS.length) * 100);

  return (
    <ActiveProfileContext.Provider value={{ profiles, active, loading, refresh, switchProfile, createProfile, updateProfile, deleteProfile, completionPct }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) throw new Error("useActiveProfile must be inside ActiveProfileProvider");
  return ctx;
}
