-- Farm zones table for Field Mapper sync
CREATE TABLE public.farm_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  crop TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  hectares NUMERIC NOT NULL DEFAULT 0,
  acres NUMERIC NOT NULL DEFAULT 0,
  latlngs JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_farm_zones_profile ON public.farm_zones(profile_id);
CREATE INDEX idx_farm_zones_user ON public.farm_zones(user_id);

ALTER TABLE public.farm_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own zones"
  ON public.farm_zones FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own zones"
  ON public.farm_zones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own zones"
  ON public.farm_zones FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own zones"
  ON public.farm_zones FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_farm_zones_updated_at
  BEFORE UPDATE ON public.farm_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();