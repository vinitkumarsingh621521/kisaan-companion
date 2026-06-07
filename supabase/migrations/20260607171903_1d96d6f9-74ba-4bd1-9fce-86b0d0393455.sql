-- Lock down direct writes
REVOKE INSERT, UPDATE, DELETE ON public.achievements FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_xp FROM authenticated, anon;

-- Drop client-facing write policies (read policies stay intact)
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('achievements','user_xp')
      AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Canonical badge catalog
CREATE OR REPLACE FUNCTION public._badge_catalog(_badge_id text)
RETURNS TABLE(badge_id text, badge_name text, xp int)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT * FROM (VALUES
    ('first_login','First Steps 👶',10),
    ('profile_50','Half Filled 🌱',30),
    ('profile_100','Profile Pro 🌾',100),
    ('first_chat','Curious Kisaan 💬',20),
    ('first_scan','Disease Detective 🔬',25),
    ('first_report','Report Maestro 📊',30),
    ('multi_profile','Multi-Farm Boss 🚜',40),
    ('organic_pioneer','Organic Pioneer 🌿',50),
    ('water_saver','Water Saver 💧',50),
    ('early_bird','Early Bird 🐦',40),
    ('iot_connect','IoT Ninja 📡',60),
    ('field_mapper','Cartographer 🗺️',35)
  ) AS t(badge_id, badge_name, xp)
  WHERE t.badge_id = _badge_id;
$$;

-- Award a badge (idempotent) and grant its XP atomically
CREATE OR REPLACE FUNCTION public.award_badge(_badge_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _b record;
  _new_xp int;
  _new_level int;
  _leveled_up boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _b FROM public._badge_catalog(_badge_id);
  IF _b.badge_id IS NULL THEN
    RAISE EXCEPTION 'Unknown badge: %', _badge_id;
  END IF;

  -- Idempotent insert
  IF EXISTS (SELECT 1 FROM public.achievements WHERE user_id = _uid AND badge_id = _b.badge_id) THEN
    RETURN jsonb_build_object('already_earned', true);
  END IF;

  INSERT INTO public.achievements(user_id, badge_id, badge_name, xp)
  VALUES (_uid, _b.badge_id, _b.badge_name, _b.xp);

  -- Seed and grant XP
  INSERT INTO public.user_xp(user_id, xp, level, streak_days, last_active_date)
  VALUES (_uid, 0, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_xp
  SET xp = xp + _b.xp,
      level = GREATEST(level, (xp + _b.xp) / 100 + 1)
  WHERE user_id = _uid
  RETURNING xp, level INTO _new_xp, _new_level;

  RETURN jsonb_build_object(
    'awarded', true,
    'badge_id', _b.badge_id,
    'xp_gained', _b.xp,
    'total_xp', _new_xp,
    'level', _new_level
  );
END $$;

-- Daily streak bump + seed
CREATE OR REPLACE FUNCTION public.bump_streak()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.user_xp%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_xp(user_id, xp, level, streak_days, last_active_date)
  VALUES (_uid, 0, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.user_xp WHERE user_id = _uid;

  IF _row.last_active_date IS DISTINCT FROM CURRENT_DATE THEN
    UPDATE public.user_xp
    SET streak_days = CASE
          WHEN _row.last_active_date = CURRENT_DATE - INTERVAL '1 day'
            THEN _row.streak_days + 1
          ELSE 1
        END,
        last_active_date = CURRENT_DATE
    WHERE user_id = _uid
    RETURNING * INTO _row;
  END IF;

  RETURN to_jsonb(_row);
END $$;

REVOKE ALL ON FUNCTION public.award_badge(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_streak() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_badge(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_streak() TO authenticated;