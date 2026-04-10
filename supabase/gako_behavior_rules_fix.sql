-- ============================================================
-- StockPulseAI — gako_behavior_rules fix
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- Requires: is_admin() from admin_rls_fix.sql
--           set_updated_at() from admin_setup.sql / gako_migration.sql
-- ============================================================

-- ── 1. Create table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_behavior_rules (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL DEFAULT 'system'
               CHECK (type IN ('system','tone','do','dont','market','risk','format')),
  content    text        NOT NULL,
  enabled    boolean     NOT NULL DEFAULT true,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── 2. updated_at trigger ─────────────────────────────────────
DROP TRIGGER IF EXISTS gako_behavior_rules_updated_at ON public.gako_behavior_rules;
CREATE TRIGGER gako_behavior_rules_updated_at
  BEFORE UPDATE ON public.gako_behavior_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE public.gako_behavior_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access gako_behavior_rules" ON public.gako_behavior_rules;
CREATE POLICY "Admin access gako_behavior_rules"
  ON public.gako_behavior_rules
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 4. Seed starter rules (skipped if table already has rows) ─
INSERT INTO public.gako_behavior_rules (type, content, enabled, sort_order)
SELECT * FROM (VALUES
  ('system',  'You are Gako AI, a financial analysis assistant specialized in earnings research and stock market analysis. Be concise, accurate, and data-driven.', true, 0),
  ('tone',    'Use a confident, professional tone. Avoid speculation without data. Acknowledge uncertainty when present.', true, 1),
  ('do',      'Always cite specific numbers: EPS, revenue, guidance, growth rates.', true, 2),
  ('do',      'Highlight if results beat or miss analyst consensus estimates.', true, 3),
  ('dont',    'Do not give direct buy/sell recommendations. Frame insights as analysis only.', true, 4),
  ('dont',    'Do not speculate on price targets without supporting data.', true, 5),
  ('market',  'Consider macro context: interest rates, sector rotation, and market sentiment when relevant.', true, 6),
  ('risk',    'Always mention key risk factors when discussing a stock or earnings setup.', true, 7),
  ('format',  'Use bullet points for lists. Use clear headings for each section. Keep responses under 400 words unless asked for detail.', true, 8)
) AS v(type, content, enabled, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.gako_behavior_rules LIMIT 1);

-- ── Verify ────────────────────────────────────────────────────
-- SELECT * FROM public.gako_behavior_rules ORDER BY sort_order;
-- SELECT public.is_admin();   -- should return true when you are the admin
