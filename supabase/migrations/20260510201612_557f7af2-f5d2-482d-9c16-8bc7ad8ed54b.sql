
-- Lock down team_members: visible to admins only (privacy)
DROP POLICY IF EXISTS "tm_select_all" ON public.team_members;
CREATE POLICY "tm_select_admin" ON public.team_members FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Lock down research_papers: uploader or admin only
DROP POLICY IF EXISTS "rp_select_all" ON public.research_papers;
CREATE POLICY "rp_select_own" ON public.research_papers FOR SELECT
  USING (auth.uid() = uploader_id OR public.has_role(auth.uid(), 'admin'));

-- Lock down research-papers storage: uploader-folder or admin only
DROP POLICY IF EXISTS "research_papers_public_read" ON storage.objects;
CREATE POLICY "research_papers_owner_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'research-papers'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );
