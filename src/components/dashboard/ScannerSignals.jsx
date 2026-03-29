import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock } from 'lucide-react';

// ── Signal type labels ─────────────────────────────────────────────────────────
// All share the same neutral styling — signals are secondary UI, not hero content
const SIGNAL_LABELS = [
  'Volume Surge',
  'Options Flow',
  'RSI Breakout',
  'Earnings Catalyst',
  'Momentum Alert',
  'Short Squeeze',
];

// ── Mock signal data ──────────────────────────────────────────────────────────
const SIGNALS = [
  {
    ticker:      'AAPL',
    type:        'Volume Surge',
    time:        '2m ago',
    explanation: 'Volume spiked 4.1× above 30-day average with unusual call buying.',
  },
  {
    ticker:      'AMD',
    type:        'Options Flow',
    time:        '7m ago',
    explanation: '$2.3M in aggressive call sweeps detected across 3 expirations.',
  },
  {
    ticker:      'TSLA',
    type:        'RSI Breakout',
    time:        '15m ago',
    explanation: 'RSI crossed 60 and price cleared 5-day resistance simultaneously.',
  },
  {
    ticker:      'GOOGL',
    type:        'Earnings Catalyst',
    time:        '23m ago',
    explanation: 'Earnings whisper raised 8% following channel checks in ad markets.',
  },
  {
    ticker:      'AMZN',
    type:        'Momentum Alert',
    time:        '41m ago',
    explanation: 'Closed above 20-day EMA for first time in 3 weeks; bands expanding.',
  },
  {
    ticker:      'CRM',
    type:        'Short Squeeze',
    time:        '58m ago',
    explanation: 'Short interest down 18% while borrow rate spiked — squeeze forming.',
  },
];

// ── Signal row ────────────────────────────────────────────────────────────────
function SignalRow({ ticker, type, time, explanation }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/StockView?symbol=${ticker}`)}
      className="w-full flex items-start gap-3 px-4 py-3 dark:hover:bg-white/[0.02] hover:bg-gray-50/60 transition-colors duration-150 text-left group"
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {/* Ticker */}
          <span className="text-xs font-semibold dark:text-white text-gray-900">
            {ticker}
          </span>

          {/* Type badge — single neutral style */}
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded dark:bg-white/[0.05] bg-gray-100 dark:text-gray-500 text-gray-400">
            {type}
          </span>
        </div>

        <p className="text-[11px] dark:text-gray-500 text-gray-500 leading-snug line-clamp-1">
          {explanation}
        </p>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 flex-shrink-0 text-[10px] dark:text-gray-700 text-gray-300 mt-0.5 whitespace-nowrap">
        <Clock className="w-2.5 h-2.5" />
        {time}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScannerSignals() {
  return (
    <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b dark:border-white/5 border-gray-100">
        <div>
          <h2 className="text-sm font-semibold dark:text-white text-gray-900">
            Triggered Today
          </h2>
          <p className="text-[11px] dark:text-gray-500 text-gray-400 mt-0.5">
            {SIGNALS.length} fresh signals from the scanner
          </p>
        </div>
        <Activity className="w-3 h-3 dark:text-gray-700 text-gray-300" />
      </div>

      {/* Signal rows */}
      <div className="divide-y dark:divide-white/[0.03] divide-gray-50">
        {SIGNALS.map((signal) => (
          <SignalRow key={`${signal.ticker}-${signal.type}`} {...signal} />
        ))}
      </div>
    </div>
  );
}
