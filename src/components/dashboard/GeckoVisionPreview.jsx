/**
 * GeckoVisionPreview
 *
 * Premium preview modal for the Gecko Vision chart analysis feature.
 * Shows a fully mocked AI chart analysis output — no live data.
 *
 * Designed to match the visual language of WyckoffPreviewModal exactly:
 * same dark theme, spacing, typography, chart patterns, and pill/card layouts.
 *
 * Export:
 *   GeckoVisionPreviewModal({ open, onClose })
 */

import React, { useCallback, useEffect } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { X, BarChart2, Sparkles, Lock } from 'lucide-react';

// ─── Mock price data — bullish trend: base → breakout → retest → continuation ──
const MOCK_CHART_DATA = [
  { date: '01/06', close: 179.40 },
  { date: '01/07', close: 180.10 },
  { date: '01/08', close: 179.80 },
  { date: '01/09', close: 181.20 },
  { date: '01/10', close: 180.50 },
  { date: '01/13', close: 182.40 }, // support tag
  { date: '01/14', close: 182.80 },
  { date: '01/15', close: 183.60 },
  { date: '01/16', close: 184.30 },
  { date: '01/17', close: 184.90 },
  { date: '01/21', close: 185.70 }, // breakout
  { date: '01/22', close: 186.40 },
  { date: '01/23', close: 186.10 },
  { date: '01/24', close: 185.30 }, // pullback starts
  { date: '01/27', close: 184.60 },
  { date: '01/28', close: 183.90 },
  { date: '01/29', close: 183.40 }, // retest
  { date: '01/30', close: 184.20 },
  { date: '01/31', close: 185.00 },
  { date: '02/03', close: 185.80 },
  { date: '02/04', close: 186.50 },
  { date: '02/05', close: 187.10 },
  { date: '02/06', close: 187.80 }, // momentum continuation
  { date: '02/07', close: 187.40 },
  { date: '02/10', close: 188.10 },
  { date: '02/11', close: 188.60 },
  { date: '02/12', close: 188.90 }, // resistance
];

const POINT_MARKERS = [
  { date: '01/13', label: 'Support',   color: '#22c55e', note: 'Price tags key support zone at 182.40' },
  { date: '01/21', label: 'Breakout',  color: '#3b82f6', note: 'Clean breakout with volume expansion above 185.00' },
  { date: '01/29', label: 'Retest',    color: '#f59e0b', note: 'Successful retest of prior resistance — now acting as support' },
  { date: '02/06', label: 'Momentum',  color: '#a855f7', note: 'Buyers absorbing supply — momentum continuation confirmed' },
  { date: '02/12', label: 'Target',    color: '#ef4444', note: 'First resistance target zone — 188.90' },
];

const SUPPORT_LEVEL = 182.40;
const RESIST_LEVEL  = 188.90;

// ─── Custom tooltip ────────────────────────────────────────────────────────────
const MockTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const marker = POINT_MARKERS.find(m => m.date === label);
  return (
    <div
      className="rounded-xl border text-xs shadow-2xl px-3 py-2.5 min-w-[160px]"
      style={{ background: '#0f172a', borderColor: '#1e293b', color: '#e2e8f0' }}
    >
      <div className="font-semibold mb-1 text-white">{label}</div>
      <div>Close: <span className="text-white font-bold">${payload[0]?.value?.toFixed(2)}</span></div>
      {marker && (
        <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: '#334155' }}>
          <span
            className="inline-block font-bold px-1.5 py-0.5 rounded text-[10px] mb-1"
            style={{ background: marker.color + '22', color: marker.color }}
          >
            {marker.label}
          </span>
          <div className="text-gray-400 leading-snug">{marker.note}</div>
        </div>
      )}
    </div>
  );
};

// ─── Custom dot renderer ───────────────────────────────────────────────────────
const MarkerDot = ({ cx, cy, payload }) => {
  if (cx == null || cy == null) return null;
  const marker = POINT_MARKERS.find(m => m.date === payload?.date);
  if (!marker) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9}  fill={marker.color} fillOpacity={0.18} stroke={marker.color} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3}  fill={marker.color} />
      <text x={cx} y={cy - 14} textAnchor="middle" fill={marker.color} fontSize={9} fontWeight={700}>
        {marker.label}
      </text>
    </g>
  );
};

