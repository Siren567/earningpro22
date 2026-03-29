import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, RefreshCw, TrendingUp, Activity, Eye, AlertTriangle } from 'lucide-react';
import GeckoIcon from '../icons/GeckoIcon';

// ── Analysis generation (same pool as GeckoAnalyze page) ─────────────────────
const TIMEFRAMES  = ['Swing', 'Swing', 'Earnings Play', 'Intraday'];
const CONFIDENCES = ['Very High', 'High', 'High', 'Moderate'];

const INSIGHT_POOL = [
  { icon: TrendingUp,    text: 'Breakout pattern forming above key resistance level'    },
  { icon: Activity,      text: 'Volume surge confirming directional momentum'           },
  { icon: TrendingUp,    text: 'Institutional accumulation visible in order flow data'  },
  { icon: Activity,      text: 'RSI reset from overbought — clean re-entry forming'     },
  { icon: TrendingUp,    text: 'Moving average convergence signaling trend continuation'},
  { icon: Eye,           text: 'Short interest declining — reducing downside pressure'  },
  { icon: Activity,      text: 'Options flow showing elevated call buying activity'     },
  { icon: TrendingUp,    text: 'Price consolidating in tight range before next move'    },
  { icon: Eye,           text: 'Higher lows structure intact — bullish bias preserved'  },
  { icon: Activity,      text: 'Earnings whisper tracking ahead of sell-side estimates' },
  { icon: TrendingUp,    text: 'Sector rotation currently favoring this segment'        },
  { icon: Eye,           text: 'Support level defended with strong conviction buying'   },
  { icon: Activity,      text: 'Catalyst window approaching — timing looks favorable'   },
  { icon: TrendingUp,    text: 'Relative strength outperforming the broader market'     },
  { icon: AlertTriangle, text: 'Compression pattern suggests an impending directional move' },
];

function buildAnalysis(ticker, seed) {
  let h = (seed + 1) * 2654435761;
  for (let i = 0; i < ticker.length; i++) {
    h = Math.imul(h ^ ticker.charCodeAt(i), 0x9e3779b9) >>> 0;
  }
  const next = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h; };

  const score      = 60 + (next() % 36);
  const timeframe  = TIMEFRAMES[next() % TIMEFRAMES.length];
  const confidence = CONFIDENCES[next() % CONFIDENCES.length];
  const pool       = [...INSIGHT_POOL];
  const insights   = [];
  for (let i = 0; i < 3; i++) insights.push(pool.splice(next() % pool.length, 1)[0]);

  return { score, timeframe, confidence, insights };
}

// ── Style maps ────────────────────────────────────────────────────────────────
const CONF_STYLE = {
  'Very High': { dot: '#10b981', pill: 'dark:bg-emerald-500/10 bg-emerald-50', label: 'dark:text-emerald-400 text-emerald-600' },
  'High':      { dot: '#60a5fa', pill: 'dark:bg-blue-500/10   bg-blue-50',     label: 'dark:text-blue-400   text-blue-600'    },
  'Moderate':  { dot: '#f59e0b', pill: 'dark:bg-amber-500/10  bg-amber-50',    label: 'dark:text-amber-400  text-amber-600'   },
};

