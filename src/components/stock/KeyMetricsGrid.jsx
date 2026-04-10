import React from 'react';
import { Info } from 'lucide-react';
import { detectLeverage } from './LeverageTag.jsx';
import { useLanguage } from '../LanguageContext';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtLarge = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  const n = Number(val);
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
};

const fmtVolume = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  const n = Number(val);
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtPrice = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  const n = Number(val);
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
};

const fmtRange = (lo, hi) => {
  if (lo == null || hi == null) return null;
  const nLo = Number(lo);
  const nHi = Number(hi);
  if (!Number.isFinite(nLo) || !Number.isFinite(nHi)) return null;
  return `$${nLo.toFixed(2)} – $${nHi.toFixed(2)}`;
};

const fmtDecimal = (val, places = 2) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return Number(val).toFixed(places);
};

// Market cap without currency prefix: 1.2T / 450B / 23.5M
const fmtMktCap = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  const n = Number(val);
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString();
};

// val is a decimal fraction (0.312 → "31.20%")
const fmtMarginPct = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return `${(Number(val) * 100).toFixed(2)}%`;
};

// val is already a dividend yield fraction (0.0046 → "0.46%")
const fmtDivYield = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return `${(Number(val) * 100).toFixed(2)}%`;
};


// ── Tooltips (English fallbacks — overridden with translations in component) ──
const TOOLTIPS_EN = {
  'Volume':             'Number of shares traded so far in the current session',
  'Avg Volume':         'Average daily trading volume over the last 30 days',
  'Market Cap':         "Market capitalization is the total value of a company's shares.",
  'P/E Ratio':          'Price-to-Earnings ratio based on the trailing twelve months',
  'EPS (TTM)':          'Earnings per share over the trailing twelve months',
  'Day Range':          "Today's intraday price range: low to high",
  '52W Range':          '52-week lowest and highest closing price',
  'Beta':               'Volatility relative to the S&P 500 — beta > 1 means more volatile',
  'Div Yield':          'Annual dividend as a percentage of the current share price',
  'Open':               "The price at which the stock opened at the start of today's session",
  'Fwd P/E':            "Forward P/E ratio based on next year's estimated earnings",
  'P/B Ratio':          'Price-to-Book ratio — share price relative to book value per share',
  'Rel. Volume':        "Today's volume divided by the 30-day average. >1x = above-average activity",
  'Revenue':            'Total revenue generated over the trailing twelve months',
  'Profit Margin':      'Net income as a percentage of total revenue (trailing twelve months)',
  'Op. Margin':         'Operating income as a percentage of revenue (trailing twelve months)',
  'Quick Ratio':        'Ability to cover short-term liabilities with liquid assets (excl. inventory)',
  'Current Ratio':      'Ability to cover short-term liabilities with current assets',
  'Float':              'Float represents the number of shares available for public trading.',
  'Shares Outstanding': "Shares Outstanding represents the total number of a company's issued shares.",
};

// ── RvolCard ──────────────────────────────────────────────────────────────────

