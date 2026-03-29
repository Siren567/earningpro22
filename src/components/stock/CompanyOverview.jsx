/**
 * CompanyOverview
 *
 * Always renders the section — shows a skeleton while fundamentals are loading,
 * then the actual content once data arrives.
 *
 * Data comes from Yahoo Finance v10/quoteSummary:
 *   assetProfile  → description, sector, industry, country  (equities)
 *   fundProfile   → fundCategory, fundFamily                (ETFs / funds)
 *
 * If none of those fields are available the section still renders its header
 * so the page layout is always consistent.
 */

import React, { useState } from 'react';

// Maximum characters before the "Show more" toggle appears
const DESC_LIMIT = 300;

export default function CompanyOverview({ fundamentals, isLoading }) {
  const [expanded, setExpanded] = useState(false);

  const {
    description,
    sector,
    industry,
    country,
    fundCategory,
    fundFamily,
  } = fundamentals ?? {};

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-4 md:p-8 border-t dark:border-white/5 border-gray-200 bg-gradient-to-br dark:from-white/[0.01] dark:to-transparent from-gray-50/30 to-white">
        <h3 className="text-sm font-semibold dark:text-white text-gray-900 uppercase tracking-wider mb-3">
          Company Overview
        </h3>
        {/* Description skeleton */}
        <div className="mb-4 space-y-2">
          <div className="h-3 rounded dark:bg-white/5 bg-gray-200 animate-pulse w-full" />
          <div className="h-3 rounded dark:bg-white/5 bg-gray-200 animate-pulse w-5/6" />
          <div className="h-3 rounded dark:bg-white/5 bg-gray-200 animate-pulse w-3/4" />
        </div>
        {/* Tag skeleton */}
        <div className="flex gap-2">
          <div className="h-6 w-28 rounded-lg dark:bg-white/5 bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 rounded-lg dark:bg-white/5 bg-gray-200 animate-pulse" />
          <div className="h-6 w-24 rounded-lg dark:bg-white/5 bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Compose description text ──────────────────────────────────────────────
  // For stocks: use longBusinessSummary from assetProfile.
  // For ETFs/funds: compose a short line from fundProfile when description absent.
  let descText = description || null;
  if (!descText && (fundCategory || fundFamily)) {
    const parts = [];
    if (fundFamily)   parts.push(`managed by ${fundFamily}`);
    if (fundCategory) parts.push(`category: ${fundCategory}`);
    descText = parts.length ? parts.join(' · ') : null;
  }

  // ── Tag list — sector / industry / country / fund category ────────────────
  const tags = [
    sector       && { label: 'Sector',    value: sector },
    industry     && { label: 'Industry',  value: industry },
    country      && { label: 'Country',   value: country },
    fundCategory && !sector && { label: 'Category', value: fundCategory },
    fundFamily   && !sector && { label: 'Family',   value: fundFamily   },
  ].filter(Boolean);

  // Hide the whole section only if absolutely nothing to show
  if (!descText && tags.length === 0) return null;

  // ── Description display with Show more / less ─────────────────────────────
  const isTruncatable = descText && descText.length > DESC_LIMIT;
  const displayText = !expanded && isTruncatable
    ? descText.slice(0, DESC_LIMIT).trimEnd() + '…'
    : descText;

  return (
    <div className="p-4 md:p-8 border-t dark:border-white/5 border-gray-200 bg-gradient-to-br dark:from-white/[0.01] dark:to-transparent from-gray-50/30 to-white">
      {/* Section title */}
      <h3 className="text-sm font-semibold dark:text-white text-gray-900 uppercase tracking-wider mb-3">
        Company Overview
      </h3>

      {/* Description */}
      {displayText && (
        <div className="mb-4">
          <p className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed">
            {displayText}
          </p>
          {isTruncatable && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-1 text-xs text-[#4CBFF5] hover:text-blue-400 transition-colors font-medium"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Sector / Industry / Country / Fund tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(({ label, value }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg
                dark:bg-white/[0.04] bg-gray-100
                dark:border dark:border-white/[0.06] border border-gray-200"
            >
              <span className="dark:text-gray-500 text-gray-400 font-medium">{label}</span>
              <span className="dark:text-gray-300 text-gray-700 font-semibold">{value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
