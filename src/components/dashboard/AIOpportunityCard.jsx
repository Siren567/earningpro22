import React, { useState } from 'react';
import { Info, ExternalLink, Zap, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GeckoIcon from '../icons/GeckoIcon';
import { useLanguage } from '../LanguageContext';

// ── Shared visual constants ───────────────────────────────────────────────────
// All three Gecko cards share one calm accent palette.
// Soft sky-blue → blue-400 — premium, readable, not neon.
const TOP_BAR_BG  = 'linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)';
const BAR_BG      = 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)';

// ── Gecko Insight popover ─────────────────────────────────────────────────────
function InsightPopover({ reasons }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1 rounded-md dark:text-gray-600 text-gray-400 dark:hover:text-gray-400 hover:text-gray-500 transition-colors duration-150"
        aria-label={t('gecko_insight')}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64">
          <div className="absolute -top-1.5 right-3 w-2.5 h-2.5 rotate-45 dark:bg-[#0f1420] bg-white dark:border-l dark:border-t dark:border-white/10 border-l border-t border-gray-200" />
          <div className="rounded-2xl dark:bg-[#0f1420] bg-white border dark:border-white/10 border-gray-200 shadow-2xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <GeckoIcon className="w-3 h-3 dark:text-gray-500 text-gray-400" />
              <p className="text-[9px] font-bold uppercase tracking-widest dark:text-gray-500 text-gray-400">
                {t('gecko_insight')}
              </p>
            </div>
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full dark:bg-gray-600 bg-gray-300" />
                  <p className="text-[11px] dark:text-gray-400 text-gray-600 leading-relaxed">{r}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
/**
 * Props:
 *   ticker      string   — 'AXON'
 *   company     string   — full company name
 *   geckoScore  number   — 0–100
 *   reason      string   — one short sentence
 *   reasons     string[] — popover detail lines
 *   confidence  string   — 'Very High' | 'High' | 'Moderate'
 *   timeframe   string   — 'Intraday' | 'Swing' | 'Earnings Play'
 */
export default function AIOpportunityCard({
  ticker,
  company,
  geckoScore,
  reason,
  reasons = [],
  confidence,
  timeframe,
}) {
  const navigate  = useNavigate();
  const { t, isRTL } = useLanguage();
  const [hovered, setHovered] = useState(false);

  const confidenceMap = {
    'Very High': t('confidence_very_high'),
    'High':      t('confidence_high'),
    'Moderate':  t('confidence_moderate'),
    'Low':       t('confidence_low'),
  };
  const confText = confidenceMap[confidence] ?? confidence;

  return (
    <div
      className="group relative flex flex-col rounded-2xl bg-white border border-gray-100 p-5 transition-all duration-200 cursor-pointer dark:bg-white/[0.03] dark:border-white/[0.06] hover:dark:border-white/[0.11] hover:border-gray-200"
      onClick={() => navigate(`/StockView?symbol=${ticker}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent line — same soft blue across all three cards */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl transition-opacity duration-200"
        style={{ background: TOP_BAR_BG, opacity: hovered ? 0.7 : 0.35 }}
      />

      {/* Row 1: ticker + timeframe badge + insight icon */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold dark:text-white text-gray-900">
            {ticker}
          </span>
          {/* Timeframe — soft blue tint, consistent accent */}
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg dark:bg-sky-500/[0.08] bg-sky-50 dark:text-sky-400/70 text-sky-600/80">
            {timeframe}
          </span>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <InsightPopover reasons={reasons} />
        </div>
      </div>

      {/* Row 2: company name */}
      <p className="relative text-xs dark:text-gray-500 text-gray-400 mb-4 leading-none">
        {company}
      </p>

      {/* Row 3: Gecko Score */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider dark:text-gray-600 text-gray-400 flex items-center gap-1">
            <GeckoIcon className="w-3 h-3" />
            {t('gecko_score')}
          </span>
          <span className="text-lg font-bold dark:text-white text-gray-900 tabular-nums leading-none">
            {geckoScore}
            <span className="text-[10px] dark:text-gray-600 text-gray-400 font-normal ml-0.5">/100</span>
          </span>
        </div>

        {/* Progress bar — calm sky-blue gradient, no glow */}
        <div className="h-1.5 rounded-full dark:bg-white/[0.06] bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${geckoScore}%`, background: BAR_BG }}
          />
        </div>
      </div>

      {/* Row 4: signal summary */}
      <p className="relative text-xs dark:text-gray-400 text-gray-600 leading-relaxed flex-1 mb-4 line-clamp-2">
        {reason}
      </p>

      {/* Row 5: confidence + view */}
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] dark:text-gray-600 text-gray-400">
          {isRTL ? `${t('confidence_label')} ${confText}` : `${confText} ${t('confidence_label')}`}
        </span>
        <div className="flex items-center gap-1 text-[11px] dark:text-gray-600 text-gray-400 dark:group-hover:text-gray-400 group-hover:text-gray-500 transition-colors">
          {t('view_label')} <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
