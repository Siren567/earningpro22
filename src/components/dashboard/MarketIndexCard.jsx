import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { getIndexData } from '@/api/yahooFinanceApi';
import MiniSparkline from './MiniSparkline';

// ── Info tooltip ──────────────────────────────────────────────────────────────
// Used only on cards that pass a `tooltip` prop (e.g. VIX).
// Supports mouse hover on desktop and tap-to-toggle on mobile.
function InfoTooltip({ tooltip }) {
  const [open, setOpen]   = useState(false);
  const buttonRef         = useRef(null);
  const tooltipRef        = useRef(null);

  // Close on outside click (mobile tap-away)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        buttonRef.current  && !buttonRef.current.contains(e.target) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center justify-center w-4 h-4 rounded dark:text-gray-600 text-gray-400 dark:hover:text-gray-400 hover:text-gray-500 transition-colors duration-150"
        aria-label="What is VIX?"
      >
        <Info className="w-3 h-3" />
      </button>

      {/* Tooltip panel */}
      <div
        ref={tooltipRef}
        className={`
          absolute left-0 top-full mt-2 z-50 w-56
          transition-all duration-150 origin-top-left
          ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
        `}
      >
        {/* Caret */}
        <div className="absolute -top-1 left-2 w-2 h-2 rotate-45 dark:bg-[#0f1420] bg-white dark:border-l dark:border-t dark:border-white/10 border-l border-t border-gray-200" />

        <div className="rounded-xl dark:bg-[#0f1420] bg-white border dark:border-white/10 border-gray-200 shadow-xl p-3.5">
          <p className="text-xs font-bold dark:text-white text-gray-900 mb-2">
            {tooltip.title}
          </p>
          <p className="text-[11px] dark:text-gray-400 text-gray-600 leading-relaxed">
            {tooltip.description}
          </p>
          {tooltip.lines && (
            <ul className="mt-2 space-y-1">
              {tooltip.lines.map((line, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 w-1 h-1 rounded-full dark:bg-gray-600 bg-gray-300 flex-shrink-0" />
                  <span className="text-[11px] dark:text-gray-400 text-gray-600 leading-snug">{line}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 p-4 animate-pulse">
      <div className="h-3 w-16 dark:bg-white/10 bg-gray-200 rounded mb-3" />
      <div className="h-6 w-24 dark:bg-white/10 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-12 dark:bg-white/10 bg-gray-200 rounded" />
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
/**
 * Props:
 *   symbol   string              — Yahoo symbol (e.g. '^VIX')
 *   label    string              — Display label
 *   color    string              — Accent / sparkline color
 *   tooltip  { title, description, lines? } | undefined
 *                                — If provided, shows an info icon with a tooltip
 */
export default function MarketIndexCard({ symbol, label, color = '#3b82f6', tooltip }) {
  const { data, isLoading } = useQuery({
    queryKey: ['indexData', symbol],
    queryFn:  () => getIndexData(symbol),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  if (isLoading) return <Skeleton />;

  const price      = data?.price;
  const change     = data?.change;
  const changePct  = data?.changePercent;
  const sparkline  = data?.sparkline ?? [];
  const isPositive = (changePct ?? 0) >= 0;
  const isFlat     = change === 0 || change == null;

  const trendColor = isFlat ? '#6b7280' : isPositive ? '#10b981' : '#f87171';
  const TrendIcon  = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown;

  const fmtPrice = (v) => {
    if (v == null) return '—';
    return v >= 1000
      ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : v.toFixed(2);
  };

  return (
    <div className="group rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 p-4 hover:dark:bg-white/[0.05] hover:bg-gray-50 transition-all duration-200 overflow-visible">

      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        {/* Label + optional info icon */}
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider dark:text-gray-500 text-gray-500">
            {label}
          </p>
          {tooltip && <InfoTooltip tooltip={tooltip} />}
        </div>

        {/* % change badge */}
        <div
          className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ color: trendColor, backgroundColor: `${trendColor}18` }}
        >
          <TrendIcon className="w-3 h-3" />
          {changePct != null ? `${isPositive && !isFlat ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
        </div>
      </div>

      {/* Price */}
      <p className="text-xl font-bold dark:text-white text-gray-900 leading-none mb-1">
        {price != null ? fmtPrice(price) : '—'}
      </p>

      {/* Absolute change */}
      <p className="text-[11px] dark:text-gray-600 text-gray-400 mb-2">
        {change != null
          ? `${isPositive && !isFlat ? '+' : ''}${change.toFixed(2)}`
          : 'No data'}
      </p>

      {/* Sparkline */}
      {sparkline.length >= 2 && (
        <div className="h-9 -mx-1">
          <MiniSparkline data={sparkline} color={trendColor} height={36} filled />
        </div>
      )}
    </div>
  );
}
