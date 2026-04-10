-- ============================================================
-- Gako Config Enhancement — Migration
-- Run this entire file in Supabase SQL Editor.
-- Safe to re-run (all ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS).
-- Requires: is_admin() function from admin_rls_fix.sql
-- ============================================================

-- ── 1. Patch gako_settings with new tracking columns ─────────
ALTER TABLE public.gako_settings
  ADD COLUMN IF NOT EXISTS updated_by_email  text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fallback_provider text        NOT NULL DEFAULT '';

-- ── 2. gako_api_keys — multi-provider key storage ────────────
--
-- Security model:
--   • key_value is stored as plaintext (Postgres row-level security enforces admin-only)
--   • The frontend NEVER selects key_value — only key_hint is displayed
--   • Edge functions read key_value via service role (bypasses RLS)
--   • For maximum security, prefer `supabase secrets set` over DB storage
--   • Supabase Vault (pgcrypto column encryption) requires Pro plan
--
CREATE TABLE IF NOT EXISTS public.gako_api_keys (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         text         NOT NULL,            -- anthropic | openai | gemini | custom
  label            text         NOT NULL DEFAULT '',  -- friendly name, e.g. "Production"
  key_value        text         NOT NULL,             -- full key — never returned to frontend
  key_hint         text         NOT NULL DEFAULT '',  -- masked preview, e.g. sk-...A82F
  is_active        boolean      NOT NULL DEFAULT false,
  validated_at     timestamptz,                       -- first successful test
  last_tested_at   timestamptz,
  last_tested_ok   boolean,
  test_latency_ms  integer,
  test_error       text,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now(),
  created_by_email text         NOT NULL DEFAULT ''
);

DROP TRIGGER IF EXISTS gako_api_keys_updated_at ON public.gako_api_keys;
CREATE TRIGGER gako_api_keys_updated_at
  BEFORE UPDATE ON public.gako_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. gako_audit_log — admin action trail ────────────────────
CREATE TABLE IF NOT EXISTS public.gako_audit_log (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text         NOT NULL DEFAULT '',
  action      text         NOT NULL,  -- settings_updated | key_added | key_deleted | key_tested | defaults_restored
  details     jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- ── 4. RLS — admin-only on both new tables ────────────────────
ALTER TABLE public.gako_api_keys   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_audit_log  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access gako_api_keys"   ON public.gako_api_keys;
DROP POLICY IF EXISTS "Admin access gako_audit_log"  ON public.gako_audit_log;

CREATE POLICY "Admin access gako_api_keys"
  ON public.gako_api_keys  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin access gako_audit_log"
  ON public.gako_audit_log USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 5. Verify ─────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'gako_settings' AND column_name IN ('updated_by_email','fallback_provider');
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('gako_api_keys','gako_audit_log');
--
-- New columns on gako_settings:
--   updated_by_email  — email of admin who last saved settings
--   fallback_provider — provider to fall back to if primary fails
--
-- New tables:
--   gako_api_keys   — stores API keys per provider (masked on read, full on write)
--   gako_audit_log  — append-only audit trail for admin actions