function RvolCard({ volume, avgVolume, t }) {
  const v    = volume    != null ? Number(volume)    : null;
  const a    = avgVolume != null ? Number(avgVolume) : null;
  const rvol = (v != null && a != null && a > 0) ? v / a : null;

  const rvolStatus = (r) => {
    if (r == null)  return null;
    if (r >= 2.0)   return { label: t('rvol_high_interest'), cls: 'dark:text-purple-400 text-purple-600' };
    if (r >= 1.5)   return { label: t('rvol_unusual'),       cls: 'dark:text-amber-400  text-amber-600'  };
    if (r >= 1.0)   return { label: t('rvol_normal'),        cls: 'dark:text-green-400  text-green-600'  };
    return                 { label: t('rvol_low'),           cls: 'dark:text-gray-500   text-gray-400'   };
  };

  const st = rvolStatus(rvol);

  return (
    <div className="rounded-xl border dark:bg-white/[0.025] bg-gray-50 dark:border-white/[0.04] border-gray-100 px-3.5 py-3">
      {/* header row */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider leading-none dark:text-gray-600 text-gray-400">
          {t('metric_rel_volume')}
        </p>
        <div className="relative group flex-shrink-0">
          <Info className="w-2.5 h-2.5 cursor-help transition-colors dark:text-gray-700 text-gray-300 dark:group-hover:text-gray-500 group-hover:text-gray-500" />
          <div className="absolute bottom-full right-0 mb-2 z-50 w-52 px-3 py-2.5 rounded-xl dark:bg-[#141b2d] bg-gray-900 border dark:border-white/[0.08] border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
            <p className="text-[11px] leading-relaxed text-gray-300">{t('tooltip_rvol')}</p>
            <div className="absolute top-full right-[5px] -translate-y-[5px] w-2.5 h-2.5 rotate-45 dark:bg-[#141b2d] bg-gray-900 dark:border-b dark:border-r dark:border-white/[0.08] border-b border-r border-white/10" />
          </div>
        </div>
      </div>

      {rvol == null ? (
        <p className="text-sm font-semibold leading-none dark:text-gray-600 text-gray-400">
          {t('metric_unavailable')}
        </p>
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold leading-none tabular-nums dark:text-gray-200 text-gray-800">
            {rvol.toFixed(1)}x
          </p>
          {st && (
            <span className={`text-[10px] font-medium leading-none ${st.cls}`}>
              {st.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── VolatilityCard ────────────────────────────────────────────────────────────

function VolatilityCard({ dayHigh, dayLow, price, t }) {
  const hi  = dayHigh != null ? Number(dayHigh) : null;
  const lo  = dayLow  != null ? Number(dayLow)  : null;
  const px  = price   != null ? Number(price)   : null;
  const pct = (hi != null && lo != null && px != null && px > 0)
    ? ((hi - lo) / px) * 100
    : null;

  const volatilityStatus = (p) => {
    if (p == null) return null;
    if (p >= 4)    return { label: t('vol_high'),     cls: 'dark:text-red-400   text-red-600'   };
    if (p >= 2)    return { label: t('vol_moderate'), cls: 'dark:text-amber-400 text-amber-600' };
    return                { label: t('vol_low'),      cls: 'dark:text-green-400 text-green-600' };
  };

  const st = volatilityStatus(pct);

  return (
    <div className="rounded-xl border dark:bg-white/[0.025] bg-gray-50 dark:border-white/[0.04] border-gray-100 px-3.5 py-3">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider leading-none dark:text-gray-600 text-gray-400">
          {t('metric_volatility')}
        </p>
        <div className="relative group flex-shrink-0">
          <Info className="w-2.5 h-2.5 cursor-help transition-colors dark:text-gray-700 text-gray-300 dark:group-hover:text-gray-500 group-hover:text-gray-500" />
          <div className="absolute bottom-full right-0 mb-2 z-50 w-52 px-3 py-2.5 rounded-xl dark:bg-[#141b2d] bg-gray-900 border dark:border-white/[0.08] border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
            <p className="text-[11px] leading-relaxed text-gray-300">{t('tooltip_volatility')}</p>
            <div className="absolute top-full right-[5px] -translate-y-[5px] w-2.5 h-2.5 rotate-45 dark:bg-[#141b2d] bg-gray-900 dark:border-b dark:border-r dark:border-white/[0.08] border-b border-r border-white/10" />
          </div>
        </div>
      </div>

      {pct == null ? (
        <p className="text-sm font-semibold leading-none dark:text-gray-600 text-gray-400">
          {t('metric_unavailable')}
        </p>
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold leading-none tabular-nums dark:text-gray-200 text-gray-800">
            {pct.toFixed(1)}%
          </p>
          {st && (
            <span className={`text-[10px] font-medium leading-none ${st.cls}`}>
              {st.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, tooltip, valueColor, soon }) {
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${
      soon
        ? 'dark:bg-white/[0.01] bg-gray-50/50 dark:border-white/[0.025] border-gray-100/80'
        : 'dark:bg-white/[0.025] bg-gray-50 dark:border-white/[0.04] border-gray-100'
    }`}>
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <p className={`text-[10px] font-medium uppercase tracking-wider leading-none ${
          soon ? 'dark:text-gray-700 text-gray-300' : 'dark:text-gray-600 text-gray-400'
        }`}>
          {label}
        </p>
        {tooltip && (
          <div className="relative group flex-shrink-0">
            <Info className={`w-2.5 h-2.5 cursor-help transition-colors dark:group-hover:text-gray-500 group-hover:text-gray-500 ${
              soon ? 'dark:text-gray-800 text-gray-200' : 'dark:text-gray-700 text-gray-300'
            }`} />
            <div className="absolute bottom-full right-0 mb-2 z-50 w-52 px-3 py-2.5 rounded-xl dark:bg-[#141b2d] bg-gray-900 border dark:border-white/[0.08] border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <p className="text-[11px] leading-relaxed text-gray-300">{tooltip}</p>
              <div className="absolute top-full right-[5px] -translate-y-[5px] w-2.5 h-2.5 rotate-45 dark:bg-[#141b2d] bg-gray-900 dark:border-b dark:border-r dark:border-white/[0.08] border-b border-r border-white/10" />
            </div>
          </div>
        )}
      </div>
      <p className={`text-sm font-semibold leading-none tabular-nums ${
        soon
          ? 'dark:text-gray-700 text-gray-300'
          : valueColor === 'green'
            ? 'dark:text-green-400 text-green-600'
            : valueColor === 'red'
              ? 'dark:text-red-400 text-red-600'
              : 'dark:text-gray-200 text-gray-800'
      }`}>
        {soon ? 'N/A' : value}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KeyMetricsGrid({ keyMetrics, finalStock, quote, fundamentals }) {
  const { t } = useLanguage();
  const leverageInfo = detectLeverage(finalStock?.companyName || '', finalStock);

  // Build translated tooltip map
  const TOOLTIPS = {
    'Volume':             t('tooltip_volume'),
    'Avg Volume':         t('tooltip_avg_volume'),
    'Market Cap':         t('tooltip_market_cap'),
    'P/E Ratio':          t('tooltip_pe'),
    'EPS (TTM)':          t('tooltip_eps'),
    'Day Range':          t('tooltip_day_range'),
    '52W Range':          t('tooltip_52w'),
    'Beta':               t('tooltip_beta'),
    'Div Yield':          t('tooltip_div_yield'),
    'Open':               t('tooltip_open'),
    'Fwd P/E':            t('tooltip_fwd_pe'),
    'P/B Ratio':          t('tooltip_pb'),
    'Rel. Volume':        t('tooltip_rvol'),
    'Revenue':            t('tooltip_revenue'),
    'Profit Margin':      t('tooltip_profit_margin'),
    'Op. Margin':         t('tooltip_op_margin'),
    'Quick Ratio':        t('tooltip_quick_ratio'),
    'Current Ratio':      t('tooltip_current_ratio'),
    'Float':              t('tooltip_float'),
    'Shares Outstanding': t('tooltip_shares_outstanding'),
  };

  // Label translation map (key = English label, value = translated)
  const LABEL = {
    'Volume':             t('metric_volume'),
    'Avg Volume':         t('metric_avg_volume'),
    'Market Cap':         t('metric_market_cap'),
    'Float':              t('metric_float'),
    'Shares Outstanding': t('metric_shares_outstanding'),
    'P/E Ratio':          t('metric_pe_ratio'),
    'EPS (TTM)':          t('metric_eps'),
    'Day Range':          t('metric_day_range'),
    '52W Range':          t('metric_52w_range'),
    'Beta':               t('metric_beta'),
    'Div Yield':          t('metric_div_yield'),
    'Open':               t('metric_open'),
    'Fwd P/E':            t('metric_fwd_pe'),
    'P/B Ratio':          t('metric_pb_ratio'),
    'Revenue':            t('metric_revenue'),
    'Profit Margin':      t('metric_profit_margin'),
    'Op. Margin':         t('metric_op_margin'),
    'Quick Ratio':        t('metric_quick_ratio'),
    'Current Ratio':      t('metric_current_ratio'),
  };

  // ── Leveraged ETF: compact 4-card layout ─────────────────────────────────
  if (leverageInfo.isLeveraged) {
    const etfMetrics = [
      leverageInfo.underlying && { label: 'Underlying', value: leverageInfo.underlying },
      leverageInfo.leverage   && { label: 'Leverage',   value: leverageInfo.leverage   },
      leverageInfo.direction  && {
        label: 'Direction',
        value: leverageInfo.direction === 'Bull' ? 'Long (Bull)' : 'Short (Bear)',
      },
      { label: 'Type', value: 'Leveraged ETF' },
    ].filter(Boolean);

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {etfMetrics.map(({ label, value }) => (
          <MetricCard key={label} label={label} value={value} tooltip={TOOLTIPS[label]} />
        ))}
      </div>
    );
  }

  // ── Resolve all raw values from every available source ────────────────────
  // quote      → live intraday data (volume, low, high, previousClose)
  // finalStock → v8/chart snapshot (open, 52w, exchange meta)
  // fundamentals → Yahoo v10/quoteSummary (marketCap, PE, EPS, margins, ratios)
  // keyMetrics → FMP fallback (peRatio, eps, marketCap)

  const volume         = quote?.volume              ?? finalStock?.volume               ?? null;
  // fundamentals?.avgVolume comes from Yahoo v10/quoteSummary which returns 401 browser-side.
  // Fallback: avgVolume is now computed from 60d candles and lives on finalStock.
  const avgVolume      = fundamentals?.avgVolume ?? finalStock?.avgVolume                ?? null;
  const dayLow         = quote?.low                 ?? finalStock?.dayLow               ?? null;
  const dayHigh        = quote?.high                ?? finalStock?.dayHigh              ?? null;
  const low52          = finalStock?.fiftyTwoWeekLow  ?? finalStock?.low52Week          ?? null;
  const high52         = finalStock?.fiftyTwoWeekHigh ?? finalStock?.high52Week         ?? null;
  const marketCap      = fundamentals?.marketCap    ?? keyMetrics?.marketCap            ?? null;
  const peRatio        = fundamentals?.peRatio      ?? keyMetrics?.peRatio              ?? null;
  const forwardPE      = fundamentals?.forwardPE                                         ?? null;
  const eps            = fundamentals?.eps          ?? keyMetrics?.eps                  ?? null;
  const beta           = fundamentals?.beta                                              ?? null;
  const pbRatio        = fundamentals?.priceToBook                                      ?? null;
  const divYield       = fundamentals?.dividendYield                                    ?? null;
  const open           = finalStock?.open                                                ?? null;
  const totalRevenue   = fundamentals?.totalRevenue                                     ?? null;
  const profitMargin   = fundamentals?.profitMargin                                     ?? null;
  const operatingMargin = fundamentals?.operatingMargin                                 ?? null;
  const quickRatio     = fundamentals?.quickRatio                                       ?? null;
  const currentRatio   = fundamentals?.currentRatio                                     ?? null;
  const floatShares        = fundamentals?.floatShares       ?? keyMetrics?.floatShares       ?? null;
  const sharesOutstanding  = fundamentals?.sharesOutstanding ?? keyMetrics?.sharesOutstanding ?? null;
  const price              = quote?.price           ?? finalStock?.price               ?? null;

  // Diagnostic — confirm resolved values for FMP-sourced fields
  console.log('[KeyMetricsGrid] keyMetrics:', keyMetrics);
  console.log('[KeyMetricsGrid] resolved → marketCap:', marketCap, '| sharesOutstanding:', sharesOutstanding, '| floatShares:', floatShares);

  // ── Ordered candidate pool ────────────────────────────────────────────────
  // Priority: user-specified order (top = highest priority).
  // Excluded intentionally — already shown in the header:
  //   • Previous Close (shown directly below the price)
  //   • % Change      (shown next to the live price)
  //
  // Each entry evaluates its formatter; null formatters mean no data → skipped.
  // The first 8 non-null entries become the 8 cards.
  // Remaining slots (if any) get a placeholder card.

  const candidates = [
    // ── Tier 1: primary metrics (user priority list) ─────────────────────
    fmtVolume(volume)              && { label: LABEL['Volume'],             value: fmtVolume(volume),              tooltip: TOOLTIPS['Volume']             },
    // Relative Volume — always include when volume is present; avgVolume comes from finalStock (60d candle avg)
    (volume != null) && { label: LABEL['Volume'], type: 'rvol', volume, avgVolume, _key: 'rvol' },
    { label: LABEL['Market Cap'],         value: fmtMktCap(marketCap)       ?? t('metric_unavailable'), tooltip: TOOLTIPS['Market Cap']         },
    { label: LABEL['Float'],              value: fmtVolume(floatShares)      ?? t('metric_unavailable'), tooltip: TOOLTIPS['Float']              },
    { label: LABEL['Shares Outstanding'], value: fmtVolume(sharesOutstanding)  ?? t('metric_unavailable'), tooltip: TOOLTIPS['Shares Outstanding'] },
    (dayHigh != null || dayLow != null || price != null) && { label: LABEL['Volume'], type: 'volatility', dayHigh, dayLow, price, _key: 'volatility' },
    fmtDecimal(peRatio)            && { label: LABEL['P/E Ratio'],    value: fmtDecimal(peRatio),            tooltip: TOOLTIPS['P/E Ratio']     },
    fmtPrice(eps)                  && { label: LABEL['EPS (TTM)'],    value: fmtPrice(eps),                  tooltip: TOOLTIPS['EPS (TTM)']     },
    fmtRange(dayLow, dayHigh)      && { label: LABEL['Day Range'],    value: fmtRange(dayLow, dayHigh),      tooltip: TOOLTIPS['Day Range']     },
    fmtRange(low52, high52)        && { label: LABEL['52W Range'],    value: fmtRange(low52, high52),        tooltip: TOOLTIPS['52W Range']     },
    fmtDecimal(beta)               && { label: LABEL['Beta'],         value: fmtDecimal(beta),               tooltip: TOOLTIPS['Beta']          },
    fmtDivYield(divYield)          && { label: LABEL['Div Yield'],    value: fmtDivYield(divYield),          tooltip: TOOLTIPS['Div Yield']     },
    fmtPrice(open)                 && { label: LABEL['Open'],         value: fmtPrice(open),                 tooltip: TOOLTIPS['Open']          },
    // ── Tier 2: extended fallbacks ────────────────────────────────────────
    fmtDecimal(forwardPE)          && { label: LABEL['Fwd P/E'],      value: fmtDecimal(forwardPE),          tooltip: TOOLTIPS['Fwd P/E']       },
    fmtDecimal(pbRatio)            && { label: LABEL['P/B Ratio'],    value: fmtDecimal(pbRatio),            tooltip: TOOLTIPS['P/B Ratio']     },
    fmtLarge(totalRevenue)         && { label: LABEL['Revenue'],      value: fmtLarge(totalRevenue),         tooltip: TOOLTIPS['Revenue']       },
    fmtMarginPct(profitMargin)     && { label: LABEL['Profit Margin'],value: fmtMarginPct(profitMargin),     tooltip: TOOLTIPS['Profit Margin'] },
    fmtMarginPct(operatingMargin)  && { label: LABEL['Op. Margin'],   value: fmtMarginPct(operatingMargin),  tooltip: TOOLTIPS['Op. Margin']    },
    fmtDecimal(quickRatio)         && { label: LABEL['Quick Ratio'],  value: fmtDecimal(quickRatio),         tooltip: TOOLTIPS['Quick Ratio']   },
    fmtDecimal(currentRatio)       && { label: LABEL['Current Ratio'],value: fmtDecimal(currentRatio),       tooltip: TOOLTIPS['Current Ratio'] },
  ].filter(Boolean); // drop falsy entries (metrics with no data)

  // Take first 8 real cards; pad any remainder with placeholder cards
  const slots = [
    ...candidates.slice(0, 8),
    ...Array.from({ length: Math.max(0, 8 - candidates.length) }, (_, i) => ({
      label:   '—',
      value:   null,
      tooltip: t('metric_unavailable'),
      soon:    true,
      _key:    `soon-${i}`,
    })),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {slots.map((card) =>
        card.type === 'rvol' ? (
          <RvolCard key="rvol" volume={card.volume} avgVolume={card.avgVolume} t={t} />
        ) : card.type === 'volatility' ? (
          <VolatilityCard key="volatility" dayHigh={card.dayHigh} dayLow={card.dayLow} price={card.price} t={t} />
        ) : (
          <MetricCard
            key={card._key ?? card.label}
            label={card.label}
            value={card.value}
            tooltip={card.tooltip}
            valueColor={card.valueColor}
            soon={card.soon}
          />
        )
      )}
    </div>
  );
}
