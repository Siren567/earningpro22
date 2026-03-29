import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Displays a company/asset logo with automatic CDN fallback chain:
 *   1. logoUrl prop (from API or CoinGecko, if provided)
 *   2. Parqet logo CDN by base symbol (skipped for futures/crypto — they don't resolve)
 *   3. Colored letter avatar (always works)
 *
 * Optional avatar customization (used for resources and crypto):
 *   avatarBg  — hex color string (e.g. '#D4A843') — applied as 20%-opacity bg + solid text
 *   initials  — short label (e.g. 'AU', 'OIL', 'BTC')
 */
export default function StockLogo({ symbol, logoUrl, avatarBg, initials, className = 'w-6 h-6' }) {
  const base = symbol ? symbol.split('.')[0].toUpperCase() : '';
  // Skip Parqet CDN for futures (=F) and crypto (-USD) — they won't have entries
  const skipCdn = !base || base.includes('=') || symbol?.includes('-');
  const cdnUrl = skipCdn ? null : `https://assets.parqet.com/logos/symbol/${base}?format=png`;

  const [phase, setPhase] = useState(() => {
    if (logoUrl) return 'prop';
    if (cdnUrl)  return 'cdn';
    return 'avatar';
  });

  const handleError = () => {
    if (phase === 'prop') setPhase(cdnUrl ? 'cdn' : 'avatar');
    else setPhase('avatar');
  };

  if (phase === 'avatar') {
    const label = initials || base[0] || '?';
    if (avatarBg) {
      return (
        <div
          className={cn('rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0', className)}
          style={{ backgroundColor: avatarBg + '30', color: avatarBg }}
        >
          {label}
        </div>
      );
    }
    return (
      <div className={cn(
        'rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
        'dark:bg-blue-500/20 bg-blue-100 dark:text-cyan-400 text-blue-700',
        className
      )}>
        {label}
      </div>
    );
  }

  const src = phase === 'prop' ? logoUrl : cdnUrl;
  return (
    <img
      src={src}
      alt={symbol}
      className={cn('rounded-xl object-contain flex-shrink-0', className)}
      onError={handleError}
    />
  );
}
