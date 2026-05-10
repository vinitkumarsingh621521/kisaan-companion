
-- 1) team_members: add user_id ownership, scope select to owner+admin, allow user CRUD on own rows
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);

DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;
DROP POLICY IF EXISTS "tm_select_admin" ON public.team_members;
DROP POLICY IF EXISTS "Admins can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete team members" ON public.team_members;

CREATE POLICY "tm_select_own_or_admin" ON public.team_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tm_insert_own_or_admin" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tm_update_own_or_admin" ON public.team_members FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tm_delete_own_or_admin" ON public.team_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2) research_papers: remove the public-read policy that leaked all uploads to everyone
DROP POLICY IF EXISTS "Anyone can view research papers" ON public.research_papers;

-- 3) Storage: team-photos — let each user manage their own folder
DROP POLICY IF EXISTS "team_photos_owner_rw" ON storage.objects;
DROP POLICY IF EXISTS "team_photos_owner_read" ON storage.objects;
DROP POLICY IF EXISTS "team_photos_public_read" ON storage.objects;

CREATE POLICY "team_photos_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "team_photos_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "team_photos_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "team_photos_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
