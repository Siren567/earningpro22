import React from 'react';

/**
 * App logo image — transparent SVG, works on both light and dark backgrounds.
 * @param {string} size - Tailwind size class, e.g. "w-8 h-8" (default)
 * @param {string} className - extra classes
 */
export default function AppLogo({ size = 'w-8 h-8', className = '' }) {
  return (
    <img
      src="/logo.svg"
      alt="StockPulse AI"
      className={`${size} ${className}`}
      draggable={false}
    />
  );
}
