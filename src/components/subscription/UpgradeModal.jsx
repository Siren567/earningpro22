import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Crown, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { useStripeActions } from '@/hooks/useStripeActions';

const PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_PRICE_ID ?? '';

const REASONS = {
  watchlist_limit: {
    title:   'Watchlist limit reached',
    detail:  'Free plan allows up to 5 tracked stocks.',
    bullets: [
      'Unlimited watchlist stocks',
      'Unlimited custom lists',
      'Real-time tracking across portfolios',
    ],
  },
  watchlist_creation_limit: {
    title:   'Custom lists are a Premium feature',
    detail:  'Free plan includes 1 watchlist (Favorites). Upgrade to create unlimited custom lists.',
    bullets: [
      'Unlimited custom watchlists',
      'Unlimited stocks per list',
      'Organize by strategy, sector, or theme',
    ],
  },
  alerts_limit: {
    title:   'Alert limit reached',
    detail:  'Free plan allows up to 3 earnings alerts.',
    bullets: [
      'Unlimited earnings alerts',
      'All notification channels',
      'Priority alert delivery',
    ],
  },
  ai_limit: {
    title:   'Daily AI analysis limit reached',
    detail:  'Free plan includes 3 AI analyses per day. Resets at midnight UTC.',
    bullets: [
      'Unlimited Wyckoff AI analyses',
      'Advanced market insights',
      'Premium AI scores',
    ],
  },
  wyckoff_access: {
    title:   'Wyckoff Analysis is a Premium feature',
    detail:  'Upgrade to unlock AI-powered Wyckoff phase detection with annotated charts.',
    bullets: [
      'Wyckoff phase detection (Accumulation, Markup, Distribution…)',
      'Annotated price chart with AI overlays',
      'Unlimited daily analyses',
    ],
  },
  earnings_limit: {
    title:   'Full Earnings Calendar is a Premium feature',
    detail:  'Free plan shows the next 7 days only. Upgrade for full calendar access.',
    bullets: [
      'Full earnings calendar — weeks ahead',
      'AI earnings insights for every stock',
      'Unlimited earnings alerts',
    ],
  },
  premium_feature: {
    title:   'Premium feature',
    detail:  'This feature is available on the Premium plan.',
    bullets: [
      'Unlimited AI analyses',
      'Full Gecko Picks access',
      'Advanced market intelligence',
    ],
  },
};

export default function UpgradeModal({ open, onClose, reason = 'premium_feature' }) {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { startCheckout, loading: stripeLoading, error: stripeError } = useStripeActions();

  if (!open) return null;

  const content = REASONS[reason] ?? REASONS.premium_feature;

  const handleUpgrade = async () => {
    if (!user || isGuest) {
      onClose();
      navigate('/Auth');
      return;
    }
    if (!PRO_PRICE_ID) {
      // Fallback: go to plans page if env var missing
      onClose();
      navigate('/Plans');
      return;
    }
    await startCheckout(PRO_PRICE_ID);
    // on success, browser navigates to Stripe — no need to close modal
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl dark:bg-[#0f1420] bg-white border dark:border-white/10 border-gray-200 shadow-2xl p-6">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg dark:text-gray-500 text-gray-400 dark:hover:bg-white/5 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + heading */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold dark:text-white text-gray-900">
              {content.title}
            </h2>
            <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5 leading-snug">
              {content.detail}
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="mb-5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest dark:text-gray-500 text-gray-400 mb-2">
            Premium includes
          </p>
          {content.bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-xs dark:text-gray-300 text-gray-700">{b}</span>
            </div>
          ))}
        </div>

        {/* Stripe error */}
        {stripeError && (
          <p className="text-xs text-red-400 mb-3 text-center">{stripeError}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={stripeLoading}
          className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          {stripeLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            : 'Upgrade to Premium'}
        </button>

        <p className="text-[11px] dark:text-gray-600 text-gray-400 text-center mt-3">
          Cancel anytime · Instant access
        </p>
      </div>
    </div>
  );
}
