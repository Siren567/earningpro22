/**
 * WyckoffComingSoon
 *
 * Shown while the live Wyckoff AI analysis feature is not yet active.
 *
 * Exports:
 *   WyckoffPreviewModal  – polished modal with mocked chart + analysis data
 *   WyckoffComingSoonCard – replaces the real WyckoffAnalysisCard in the UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { Brain, HelpCircle, TrendingUp, X, Sparkles, Lock, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/components/LanguageContext';
import { useSubscription } from '@/components/hooks/useSubscription';

// ─── Premium gate ──────────────────────────────────────────────────────────────
// Wyckoff is a premium-only feature.
// Replace useSubscription() with a mock if needed:
//   const isPremium = false;
// or swap the hook for your own plan check later.

// ─── Mock price data — classic Wyckoff accumulation ───────────────────────────
// Prices trace: distribution top → SC → AR → ST → Spring → SOS → markup
const MOCK_CHART_DATA = [
  { date: '01/06', close: 18.45, volume: 2.1 },
  { date: '01/07', close: 18.31, volume: 2.4 },
  { date: '01/08', close: 18.10, volume: 3.1 },
  { date: '01/09', close: 17.72, volume: 4.8 },
  { date: '01/10', close: 17.28, volume: 7.2 }, // Preliminary Support
  { date: '01/13', close: 17.20, volume: 9.5 }, // SC — Selling Climax
  { date: '01/14', close: 17.42, volume: 5.3 },
  { date: '01/15', close: 17.85, volume: 4.1 }, // AR — Automatic Rally
  { date: '01/16', close: 17.68, volume: 2.9 },
  { date: '01/17', close: 17.55, volume: 2.6 },
  { date: '01/20', close: 17.38, volume: 3.2 }, // ST — Secondary Test
  { date: '01/21', close: 17.50, volume: 2.8 },
  { date: '01/22', close: 17.62, volume: 2.2 },
  { date: '01/23', close: 17.70, volume: 2.0 },
  { date: '01/24', close: 17.58, volume: 1.9 },
  { date: '01/27', close: 17.75, volume: 2.1 },
  { date: '01/28', close: 17.82, volume: 2.3 },
  { date: '01/29', close: 17.68, volume: 2.0 },
  { date: '01/30', close: 17.55, volume: 2.4 },
  { date: '01/31', close: 17.44, volume: 2.7 },
  { date: '02/03', close: 17.50, volume: 2.2 },
  { date: '02/04', close: 17.60, volume: 2.1 },
  { date: '02/05', close: 17.45, volume: 2.5 },
  { date: '02/06', close: 17.30, volume: 3.0 },
  { date: '02/07', close: 17.08, volume: 5.8 }, // Spring
  { date: '02/10', close: 17.32, volume: 4.2 }, // Test of Spring
  { date: '02/11', close: 17.55, volume: 3.1 },
  { date: '02/12', close: 17.72, volume: 2.8 },
  { date: '02/13', close: 17.90, volume: 3.5 },
  { date: '02/14', close: 18.05, volume: 4.0 }, // SOS — Sign of Strength
  { date: '02/18', close: 17.82, volume: 2.6 }, // LPS — Last Point of Support
  { date: '02/19', close: 17.95, volume: 2.4 },
  { date: '02/20', close: 18.12, volume: 3.0 },
  { date: '02/21', close: 18.35, volume: 3.8 },
  { date: '02/24', close: 18.28, volume: 2.9 }, // BU — Back Up
  { date: '02/25', close: 18.42, volume: 3.5 },
  { date: '02/26', close: 18.58, volume: 4.1 },
  { date: '02/27', close: 18.72, volume: 4.6 }, // Markup begins
  { date: '02/28', close: 18.68, volume: 3.2 },
  { date: '03/03', close: 18.85, volume: 3.0 },
];

// Point markers shown on the chart
const POINT_MARKERS = [
  { date: '01/13', label: 'SC',       color: '#ef4444', y: 17.20, note: 'Selling Climax — capitulation volume spike' },
  { date: '01/15', label: 'AR',       color: '#22c55e', y: 17.85, note: 'Automatic Rally — demand absorbs supply' },
  { date: '01/20', label: 'ST',       color: '#f59e0b', y: 17.38, note: 'Secondary Test — confirms SC low holds' },
  { date: '02/07', label: 'Spring',   color: '#a855f7', y: 17.08, note: 'Spring — shakeout below support, reversal follows' },
  { date: '02/10', label: 'Test',     color: '#3b82f6', y: 17.32, note: 'Test — low-volume retest of spring low' },
  { date: '02/14', label: 'SOS',      color: '#22c55e', y: 18.05, note: 'Sign of Strength — price surges through resistance' },
  { date: '02/25', label: 'Upthrust', color: '#ef4444', y: 18.42, note: 'Upthrust — temporary push above resistance' },
];

const SUPPORT_LEVEL  = 17.20;
const RESIST_LEVEL   = 18.40;
const ACCUM_LOW      = 17.15;
const ACCUM_HIGH     = 18.45;

// ─── Custom tooltip for mock chart ────────────────────────────────────────────
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

// ─── Dot renderer that draws point markers ────────────────────────────────────
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

// ─── WyckoffPreviewModal ───────────────────────────────────────────────────────
export function WyckoffPreviewModal({ open, onClose }) {
  // Close on Escape
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
        {/* Close button */}
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
          {/* Modal header */}
          <div className="flex items-start gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(168,85,247,0.15)' }}>
              <Brain className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <div className="flex-1 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">Wyckoff Analysis Preview</h2>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                  style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}
                >
                  <Sparkles size={9} /> PREVIEW
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                This is a simulated example of the AI-powered Wyckoff chart analysis coming soon.
              </p>
            </div>
          </div>

          {/* Phase summary strip */}
          <div
            className="flex flex-wrap gap-3 mt-4 p-3 rounded-xl border"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1e293b' }}
          >
            {[
              { label: 'Phase',         value: 'Accumulation',  color: '#22c55e' },
              { label: 'Bias',          value: 'Bullish',       color: '#22c55e' },
              { label: 'Confidence',    value: 'Medium',        color: '#f59e0b' },
              { label: 'Key Support',   value: '$17.20',        color: '#22c55e' },
              { label: 'Key Resistance',value: '$18.40',        color: '#ef4444' },
            ].map(item => (
              <div key={item.label} className="flex flex-col min-w-[80px]">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">
                  {item.label}
                </span>
                <span className="text-sm font-bold mt-0.5" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="mt-4 rounded-xl overflow-hidden border" style={{ borderColor: '#1e293b' }}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={MOCK_CHART_DATA} margin={{ top: 12, right: 50, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="previewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#475569', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    interval={7}
                  />

                  <YAxis
                    domain={[16.80, 19.10]}
                    orientation="right"
                    tick={{ fill: '#475569', fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${v}`}
                    width={52}
                  />

                  <Tooltip content={<MockTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />

                  {/* Accumulation zone */}
                  <ReferenceArea
                    y1={ACCUM_LOW} y2={ACCUM_HIGH}
                    fill="#22c55e" fillOpacity={0.05}
                    stroke="#22c55e" strokeOpacity={0.15} strokeWidth={1}
                    label={{
                      value: 'Accumulation Zone',
                      position: 'insideTopLeft',
                      fill: '#22c55e',
                      fillOpacity: 0.6,
                      fontSize: 9,
                      fontWeight: 600,
                    }}
                  />

                  {/* Support */}
                  <ReferenceLine
                    y={SUPPORT_LEVEL}
                    stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3"
                    label={{ value: `Support $${SUPPORT_LEVEL}`, position: 'insideTopLeft', fill: '#22c55e', fontSize: 9, fontWeight: 600 }}
                  />

                  {/* Resistance */}
                  <ReferenceLine
                    y={RESIST_LEVEL}
                    stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3"
                    label={{ value: `Resistance $${RESIST_LEVEL}`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 9, fontWeight: 600 }}
                  />

                  {/* Price area */}
                  <Area
                    dataKey="close"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#previewGrad)"
                    dot={MarkerDot}
                    activeDot={{ r: 4, fill: '#a855f7' }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap gap-2 mt-3">
            {POINT_MARKERS.map(m => (
              <div
                key={m.label}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                style={{ borderColor: m.color + '40', background: m.color + '10', color: m.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                {m.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
              style={{ borderColor: '#22c55e40', background: '#22c55e10', color: '#22c55e' }}>
              <span>▭</span> Accum. Zone
            </div>
          </div>

          {/* Scenario explanation */}
          <div
            className="mt-4 p-3.5 rounded-xl border"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1e293b' }}
          >
            <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1.5">
              Wyckoff Interpretation
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Price completed a Selling Climax (SC) at <span className="text-green-400 font-semibold">$17.20</span> with elevated
              volume, followed by an Automatic Rally (AR) to <span className="text-blue-400 font-semibold">$17.85</span>.
              A Spring shook out weak holders below support before the Sign of Strength (SOS) confirmed
              institutional demand. Price is now in Phase D — the markup phase — with the next target near
              the <span className="text-red-400 font-semibold">$18.40</span> resistance zone.
            </p>
          </div>

          {/* Analysis cards row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: 'Trade Idea',     value: 'Long above $17.80 LPS zone',   color: 'text-blue-300' },
              { label: 'Invalidation',   value: 'Close below $17.00 Spring low', color: 'text-red-300' },
              { label: 'Target',         value: '$19.20 — Phase E markup',       color: 'text-green-300' },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-xl border p-3"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1e293b' }}
              >
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">{item.label}</div>
                <div className={`text-xs font-medium leading-snug ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-xl border"
            style={{ background: 'rgba(168,85,247,0.06)', borderColor: 'rgba(168,85,247,0.2)' }}
          >
            <Lock size={13} className="text-purple-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-300/80 leading-relaxed">
              <span className="font-semibold text-purple-300">Preview only.</span>{' '}
              This chart and analysis are illustrative examples. Live AI-powered Wyckoff analysis
              for any stock is not yet available — it's coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WyckoffComingSoonCard ─────────────────────────────────────────────────────
export function WyckoffComingSoonCard() {
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useLanguage();

  // ── Premium check ────────────────────────────────────────────────────────────
  // To swap this out: replace the line below with `const isPremium = false;`
  // or wire in your own plan check. useSubscription() reads from AuthContext.
  const { isPremium } = useSubscription();

  return (
    <>
      <WyckoffPreviewModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-lg overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          {/* Left: icon + text */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isPremium ? 'rgba(168,85,247,0.12)' : 'rgba(245,158,11,0.10)' }}
            >
              {isPremium
                ? <Brain className="w-5 h-5" style={{ color: '#a855f7' }} />
                : <Crown className="w-5 h-5 text-amber-400" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold dark:text-white text-gray-900">
                  {t('wyckoff_title')}
                </h3>

                {/* Coming Soon badge — always visible */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                  style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}
                >
                  <Sparkles size={9} /> Coming Soon
                </span>

                {/* Premium badge — only for free users */}
                {!isPremium && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
                    style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
                  >
                    <Crown size={9} /> Premium
                  </span>
                )}

                {/* Help / preview icon — always visible */}
                <button
                  onClick={() => setModalOpen(true)}
                  title="See a preview of the upcoming Wyckoff feature"
                  className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                  style={{ color: '#64748b' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                >
                  <HelpCircle size={15} />
                </button>
              </div>

              <p className="text-sm dark:text-gray-400 text-gray-500 mt-0.5">
                {t('wyckoff_desc')}
              </p>

              {/* Subtext differs by plan */}
              {!isPremium ? (
                <p className="text-[11px] mt-1 text-amber-400/80">
                  Upgrade to Premium to unlock Wyckoff AI analysis.{' '}
                  <button
                    onClick={() => setModalOpen(true)}
                    className="underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
                    style={{ color: '#c084fc' }}
                  >
                    See a preview →
                  </button>
                </p>
              ) : (
                <p className="text-[11px] mt-1" style={{ color: '#a855f7' }}>
                  AI-powered Wyckoff chart analysis will be available soon.{' '}
                  <button
                    onClick={() => setModalOpen(true)}
                    className="underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
                    style={{ color: '#c084fc' }}
                  >
                    See a preview →
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Right CTA — differs by plan */}
          {!isPremium ? (
            <Link
              to="/Plans"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 transition-colors"
              style={{
                background: 'rgba(245,158,11,0.12)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.12)'}
            >
              <Crown size={15} />
              Upgrade to Premium
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0 cursor-not-allowed select-none"
              style={{
                background: 'rgba(168,85,247,0.08)',
                color: 'rgba(168,85,247,0.45)',
                border: '1px solid rgba(168,85,247,0.15)',
              }}
            >
              <TrendingUp size={15} />
              Analyze (Coming Soon)
            </button>
          )}

        </div>
      </div>
    </>
  );
}
