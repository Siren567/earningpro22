-- ============================================================
-- StockPulseAI — Admin Action Functions
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 0. is_admin() helper (idempotent — safe to re-run) ───────
-- Already created in admin_rls_fix.sql, but included here so
-- this file is self-contained.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── 1. admin_update_user_role ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id uuid,
  new_role       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  -- Caller must be admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Prevent self-demotion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;

  -- Validate role value
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: must be user or admin';
  END IF;

  -- Prevent removing last admin
  IF new_role = 'user' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles
    WHERE role = 'admin';

    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, text) TO authenticated;

-- ── 2. admin_update_user_plan ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(
  target_user_id uuid,
  new_plan       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF new_plan NOT IN ('free', 'basic', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid plan: must be free, basic, pro, or enterprise';
  END IF;

  UPDATE public.profiles
  SET subscription_plan = new_plan, updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text) TO authenticated;

-- ── 3. admin_set_user_suspended ───────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(
  target_user_id uuid,
  suspended      boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Prevent self-suspension
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot suspend your own account';
  END IF;

  UPDATE public.profiles
  SET is_suspended = suspended, updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean) TO authenticated;

-- ── Verify ────────────────────────────────────────────────────
-- After running, confirm functions exist:
--
-- SELECT proname, pg_get_function_arguments(oid) AS args
-- FROM pg_proc
-- WHERE proname IN (
--   'is_admin',
--   'admin_update_user_role',
--   'admin_update_user_plan',
--   'admin_set_user_suspended'
-- ) AND pronamespace = 'public'::regnamespace;
