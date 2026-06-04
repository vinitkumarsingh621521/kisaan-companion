
-- ── research_papers: remove anon UPDATE, restrict to uploader/admin ──
DROP POLICY IF EXISTS "Anyone can update view/download counters; uploader/admin can ed" ON public.research_papers;

CREATE POLICY "Uploader or admin can update papers"
ON public.research_papers
FOR UPDATE
TO authenticated
USING ((auth.uid() = uploader_id) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = uploader_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Safe counter bump helper (anyone signed in can increment views/downloads, nothing else)
CREATE OR REPLACE FUNCTION public.bump_paper_counter(_paper_id uuid, _field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _field = 'views' THEN
    UPDATE public.research_papers SET views = views + 1 WHERE id = _paper_id;
  ELSIF _field = 'downloads' THEN
    UPDATE public.research_papers SET downloads = downloads + 1 WHERE id = _paper_id;
  ELSE
    RAISE EXCEPTION 'invalid field';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_paper_counter(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_paper_counter(uuid, text) TO authenticated;

-- ── community_posts: prevent authors from inflating likes_count / comments_count ──
REVOKE UPDATE (likes_count, comments_count) ON public.community_posts FROM authenticated;
REVOKE UPDATE (likes_count, comments_count) ON public.community_posts FROM anon;

-- Trigger keeps likes_count in sync with actual community_likes rows
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
      SET likes_count = likes_count + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_post_likes_count_ins ON public.community_likes;
DROP TRIGGER IF EXISTS trg_sync_post_likes_count_del ON public.community_likes;

CREATE TRIGGER trg_sync_post_likes_count_ins
AFTER INSERT ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

CREATE TRIGGER trg_sync_post_likes_count_del
AFTER DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

-- One-time reconciliation so counts match existing likes data
UPDATE public.community_posts p
SET likes_count = sub.cnt
FROM (
  SELECT post_id, COUNT(*)::int AS cnt
  FROM public.community_likes
  GROUP BY post_id
) sub
WHERE p.id = sub.post_id;

UPDATE public.community_posts
SET likes_count = 0
WHERE id NOT IN (SELECT post_id FROM public.community_likes);
