import React, { useState, useRef, useCallback } from 'react';
import { Upload, RefreshCw, TrendingUp, Activity, Zap, AlertTriangle } from 'lucide-react';
import GeckoIcon from '../icons/GeckoIcon';

// ── Analysis presets ──────────────────────────────────────────────────────────
const ANALYSES = [
  {
    signal: 'Bullish',
    bullets: [
      { icon: TrendingUp,    text: 'Breakout forming above key resistance zone'     },
      { icon: Zap,           text: 'Momentum increasing — volume confirming move'   },
      { icon: Activity,      text: 'Watch for continuation above current level'     },
    ],
  },
  {
    signal: 'Bullish',
    bullets: [
      { icon: TrendingUp,    text: 'Higher lows forming — uptrend structure intact' },
      { icon: Zap,           text: 'RSI recovering from oversold without breakdown' },
      { icon: Activity,      text: 'Risk/reward favors long from current setup'     },
    ],
  },
  {
    signal: 'Cautious',
    bullets: [
      { icon: Activity,      text: 'Consolidation pattern forming after recent rally' },
      { icon: TrendingUp,    text: 'Support holding — buyers defending the zone'      },
      { icon: Activity,      text: 'Trigger: clean close above 5-day resistance'      },
    ],
  },
  {
    signal: 'Bearish',
    bullets: [
      { icon: AlertTriangle, text: 'Distribution pattern visible at current highs' },
      { icon: Activity,      text: 'Volume declining — conviction fading'           },
      { icon: Activity,      text: 'Watch for breakdown below nearest support'      },
    ],
  },
];

const SIGNAL_STYLES = {
  Bullish:  { dot: '#10b981', pill: 'dark:bg-emerald-500/10 bg-emerald-50', label: 'dark:text-emerald-400 text-emerald-600' },
  Cautious: { dot: '#f59e0b', pill: 'dark:bg-amber-500/10  bg-amber-50',   label: 'dark:text-amber-400  text-amber-600'   },
  Bearish:  { dot: '#f87171', pill: 'dark:bg-red-500/10    bg-red-50',     label: 'dark:text-red-400    text-red-600'     },
};

