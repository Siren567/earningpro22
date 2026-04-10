/**
 * WyckoffAnalysisCard
 *
 * Fetches 3-month daily OHLCV data from Yahoo Finance, sends it to the
 * gako-wyckoff edge function (Gemini), and renders a Recharts chart with
 * Wyckoff annotation overlays (lines, zones, labelled points, trend lines).
 *
 * Supports PNG export via html2canvas.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
  Line, Customized,
} from 'recharts';
import { Brain, Download, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';
import { wyckoffAnalysis } from '@/api/gakoApi';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/components/hooks/useSubscription';
import { useAuth } from '@/components/auth/AuthContext';
import { useLanguage } from '@/components/LanguageContext';
import { canRunAiToday, incrementAiUsage, getAiUsageRemaining } from '@/lib/aiUsageTracker';
import UpgradeModal from '@/components/subscription/UpgradeModal';

// ─── Colour palette ────────────────────────────────────────────────────────────
const COLOR = {
  green:  '#22c55e',
  red:    '#ef4444',
  yellow: '#f59e0b',
  blue:   '#3b82f6',
  purple: '#a855f7',
};

// ─── Yahoo Finance OHLCV fetch ─────────────────────────────────────────────────
async function fetchOHLCV(symbol) {
  const url = `/api/yf/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No chart data returned from Yahoo Finance');

  const timestamps = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens   = q.open   ?? [];
  const highs   = q.high   ?? [];
  const lows    = q.low    ?? [];
  const closes  = q.close  ?? [];
  const volumes = q.volume ?? [];

  return timestamps
    .map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().slice(0, 10),
      open:   opens[i]   ?? null,
      high:   highs[i]   ?? null,
      low:    lows[i]    ?? null,
      close:  closes[i]  ?? null,
      volume: volumes[i] ?? 0,
    }))
    .filter(d => d.close !== null);
}

// ─── Custom dot — renders Wyckoff "point" annotations on the line ─────────────
const AnnotatedDot = ({ cx, cy, index, payload, pointAnnotations, setHovered }) => {
  if (cx == null || cy == null) return null;
  const ann = pointAnnotations?.find(p => p.time === payload?.date);
  if (!ann) return null;

  const c = COLOR[ann.color] ?? COLOR.purple;
  return (
    <g key={`dot-${index}`}>
      <circle
        cx={cx} cy={cy} r={8}
        fill={c} fillOpacity={0.25}
        stroke={c} strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(ann)}
        onMouseLeave={() => setHovered(null)}
      />
      <circle cx={cx} cy={cy} r={3} fill={c} />
      <text
        x={cx} y={cy - 14}
        textAnchor="middle"
        fill={c}
        fontSize={10}
        fontWeight={700}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {ann.title}
      </text>
    </g>
  );
};

// ─── Trend-line overlay using Recharts Customized ─────────────────────────────
const TrendLines = ({ xAxisMap, yAxisMap, drawings = [] }) => {
  const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : null;
  const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : null;
  if (!xAxis || !yAxis) return null;

  const trendLines = drawings.filter(d => d.type === 'trend_line');
  return (
    <g>
      {trendLines.map((tl, i) => {
        const x1 = xAxis.scale(tl.start_time);
        const y1 = yAxis.scale(tl.start_price);
        const x2 = xAxis.scale(tl.end_time);
        const y2 = yAxis.scale(tl.end_price);
        if (x1 == null || x2 == null || isNaN(x1) || isNaN(x2)) return null;
        const c = COLOR[tl.color] ?? COLOR.blue;
        return (
          <g key={`tl-${i}`}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={c} strokeWidth={2}
              strokeDasharray="6 3"
              strokeOpacity={0.85}
            />
            {tl.label && (
              <text
                x={(x1 + x2) / 2}
                y={Math.min(y1, y2) - 6}
                fill={c}
                fontSize={10}
                textAnchor="middle"
                fontWeight={600}
              >
                {tl.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

// ─── Custom price tooltip ──────────────────────────────────────────────────────
const PriceTooltip = ({ active, payload, label, hoveredAnnotation }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;

  return (
    <div
      className="rounded-xl border text-xs shadow-2xl px-3 py-2.5 min-w-[170px]"
      style={{ background: '#0f172a', borderColor: '#1e293b', color: '#e2e8f0' }}
    >
      <div className="font-semibold mb-1 text-white">{label}</div>
      {d && (
        <div className="space-y-0.5">
          <div>O: <span className="text-gray-300">${d.open?.toFixed(2)}</span></div>
          <div>H: <span className="text-green-400">${d.high?.toFixed(2)}</span></div>
          <div>L: <span className="text-red-400">${d.low?.toFixed(2)}</span></div>
          <div>C: <span className="text-white font-bold">${d.close?.toFixed(2)}</span></div>
          <div>Vol: <span className="text-gray-400">{d.volume ? `${(d.volume / 1e6).toFixed(2)}M` : '-'}</span></div>
        </div>
      )}
      {hoveredAnnotation && (
        <div
          className="mt-2 pt-2 border-t text-xs"
          style={{ borderColor: '#334155' }}
        >
          <div className="font-bold mb-0.5" style={{ color: COLOR[hoveredAnnotation.color] ?? '#fff' }}>
            {hoveredAnnotation.title}
          </div>
          <div className="text-gray-300 leading-snug">{hoveredAnnotation.explanation}</div>
        </div>
      )}
    </div>
  );
};

// ─── Phase badge ───────────────────────────────────────────────────────────────
const PhaseBadge = ({ phase }) => {
  const map = {
    Accumulation:     { bg: 'bg-green-500/15',  text: 'text-green-400',  icon: <TrendingUp size={12} />   },
    Distribution:     { bg: 'bg-red-500/15',    text: 'text-red-400',    icon: <TrendingDown size={12} /> },
    Markup:           { bg: 'bg-blue-500/15',   text: 'text-blue-400',   icon: <TrendingUp size={12} />   },
    Markdown:         { bg: 'bg-red-500/15',    text: 'text-red-400',    icon: <TrendingDown size={12} /> },
    'Re-accumulation':{ bg: 'bg-teal-500/15',   text: 'text-teal-400',   icon: <Minus size={12} />        },
    'Re-distribution':{ bg: 'bg-orange-500/15', text: 'text-orange-400', icon: <Minus size={12} />        },
    Unknown:          { bg: 'bg-gray-500/15',   text: 'text-gray-400',   icon: <Minus size={12} />        },
  };
  const s = map[phase] ?? map.Unknown;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon}{phase ?? 'Unknown'}
    </span>
  );
};

// ─── Rating dots ───────────────────────────────────────────────────────────────
const RatingDots = ({ rating = 0 }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 10 }).map((_, i) => (
      <div
        key={i}
        className={`w-1.5 h-1.5 rounded-full ${
          i < rating
            ? rating >= 7 ? 'bg-green-400' : rating >= 4 ? 'bg-yellow-400' : 'bg-red-400'
            : 'bg-white/10'
        }`}
      />
    ))}
    <span className="ml-1.5 text-xs text-gray-400">{rating}/10</span>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
export default function WyckoffAnalysisCard({ symbol, companyName }) {
  const [state, setState]           = useState('idle');
  const [analysisData, setAnalysis] = useState(null);
  const [chartData, setChartData]   = useState([]);
  const [errorMsg, setErrorMsg]     = useState('');
  const [hoveredAnn, setHoveredAnn] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const captureRef = useRef(null);

  const { t }                   = useLanguage();
  const { user }                = useAuth();
  const { plan, limits, isPremium } = useSubscription();
  const remaining               = getAiUsageRemaining(user?.id, plan);
  const aiBlocked               = !canRunAiToday(user?.id, plan);

  const drawings  = analysisData?.drawings  ?? [];
  const summary   = analysisData?.summary   ?? {};
  const analysis  = analysisData?.analysis  ?? {};

  const pointAnnotations = drawings.filter(d => d.type === 'point');

  // ── Run analysis ─────────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!symbol) return;

    // Premium gate — Wyckoff is premium-only
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }

    // AI daily limit gate (premium has unlimited, but guard anyway)
    if (!canRunAiToday(user?.id, plan)) {
      setShowUpgrade(true);
      return;
    }

    setState('loading');
    setErrorMsg('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '(not set)';
      console.log('[WyckoffAnalysisCard] supabase project URL:', supabaseUrl);

      // Step 1: check for an existing valid session first.
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      let freshToken = sessionData?.session?.access_token ?? null;

      console.log('[WyckoffAnalysisCard] getSession →', {
        hasSession:   !!sessionData?.session,
        hasToken:     !!freshToken,
        tokenPreview: freshToken?.slice(0, 20) ?? 'none',
        userId:       sessionData?.session?.user?.id ?? 'none',
        sessionError: sessionError?.message ?? 'none',
      });

      // Step 2: only refresh if session is absent or token is missing.
      if (!freshToken) {
        console.log('[WyckoffAnalysisCard] no token in getSession — attempting refreshSession');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        freshToken = refreshData?.session?.access_token ?? null;

        console.log('[WyckoffAnalysisCard] refreshSession →', {
          hasSession:   !!refreshData?.session,
          hasToken:     !!freshToken,
          tokenPreview: freshToken?.slice(0, 20) ?? 'none',
          userId:       refreshData?.session?.user?.id ?? 'none',
          refreshError: refreshError?.message ?? 'none',
        });

        if (refreshError) {
          console.error('[WyckoffAnalysisCard] refresh error:', refreshError.message);
          setErrorMsg('Session expired. Please sign in again.');
          setState('error');
          return;
        }
      }

      // Step 3: fail clearly if still no token.
      if (!freshToken) {
        console.error('[WyckoffAnalysisCard] no access token after getSession + refreshSession');
        setErrorMsg('You must be signed in to use Wyckoff Analysis.');
        setState('error');
        return;
      }

      // Decode JWT payload to confirm iss/aud match this project.
      try {
        const payload = JSON.parse(atob(freshToken.split('.')[1]));
        console.log('[WyckoffAnalysisCard] token iss:', payload.iss, '| aud:', payload.aud, '| exp:', new Date((payload.exp ?? 0) * 1000).toISOString());
        const issMatch = (payload.iss ?? '').includes(supabaseUrl.replace('https://', '').split('.')[0]);
        console.log('[WyckoffAnalysisCard] issuer matches project:', issMatch);
      } catch { /* non-fatal */ }

      // freshToken is live in the SDK's session — invoke() picks it up automatically.
      const accessToken = freshToken;

      const priceData = await fetchOHLCV(symbol);

      console.log(
        `[WyckoffAnalysisCard] payload — symbol: ${symbol}` +
        ` | companyName: ${companyName ?? symbol}` +
        ` | candles: ${priceData.length}` +
        ` | range: ${priceData[0]?.date ?? '?'} → ${priceData[priceData.length - 1]?.date ?? '?'}` +
        ` | timeframe: 1d/3mo`
      );

      if (priceData.length < 10) {
        setErrorMsg(
          `Not enough price data for ${symbol} — got ${priceData.length} candle${priceData.length === 1 ? '' : 's'}, need at least 10.`
        );
        setState('error');
        return;
      }

      setChartData(priceData);
      const result = await wyckoffAnalysis({
        symbol,
        companyName: companyName ?? symbol,
        priceData,
        accessToken,
      });
      // Count this analysis against the daily limit
      incrementAiUsage(user?.id);
      setAnalysis(result);
      setState('done');
    } catch (err) {
      console.error('[WyckoffAnalysisCard]', err);
      setErrorMsg(err.message ?? 'Unknown error');
      setState('error');
    }
  }, [symbol, companyName, user?.id, plan]);

  // ── Export PNG ────────────────────────────────────────────────────────────────
  const exportPng = useCallback(async () => {
    if (!captureRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: '#0a0f1e',
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `${symbol}_wyckoff.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[WyckoffAnalysisCard] export failed:', err);
    }
  }, [symbol]);

  // ── Y-axis domain with padding ────────────────────────────────────────────────
  const yDomain = (() => {
    if (!chartData.length) return ['auto', 'auto'];
    const prices = chartData.flatMap(d => [d.high, d.low]).filter(Boolean);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.06;
    return [+(min - pad).toFixed(2), +(max + pad).toFixed(2)];
  })();

  const maxVolume = chartData.length ? Math.max(...chartData.map(d => d.volume ?? 0)) : 1;

  // ── Idle / loading / error states ─────────────────────────────────────────────
  // Wyckoff is premium-only. Free users see a locked state.
  const wyckoffLocked = !isPremium;
  const upgradeReason = wyckoffLocked ? 'wyckoff_access' : 'ai_limit';

  if (state === 'idle') {
    return (
      <>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason={upgradeReason} />
        <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-lg overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${wyckoffLocked ? 'bg-amber-400/10' : 'bg-purple-500/15'}`}>
                {wyckoffLocked ? <Crown className="w-5 h-5 text-amber-400" /> : <Brain className="w-5 h-5 text-purple-400" />}
              </div>
              <div>
                <h3 className="text-base font-bold dark:text-white text-gray-900">{t('wyckoff_title')}</h3>
                <p className="text-sm dark:text-gray-400 text-gray-500 mt-0.5">
                  {t('wyckoff_desc')}
                </p>
                {wyckoffLocked ? (
                  <p className="text-[11px] text-amber-400 mt-1 font-medium">
                    {t('wyckoff_premium_note')}
                  </p>
                ) : (
                  <p className="text-[11px] dark:text-gray-600 text-gray-400 mt-1">
                    {aiBlocked
                      ? t('wyckoff_limit_reached')
                      : `${remaining} of ${limits.aiDailyLimit} analyses remaining today`}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => wyckoffLocked || aiBlocked ? setShowUpgrade(true) : runAnalysis()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0 ${
                wyckoffLocked
                  ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-400/20'
                  : aiBlocked
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-400/20'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {wyckoffLocked || aiBlocked ? <Crown size={16} /> : <Brain size={16} />}
              {wyckoffLocked ? t('wyckoff_upgrade_unlock') : aiBlocked ? t('wyckoff_upgrade_analyze') : t('wyckoff_analyze')}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (state === 'loading') {
    return (
      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-lg overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[220px]">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <div className="text-center">
            <p className="dark:text-white text-gray-900 font-semibold">{t('wyckoff_analyzing')} {symbol}…</p>
            <p className="dark:text-gray-400 text-gray-500 text-sm mt-1">
              {t('wyckoff_fetching_data')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-lg overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[180px]">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <div className="text-center">
            <p className="dark:text-white text-gray-900 font-semibold">{t('wyckoff_failed')}</p>
            <p className="dark:text-gray-400 text-gray-500 text-sm mt-1 max-w-sm">{errorMsg}</p>
          </div>
          <button
            onClick={runAnalysis}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold dark:bg-white/10 bg-gray-100 dark:text-white text-gray-700 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
          >
            <RefreshCw size={14} /> {t('wyckoff_retry')}
          </button>
        </div>
      </div>
    );
  }

  // ── Done: full card ─────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-lg overflow-hidden">

      {/* Header */}
      <div className="p-4 md:p-6 border-b dark:border-white/5 border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-white text-gray-900">{t('wyckoff_title')}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <PhaseBadge phase={summary.phase} />
              <RatingDots rating={summary.rating} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (wyckoffLocked || aiBlocked) ? setShowUpgrade(true) : runAnalysis()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-600 dark:hover:bg-white/10 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={12} /> {t('wyckoff_reanalyze')}
          </button>
          <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason={upgradeReason} />
          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-600 dark:hover:bg-white/10 hover:bg-gray-200 transition-colors"
          >
            <Download size={12} /> {t('wyckoff_export_png')}
          </button>
        </div>
      </div>

      {/* Chart capture area */}
      <div ref={captureRef} style={{ background: 'inherit' }}>

        {/* Chart */}
        <div className="px-2 pt-4 pb-2" style={{ height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="wyckoffGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"   stopColor="#a855f7" stopOpacity={0.18} />
                  <stop offset="95%"  stopColor="#a855f7" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={v => v?.slice(5)}   // show MM-DD
              />

              <YAxis
                yAxisId="price"
                domain={yDomain}
                orientation="right"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${v}`}
                width={60}
              />

              <YAxis
                yAxisId="vol"
                domain={[0, maxVolume * 5]}
                hide
              />

              <Tooltip
                content={({ active, payload, label }) => (
                  <PriceTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    hoveredAnnotation={hoveredAnn}
                  />
                )}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              />

              {/* Volume bars (background) */}
              <Bar
                yAxisId="vol"
                dataKey="volume"
                fill="rgba(168,85,247,0.12)"
                radius={[1, 1, 0, 0]}
                isAnimationActive={false}
              />

              {/* Price area */}
              <Area
                yAxisId="price"
                dataKey="close"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#wyckoffGrad)"
                dot={(props) => (
                  <AnnotatedDot
                    {...props}
                    pointAnnotations={pointAnnotations}
                    setHovered={setHoveredAnn}
                  />
                )}
                activeDot={{ r: 4, fill: '#a855f7' }}
                isAnimationActive={false}
              />

              {/* ── Wyckoff drawings ── */}

              {/* Horizontal lines */}
              {drawings
                .filter(d => d.type === 'horizontal_line')
                .map((d, i) => (
                  <ReferenceLine
                    key={`hl-${i}`}
                    yAxisId="price"
                    y={d.price}
                    stroke={COLOR[d.color] ?? COLOR.green}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    label={{
                      value: `${d.label ?? ''} $${d.price}`,
                      position: 'insideTopLeft',
                      fill: COLOR[d.color] ?? COLOR.green,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                ))
              }

              {/* Zones */}
              {drawings
                .filter(d => d.type === 'zone')
                .map((d, i) => (
                  <ReferenceArea
                    key={`zone-${i}`}
                    yAxisId="price"
                    y1={d.price_low}
                    y2={d.price_high}
                    fill={COLOR[d.color] ?? COLOR.green}
                    fillOpacity={0.08}
                    stroke={COLOR[d.color] ?? COLOR.green}
                    strokeOpacity={0.25}
                    strokeWidth={1}
                    label={{
                      value: d.label ?? '',
                      position: 'insideTopLeft',
                      fill: COLOR[d.color] ?? COLOR.green,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                ))
              }

              {/* Trend lines (custom SVG via Customized) */}
              <Customized component={(props) => (
                <TrendLines drawings={drawings} {...props} />
              )} />

            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Analysis cards row */}
        <div className="px-4 md:px-6 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">

          <div className="rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-100 p-3.5">
            <div className="text-xs dark:text-gray-500 text-gray-400 uppercase tracking-wide font-semibold mb-1.5">{t('wyckoff_bias')}</div>
            <div className="text-sm dark:text-white text-gray-900 font-medium leading-snug">
              {summary.bias ?? '—'}
            </div>
          </div>

          <div className="rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-100 p-3.5">
            <div className="text-xs dark:text-gray-500 text-gray-400 uppercase tracking-wide font-semibold mb-1.5">{t('wyckoff_invalidation')}</div>
            <div className="text-sm dark:text-red-300 text-red-600 font-medium leading-snug">
              {summary.invalidation ?? '—'}
            </div>
          </div>

          <div className="rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-100 p-3.5">
            <div className="text-xs dark:text-gray-500 text-gray-400 uppercase tracking-wide font-semibold mb-1.5">{t('wyckoff_trade_idea')}</div>
            <div className="text-sm dark:text-blue-300 text-blue-600 font-medium leading-snug">
              {analysis.trade_idea ?? '—'}
            </div>
          </div>
        </div>

        {/* Wyckoff logic */}
        <div className="px-4 md:px-6 pb-5">
          <div className="rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-100 p-3.5">
            <div className="text-xs dark:text-gray-500 text-gray-400 uppercase tracking-wide font-semibold mb-1.5">{t('wyckoff_interpretation')}</div>
            <p className="text-sm dark:text-gray-300 text-gray-700 leading-relaxed">
              {analysis.wyckoff_logic ?? analysis.trend ?? '—'}
            </p>
          </div>
        </div>

        {/* Drawing legend */}
        {drawings.length > 0 && (
          <div className="px-4 md:px-6 pb-5">
            <div className="flex flex-wrap gap-2">
              {drawings.map((d, i) => {
                const c = COLOR[d.color] ?? '#9ca3af';
                const label = d.label ?? d.title ?? d.type;
                const typeIcon = d.type === 'horizontal_line' ? '—'
                  : d.type === 'zone' ? '▭'
                  : d.type === 'point' ? '●'
                  : '↗';
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
                    style={{ borderColor: c + '40', background: c + '10', color: c }}
                  >
                    <span style={{ color: c }}>{typeIcon}</span>
                    {label}
                    {d.price ? ` $${d.price}` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>{/* /captureRef */}
    </div>
  );
}
