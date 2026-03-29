import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Zap, RefreshCw,
  TrendingUp, Activity, Eye, AlertTriangle, Search,
} from 'lucide-react';
import { getStockQuote } from '@/api/yahooFinanceApi';
import StockLogo from '../components/stock/StockLogo';
import GeckoIcon from '../components/icons/GeckoIcon';

// ── Analysis generation ───────────────────────────────────────────────────────
// Deterministic hash → different result per seed (re-analyze increments seed).
const TIMEFRAMES  = ['Swing', 'Swing', 'Earnings Play', 'Intraday'];
const CONFIDENCES = ['Very High', 'High', 'High', 'Moderate'];

const INSIGHT_POOL = [
  { icon: TrendingUp,    text: 'Breakout pattern forming above key resistance level'   },
  { icon: Zap,           text: 'Volume surge confirming directional momentum'          },
  { icon: Activity,      text: 'Institutional accumulation visible in order flow data' },
  { icon: TrendingUp,    text: 'RSI reset from overbought — clean re-entry forming'    },
  { icon: Activity,      text: 'Moving average convergence signaling trend continuation'},
  { icon: Eye,           text: 'Short interest declining — reducing downside pressure' },
  { icon: Zap,           text: 'Options flow showing elevated call buying activity'    },
  { icon: Activity,      text: 'Price consolidating in tight range before next move'   },
  { icon: TrendingUp,    text: 'Higher lows structure intact — bullish bias preserved' },
  { icon: Eye,           text: 'Earnings whisper tracking ahead of sell-side estimates'},
  { icon: Activity,      text: 'Sector rotation currently favoring this segment'       },
  { icon: TrendingUp,    text: 'Support level defended with strong conviction buying'  },
  { icon: Eye,           text: 'Catalyst window approaching — timing looks favorable'  },
  { icon: Zap,           text: 'Relative strength outperforming the broader market'    },
  { icon: Activity,      text: 'Compression pattern suggests an impending directional move' },
  { icon: AlertTriangle, text: 'Gap fill complete — clean technical setup developing'  },
];