// ── Faint chart illustration ──────────────────────────────────────────────────
// Decorative SVG that hints at "chart analysis" — very low opacity, dark-theme-aware.
function ChartIllustration() {
  return (
    <svg
      viewBox="0 0 200 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[220px] opacity-[0.07] dark:opacity-[0.09]"
      aria-hidden="true"
    >
      {/* Grid lines */}
      {[16, 32, 48, 64].map(y => (
        <line key={y} x1="10" y1={y} x2="190" y2={y} stroke="currentColor" strokeWidth="0.5" />
      ))}

      {/* Candlestick bars */}
      {[
        { x: 20,  lo: 58, hi: 22, open: 50, close: 30 },
        { x: 40,  lo: 54, hi: 20, open: 46, close: 28 },
        { x: 60,  lo: 60, hi: 30, open: 52, close: 38 },
        { x: 80,  lo: 50, hi: 18, open: 42, close: 24 },
        { x: 100, lo: 46, hi: 14, open: 38, close: 20 },
        { x: 120, lo: 42, hi: 16, open: 36, close: 22 },
        { x: 140, lo: 36, hi: 10, open: 30, close: 14 },
        { x: 160, lo: 32, hi:  8, open: 28, close: 12 },
        { x: 180, lo: 28, hi:  6, open: 22, close:  8 },
      ].map(({ x, lo, hi, open, close }) => (
        <g key={x}>
          {/* Wick */}
          <line x1={x} y1={hi} x2={x} y2={lo} stroke="currentColor" strokeWidth="1" />
          {/* Body */}
          <rect
            x={x - 4}
            y={Math.min(open, close)}
            width={8}
            height={Math.abs(open - close) || 1}
            rx="1"
            fill="currentColor"
          />
        </g>
      ))}

      {/* Trend line overlay */}
      <polyline
        points="20,45 40,40 60,44 80,35 100,30 120,28 140,20 160,16 180,10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="3 2"
      />
    </svg>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function IdleState({ dragActive, onDragOver, onDragLeave, onDrop, onBrowse }) {
  return (
    <div className="px-5 pb-6 pt-2">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onBrowse}
        className={`
          relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed
          px-8 py-12 transition-all duration-200 cursor-pointer select-none overflow-hidden
          ${dragActive
            ? 'dark:border-sky-500/40 border-sky-400/40 dark:bg-sky-500/[0.05] bg-sky-50/60'
            : 'dark:border-white/[0.08] border-gray-200 dark:hover:border-white/[0.14] hover:border-gray-300 dark:hover:bg-white/[0.02] hover:bg-gray-50/60'
          }
        `}
      >
        {/* Faint chart illustration — decorative background */}
        {!dragActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <ChartIllustration />
          </div>
        )}

        {/* Upload icon */}
        <div className={`
          relative z-10 w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-200
          ${dragActive ? 'dark:bg-sky-500/15 bg-sky-100' : 'dark:bg-white/[0.05] bg-gray-100'}
        `}>
          <Upload className={`w-5 h-5 transition-colors duration-200 ${dragActive ? 'dark:text-sky-400 text-sky-500' : 'dark:text-gray-500 text-gray-400'}`} />
        </div>

        {/* Text content */}
        <p className="relative z-10 text-sm font-medium dark:text-white text-gray-900 mb-1.5 text-center">
          {dragActive ? 'Drop to analyze' : 'Upload a chart screenshot'}
        </p>

        {!dragActive && (
          <>
            <p className="relative z-10 text-xs dark:text-gray-500 text-gray-400 mb-1 text-center leading-relaxed">
              Upload to detect patterns and signals instantly
            </p>
            <p className="relative z-10 text-[11px] dark:text-gray-600 text-gray-300 mb-6 text-center">
              Try: breakout or momentum setups
            </p>

            <button
              onClick={e => { e.stopPropagation(); onBrowse(); }}
              className="relative z-10 px-4 py-2 rounded-xl text-xs font-semibold dark:bg-white/[0.07] bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/[0.11] hover:bg-gray-200 transition-colors duration-150"
            >
              Choose file
            </button>

            <p className="relative z-10 text-[10px] dark:text-gray-700 text-gray-300 mt-4">
              PNG · JPG · WebP
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingState({ imgSrc }) {
  return (
    <div className="px-5 pb-6 pt-2">
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:w-[45%] flex-shrink-0 rounded-xl overflow-hidden dark:bg-black/20 bg-gray-100 border dark:border-white/[0.06] border-gray-200 flex items-center justify-center aspect-video">
          <img src={imgSrc} alt="Uploaded chart" className="w-full h-full object-contain opacity-40" />
        </div>

        <div className="flex-1 flex flex-col justify-center py-2 gap-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full dark:bg-sky-400 bg-sky-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full dark:bg-sky-400 bg-sky-500" />
            </span>
            <span className="text-xs dark:text-gray-500 text-gray-400">Analyzing chart pattern…</span>
          </div>

          <div className="space-y-4">
            {[85, 70, 60].map((w, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="w-7 h-7 rounded-lg dark:bg-white/[0.05] bg-gray-100 flex-shrink-0" />
                <div className="h-2.5 rounded-full dark:bg-white/[0.06] bg-gray-200" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultState({ imgSrc, result }) {
  const sig = SIGNAL_STYLES[result.signal] ?? SIGNAL_STYLES.Cautious;

  return (
    <>
      <style>{`
        @keyframes geckoFadeUp {
          from { opacity: 0; transform: translateY(7px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div className="px-5 pb-6 pt-2">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">
          <div className="lg:w-[45%] flex-shrink-0 rounded-xl overflow-hidden dark:bg-black/20 bg-gray-100 border dark:border-white/[0.08] border-gray-200 flex items-center justify-center aspect-video">
            <img src={imgSrc} alt="Analyzed chart" className="w-full h-full object-contain" />
          </div>

          <div className="flex-1 flex flex-col justify-center py-1">
            <div
              className={`self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-5 ${sig.pill}`}
              style={{ animation: 'geckoFadeUp 0.35s ease forwards', animationDelay: '0ms', opacity: 0 }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sig.dot }} />
              <span className={`text-[11px] font-semibold ${sig.label}`}>{result.signal} Signal</span>
            </div>

            <div className="space-y-3.5">
              {result.bullets.map(({ icon: Icon, text }, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3"
                  style={{
                    animation: 'geckoFadeUp 0.4s ease forwards',
                    animationDelay: `${80 + i * 110}ms`,
                    opacity: 0,
                  }}
                >
                  <div className="w-7 h-7 rounded-lg dark:bg-white/[0.05] bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
                  </div>
                  <p className="text-sm dark:text-gray-300 text-gray-700 leading-snug pt-1.5">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GeckoVision() {
  const [phase, setPhase]           = useState('idle');
  const [imgSrc, setImgSrc]         = useState(null);
  const [result, setResult]         = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file?.type.startsWith('image/')) return;
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setResult(null);
    setPhase('loading');
    setTimeout(() => {
      const pick = ANALYSES[Math.floor(Math.random() * ANALYSES.length)];
      setResult(pick);
      setPhase('result');
    }, 1900);
  }, [imgSrc]);

  const reset = () => {
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    setImgSrc(null);
    setResult(null);
    setPhase('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    processFile(e.dataTransfer.files?.[0]);
  }, [processFile]);

  return (
    <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b dark:border-white/5 border-gray-100">
        <div className="flex items-center gap-2">
          <GeckoIcon className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
          <h2 className="text-sm font-semibold dark:text-white text-gray-900">Gecko Vision</h2>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded dark:bg-sky-500/10 bg-sky-50 dark:text-sky-500/60 text-sky-400 uppercase tracking-widest">
            Beta
          </span>
        </div>

        {phase !== 'idle' && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-[11px] dark:text-gray-600 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 transition-colors duration-150"
          >
            <RefreshCw className="w-3 h-3" />
            Re-upload
          </button>
        )}
      </div>

      {/* ── Body ── */}
      {phase === 'idle'   && (
        <IdleState
          dragActive={dragActive}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onBrowse={() => fileRef.current?.click()}
        />
      )}
      {phase === 'loading' && <LoadingState imgSrc={imgSrc} />}
      {phase === 'result'  && result && <ResultState imgSrc={imgSrc} result={result} />}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => processFile(e.target.files?.[0])}
      />
    </div>
  );
}
