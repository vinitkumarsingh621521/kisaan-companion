
-- Drop public read on research-papers storage bucket (private bucket should require auth)
DROP POLICY IF EXISTS "Research papers public read" ON storage.objects;

-- Restrict team_members writes to admins only
DROP POLICY IF EXISTS tm_insert_own_or_admin ON public.team_members;
DROP POLICY IF EXISTS tm_update_own_or_admin ON public.team_members;
DROP POLICY IF EXISTS tm_delete_own_or_admin ON public.team_members;

CREATE POLICY tm_insert_admin ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY tm_update_admin ON public.team_members
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY tm_delete_admin ON public.team_members
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Remove broad owner-folder write policies on team-photos bucket; admin policies remain
DROP POLICY IF EXISTS team_photos_owner_insert ON storage.objects;
DROP POLICY IF EXISTS team_photos_owner_update ON storage.objects;
DROP POLICY IF EXISTS team_photos_owner_delete ON storage.objects;
