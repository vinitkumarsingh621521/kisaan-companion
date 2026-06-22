DROP POLICY IF EXISTS "public read comments" ON public.community_comments;
CREATE POLICY "Authenticated users can read comments"
  ON public.community_comments FOR SELECT
  TO authenticated
  USING (true);

-- Lock writes on user_xp to SECURITY DEFINER functions only by denying client writes
CREATE POLICY "No client inserts on user_xp"
  ON public.user_xp FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No client updates on user_xp"
  ON public.user_xp FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No client deletes on user_xp"
  ON public.user_xp FOR DELETE
  TO authenticated
  USING (false);