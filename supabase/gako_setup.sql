-- ============================================================
-- StockPulseAI — Gako AI Control Center Setup
-- Run this entire file in Supabase SQL Editor.
-- Requires: is_admin() function from admin_rls_fix.sql
-- ============================================================

-- ── Extend existing gako_skills table ────────────────────────
ALTER TABLE public.gako_skills
  ADD COLUMN IF NOT EXISTS slug        text,
  ADD COLUMN IF NOT EXISTS category    text        NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS examples    jsonb       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS visible     boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version     integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- Backfill slug from name for existing rows
UPDATE public.gako_skills
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE slug IS NULL;

-- Updated_at trigger for gako_skills
DROP TRIGGER IF EXISTS gako_skills_updated_at ON public.gako_skills;
CREATE TRIGGER gako_skills_updated_at
  BEFORE UPDATE ON public.gako_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── gako_settings (single-row model config) ──────────────────
CREATE TABLE IF NOT EXISTS public.gako_settings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       text        NOT NULL DEFAULT 'anthropic',
  model_name     text        NOT NULL DEFAULT 'claude-sonnet-4-6',
  temperature    numeric(3,2) NOT NULL DEFAULT 0.70,
  max_tokens     integer     NOT NULL DEFAULT 2048,
  system_prompt  text        NOT NULL DEFAULT '',
  fallback_model text        NOT NULL DEFAULT '',
  api_endpoint   text        NOT NULL DEFAULT '',
  enabled        boolean     NOT NULL DEFAULT true,
  status         text        NOT NULL DEFAULT 'online',   -- online | offline | testing
  publish_status text        NOT NULL DEFAULT 'draft',    -- draft | published | archived
  last_published timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Seed default settings row if none exists
INSERT INTO public.gako_settings (provider, model_name, temperature, max_tokens, system_prompt)
SELECT 'anthropic', 'claude-sonnet-4-6', 0.70, 2048,
  'You are Gako, an AI assistant specialized in stock market analysis and earnings research. Be concise, accurate, and data-driven.'
WHERE NOT EXISTS (SELECT 1 FROM public.gako_settings);

-- ── gako_behavior_rules ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_behavior_rules (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL DEFAULT 'system',   -- system | tone | do | dont | market | risk | format
  content    text        NOT NULL,
  enabled    boolean     NOT NULL DEFAULT true,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── gako_methods (playbooks / analysis frameworks) ────────────
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

-- ── gako_test_cases ───────────────────────────────────────────
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

-- ── gako_test_runs ────────────────────────────────────────────
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

-- ── gako_logs ─────────────────────────────────────────────────
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

-- ── Updated_at triggers for new tables ───────────────────────
DROP TRIGGER IF EXISTS gako_settings_updated_at ON public.gako_settings;
CREATE TRIGGER gako_settings_updated_at
  BEFORE UPDATE ON public.gako_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gako_behavior_rules_updated_at ON public.gako_behavior_rules;
CREATE TRIGGER gako_behavior_rules_updated_at
  BEFORE UPDATE ON public.gako_behavior_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS gako_methods_updated_at ON public.gako_methods;
CREATE TRIGGER gako_methods_updated_at
  BEFORE UPDATE ON public.gako_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS for all new tables (admin-only) ──────────────────────
ALTER TABLE public.gako_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_behavior_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_methods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_test_cases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_test_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_logs           ENABLE ROW LEVEL SECURITY;

-- Drop and recreate to stay idempotent
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

-- gako_skills: keep existing read policy for authenticated, admin gets write
-- (gako_skills was already set up in admin_setup.sql with broader read access)
DROP POLICY IF EXISTS "Admin can write gako_skills" ON public.gako_skills;
CREATE POLICY "Admin can write gako_skills"
  ON public.gako_skills FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Done ─────────────────────────────────────────────────────
-- Tables created:
--   gako_settings        — model/provider config (single row)
--   gako_skills          — extended with slug, category, description, instructions, examples
--   gako_behavior_rules  — system prompt rules, tone, do/don't
--   gako_methods         — analysis playbooks/frameworks
--   gako_test_cases      — saved test prompts
--   gako_test_runs       — test execution history + scores
--   gako_logs            — live usage logs
