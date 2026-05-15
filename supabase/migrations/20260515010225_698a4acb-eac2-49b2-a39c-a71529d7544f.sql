DROP POLICY IF EXISTS "tm_select_own_or_admin" ON public.team_members;
CREATE POLICY "tm_select_public" ON public.team_members FOR SELECT TO anon, authenticated USING (true);