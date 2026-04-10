-- ── Plans table ──────────────────────────────────────────────────────────────
-- Stores all subscription plan definitions.
-- Admin can toggle is_active to show/hide plans on the public store.
-- Existing subscribers keep access regardless of is_active.

CREATE TABLE IF NOT EXISTS public.plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT        UNIQUE NOT NULL,         -- matches profiles.subscription_plan value
  name          TEXT        NOT NULL,
  price_monthly INTEGER     NOT NULL DEFAULT 0,
  price_yearly  INTEGER     NOT NULL DEFAULT 0,
  description   TEXT        NOT NULL DEFAULT '',
  features_en   TEXT[]      NOT NULL DEFAULT '{}',
  features_he   TEXT[]      NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  popular       BOOLEAN     NOT NULL DEFAULT false,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can read plans
CREATE POLICY "plans_public_read"
  ON public.plans FOR SELECT
  USING (true);

-- Only admins can modify plans
CREATE POLICY "plans_admin_write"
  ON public.plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO public.plans
  (key, name, price_monthly, price_yearly, description, features_en, features_he, is_active, popular, display_order)
VALUES
  (
    'free', 'Free', 0, 0,
    'Basic access to earnings calendar and watchlist.',
    ARRAY[
      'Up to 5 watchlist stocks',
      'Up to 3 alerts',
      'Basic AI scores',
      'Daily updates',
      'Community access',
      'Limited Earnings Calendar (next 7 days only)'
    ],
    ARRAY[
      'עד 5 מניות ברשימת מעקב',
      'עד 3 התראות',
      'ציוני AI בסיסיים',
      'עדכונים יומיים',
      'גישה לקהילה',
      'לוח דוחות מוגבל (7 ימים קדימה בלבד)'
    ],
    true, false, 0
  ),
  (
    'basic', 'Basic', 9, 90,
    'Stock alerts, RVOL metrics, and basic analytics.',
    ARRAY[
      'Up to 20 watchlist stocks',
      'Up to 20 alerts',
      'RVOL metrics',
      'Stock alerts',
      'Basic analytics'
    ],
    ARRAY[
      'עד 20 מניות ברשימת מעקב',
      'עד 20 התראות',
      'מדדי RVOL',
      'התראות מניות',
      'אנליטיקה בסיסית'
    ],
    false, false, 1
  ),
  (
    'pro', 'Premium', 29, 290,
    'Full analytics, FMP fundamentals, and priority support.',
    ARRAY[
      'Unlimited watchlists',
      'Unlimited alerts',
      'Premium AI scores',
      'Full Earnings Calendar access',
      'Advanced charts',
      'All notification channels',
      'Priority support'
    ],
    ARRAY[
      'רשימות מעקב ללא הגבלה',
      'התראות ללא הגבלה',
      'ציוני AI פרימיום',
      'גישה מלאה ללוח דוחות',
      'גרפים מתקדמים',
      'כל ערוצי ההתראה',
      'תמיכה מועדפת'
    ],
    true, true, 2
  ),
  (
    'enterprise', 'Enterprise', 99, 990,
    'Custom limits, admin tools, and dedicated support.',
    ARRAY[
      'Everything in Premium',
      'Custom limits',
      'Admin tools',
      'Dedicated support',
      'API access'
    ],
    ARRAY[
      'הכל מ-Premium',
      'מגבלות מותאמות אישית',
      'כלי ניהול',
      'תמיכה ייעודית',
      'גישה ל-API'
    ],
    false, false, 3
  )
ON CONFLICT (key) DO UPDATE SET
  name          = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly  = EXCLUDED.price_yearly,
  description   = EXCLUDED.description,
  features_en   = EXCLUDED.features_en,
  features_he   = EXCLUDED.features_he,
  popular       = EXCLUDED.popular,
  display_order = EXCLUDED.display_order,
  updated_at    = now();
-- NOTE: is_active is intentionally NOT overwritten on conflict,
-- so admin toggles survive re-runs of this migration.
