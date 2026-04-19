import { useEffect, useState } from "react";
import { useActiveProfile } from "./useActiveProfile";

const CTX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/farmer-context`;

export interface PersonalizationCtx {
  farmer_name: string;
  location: { state?: string; district?: string; village?: string };
  climate: { zone: string; rainfall: string; soils: string[]; majorCrops: string[]; monsoon_stage: string; current_season: string };
  crops: { current: string[]; suitable: string[] };
  financial: { bucket: string; income?: string; monthly_investment?: string };
  risk_profile: string;
  schemes_matched: string[];
  nearest_mandi: { name: string; distance_km: string };
  scores: { soil_health: number; diversification: number; tech_readiness: number; farm_health: number };
  ai_summary_seed: string;
}

export function usePersonalization() {
  const { active } = useActiveProfile();
  const [ctx, setCtx] = useState<PersonalizationCtx | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) { setCtx(null); return; }
    let cancelled = false;
    setLoading(true);
    fetch(CTX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ profile: active }),
    })
      .then(r => r.json())
      .then(data => { if (!cancelled) setCtx(data); })
      .catch(e => console.error("personalization err:", e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [active?.id, active?.updated_at]);

  return { ctx, loading };
}
