import React from 'react';
import { Crown } from 'lucide-react';

/**
 * Inline badge for premium-gated features.
 * Usage: <PremiumBadge /> or <PremiumBadge label="Upgrade to unlock" />
 */
export default function PremiumBadge({ label = 'Premium', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 ${className}`}
    >
      <Crown className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}
