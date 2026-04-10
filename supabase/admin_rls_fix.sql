-- ============================================================
-- StockPulseAI — Admin RLS Fix
-- Run this entire file in Supabase SQL Editor.
-- ============================================================

-- ── 1. Drop any existing admin SELECT policy on profiles ─────
-- A policy that checks public.profiles inside a public.profiles
-- policy causes infinite recursion. Remove it entirely.

DROP POLICY IF EXISTS "Admin full access on profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles"       ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles"      ON public.profiles;

-- ── 2. Self-only SELECT — the only SELECT policy on profiles ──
-- Both regular users and admins read their own row via this.
-- AuthContext reads id/role/is_suspended through this policy fine.

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ── 3. SECURITY DEFINER helper: is_admin() ───────────────────
-- Executes as the function owner (postgres / superuser).
-- Superusers bypass RLS, so this reads public.profiles WITHOUT
-- triggering any RLS policy — no recursion possible.

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

-- Grant execute so the authenticated role can call it
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── 4. Admin UPDATE policy (non-recursive) ───────────────────
-- Uses is_admin() which bypasses RLS internally — safe.
-- Required for suspend/unsuspend, role changes, plan changes.

DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
CREATE POLICY "Admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. admin_get_all_profiles() — the admin RPC ──────────────
-- Called by the Admin Panel instead of a direct client SELECT.
-- SECURITY DEFINER bypasses RLS to return all rows.
-- Guards with is_admin() so only admins can get data.

CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
  id                uuid,
  email             text,
  full_name         text,
  role              text,
  subscription_plan text,
  is_suspended      boolean,
  created_at        timestamptz,
  updated_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.subscription_plan,
      p.is_suspended,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute to authenticated users (function enforces admin check)
GRANT EXECUTE ON FUNCTION public.admin_get_all_profiles() TO authenticated;

-- ── Verify ───────────────────────────────────────────────────
-- Run this as a quick sanity check after the above:
--   SELECT public.is_admin();           -- should return true when you are the admin
--   SELECT * FROM public.admin_get_all_profiles();  -- should return all users

-- ── Active policies on public.profiles after this script ─────
--   SELECT  →  "Users can read own profile"   USING (auth.uid() = id)
--   UPDATE  →  "Admin can update profiles"    USING (public.is_admin())
--
-- Admin Panel fetches users via:  supabase.rpc('admin_get_all_profiles')
-- AuthContext reads own row via:  self-only SELECT policy  ✓
-- Normal users see only their row through RLS              ✓
-- No policy queries public.profiles inside itself          ✓
