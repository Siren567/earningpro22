import React from 'react';
import { Info } from 'lucide-react';
import { detectLeverage } from './LeverageTag.jsx';

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

const fmtPE = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return Number(val).toFixed(2);
};

const fmtChangePct = (val) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  const n = Number(val);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

const fmtRvol = (volume, avgVolume) => {
  if (volume == null || avgVolume == null) return null;
  const v = Number(volume);
  const a = Number(avgVolume);
  if (!Number.isFinite(v) || !Number.isFinite(a) || a === 0) return null;
  return `${(v / a).toFixed(2)}x`;
};

const fmtPct = (val, decimals = 2) => {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return `${(Number(val) * 100).toFixed(decimals)}%`;
};

// ── Tooltips ──────────────────────────────────────────────────────────────────

const TOOLTIPS = {
  'Volume':      'Shares traded so far in the current session',
  'Avg Volume':  'Average daily trading volume over the last 30 days',
  'Day Range':   'Intraday low and high price for today\'s session',
  '52W Range':   '52-week lowest and highest closing price',
  '% Change':    'Price change as a percentage from the previous close',
  'Market Cap':  'Total market value of all outstanding shares',
  'P/E Ratio':   'Price-to-Earnings ratio (trailing twelve months)',
  'Fwd P/E':     "Forward P/E based on next year's estimated earnings",
  'EPS (TTM)':   'Earnings per share over the trailing twelve months',
  'Beta':        'Volatility relative to the S&P 500. Beta > 1 = more volatile',
  'Rel. Volume': 'Today\'s volume vs. the 30-day average. >1x = above-average activity',
  'P/B Ratio':   'Price-to-Book ratio — market value relative to book value',
  'Div Yield':   'Annual dividend as a percentage of the current share price',
};

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, tooltip, valueColor }) {
  return (
    <div className="rounded-xl dark:bg-white/[0.025] bg-gray-50 border dark:border-white/[0.04] border-gray-100 px-3.5 py-3">
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider dark:text-gray-600 text-gray-400 leading-none">
          {label}
        </p>
        {tooltip && (
          <div className="relative group flex-shrink-0">
            <Info className="w-2.5 h-2.5 dark:text-gray-700 text-gray-300 dark:group-hover:text-gray-500 group-hover:text-gray-500 cursor-help transition-colors" />
            <div className="absolute bottom-full right-0 mb-2 z-50 w-52 px-3 py-2.5 rounded-xl dark:bg-[#141b2d] bg-gray-900 border dark:border-white/[0.08] border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <p className="text-[11px] leading-relaxed text-gray-300">{tooltip}</p>
              <div className="absolute top-full right-[5px] -translate-y-[5px] w-2.5 h-2.5 rotate-45 dark:bg-[#141b2d] bg-gray-900 dark:border-b dark:border-r dark:border-white/[0.08] border-b border-r border-white/10" />
            </div>
          </div>
        )}
      </div>
      <p className={`text-sm font-semibold leading-none tabular-nums ${
        valueColor === 'green'
          ? 'dark:text-green-400 text-green-600'
          : valueColor === 'red'
            ? 'dark:text-red-400 text-red-600'
            : 'dark:text-gray-200 text-gray-800'
      }`}>
        {value}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KeyMetricsGrid({ keyMetrics, finalStock, quote, fundamentals }) {
  const leverageInfo = detectLeverage(finalStock?.companyName || '', finalStock);

  // ── Leveraged ETF: compact 4-card layout ──────────────────────────────────
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
          <MetricCard key={label} label={label} value={value} />
        ))}
      </div>
    );
  }

  // ── Resolve all raw values from every available source ────────────────────
  const volume    = quote?.volume         ?? finalStock?.volume                  ?? null;
  const avgVolume = fundamentals?.avgVolume                                       ?? null;
  const dayLow    = quote?.low            ?? finalStock?.dayLow                  ?? null;
  const dayHigh   = quote?.high           ?? finalStock?.dayHigh                 ?? null;
  const low52     = finalStock?.fiftyTwoWeekLow  ?? finalStock?.low52Week        ?? null;
  const high52    = finalStock?.fiftyTwoWeekHigh ?? finalStock?.high52Week       ?? null;
  const changePct = quote?.percentChange  ?? quote?.changePercent
                 ?? finalStock?.changePercent                                     ?? null;
  // Market cap: keyMetrics is always defined (even on API failure), use as fallback
  const marketCap = fundamentals?.marketCap ?? keyMetrics?.marketCap             ?? null;

  // Valuation cascade — keyMetrics fills gaps when fundamentals haven't loaded
  const peRatio   = fundamentals?.peRatio   ?? keyMetrics?.peRatio               ?? null;
  const forwardPE = fundamentals?.forwardPE                                       ?? null;
  const eps       = fundamentals?.eps       ?? keyMetrics?.eps                   ?? null;
  const beta      = fundamentals?.beta                                            ?? null;
  const pbRatio   = fundamentals?.priceToBook                                    ?? null;
  const divYield  = fundamentals?.dividendYield                                  ?? null;

  // ── Derived colours ───────────────────────────────────────────────────────
  const pctNum    = changePct != null ? Number(changePct) : null;
  const pctColor  = pctNum == null ? undefined : pctNum >= 0 ? 'green' : 'red';

  const rvolRaw   = (volume != null && avgVolume != null && Number(avgVolume) > 0)
    ? Number(volume) / Number(avgVolume) : null;
  const rvolColor = rvolRaw != null && rvolRaw >= 1.5 ? 'green' : undefined;

  // ── Build the 8 primary slots ─────────────────────────────────────────────
  // Each slot resolves to { label, value, tooltip, valueColor } or null.
  // Null slots are replaced by the reserve pool below.

  const valuation = (() => {
    if (peRatio   != null && Number.isFinite(Number(peRatio)))   return { label: 'P/E Ratio', value: fmtPE(peRatio),           tooltip: TOOLTIPS['P/E Ratio'] };
    if (forwardPE != null && Number.isFinite(Number(forwardPE))) return { label: 'Fwd P/E',   value: fmtPE(forwardPE),         tooltip: TOOLTIPS['Fwd P/E']   };
    if (eps       != null && Number.isFinite(Number(eps)))       return { label: 'EPS (TTM)', value: fmtPrice(eps),            tooltip: TOOLTIPS['EPS (TTM)'] };
    if (beta      != null && Number.isFinite(Number(beta)))      return { label: 'Beta',      value: Number(beta).toFixed(2),  tooltip: TOOLTIPS['Beta']      };
    return null;
  })();

  const primarySlots = [
    { label: 'Volume',      value: fmtVolume(volume),          tooltip: TOOLTIPS['Volume']                                },
    { label: 'Avg Volume',  value: fmtVolume(avgVolume),        tooltip: TOOLTIPS['Avg Volume']                           },
    { label: 'Day Range',   value: fmtRange(dayLow, dayHigh),   tooltip: TOOLTIPS['Day Range']                            },
    { label: '52W Range',   value: fmtRange(low52, high52),     tooltip: TOOLTIPS['52W Range']                            },
    { label: '% Change',    value: fmtChangePct(changePct),     tooltip: TOOLTIPS['% Change'],    valueColor: pctColor    },
    { label: 'Market Cap',  value: fmtLarge(marketCap),         tooltip: TOOLTIPS['Market Cap']                           },
    valuation,
    { label: 'Rel. Volume', value: fmtRvol(volume, avgVolume),  tooltip: TOOLTIPS['Rel. Volume'], valueColor: rvolColor   },
  ];

  // ── Reserve pool: used to fill any null primary slot ─────────────────────
  // Listed in preference order; each entry is only used once.
  const reservePool = [
    beta      != null ? { label: 'Beta',      value: Number(beta).toFixed(2),     tooltip: TOOLTIPS['Beta']      } : null,
    pbRatio   != null ? { label: 'P/B Ratio', value: fmtPE(pbRatio),              tooltip: TOOLTIPS['P/B Ratio'] } : null,
    divYield  != null ? { label: 'Div Yield', value: fmtPct(divYield),            tooltip: TOOLTIPS['Div Yield'] } : null,
    eps       != null ? { label: 'EPS (TTM)', value: fmtPrice(eps),               tooltip: TOOLTIPS['EPS (TTM)'] } : null,
    forwardPE != null ? { label: 'Fwd P/E',   value: fmtPE(forwardPE),            tooltip: TOOLTIPS['Fwd P/E']   } : null,
  ].filter(Boolean);

  // Track which reserve labels have been used (avoid duplication with valuation)
  const usedLabels = new Set(
    primarySlots.filter((s) => s != null && s.value != null).map((s) => s.label)
  );

  let reserveIdx = 0;
  const getReserve = () => {
    while (reserveIdx < reservePool.length) {
      const candidate = reservePool[reserveIdx++];
      if (!usedLabels.has(candidate.label)) {
        usedLabels.add(candidate.label);
        return candidate;
      }
    }
    return null;
  };

  // Fill each slot: use primary if value is real, otherwise pull from reserve
  const slots = primarySlots.map((slot) => {
    if (slot != null && slot.value != null) return slot;
    return getReserve();
  }).filter(Boolean).slice(0, 8);

  if (slots.length === 0) return null;

  // Column layout: always clean, no orphan gaps
  const colMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3',
    7: 'grid-cols-2 md:grid-cols-4',
    8: 'grid-cols-2 md:grid-cols-4',
  };
  const gridCols = colMap[slots.length] ?? 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {slots.map(({ label, value, tooltip, valueColor }) => (
        <MetricCard
          key={label}
          label={label}
          value={value}
          tooltip={tooltip}
          valueColor={valueColor}
        />
      ))}
    </div>
  );
}
