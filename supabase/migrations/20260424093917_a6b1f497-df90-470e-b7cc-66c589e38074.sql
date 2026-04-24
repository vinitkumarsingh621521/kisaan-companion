-- community_posts
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  district text,
  content text NOT NULL,
  photo_url text,
  badge text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view posts" ON public.community_posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts" ON public.community_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.community_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.community_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_community_posts_created ON public.community_posts(created_at DESC);

-- community_likes
CREATE TABLE public.community_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view likes" ON public.community_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own likes" ON public.community_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.community_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- like counter trigger
CREATE OR REPLACE FUNCTION public.bump_post_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER community_likes_count
  AFTER INSERT OR DELETE ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes();

-- user_xp
CREATE TABLE public.user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own xp" ON public.user_xp
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own xp" ON public.user_xp
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own xp" ON public.user_xp
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER user_xp_updated_at
  BEFORE UPDATE ON public.user_xp
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('community-photos', 'community-photos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read community photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-photos');
CREATE POLICY "Auth upload own community photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth update own community photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'community-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Auth delete own community photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'community-photos' AND auth.uid()::text = (storage.foldername(name))[1]);