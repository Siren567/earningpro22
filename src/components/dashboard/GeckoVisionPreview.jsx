/**
 * GeckoVisionPreview — AI signal-based chart demo (Gecko Vision).
 * Intentionally NOT price-structure / S&R / breakout / zone analysis.
 * Standalone; no imports from Wyckoff modules.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  X,
  Activity,
  Sparkles,
  Lock,
  Zap,
  RefreshCw,
  Flame,
  TrendingUp,
  Gauge,
  Radio,
} from 'lucide-react';

const REGIME_COLORS = {
  strong: '#22c55e',
  neutral: '#eab308',
  weak: '#ef4444',
};

/** Mock series: regime drives line color; vol band is curved (not flat levels). */
const RAW_SERIES = [
  { date: '01/06', close: 179.4, regime: 'neutral', signal: null, volLo: 177.8, volHi: 181.0 },
  { date: '01/07', close: 180.1, regime: 'strong', signal: 'momentum', volLo: 178.5, volHi: 181.6 },
  { date: '01/08', close: 179.8, regime: 'weak', signal: null, volLo: 178.2, volHi: 181.2 },
  { date: '01/09', close: 181.2, regime: 'strong', signal: null, volLo: 179.0, volHi: 182.8 },
  { date: '01/10', close: 180.5, regime: 'neutral', signal: 'reversal', volLo: 178.8, volHi: 182.0 },
  { date: '01/13', close: 182.4, regime: 'strong', signal: null, volLo: 180.5, volHi: 183.6 },
  { date: '01/14', close: 182.8, regime: 'strong', signal: 'acceleration', volLo: 181.0, volHi: 184.2 },
  { date: '01/15', close: 183.6, regime: 'strong', signal: null, volLo: 182.0, volHi: 185.0 },
  { date: '01/16', close: 184.3, regime: 'neutral', signal: null, volLo: 182.5, volHi: 185.5 },
  { date: '01/17', close: 184.9, regime: 'strong', signal: null, volLo: 183.2, volHi: 186.2 },
  { date: '01/21', close: 186.2, regime: 'strong', signal: 'momentum', volLo: 184.0, volHi: 187.5 },
  { date: '01/22', close: 186.4, regime: 'neutral', signal: null, volLo: 184.8, volHi: 187.6 },
  { date: '01/23', close: 186.1, regime: 'weak', signal: null, volLo: 184.5, volHi: 187.2 },
  { date: '01/24', close: 185.3, regime: 'weak', signal: null, volLo: 183.8, volHi: 186.5 },
  { date: '01/27', close: 184.6, regime: 'neutral', signal: 'reversal', volLo: 183.0, volHi: 186.0 },
  { date: '01/28', close: 184.0, regime: 'weak', signal: null, volLo: 182.5, volHi: 185.2 },
  { date: '01/29', close: 184.5, regime: 'neutral', signal: null, volLo: 183.0, volHi: 185.8 },
  { date: '01/30', close: 185.2, regime: 'strong', signal: null, volLo: 183.5, volHi: 186.5 },
  { date: '01/31', close: 186.0, regime: 'strong', signal: 'acceleration', volLo: 184.2, volHi: 187.2 },
  { date: '02/03', close: 186.8, regime: 'strong', signal: null, volLo: 185.0, volHi: 188.0 },
  { date: '02/04', close: 187.2, regime: 'neutral', signal: null, volLo: 185.5, volHi: 188.2 },
  { date: '02/05', close: 187.5, regime: 'strong', signal: null, volLo: 186.0, volHi: 188.8 },
  { date: '02/06', close: 188.0, regime: 'strong', signal: 'momentum', volLo: 186.2, volHi: 189.2 },
  { date: '02/07', close: 187.6, regime: 'neutral', signal: null, volLo: 186.0, volHi: 188.8 },
  { date: '02/10', close: 188.2, regime: 'strong', signal: null, volLo: 186.5, volHi: 189.5 },
  { date: '02/11', close: 188.5, regime: 'strong', signal: null, volLo: 187.0, volHi: 189.8 },
  { date: '02/12', close: 188.9, regime: 'neutral', signal: null, volLo: 187.2, volHi: 190.2 },
];

function withVolStack(rows) {
  return rows.map((r) => ({
    ...r,
    volBase: r.volLo,
    volThickness: Math.max(0.01, r.volHi - r.volLo),
  }));
}

const CHART_DATA = withVolStack(RAW_SERIES);

/** Contiguous regime runs; overlap one point at boundaries so the path stays visually continuous. */
function splitPriceSegments(rows) {
  if (!rows.length) return [];
  const segments = [];
  let segStart = 0;
  let regime = rows[0].regime;
  for (let i = 1; i <= rows.length; i++) {
    const atEnd = i === rows.length;
    const changed = !atEnd && rows[i].regime !== regime;
    if (atEnd || changed) {
      const slice = rows.slice(segStart, i);
      if (slice.length) segments.push({ regime, data: slice });
      if (!atEnd) {
        segStart = i > 0 ? i - 1 : i;
        regime = rows[i].regime;
      }
    }
  }
  return segments;
}

