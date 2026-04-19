
-- ============== ROLES SYSTEM ==============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============== FARMER PROFILES ==============
CREATE TABLE public.farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'New Farmer',
  farm_location TEXT,
  farm_size TEXT,
  soil_type TEXT,
  preferred_language TEXT DEFAULT 'English',
  avatar_url TEXT,
  farmer_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fp_select_own" ON public.farmer_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fp_insert_own" ON public.farmer_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fp_update_own" ON public.farmer_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fp_delete_own" ON public.farmer_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_fp_updated BEFORE UPDATE ON public.farmer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_farmer_profiles_user ON public.farmer_profiles(user_id);

-- ============== USER SETTINGS ==============
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_profile_id UUID REFERENCES public.farmer_profiles(id) ON DELETE SET NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "us_select_own" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "us_insert_own" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "us_update_own" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "us_delete_own" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_us_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== TEAM MEMBERS ==============
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_teacher BOOLEAN NOT NULL DEFAULT false,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tm_select_all" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "tm_admin_all" ON public.team_members FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tm_updated BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 4 students + 1 teacher
INSERT INTO public.team_members (name, role, bio, sort_order, is_teacher, is_lead) VALUES
  ('Team Lead', 'Team Lead & Full-Stack Developer', 'Leads the SIH-25030 team. Loves AI, agriculture, and impact-driven tech.', 1, false, true),
  ('Member 2', 'ML Engineer', 'Builds and tunes the 22 ML models powering crop recommendations.', 2, false, false),
  ('Member 3', 'Frontend & UX', 'Designs the farmer-friendly experience across all 13 languages.', 3, false, false),
  ('Member 4', 'Data Engineer', 'Curates 110+ crop datasets and the soil knowledge base.', 4, false, false),
  ('Faculty Mentor', 'Faculty Mentor', 'Guides the team through the SIH-25030 problem statement.', 5, true, false);

-- ============== RESEARCH PAPERS ==============
CREATE TABLE public.research_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  abstract TEXT,
  authors TEXT,
  file_url TEXT NOT NULL,
  file_size_kb INTEGER,
  downloads INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rp_select_all" ON public.research_papers FOR SELECT USING (true);
CREATE POLICY "rp_insert_auth" ON public.research_papers FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "rp_update_own" ON public.research_papers FOR UPDATE USING (auth.uid() = uploader_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rp_delete_own" ON public.research_papers FOR DELETE USING (auth.uid() = uploader_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_rp_updated BEFORE UPDATE ON public.research_papers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== ACHIEVEMENTS ==============
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 10,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ach_select_own" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ach_insert_own" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ach_delete_own" ON public.achievements FOR DELETE USING (auth.uid() = user_id);

-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('team-photos', 'team-photos', true),
  ('research-papers', 'research-papers', true),
  ('farm-photos', 'farm-photos', false)
ON CONFLICT (id) DO NOTHING;

-- team-photos: public read, admin write
CREATE POLICY "team_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'team-photos');
CREATE POLICY "team_photos_admin_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "team_photos_admin_update" ON storage.objects FOR UPDATE USING (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "team_photos_admin_delete" ON storage.objects FOR DELETE USING (bucket_id = 'team-photos' AND public.has_role(auth.uid(), 'admin'));

-- research-papers: public read, owner write
CREATE POLICY "research_papers_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'research-papers');
CREATE POLICY "research_papers_user_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "research_papers_user_update" ON storage.objects FOR UPDATE USING (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "research_papers_user_delete" ON storage.objects FOR DELETE USING (bucket_id = 'research-papers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- farm-photos: private to owner
CREATE POLICY "farm_photos_user_read" ON storage.objects FOR SELECT USING (bucket_id = 'farm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "farm_photos_user_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'farm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "farm_photos_user_update" ON storage.objects FOR UPDATE USING (bucket_id = 'farm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "farm_photos_user_delete" ON storage.objects FOR DELETE USING (bucket_id = 'farm-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============== MIGRATE EXISTING DATA ==============
INSERT INTO public.farmer_profiles (user_id, full_name, farm_location, farm_size, soil_type, preferred_language, farmer_details, is_active)
SELECT user_id, COALESCE(full_name, 'My Farm'), farm_location, farm_size, soil_type, preferred_language, COALESCE(farmer_details, '{}'::jsonb), true
FROM public.profiles
ON CONFLICT DO NOTHING;