function buildAnalysis(ticker, seed) {
  // Fast integer hash of ticker chars + seed
  let h = (seed + 1) * 2654435761;
  for (let i = 0; i < ticker.length; i++) {
    h = Math.imul(h ^ ticker.charCodeAt(i), 0x9e3779b9) >>> 0;
  }
  const next = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h; };

  const score      = 60 + (next() % 36);              // 60–95
  const timeframe  = TIMEFRAMES[next() % TIMEFRAMES.length];
  const confidence = CONFIDENCES[next() % CONFIDENCES.length];

  const pool = [...INSIGHT_POOL];
  const insights = [];
  for (let i = 0; i < 3; i++) {
    const idx = next() % pool.length;
    insights.push(pool.splice(idx, 1)[0]);
  }
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
function Skeleton({ ticker, company }) {
  return (
    <div className="p-6 sm:p-8 animate-pulse">
      {/* Header — real data shown even during load */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {ticker && (
              <StockLogo symbol={ticker} className="w-9 h-9 rounded-xl flex-shrink-0" />
            )}
            <span className="text-xl font-bold dark:text-white text-gray-900">{ticker}</span>
            <div className="h-5 w-20 rounded-lg dark:bg-white/[0.07] bg-gray-200" />
          </div>
          {company
            ? <p className="text-xs dark:text-gray-500 text-gray-400 ml-12">{company}</p>
            : <div className="h-3 w-32 ml-12 rounded dark:bg-white/[0.04] bg-gray-100" />
          }
        </div>
      </div>

      {/* Analyzing pulse */}
      <div className="flex items-center gap-2 mb-7">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full dark:bg-sky-400 bg-sky-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full dark:bg-sky-400 bg-sky-500" />
        </span>
        <span className="text-xs dark:text-gray-500 text-gray-400">Reading chart signals…</span>
      </div>

      {/* Score skeleton */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-24 rounded dark:bg-white/[0.05] bg-gray-200" />
          <div className="h-4 w-14 rounded dark:bg-white/[0.07] bg-gray-200" />
        </div>
        <div className="h-1.5 rounded-full dark:bg-white/[0.06] bg-gray-100" />
      </div>

      <div className="h-px dark:bg-white/[0.05] bg-gray-100 mb-6" />

      {/* Insight skeletons */}
      <div className="space-y-4">
        {[88, 73, 80].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl dark:bg-white/[0.05] bg-gray-100 flex-shrink-0" />
            <div
              className="h-3 rounded dark:bg-white/[0.05] bg-gray-200"
              style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────
function Result({ ticker, company, analysis }) {
  const conf = CONF_STYLE[analysis.confidence] ?? CONF_STYLE['High'];

  return (
    <>
      <style>{`
        @keyframes geckoSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="p-6 sm:p-8">
        {/* Header row */}
        <div
          className="flex items-start justify-between mb-7"
          style={{ animation: 'geckoSlideUp 0.35s ease forwards' }}
        >
          <div className="flex items-start gap-3">
            <StockLogo symbol={ticker} className="w-9 h-9 rounded-xl flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold dark:text-white text-gray-900">{ticker}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg dark:bg-sky-500/[0.08] bg-sky-50 dark:text-sky-400/70 text-sky-600/80">
                  {analysis.timeframe}
                </span>
              </div>
              <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{company || '—'}</p>
            </div>
          </div>
        </div>

        {/* Gecko Score */}
        <div
          className="mb-6"
          style={{ animation: 'geckoSlideUp 0.35s ease forwards', animationDelay: '60ms', opacity: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider dark:text-gray-600 text-gray-400 flex items-center gap-1.5">
              <GeckoIcon className="w-3 h-3" />
              Gecko Score
            </span>
            <span className="text-2xl font-bold dark:text-white text-gray-900 tabular-nums leading-none">
              {analysis.score}
              <span className="text-[11px] dark:text-gray-600 text-gray-400 font-normal ml-0.5">/100</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full dark:bg-white/[0.06] bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${analysis.score}%`, background: BAR_BG }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px dark:bg-white/[0.05] bg-gray-100 mb-6" />

        {/* Insights */}
        <div className="space-y-4 mb-7">
          {analysis.insights.map(({ icon: Icon, text }, i) => (
            <div
              key={i}
              className="flex items-start gap-3"
              style={{
                animation: 'geckoSlideUp 0.4s ease forwards',
                animationDelay: `${120 + i * 100}ms`,
                opacity: 0,
              }}
            >
              <div className="w-7 h-7 rounded-xl dark:bg-white/[0.05] bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
              </div>
              <p className="text-sm dark:text-gray-300 text-gray-700 leading-snug pt-1.5">{text}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px dark:bg-white/[0.05] bg-gray-100 mb-5" />

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{ animation: 'geckoSlideUp 0.35s ease forwards', animationDelay: '440ms', opacity: 0 }}
        >
          {/* Confidence badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${conf.pill}`}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: conf.dot }} />
            <span className={`text-[11px] font-semibold ${conf.label}`}>
              {analysis.confidence} confidence
            </span>
          </div>

          {/* View stock link */}
          <a
            href={`/StockView?symbol=${ticker}`}
            className="flex items-center gap-1.5 text-xs font-medium dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 transition-colors"
          >
            View {ticker}
            <span className="dark:text-gray-700 text-gray-300">→</span>
          </a>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GeckoAnalyze() {
  const navigate = useNavigate();

  const ticker = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('ticker') || '').toUpperCase().trim();
  }, []);

  const [seed, setSeed]         = useState(0);
  const [analyzing, setAnalyzing] = useState(true);

  // Simulate analysis processing — resets on re-analyze
  useEffect(() => {
    setAnalyzing(true);
    const t = setTimeout(() => setAnalyzing(false), 1500);
    return () => clearTimeout(t);
  }, [seed]);

  // Fetch company name (lightweight quote call)
  const { data: quote } = useQuery({
    queryKey: ['geckoAnalyzeQuote', ticker],
    queryFn:  () => getStockQuote(ticker),
    enabled:  !!ticker,
    staleTime: 120_000,
    retry: 1,
  });

  const company  = quote?.companyName || quote?.shortName || '';
  const analysis = useMemo(() => buildAnalysis(ticker, seed), [ticker, seed]);

  const reAnalyze = () => setSeed(s => s + 1);

  // ── No ticker ──────────────────────────────────────────────────────────────
  if (!ticker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-12 h-12 rounded-2xl dark:bg-white/[0.04] bg-gray-100 flex items-center justify-center mb-4">
          <GeckoIcon className="w-6 h-6 dark:text-gray-500 text-gray-400" />
        </div>
        <p className="text-sm font-medium dark:text-white text-gray-900 mb-1">No ticker specified</p>
        <p className="text-xs dark:text-gray-500 text-gray-400 mb-6">Open a stock first, then click Analyze.</p>
        <button
          onClick={() => navigate('/StockView')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold dark:bg-white/[0.07] bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Search a stock
        </button>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-8">

      {/* Back navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(`/StockView?symbol=${ticker}`)}
          className="flex items-center gap-1.5 text-xs dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {ticker}
        </button>

        {/* Header badge */}
        <div className="flex items-center gap-1.5 text-[10px] font-medium dark:text-gray-600 text-gray-400 uppercase tracking-widest">
          <GeckoIcon className="w-3 h-3" />
          Gecko Vision
        </div>
      </div>

      {/* Analysis card */}
      <div className="relative rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/[0.07] border-gray-100 overflow-hidden">

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: TOP_BAR_BG }}
        />

        {analyzing
          ? <Skeleton ticker={ticker} company={company} />
          : <Result   ticker={ticker} company={company} analysis={analysis} />
        }
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between mt-5 px-1">
        {/* Re-analyze */}
        <button
          onClick={reAnalyze}
          disabled={analyzing}
          className="flex items-center gap-1.5 text-xs font-medium dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-700 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
          Re-analyze
        </button>

        {/* Search another */}
        <button
          onClick={() => navigate('/StockView')}
          className="flex items-center gap-1.5 text-xs font-medium dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-700 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Analyze another stock
        </button>
      </div>
    </div>
  );
}
