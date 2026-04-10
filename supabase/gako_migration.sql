-- ============================================================
-- Gako Training Workflow — Patch Migration
-- Run this in Supabase SQL Editor.
-- Safe to re-run (all ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS).
-- ============================================================

-- ── 1. Patch gako_settings with missing columns ──────────────
ALTER TABLE public.gako_settings
  ADD COLUMN IF NOT EXISTS provider       text        NOT NULL DEFAULT 'anthropic',
  ADD COLUMN IF NOT EXISTS model_name     text        NOT NULL DEFAULT 'claude-sonnet-4-6',
  ADD COLUMN IF NOT EXISTS temperature    numeric(3,2) NOT NULL DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS max_tokens     integer     NOT NULL DEFAULT 2048,
  ADD COLUMN IF NOT EXISTS system_prompt  text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fallback_model text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS api_endpoint   text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS enabled        boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status         text        NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS publish_status text        NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS last_published timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now();

-- Seed default settings row if none exists
INSERT INTO public.gako_settings (provider, model_name, temperature, max_tokens, system_prompt)
SELECT 'anthropic', 'claude-sonnet-4-6', 0.70, 2048,
  'You are Gako, an AI assistant specialized in stock market analysis and earnings research. Be concise, accurate, and data-driven.'
WHERE NOT EXISTS (SELECT 1 FROM public.gako_settings);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS gako_settings_updated_at ON public.gako_settings;
CREATE TRIGGER gako_settings_updated_at
  BEFORE UPDATE ON public.gako_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 2. Extend gako_skills if columns are missing ─────────────
ALTER TABLE public.gako_skills
  ADD COLUMN IF NOT EXISTS slug         text,
  ADD COLUMN IF NOT EXISTS category     text        NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS examples     jsonb       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS visible      boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version      integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

UPDATE public.gako_skills
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE slug IS NULL;

-- ── 3. Create gako_behavior_rules if missing ─────────────────
CREATE TABLE IF NOT EXISTS public.gako_behavior_rules (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL DEFAULT 'system',
  content    text        NOT NULL,
  enabled    boolean     NOT NULL DEFAULT true,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Create gako_methods if missing ────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_methods (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  category         text        NOT NULL DEFAULT 'general',
  description      text,
  steps            jsonb       NOT NULL DEFAULT '[]',
  examples         jsonb       NOT NULL DEFAULT '[]',
  when_to_use      text,
  when_not_to_use  text,
  confidence_notes text,
  enabled          boolean     NOT NULL DEFAULT true,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 5. Create gako_test_cases ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_test_cases (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  prompt     text        NOT NULL,
  skill_slug text,
  expected   text,
  tags       text[]      NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── 6. Create gako_test_runs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_test_runs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id uuid        REFERENCES public.gako_test_cases(id) ON DELETE SET NULL,
  prompt       text        NOT NULL,
  response     text,
  skill_used   text,
  provider     text,
  model_used   text,
  score        integer     CHECK (score BETWEEN 1 AND 5),
  passed       boolean,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 7. Create gako_logs if missing ───────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  input       text,
  output      text,
  skill_used  text,
  provider    text,
  model_used  text,
  success     boolean     NOT NULL DEFAULT true,
  duration_ms integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 8. RLS for all tables ─────────────────────────────────────
ALTER TABLE public.gako_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_behavior_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_methods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_test_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_test_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_logs           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access gako_settings"       ON public.gako_settings;
DROP POLICY IF EXISTS "Admin access gako_behavior_rules" ON public.gako_behavior_rules;
DROP POLICY IF EXISTS "Admin access gako_methods"        ON public.gako_methods;
DROP POLICY IF EXISTS "Admin access gako_test_cases"     ON public.gako_test_cases;
DROP POLICY IF EXISTS "Admin access gako_test_runs"      ON public.gako_test_runs;
DROP POLICY IF EXISTS "Admin access gako_logs"           ON public.gako_logs;

CREATE POLICY "Admin access gako_settings"
  ON public.gako_settings USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin access gako_behavior_rules"
  ON public.gako_behavior_rules USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin access gako_methods"
  ON public.gako_methods USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin access gako_test_cases"
  ON public.gako_test_cases USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin access gako_test_runs"
  ON public.gako_test_runs USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin access gako_logs"
  ON public.gako_logs USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can write gako_skills" ON public.gako_skills;
CREATE POLICY "Admin can write gako_skills"
  ON public.gako_skills FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Done ─────────────────────────────────────────────────────
-- Gako training workflow is now fully ready.
