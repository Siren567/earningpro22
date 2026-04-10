-- ============================================================
-- gako_settings singleton fix
-- Run once in Supabase SQL Editor (safe to re-run).
--
-- WHY id became NULL:
--   The table was originally created (or migrated) before
--   DEFAULT gen_random_uuid() was in place on the id column.
--   INSERT statements that omitted the id column therefore
--   stored NULL rather than a generated UUID.
--   Additionally, every admin panel save issued a new INSERT
--   instead of UPDATE, adding a new NULL-id row each time.
--
-- WHICH ROW TO KEEP:
--   The row with the most-recently updated_at (most recent
--   admin edits) — or if all updated_at are equal, the one
--   with the longest system_prompt (most content).
-- ============================================================

-- ── Step 1: ensure the id column has the right default ───────
ALTER TABLE public.gako_settings
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ── Step 2: assign fresh UUIDs to every row that has id NULL ─
UPDATE public.gako_settings
   SET id = gen_random_uuid()
 WHERE id IS NULL;

-- ── Step 3: collapse to a single canonical row ────────────────
-- We keep the row with the latest updated_at.
-- All others are deleted.
-- After this block exactly one row exists.

DO $$
DECLARE
  keeper_id uuid;
BEGIN
  -- Pick the row to keep: latest updated_at, break ties by
  -- longest system_prompt, then just take any.
  SELECT id INTO keeper_id
    FROM public.gako_settings
   ORDER BY
     updated_at          DESC NULLS LAST,
     length(system_prompt) DESC NULLS LAST
   LIMIT 1;

  IF keeper_id IS NULL THEN
    RAISE NOTICE 'gako_settings is empty — nothing to consolidate.';
    RETURN;
  END IF;

  -- Delete every other row
  DELETE FROM public.gako_settings
   WHERE id <> keeper_id;

  RAISE NOTICE 'gako_settings consolidated. Keeping row id = %', keeper_id;
END;
$$;

-- ── Step 4: add a uniqueness constraint so this can never
--           happen again (only one row allowed in the table) ──
-- We use a partial unique index on a constant expression.
-- This makes every INSERT after the first one fail at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS gako_settings_singleton
  ON public.gako_settings ((true));

-- ── Step 5: ensure updated_at trigger exists ─────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS gako_settings_updated_at ON public.gako_settings;
CREATE TRIGGER gako_settings_updated_at
  BEFORE UPDATE ON public.gako_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Step 6: verify ────────────────────────────────────────────
-- Run these selects to confirm the fix worked:
--
--   SELECT id, provider, model_name, updated_at
--     FROM public.gako_settings;
--   -- Should return exactly one row with a non-null UUID id.
--
--   SELECT COUNT(*) FROM public.gako_settings;
--   -- Should return 1.
