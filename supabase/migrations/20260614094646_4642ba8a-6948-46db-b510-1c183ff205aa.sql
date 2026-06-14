-- 1) Research papers: allow all authenticated users to read (library)
DROP POLICY IF EXISTS "rp_select_own" ON public.research_papers;
CREATE POLICY "rp_select_authenticated"
  ON public.research_papers
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) Remove self-claim admin path; only existing admins may insert roles
DROP POLICY IF EXISTS "Admins can insert roles, or first user can claim admin" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Storage policies for now-private research-papers bucket
DROP POLICY IF EXISTS "rp_storage_read_auth" ON storage.objects;
DROP POLICY IF EXISTS "rp_storage_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "rp_storage_update_owner_admin" ON storage.objects;
DROP POLICY IF EXISTS "rp_storage_delete_owner_admin" ON storage.objects;

CREATE POLICY "rp_storage_read_auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'research-papers');

CREATE POLICY "rp_storage_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'research-papers' AND owner = auth.uid());

CREATE POLICY "rp_storage_update_owner_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'research-papers' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "rp_storage_delete_owner_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'research-papers' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));
