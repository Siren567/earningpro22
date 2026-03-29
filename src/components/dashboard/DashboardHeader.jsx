import React, { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
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

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

export default function DashboardHeader() {
  const { user } = useAuth();

  const firstName = useMemo(() => {
    return (
      user?.user_metadata?.first_name ||
      user?.email?.split('@')[0]?.replace(/[._-]/g, ' ').split(' ')[0] ||
      'Trader'
    );
  }, [user]);

  const greeting = useMemo(() => getGreeting(), []);

  const dateLabel = useMemo(() =>
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month:   'long',
      day:     'numeric',
    }),
  []);

  return (
    <div className="space-y-6">
      {/* Greeting row */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold dark:text-white text-gray-900 tracking-tight">
            {greeting},{' '}
            <span className="dark:text-white text-gray-900 font-bold">{firstName}</span>
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
          Markets live
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