const SIGNAL_META = {
  momentum: { emoji: '⚡', label: 'Momentum pulse', Icon: Zap, color: '#fbbf24' },
  reversal: { emoji: '🔄', label: 'Regime shift', Icon: RefreshCw, color: '#38bdf8' },
  acceleration: { emoji: '🔥', label: 'Acceleration', Icon: Flame, color: '#f97316' },
};

const SignalDot = (props) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.signal) return null;
  const meta = SIGNAL_META[payload.signal];
  if (!meta) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill={meta.color} fillOpacity={0.2} stroke={meta.color} strokeWidth={1.5} />
      <text x={cx} y={cy - 16} textAnchor="middle" fontSize={11}>
        {meta.emoji}
      </text>
    </g>
  );
};

const DemoTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-xl"
      style={{ background: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}
    >
      <div className="font-semibold text-white">{row.date}</div>
      <div className="mt-1">
        Signal close: <span className="font-mono font-bold text-white">${row.close.toFixed(2)}</span>
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
        Regime · {row.regime}
        {row.signal ? ` · ${SIGNAL_META[row.signal]?.label ?? row.signal}` : ''}
      </div>
    </div>
  );
};

const TOP_METRICS = {
  trendStrength: { value: 78, label: 'Trend Strength', suffix: '/100', color: '#4ade80' },
  momentumScore: { value: '+64', label: 'Momentum Score', suffix: '', color: '#38bdf8' },
  volatilityIndex: { value: '42', label: 'Volatility Index', suffix: '', color: '#c084fc' },
  bias: { value: 'Bullish', label: 'Bias', suffix: '', color: '#4ade80' },
};

const AI_BLOCKS = [
  {
    key: 'summary',
    title: 'Signal Summary',
    body: 'Net constructive: green segments dominate the window; pullbacks register as short-lived signal decay, not structural flip.',
  },
  {
    key: 'momentum',
    title: 'Momentum State',
    body: 'Impulse intact — last three pulses expanded range without collapsing the vol envelope. Watch for decay if pulses cluster weak.',
  },
  {
    key: 'vol',
    title: 'Volatility Regime',
    body: 'Band width stable-to-widening → expansion-friendly environment. No compression spike detected in this demo slice.',
  },
  {
    key: 'dir',
    title: 'Directional Bias',
    body: 'Model lean: long-bias while strength meter >70 and bias chip stays green. Neutral chop if scores diverge.',
  },
];

const SETUP_CARDS = [
  {
    title: 'Long Bias Scenario',
    text: 'Add on strength pulses; hold while trend strength stays elevated and momentum score positive.',
    accent: 'text-emerald-300',
  },
  {
    title: 'Short Bias Scenario',
    text: 'Fade only if weak segments chain and vol band inverts (simulated) — otherwise counter-trend is low edge here.',
    accent: 'text-rose-300',
  },
  {
    title: 'Risk Trigger',
    text: 'Automated flatten if composite score drops below 45 for two consecutive prints (demo rule).',
    accent: 'text-amber-200',
  },
  {
    title: 'Expected Range',
    text: 'Projected oscillation band ±2.1% around last close for the next session cluster (mock).',
    accent: 'text-sky-300',
  },
];

