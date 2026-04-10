-- ============================================================
-- gako_settings singleton fix — v2
-- Works with INTEGER id columns (SERIAL / BIGSERIAL).
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- ── Step 0: inspect the real schema first (run this SELECT
--           and read the output before running the rest) ─────
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'gako_settings'
ORDER BY ordinal_position;

-- You should see something like:
--   id            | integer   | nextval(...)  | YES or NO
--   provider      | text      | ...           | ...
--   ...
-- Confirm id type before continuing.

-- ============================================================
-- STOP HERE — read the SELECT output above, then continue.
-- ============================================================


-- ── Step 1: fix any rows where id IS NULL ────────────────────
-- For integer/serial columns, NULL id means the sequence was
-- bypassed. We fix by assigning the next sequence value.
-- If id is NOT NULL on all rows already, this is a no-op.

DO $$
DECLARE
  seq_name text;
  next_val bigint;
BEGIN
  -- Find the sequence backing the id column (works for SERIAL / BIGSERIAL)
  SELECT pg_get_serial_sequence('public.gako_settings', 'id')
    INTO seq_name;

  IF seq_name IS NULL THEN
    RAISE NOTICE 'id column has no backing sequence (may be plain integer). ' ||
                 'Assigning sequential values manually.';

    -- Assign sequential ints starting from 1 for NULL id rows
    WITH ranked AS (
      SELECT ctid, row_number() OVER () AS rn
        FROM public.gako_settings
       WHERE id IS NULL
    )
    UPDATE public.gako_settings gs
       SET id = (SELECT COALESCE(MAX(id), 0) FROM public.gako_settings WHERE id IS NOT NULL)
             + r.rn
      FROM ranked r
     WHERE gs.ctid = r.ctid;

  ELSE
    RAISE NOTICE 'Found sequence: %', seq_name;

    FOR next_val IN
      SELECT nextval(seq_name)
        FROM public.gako_settings
       WHERE id IS NULL
    LOOP
      UPDATE public.gako_settings
         SET id = next_val
       WHERE id IS NULL
         AND ctid = (
           SELECT ctid FROM public.gako_settings WHERE id IS NULL LIMIT 1
         );
    END LOOP;
  END IF;

  RAISE NOTICE 'NULL id repair complete.';
END;
$$;


-- ── Step 2: collapse to one canonical row ─────────────────────
-- Keep the row with the latest updated_at (your most recent edit).
-- Delete all others.

DO $$
DECLARE
  keeper_id integer;
  deleted_count integer;
BEGIN
  -- Pick the row to keep
  SELECT id INTO keeper_id
    FROM public.gako_settings
   ORDER BY
     updated_at           DESC NULLS LAST,
     length(system_prompt) DESC NULLS LAST,
     id                   DESC
   LIMIT 1;

  IF keeper_id IS NULL THEN
    RAISE NOTICE 'gako_settings is empty — nothing to consolidate.';
    RETURN;
  END IF;

  DELETE FROM public.gako_settings
   WHERE id <> keeper_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Kept row id = %. Deleted % duplicate(s).', keeper_id, deleted_count;
END;
$$;


-- ── Step 3: prevent future duplicates ────────────────────────
-- A unique index on a constant (true) means the table can only
-- ever hold one row. Any INSERT when a row already exists will
-- fail with a unique violation at the DB level.

CREATE UNIQUE INDEX IF NOT EXISTS gako_settings_singleton
  ON public.gako_settings ((true));


-- ── Step 4: make id NOT NULL if it is currently nullable ──────
-- Only needed if your column allows NULL. Safe no-op otherwise.

ALTER TABLE public.gako_settings
  ALTER COLUMN id SET NOT NULL;


-- ── Step 5: ensure updated_at trigger exists ─────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS gako_settings_updated_at ON public.gako_settings;
CREATE TRIGGER gako_settings_updated_at
  BEFORE UPDATE ON public.gako_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── Step 6: verify everything ─────────────────────────────────

SELECT
  id,
  provider,
  model_name,
  temperature,
  max_tokens,
  enabled,
  status,
  updated_at,
  updated_by_email
FROM public.gako_settings;

-- Expected: exactly ONE row, id is a non-null integer.

SELECT COUNT(*) AS total_rows FROM public.gako_settings;
-- Expected: 1
