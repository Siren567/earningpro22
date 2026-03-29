import React, { useEffect, useRef, useState } from 'react';
import { BarChart2 } from 'lucide-react';

const timeframeToInterval = {
  '1D': '5',
  '5D': '15',
  '1M': '60',
  '3M': 'D',
  '6M': 'D',
  'YTD': 'D',
  '1Y': 'W',
  '5Y': 'W',
};

// Build ordered candidate list to try: primary first, then progressively simpler forms.
function buildCandidates(symbol) {
  if (!symbol) return [];
  const candidates = [symbol];

  // If exchange-prefixed (NASDAQ:AAPL) also try bare (AAPL)
  if (symbol.includes(':')) {
    candidates.push(symbol.split(':')[1]);
  }

  // If Yahoo-style suffix (BTC-USD, AAPL.L) also try base part
  const base = symbol.split(/[.:-]/)[0].toUpperCase();
  if (base && !candidates.includes(base)) {
    candidates.push(base);
  }

  return [...new Set(candidates)]; // deduplicate
}

// Validate a single symbol against TradingView's public search API.
// Returns the resolved full_name (e.g. "NASDAQ:AAPL") on success, null if not found.
// Returns the candidate unchanged on network/CORS failure so the widget can still try.
async function validateSymbol(candidate) {
  const searchText = candidate.includes(':') ? candidate.split(':')[1] : candidate;
  try {
    const res = await fetch(
      `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(searchText)}&hl=1&lang=en&domain=production`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return candidate; // Non-2xx → assume might be valid, pass through
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const upper = searchText.toUpperCase();

    // Prefer exact symbol match respecting exchange prefix if provided
    if (candidate.includes(':')) {
      const [exch, sym] = candidate.split(':');
      const exact = data.find(
        r => r.symbol?.toUpperCase() === sym.toUpperCase() &&
             r.exchange?.toUpperCase() === exch.toUpperCase()
      );
      if (exact) return exact.full_name || candidate;
    }

    // Exact symbol match (any exchange)
    const exact = data.find(r => r.symbol?.toUpperCase() === upper);
    if (exact) return exact.full_name || candidate;

    // Prefix match — first result is usually the best
    return data[0].full_name || candidate;
  } catch {
    // Timeout or CORS — pass original candidate through to the widget
    return candidate;
  }
}

// Try candidates in order; return first valid resolved symbol, or null if all fail.
async function resolveChartSymbol(symbol) {
  const candidates = buildCandidates(symbol);
  for (const candidate of candidates) {
    const resolved = await validateSymbol(candidate);
    if (resolved !== null) return resolved;
  }
  return null;
}

function mountWidget(container, symbol, interval) {
  container.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'tradingview-widget-container__widget';
  container.appendChild(div);

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.textContent = JSON.stringify({
    autosize: true,
    symbol,
    interval,
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    enable_publishing: false,
    allow_symbol_change: true,
    save_image: false,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    gridColor: 'rgba(255, 255, 255, 0.06)',
    hide_top_toolbar: false,
    hide_legend: false,
    support_host: 'https://www.tradingview.com',
  });
  container.appendChild(script);
}

export default function AdvancedChart({ symbol = 'AAPL', timeframe = '1D' }) {
  const containerRef = useRef(null);
  // 'loading' | 'ready' | 'unavailable'
  const [status, setStatus] = useState('loading');
  const [resolvedSymbol, setResolvedSymbol] = useState(null);

  // Phase 1: resolve symbol on every symbol change
  useEffect(() => {
    if (!symbol) {
      setStatus('unavailable');
      return;
    }
    console.log('[chart] symbol used:', symbol);
    setStatus('loading');
    setResolvedSymbol(null);
    let cancelled = false;

    resolveChartSymbol(symbol).then(resolved => {
      if (cancelled) return;
      if (resolved) {
        console.log('[chart] resolved to:', resolved);
        setResolvedSymbol(resolved);
        setStatus('ready');
      } else {
        console.warn('[chart] could not resolve symbol — falling back to raw:', symbol);
        // Fallback: mount with the raw symbol rather than showing "unavailable"
        setResolvedSymbol(symbol);
        setStatus('ready');
      }
    });

    return () => { cancelled = true; };
  }, [symbol]);

  // Phase 2: mount widget once a valid symbol is confirmed
  useEffect(() => {
    if (status !== 'ready' || !resolvedSymbol || !containerRef.current) return;
    const interval = timeframeToInterval[timeframe] || 'D';
    mountWidget(containerRef.current, resolvedSymbol, interval);
  }, [status, resolvedSymbol, timeframe]);

  // Unavailable state — clean fallback, no broken widget
  if (status === 'unavailable') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-3">
        <BarChart2 className="w-10 h-10 dark:text-gray-700 text-gray-300" />
        <p className="text-sm font-medium dark:text-gray-400 text-gray-500">Chart not available</p>
        <p className="text-xs dark:text-gray-600 text-gray-400">
          TradingView does not support this symbol
        </p>
      </div>
    );
  }

  return (
    <div className="tradingview-widget-container relative" ref={containerRef} style={{ height: '100%', width: '100%' }}>
      {/* Spinner shown while resolving the symbol */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 dark:border-white/10 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      <style>{`
        .tradingview-widget-container { border-radius: 0; overflow: hidden; height: 100%; }
      `}</style>
    </div>
  );
}