// ─── GeckoVisionPreviewModal ───────────────────────────────────────────────────
export function GeckoVisionPreviewModal({ open, onClose }) {
  const handleKey = useCallback(e => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open, handleKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: '#0a0f1e', borderColor: '#1e293b' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <X size={15} className="text-gray-400" />
        </button>

        <div className="p-6">

          {/* ── Header ── */}
          <div className="flex items-start gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.15)' }}
            >
              <BarChart2 className="w-5 h-5" style={{ color: '#60a5fa' }} />
            </div>
            <div className="flex-1 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">Chart Analysis Preview</h2>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}
                >
                  <Sparkles size={9} /> PREVIEW
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Example of how AI-powered chart analysis will appear in the dashboard.
              </p>
            </div>
          </div>

          {/* ── Summary strip ── */}
          <div
            className="flex flex-wrap gap-3 mt-4 p-3 rounded-xl border"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1e293b' }}
          >
            {[
              { label: 'Trend',      value: 'Bullish', color: '#22c55e' },
              { label: 'Momentum',   value: 'Strong',  color: '#22c55e' },
              { label: 'Risk',       value: 'Medium',  color: '#f59e0b' },
              { label: 'Support',    value: '$182.40', color: '#22c55e' },
              { label: 'Resistance', value: '$188.90', color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col min-w-[72px]">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">
                  {label}
                </span>
                <span className="text-sm font-bold mt-0.5" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* ── Chart ── */}
          <div className="mt-4 rounded-xl overflow-hidden border" style={{ borderColor: '#1e293b' }}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={MOCK_CHART_DATA} margin={{ top: 12, right: 50, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="geckoChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#475569', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval={5}
                  />

                  <YAxis
                    domain={[178.0, 191.5]}
                    orientation="right"
                    tick={{ fill: '#475569', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${v}`}
                    width={52}
                  />

                  <Tooltip
                    content={<MockTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                  />

                  {/* Breakout zone */}
                  <ReferenceArea
                    x1="01/21" x2="01/22"
                    y1={185.0} y2={186.6}
                    fill="#3b82f6" fillOpacity={0.10}
                    stroke="#3b82f6" strokeOpacity={0.25} strokeWidth={1}
                    label={{
                      value: 'Breakout',
                      position: 'insideTopLeft',
                      fill: '#60a5fa', fontSize: 9, fontWeight: 600,
                    }}
                  />

                  {/* Pullback / retest zone */}
                  <ReferenceArea
                    x1="01/24" x2="01/29"
                    y1={183.0} y2={185.7}
                    fill="#f59e0b" fillOpacity={0.07}
                    stroke="#f59e0b" strokeOpacity={0.20} strokeWidth={1}
                    label={{
                      value: 'Pullback Zone',
                      position: 'insideTopLeft',
                      fill: '#fbbf24', fontSize: 9, fontWeight: 600,
                    }}
                  />

                  {/* Momentum continuation zone */}
                  <ReferenceArea
                    x1="02/04" x2="02/12"
                    y1={186.0} y2={189.1}
                    fill="#a855f7" fillOpacity={0.06}
                    stroke="#a855f7" strokeOpacity={0.15} strokeWidth={1}
                    label={{
                      value: 'Momentum',
                      position: 'insideTopLeft',
                      fill: '#c084fc', fontSize: 9, fontWeight: 600,
                    }}
                  />

                  {/* Support line */}
                  <ReferenceLine
                    y={SUPPORT_LEVEL}
                    stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3"
                    label={{
                      value: `Support  $${SUPPORT_LEVEL}`,
                      position: 'insideTopLeft',
                      fill: '#22c55e', fontSize: 9, fontWeight: 600,
                    }}
                  />

                  {/* Resistance line */}
                  <ReferenceLine
                    y={RESIST_LEVEL}
                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3"
                    label={{
                      value: `Resistance  $${RESIST_LEVEL}`,
                      position: 'insideTopLeft',
                      fill: '#ef4444', fontSize: 9, fontWeight: 600,
                    }}
                  />

                  {/* Price area */}
                  <Area
                    dataKey="close"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#geckoChartGrad)"
                    dot={MarkerDot}
                    activeDot={{ r: 4, fill: '#3b82f6' }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Signal pill legend ── */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: 'Breakout',           color: '#3b82f6' },
              { label: 'Retest',             color: '#f59e0b' },
              { label: 'Support',            color: '#22c55e' },
              { label: 'Resistance',         color: '#ef4444' },
              { label: 'Trend Continuation', color: '#a855f7' },
              { label: 'Risk Zone',          color: '#f97316' },
            ].map(({ label, color }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                style={{ borderColor: color + '40', background: color + '10', color }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>

          {/* ── Analysis block ── */}
          <div
            className="mt-4 p-3.5 rounded-xl border"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1e293b' }}
          >
            <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-2.5">
              AI Chart Analysis
            </div>
            <div className="space-y-2">
              {[
                { label: 'Market Structure', value: 'Higher highs and higher lows confirm trend continuation.' },
                { label: 'Momentum',         value: 'Buyers remain in control after reclaiming support at 182.40.' },
                { label: 'Key Level',        value: 'Holding above 182.40 keeps the bullish structure intact.' },
                { label: 'Risk Note',        value: 'Rejection near 188.90 could trigger a short-term pullback.' },
                { label: 'Outlook',          value: 'If price consolidates above support, continuation toward 191.20 is likely.' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-2.5 text-xs">
                  <span
                    className="text-gray-500 font-semibold flex-shrink-0"
                    style={{ minWidth: '8rem' }}
                  >
                    {label}
                  </span>
                  <span className="text-gray-300 leading-relaxed">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom mini-cards ── */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: 'Setup Idea',   value: 'Long on clean hold above 183.00', color: 'text-blue-300'  },
              { label: 'Invalidation', value: 'Lose 181.90 with sustained weakness', color: 'text-red-300'   },
              { label: 'Target',       value: '188.90 then 191.20',             color: 'text-green-300' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl border p-3"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1e293b' }}
              >
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">
                  {label}
                </div>
                <div className={`text-xs font-medium leading-snug ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* ── Footer note ── */}
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-xl border"
            style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}
          >
            <Lock size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-300/80 leading-relaxed">
              <span className="font-semibold text-blue-300">Preview only</span>{' '}
              — live chart analysis output may vary. This is a simulated example of the
              upcoming Gecko Vision AI feature.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
