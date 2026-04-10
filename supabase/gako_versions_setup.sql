-- ============================================================
-- gako_versions — snapshot-based version history for Gako config
-- Run once in Supabase SQL Editor. Safe to re-run.
-- Requires: is_admin() from admin_rls_fix.sql
-- ============================================================

-- ── 1. Create table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_versions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number integer     NOT NULL,
  status         text        NOT NULL DEFAULT 'published'
                   CHECK (status IN ('published', 'archived')),
  summary        text,
  snapshot_json  jsonb       NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text,
  published_at   timestamptz,
  archived_at    timestamptz
);

-- ── 2. RLS ────────────────────────────────────────────────────
ALTER TABLE public.gako_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access gako_versions" ON public.gako_versions;
CREATE POLICY "Admin access gako_versions"
  ON public.gako_versions
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Verify ────────────────────────────────────────────────────
-- SELECT * FROM public.gako_versions ORDER BY version_number DESC;
