-- ============================================================
-- StockPulseAI — Gako Chat Conversation Tables
-- Run in Supabase SQL Editor after gako_setup.sql
-- ============================================================

-- ── gako_conversations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── gako_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gako_messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid        NOT NULL REFERENCES public.gako_conversations(id) ON DELETE CASCADE,
  role             text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text        NOT NULL,
  skill_used       text,
  provider         text,
  model_used       text,
  duration_ms      integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gako_messages_conversation_idx
  ON public.gako_messages (conversation_id, created_at);

-- ── RLS (admin-only) ─────────────────────────────────────────
ALTER TABLE public.gako_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gako_messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access gako_conversations" ON public.gako_conversations;
DROP POLICY IF EXISTS "Admin access gako_messages"      ON public.gako_messages;

CREATE POLICY "Admin access gako_conversations"
  ON public.gako_conversations USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin access gako_messages"
  ON public.gako_messages USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Done ─────────────────────────────────────────────────────
-- Tables created:
--   gako_conversations  — one row per chat session
--   gako_messages       — all messages in a conversation (user + assistant)
