import { useQuery } from "@tanstack/react-query";
import { useActiveProfile } from "./useActiveProfile";

const CTX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/farmer-context`;

export interface WeatherDay {
  date: string;
  day: string;
  emoji: string;
  temp_high: number;
  temp_low: number;
  rain_mm: number;
  rain_pct: number;
  wind_kph: number;
}

export interface PersonalizationCtx {
  farmer_name: string;
  location: { state?: string; district?: string; village?: string; lat?: number; lon?: number };
  climate: { zone: string; rainfall: string; soils: string[]; majorCrops: string[]; monsoon_stage: string; current_season: string };
  crops: { current: string[]; suitable: string[] };
  financial: { bucket: string; income?: string; monthly_investment?: string };
  risk_profile: string;
  schemes_matched: string[];
  nearest_mandi: { name: string; distance_km: string };
  scores: { soil_health: number; diversification: number; tech_readiness: number; farm_health: number };
  weather: { current_temp: number; current_humidity: number; current_wind: number; today_rain_pct: number; forecast: WeatherDay[]; source: string } | null;
  ai_summary_seed: string;
}

const cacheKey = (id: string) => `km.personalization.${id}`;

function readCache(id: string): PersonalizationCtx | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > 24 * 60 * 60 * 1000) return null; // 24h hard expiry
    return data;
  } catch { return null; }
}
function writeCache(id: string, data: PersonalizationCtx) {
  try { localStorage.setItem(cacheKey(id), JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function usePersonalization() {
  const { active } = useActiveProfile();
  const profileId = active?.id;
  const updatedAt = active?.updated_at;

  const { data, isLoading } = useQuery({
    queryKey: ["personalization", profileId, updatedAt],
    enabled: !!active,
    staleTime: 10 * 60 * 1000,
    initialData: () => (profileId ? readCache(profileId) ?? undefined : undefined),
    queryFn: async () => {
      const r = await fetch(CTX_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ profile: active }),
      });
      const json = (await r.json()) as PersonalizationCtx;
      if (profileId) writeCache(profileId, json);
      return json;
    },
  });

  return { ctx: data ?? null, loading: isLoading };
}
