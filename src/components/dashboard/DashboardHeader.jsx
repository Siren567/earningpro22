import React, { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../LanguageContext';
import MarketIndexCard from './MarketIndexCard';

const INDICES = [
  { symbol: '^GSPC',     label: 'S&P 500',    color: '#3b82f6' },
  { symbol: '^NDX',      label: 'Nasdaq 100', color: '#8b5cf6' },
  { symbol: '^TA125.TA', label: 'TA-125',     color: '#10b981' },
  {
    symbol: '^VIX',
    label:  'VIX',
    color:  '#f59e0b',
    tooltip: {
      title:       'VIX — Volatility Index',
      description: 'Measures expected market volatility over the next 30 days.',
      lines: [
        'Higher values = more fear, bigger expected swings',
        'Lower values = calmer, more stable conditions',
      ],
    },
  },
];

export default function DashboardHeader() {
  const { user, isGuest } = useAuth();
  const { t, lang, isRTL } = useLanguage();

  const firstName = useMemo(() => {
    if (isGuest) return t('auth_guest_label');
    return (
      user?.user_metadata?.first_name ||
      user?.email?.split('@')[0]?.replace(/[._-]/g, ' ').split(' ')[0] ||
      'Trader'
    );
  }, [user, isGuest, t]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return t('greeting_morning');
    if (h >= 12 && h < 17) return t('greeting_afternoon');
    if (h >= 17 && h < 21) return t('greeting_evening');
    return t('greeting_night');
  }, [t]);

  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'long',
      month:   'long',
      day:     'numeric',
    }),
  [lang]);

  return (
    <div className="space-y-6">
      {/* Greeting row */}
      <div className={`flex items-end justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl sm:text-3xl font-semibold dark:text-white text-gray-900 tracking-tight">
            {greeting},{' '}
            <span className="dark:text-white text-gray-900 font-bold" dir="ltr">{firstName}</span>
          </h1>
          <p className="text-sm dark:text-gray-500 text-gray-400 mt-1.5">
            {dateLabel}
          </p>
        </div>

        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium dark:text-gray-500 text-gray-400 tracking-wide">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          {t('markets_live')}
        </div>
      </div>

      {/* Market overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {INDICES.map(idx => (
          <MarketIndexCard key={idx.symbol} {...idx} />
        ))}
      </div>
    </div>
  );
}
