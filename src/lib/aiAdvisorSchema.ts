import { z } from "zod";

export const advisorInputSchema = z.object({
  // Location & climate
  state: z.string().optional(),
  district: z.string().optional(),
  village: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  altitude_m: z.number().optional(),
  climate_zone: z.string().optional(),
  avg_rainfall_mm: z.number().optional(),
  monsoon_stage: z.string().optional(),
  frost_risk: z.enum(["none", "low", "medium", "high"]).optional(),

  // Soil & land
  soil_type: z.string().optional(),
  soil_ph: z.number().optional(),
  nitrogen: z.number().optional(),
  phosphorus: z.number().optional(),
  potassium: z.number().optional(),
  organic_carbon_pct: z.number().optional(),
  soil_texture: z.string().optional(),
  drainage: z.enum(["poor", "moderate", "good"]).optional(),
  land_size_acres: z.number().optional(),
  slope: z.enum(["flat", "gentle", "steep"]).optional(),
  irrigation_source: z.enum(["borewell", "canal", "rainfed", "drip", "river", "pond"]).optional(),
  water_availability: z.number().min(1).max(10).optional(),

  // Crops & history
  current_crops: z.array(z.string()).optional(),
  previous_crops: z.array(z.string()).optional(),
  intended_crop: z.string().optional(),
  sowing_date: z.string().optional(),
  expected_harvest: z.string().optional(),
  rotation_pattern: z.string().optional(),
  intercropping: z.boolean().optional(),
  seed_source: z.string().optional(),

  // Inputs & practices
  uses_fertilizer: z.boolean().optional(),
  fertilizer_brand: z.string().optional(),
  npk_ratio: z.string().optional(),
  uses_pesticide: z.boolean().optional(),
  pesticide_type: z.string().optional(),
  farming_style: z.enum(["organic", "chemical", "mixed"]).optional(),
  mulching: z.boolean().optional(),
  machinery_owned: z.array(z.string()).optional(),
  labour_availability: z.enum(["scarce", "moderate", "abundant"]).optional(),
  compost_use: z.boolean().optional(),
  tillage_type: z.enum(["conventional", "minimum", "zero"]).optional(),

  // Economics & risk
  budget_per_acre: z.number().optional(),
  expected_yield_ton_acre: z.number().optional(),
  mandi_distance_km: z.number().optional(),
  cold_storage: z.boolean().optional(),
  insurance: z.boolean().optional(),
  loan_taken: z.boolean().optional(),
  risk_appetite: z.enum(["conservative", "balanced", "aggressive"]).optional(),
  target_profit: z.number().optional(),

  // Goals
  primary_goal: z.enum(["profit", "sustainability", "food_security", "export"]).optional(),
  open_to_new_crops: z.boolean().optional(),
  market_preference: z.enum(["local_mandi", "contract", "export", "fpo"]).optional(),
  organic_cert: z.boolean().optional(),
  time_horizon: z.enum(["1_season", "1_year", "3_years"]).optional(),
  tech_comfort: z.number().min(1).max(5).optional(),
});

export type AdvisorInput = z.infer<typeof advisorInputSchema>;

export interface AdvisoryResult {
  status: "ok" | "partial";
  summary: string;
  crop_suitability: { chosen_crop: string; score: number; verdict: string; reason: string };
  alternative_crops: { name: string; emoji: string; score: number; profit_per_acre: string; reason: string }[];
  climate_risk: { overall: string; heat: string; frost: string; flood: string; drought: string };
  soil_plan: { action: string; dosage: string; why: string };
  irrigation_plan: { method: string; schedule: string; water_saving_pct: number };
  fertilizer_plan: { npk_kg_per_acre: string; timing: string; brands: string[]; organic_alt: string };
  pesticide_plan: { needed: boolean; products: string[]; ipm_alternative: string };
  cost_breakdown: { seed: string; labour: string; machinery: string; transport: string; total_per_acre: string; total: string };
  yield_forecast: { low: string; expected: string; high: string };
  revenue_forecast: { gross: string; net_profit: string; roi_pct: number; break_even_per_quintal: string };
  sowing_window: string;
  harvest_window: string;
  market_strategy: { channel: string; best_month: string; reason: string };
  schemes: { name: string; benefit: string; fit_reason: string }[];
  insurance: { recommended: string; sum_insured: string; premium: string };
  sustainability: { score: number; improvement: string };
  water_footprint: string;
  tips: string[];
  red_flags: string[];
}
