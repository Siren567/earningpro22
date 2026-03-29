import React, { useState } from 'react';
import { getMockAsset } from '@/lib/mockMarketData';

/**
 * AssetIcon — unified icon component for all watchlist rows.
 * Priority: API logo → mock logo → crypto color circle → resource emoji → initials fallback
 */
export default function AssetIcon({ symbol, logoUrl, size = 'md' }) {
  const [imgError, setImgError] = useState(false);
  const mock = getMockAsset(symbol);

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-xs';

  // 1. API-provided logo
  const resolvedLogo = logoUrl && !imgError ? logoUrl : (mock?.logoUrl && !imgError ? mock.logoUrl : null);

  if (resolvedLogo) {
    return (
      <div className={`${sizeClass} rounded-lg flex-shrink-0 overflow-hidden dark:bg-white/5 bg-gray-100 flex items-center justify-center`}>
        <img
          src={resolvedLogo}
          alt={symbol}
          className="w-full h-full object-contain p-0.5"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // 2. Resource: emoji badge
  if (mock?.emoji) {
    return (
      <div
        className={`${sizeClass} rounded-lg flex-shrink-0 flex items-center justify-center text-base`}
        style={{ background: `${mock.color}22`, border: `1px solid ${mock.color}44` }}
        title={mock.name}
      >
        {mock.emoji}
      </div>
    );
  }

  // 3. Initials fallback (for mock or any other asset)
  const initials = mock?.initials
    || mock?.displaySymbol?.slice(0, 2)
    || symbol.replace('-USD', '').replace('=F', '').slice(0, 2).toUpperCase();

  const bgColor = mock?.color ? `${mock.color}22` : undefined;
  const borderColor = mock?.color ? `${mock.color}44` : undefined;

  return (
    <div
      className={`${sizeClass} rounded-lg flex-shrink-0 flex items-center justify-center font-bold tracking-tight ${
        bgColor ? '' : 'dark:bg-blue-500/20 bg-blue-100 dark:text-cyan-400 text-blue-700'
      }`}
      style={bgColor ? { background: bgColor, border: `1px solid ${borderColor}`, color: mock?.color } : {}}
      title={mock?.name || symbol}
    >
      {initials}
    </div>
  );
}