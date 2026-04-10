-- ============================================================
-- gako_logs column fix
-- Run once in Supabase SQL Editor. Safe to re-run.
--
-- Root cause: the table was created with only an `id` column.
-- All content columns are missing, causing the SELECT with
-- ORDER BY created_at to return 42703 "column does not exist".
-- ============================================================

-- ── 1. Add all missing columns ────────────────────────────────
ALTER TABLE public.gako_logs
  ADD COLUMN IF NOT EXISTS user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS input       text,
  ADD COLUMN IF NOT EXISTS output      text,
  ADD COLUMN IF NOT EXISTS skill_used  text,
  ADD COLUMN IF NOT EXISTS provider    text,
  ADD COLUMN IF NOT EXISTS model_used  text,
  ADD COLUMN IF NOT EXISTS success     boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS created_at  timestamptz NOT NULL DEFAULT now();

-- ── 2. RLS ────────────────────────────────────────────────────
ALTER TABLE public.gako_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access gako_logs" ON public.gako_logs;
CREATE POLICY "Admin access gako_logs"
  ON public.gako_logs
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Verify ────────────────────────────────────────────────────
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_name = 'gako_logs'
--  ORDER BY ordinal_position;
