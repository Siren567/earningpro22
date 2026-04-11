-- Migration: add Stripe subscription fields to profiles
-- Run this in Supabase SQL editor or as a migration

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id        text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id    text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_period_end   timestamptz;

-- Index for webhook lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Index for subscription id lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_subscription_id_idx
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.profiles.stripe_customer_id        IS 'Stripe Customer ID (cus_...)';
COMMENT ON COLUMN public.profiles.stripe_subscription_id    IS 'Stripe Subscription ID (sub_...)';
COMMENT ON COLUMN public.profiles.stripe_subscription_status IS 'Stripe subscription status: active, past_due, canceled, trialing, etc.';
COMMENT ON COLUMN public.profiles.subscription_period_end   IS 'Current billing period end (from Stripe)';