const BAR_BG     = 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)';
const TOP_BAR_BG = 'linear-gradient(90deg, #38bdf8 0%, #60a5fa 100%)';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PanelSkeleton() {
  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-5 animate-pulse">
      {/* Left */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
          <div className="h-2.5 w-20 dark:bg-white/[0.06] bg-gray-200 rounded" />
          <div className="h-5 w-12 dark:bg-white/[0.08] bg-gray-200 rounded" />
        </div>
        <div className="h-1.5 rounded-full dark:bg-white/[0.06] bg-gray-200 mb-4" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-28 dark:bg-white/[0.05] bg-gray-100 rounded-full" />
          <div className="h-6 w-16 dark:bg-white/[0.05] bg-gray-100 rounded-lg" />
        </div>
      </div>
      {/* Right */}
      <div className="flex flex-col justify-center gap-3">
        {[85, 71, 78].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg dark:bg-white/[0.05] bg-gray-100 flex-shrink-0" />
            <div className="h-3 rounded dark:bg-white/[0.05] bg-gray-200" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────
function PanelResult({ analysis }) {
  const conf = CONF_STYLE[analysis.confidence] ?? CONF_STYLE['High'];

  return (
    <>
      <style>{`
        @keyframes geckoPanelUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div className="p-5 grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-5 md:gap-6">

        {/* Left — score + meta */}
        <div
          className="flex flex-col justify-center"
          style={{ animation: 'geckoPanelUp 0.3s ease forwards' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider dark:text-gray-600 text-gray-400 flex items-center gap-1">
              <GeckoIcon className="w-2.5 h-2.5" />
              Gecko Score
            </span>
            <span className="text-2xl font-bold dark:text-white text-gray-900 tabular-nums leading-none">
              {analysis.score}
              <span className="text-[10px] dark:text-gray-600 text-gray-400 font-normal ml-0.5">/100</span>
            </span>
          </div>

          <div className="h-1.5 rounded-full dark:bg-white/[0.06] bg-gray-100 overflow-hidden mb-4">
            <div
              className="h-full rounded-full"
              style={{ width: `${analysis.score}%`, background: BAR_BG, transition: 'width 0.6s ease' }}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${conf.pill}`}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: conf.dot }} />
              <span className={`text-[11px] font-semibold ${conf.label}`}>{analysis.confidence} confidence</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg dark:bg-sky-500/[0.08] bg-sky-50 dark:text-sky-400/70 text-sky-600/80">
              {analysis.timeframe}
            </span>
          </div>
        </div>

        {/* Right — insights */}
        <div className="flex flex-col justify-center gap-3">
          {analysis.insights.map(({ icon: Icon, text }, i) => (
            <div
              key={i}
              className="flex items-start gap-3"
              style={{
                animation: 'geckoPanelUp 0.35s ease forwards',
                animationDelay:  `${i * 80}ms`,
                opacity: 0,
              }}
            >
              <div className="w-6 h-6 rounded-lg dark:bg-white/[0.05] bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3 h-3 dark:text-gray-500 text-gray-400" />
              </div>
              <p className="text-sm dark:text-gray-300 text-gray-700 leading-snug pt-0.5">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
/**
 * GeckoAnalysisPanel
 *
 * Inline analysis card — rendered inside the stock page without navigation.
 *
 * Props:
 *   ticker   string   — stock symbol
 *   onClose  fn       — called when user dismisses the panel
 */
export default function GeckoAnalysisPanel({ ticker, onClose }) {
  const [seed, setSeed]         = useState(0);
  const [analyzing, setAnalyzing] = useState(true);
  const panelRef = useRef(null);

  // Simulated analysis delay — resets on re-analyze
  useEffect(() => {
    setAnalyzing(true);
    const t = setTimeout(() => setAnalyzing(false), 1500);
    return () => clearTimeout(t);
  }, [seed]);

  // Scroll panel into view when it first mounts
  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const analysis = useMemo(() => buildAnalysis(ticker, seed), [ticker, seed]);

  return (
    <div
      ref={panelRef}
      className="relative rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/[0.07] border-gray-100 overflow-hidden"
      style={{ animation: 'geckoSlideIn 0.22s ease forwards' }}
    >
      <style>{`
        @keyframes geckoSlideIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: TOP_BAR_BG }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b dark:border-white/[0.05] border-gray-100">
        <div className="flex items-center gap-2">
          <GeckoIcon className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
          <span className="text-sm font-semibold dark:text-white text-gray-900">Gecko Analysis</span>
          <span className="dark:text-gray-700 text-gray-300">·</span>
          <span className="text-xs font-medium dark:text-gray-500 text-gray-400 tabular-nums">{ticker}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Re-analyze */}
          <button
            onClick={() => setSeed(s => s + 1)}
            disabled={analyzing}
            title="Re-analyze"
            className="p-1.5 rounded-lg dark:text-gray-600 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 dark:hover:bg-white/[0.05] hover:bg-gray-100 transition-all duration-150 disabled:opacity-30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-lg dark:text-gray-600 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 dark:hover:bg-white/[0.05] hover:bg-gray-100 transition-all duration-150"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {analyzing ? <PanelSkeleton /> : <PanelResult analysis={analysis} />}
    </div>
  );
}