export function GeckoVisionPreviewModal({ open, onClose }) {
  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open, handleKey]);

  const segments = useMemo(() => splitPriceSegments(CHART_DATA), []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #0c1222 0%, #080c18 100%)',
          borderColor: 'rgba(56, 189, 248, 0.15)',
          boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.08), 0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full flex items-center justify-center text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="p-6 pt-7">
          {/* Header — AI ops feel */}
          <div className="flex flex-wrap items-start gap-3 mb-5">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(56,189,248,0.2) 100%)',
                boxShadow: '0 0 20px rgba(99,102,241,0.25)',
              }}
            >
              <Activity className="h-5 w-5 text-indigo-300" />
            </div>
            <div className="min-w-0 flex-1 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">Signal Engine · Preview</h2>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.25)' }}
                >
                  <Sparkles className="h-3 w-3" />
                  Simulated
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                AI signal readout — regime-colored path, volatility envelope, event markers. Not classical chart patterns.
              </p>
            </div>
          </div>

          {/* Live-style metric bar */}
          <div
            className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-xl p-3"
            style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(148,163,184,0.12)',
            }}
          >
            {[
              { ...TOP_METRICS.trendStrength, icon: Gauge },
              { ...TOP_METRICS.momentumScore, icon: Radio },
              { ...TOP_METRICS.volatilityIndex, icon: Activity },
              { ...TOP_METRICS.bias, icon: TrendingUp },
            ].map(({ label, value, suffix, color, icon: Icon }) => (
              <div key={label} className="flex flex-col gap-0.5 rounded-lg px-2 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  <Icon className="h-3 w-3 opacity-70" />
                  {label}
                </div>
                <div className="text-lg font-bold tabular-nums leading-tight" style={{ color }}>
                  {value}
                  {suffix ? <span className="text-xs font-semibold text-slate-500">{suffix}</span> : null}
                </div>
              </div>
            ))}
          </div>

          {/* Bias chip row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Live bias</span>
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold"
              style={{
                borderColor: 'rgba(74,222,128,0.4)',
                background: 'rgba(74,222,128,0.1)',
                color: '#86efac',
              }}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Long lean
            </span>
            <span className="text-[10px] text-slate-500">Model confidence · mock 0.81</span>
          </div>

          {/* Chart */}
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ border: '1px solid rgba(51,65,85,0.5)', background: 'rgba(2,6,23,0.5)' }}
          >
            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={CHART_DATA} margin={{ top: 8, right: 48, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.14} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.06} />
                    </linearGradient>
                    <filter id="sigGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid stroke="rgba(148,163,184,0.06)" vertical={false} strokeDasharray="4 6" />

                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    orientation="right"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={46}
                  />

                  <Tooltip content={<DemoTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.15)', strokeWidth: 1 }} />

                  {/* Volatility envelope (curved band — not flat S/R) */}
                  <Area
                    type="monotone"
                    dataKey="volBase"
                    stackId="env"
                    stroke="none"
                    fill="transparent"
                    fillOpacity={0}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="volThickness"
                    stackId="env"
                    stroke="none"
                    fill="url(#volGrad)"
                    fillOpacity={1}
                    isAnimationActive={false}
                  />

                  {/* Regime-colored price segments */}
                  {segments.map((seg, idx) => (
                    <Line
                      key={`${seg.regime}-${idx}`}
                      data={seg.data}
                      dataKey="close"
                      type="monotone"
                      stroke={REGIME_COLORS[seg.regime] ?? '#94a3b8'}
                      strokeWidth={2.5}
                      dot={<SignalDot />}
                      activeDot={{ r: 5, strokeWidth: 0, fill: REGIME_COLORS[seg.regime] }}
                      connectNulls
                      isAnimationActive={false}
                      style={{ filter: 'url(#sigGlow)' }}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend — signals + regime colors */}
            <div
              className="flex flex-wrap gap-x-4 gap-y-2 border-t px-3 py-2.5 text-[10px]"
              style={{ borderColor: 'rgba(51,65,85,0.4)', background: 'rgba(15,23,42,0.4)' }}
            >
              <span className="font-semibold uppercase tracking-wide text-slate-500">Path</span>
              {[
                { k: 'strong', l: 'Strong' },
                { k: 'neutral', l: 'Neutral' },
                { k: 'weak', l: 'Weak' },
              ].map(({ k, l }) => (
                <span key={k} className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-2 w-4 rounded-sm" style={{ background: REGIME_COLORS[k] }} />
                  {l}
                </span>
              ))}
              <span className="mx-1 hidden text-slate-600 sm:inline">|</span>
              <span className="font-semibold uppercase tracking-wide text-slate-500">Markers</span>
              <span className="text-slate-400">⚡ pulse</span>
              <span className="text-slate-400">🔄 shift</span>
              <span className="text-slate-400">🔥 accel</span>
            </div>
          </div>

          {/* Machine-style analysis */}
          <div
            className="mt-4 space-y-3 rounded-xl p-4 font-mono text-[11px] leading-relaxed"
            style={{
              background: 'rgba(15,23,42,0.55)',
              border: '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-indigo-400/90">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              inference_stream · demo
            </div>
            {AI_BLOCKS.map(({ key, title, body }) => (
              <div key={key} className="border-l-2 border-indigo-500/40 pl-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</div>
                <p className="mt-1 text-slate-300">{body}</p>
              </div>
            ))}
          </div>

          {/* Scenarios */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SETUP_CARDS.map(({ title, text, accent }) => (
              <div
                key={title}
                className="rounded-xl p-3.5"
                style={{
                  background: 'rgba(30,41,59,0.35)',
                  border: '1px solid rgba(148,163,184,0.1)',
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</div>
                <p className={`mt-1.5 text-xs leading-snug ${accent}`}>{text}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-4 flex gap-2 rounded-xl border p-3"
            style={{ background: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.2)' }}
          >
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
            <p className="text-xs leading-relaxed text-sky-200/80">
              <span className="font-semibold text-sky-200">Synthetic run</span> — metrics, bands, and copy are mocked for
              UI only. Not financial advice. Production signals will use live models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
