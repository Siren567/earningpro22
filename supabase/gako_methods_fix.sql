-- ============================================================
-- gako_methods column fix
-- Run once in Supabase SQL Editor. Safe to re-run.
--
-- Root cause: the table was created with only an `id` column.
-- All content columns are missing, causing every SELECT and
-- INSERT to return 400 / "column does not exist".
-- ============================================================

-- ── 1. Add all missing columns ────────────────────────────────
ALTER TABLE public.gako_methods
  ADD COLUMN IF NOT EXISTS title            text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category         text        NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS description      text,
  ADD COLUMN IF NOT EXISTS steps            jsonb       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS examples         jsonb       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS when_to_use      text,
  ADD COLUMN IF NOT EXISTS when_not_to_use  text,
  ADD COLUMN IF NOT EXISTS confidence_notes text,
  ADD COLUMN IF NOT EXISTS enabled          boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order       integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now();

-- ── 2. updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS gako_methods_updated_at ON public.gako_methods;
CREATE TRIGGER gako_methods_updated_at
  BEFORE UPDATE ON public.gako_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE public.gako_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access gako_methods" ON public.gako_methods;
CREATE POLICY "Admin access gako_methods"
  ON public.gako_methods
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Verify ────────────────────────────────────────────────────
-- SELECT column_name, data_type
--   FROM information_schema.columns
--  WHERE table_name = 'gako_methods'
--  ORDER BY ordinal_position;
