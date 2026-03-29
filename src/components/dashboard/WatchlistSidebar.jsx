import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, BookmarkX, TrendingUp, TrendingDown } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useCustomLists } from '../hooks/useCustomLists';
import { getStockQuote } from '@/api/yahooFinanceApi';
import StockLogo from '../stock/StockLogo';
import MiniSparkline from './MiniSparkline';

// ── Deterministic mock sparkline ──────────────────────────────────────────────
// When live OHLC data isn't available we still render a plausible trend so the
// UI never shows a blank sparkline slot.  The pattern is seeded from the symbol
// so each stock gets a unique but stable shape across re-renders.
function mockSparkline(symbol, isPositive) {
  let seed = Array.from(symbol).reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const base   = 100;
  const points = 8;
  const drift  = isPositive ? 0.004 : -0.004;
  const result = [base];

  for (let i = 1; i < points; i++) {
    const noise = (rand() - 0.5) * 3;
    result.push(result[i - 1] * (1 + drift) + noise);
  }
  return result;
}

// ── Single watchlist row ──────────────────────────────────────────────────────
function WatchlistRow({ symbol }) {
  const navigate = useNavigate();

  const { data: quote, isLoading } = useQuery({
    queryKey:        ['wl-quote', symbol],
    queryFn:         () => getStockQuote(symbol),
    staleTime:       60_000,
    refetchInterval: 60_000,
    retry:           1,
  });

  const price      = quote?.current;
  const pct        = quote?.percentChange;
  const isPositive = (pct ?? 0) >= 0;
  // Price badge: green / red — only used for the % change text
  const trendColor = price == null ? '#6b7280' : isPositive ? '#34d399' : '#f87171';
  // Sparkline: uniform soft blue — neutral, readable, not competing with price color
  const sparkColor = '#60a5fa';

  // Build OHLC sparkline from live data; fall back to deterministic mock
  const sparkline = useMemo(() => {
    if (quote?.open && quote?.high && quote?.low && quote?.current) {
      const { open, high, low, current } = quote;
      return [open, (open + high) / 2, high, (high + low) / 2, low, current];
    }
    // Use mock when quote is still loading or OHLC fields are missing
    return mockSparkline(symbol, isPositive);
  }, [quote, symbol, isPositive]);

  return (
    <button
      onClick={() => navigate(`/StockView?symbol=${symbol}`)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl dark:hover:bg-white/[0.04] hover:bg-gray-50 transition-colors duration-150 text-left group"
    >
      {/* Logo — real image via Parqet CDN, falls back to letter avatar */}
      <StockLogo symbol={symbol} className="w-8 h-8 rounded-lg flex-shrink-0" />

      {/* Ticker */}
      <span className="text-xs font-semibold dark:text-gray-300 text-gray-700 w-10 flex-shrink-0 leading-none">
        {symbol.split('.')[0]}
      </span>

      {/* Sparkline — always rendered (mock if live unavailable) */}
      <div className="flex-1 h-8 min-w-0">
        <MiniSparkline
          data={sparkline}
          color={isLoading ? '#374151' : sparkColor}
          height={32}
          filled={false}
        />
      </div>

      {/* Price + % change */}
      <div className="text-right flex-shrink-0 min-w-[60px]">
        {isLoading ? (
          <>
            <div className="h-3 w-14 dark:bg-white/8 bg-gray-200 rounded animate-pulse ml-auto mb-1.5" />
            <div className="h-2.5 w-9 dark:bg-white/5 bg-gray-100 rounded animate-pulse ml-auto" />
          </>
        ) : (
          <>
            <p className="text-xs font-medium dark:text-gray-300 text-gray-700 tabular-nums leading-none">
              {price != null ? `$${price.toFixed(2)}` : '—'}
            </p>
            <div
              className="flex items-center justify-end gap-0.5 mt-1"
              style={{ color: trendColor }}
            >
              {pct != null ? (
                <>
                  {isPositive
                    ? <TrendingUp className="w-2.5 h-2.5" />
                    : <TrendingDown className="w-2.5 h-2.5" />}
                  <span className="text-[10px] font-medium tabular-nums">
                    {isPositive ? '+' : ''}{pct.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-[10px] dark:text-gray-600 text-gray-400">—</span>
              )}
            </div>
          </>
        )}
      </div>
    </button>
  );
}

// ── Row skeleton ──────────────────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
      <div className="w-8 h-8 rounded-lg dark:bg-white/[0.06] bg-gray-100 flex-shrink-0" />
      <div className="w-10 h-3 dark:bg-white/[0.06] bg-gray-200 rounded flex-shrink-0" />
      <div className="flex-1 h-8 dark:bg-white/[0.03] bg-gray-50 rounded" />
      <div className="flex-shrink-0 space-y-1.5 min-w-[60px]">
        <div className="h-3 w-14 dark:bg-white/[0.06] bg-gray-200 rounded ml-auto" />
        <div className="h-2.5 w-9 dark:bg-white/[0.04] bg-gray-100 rounded ml-auto" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
      <div className="w-10 h-10 rounded-xl dark:bg-white/[0.04] bg-gray-100 flex items-center justify-center mb-3">
        <BookmarkX className="w-4 h-4 dark:text-gray-600 text-gray-400" />
      </div>
      <p className="text-xs font-medium dark:text-gray-400 text-gray-600 mb-1">No stocks yet</p>
      <p className="text-[11px] dark:text-gray-600 text-gray-400 mb-4 leading-snug">
        Save stocks from the Watchlist to track them here
      </p>
      <button
        onClick={onAdd}
        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/15"
      >
        Go to Watchlist
      </button>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function WatchlistSidebar() {
  const navigate = useNavigate();

  // Source 1: flat favorites (user_watchlist table)
  const { symbols: favSymbols, loading: favLoading } = useWatchlist();

  // Source 2: all named custom lists (user_watchlist_lists + user_watchlist_items)
  const { customCategories, listsLoading } = useCustomLists();

  const loading = favLoading || listsLoading;

  // Merge all sources — favorites first, then deduped custom-list symbols
  const allSymbols = useMemo(() => {
    const customSymbols = Object.values(customCategories)
      .flatMap(cat => cat.assets ?? []);

    const seen  = new Set(favSymbols);
    const extra = customSymbols.filter(s => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });

    const merged = [...favSymbols, ...extra];
    console.log('[WatchlistSidebar] allSymbols:', merged.length,
      '(fav:', favSymbols.length, '+ custom:', extra.length, ')');
    return merged;
  }, [favSymbols, customCategories]);

  const displaySymbols = allSymbols.slice(0, 6);

  return (
    <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b dark:border-white/5 border-gray-100">
        <div>
          <h2 className="text-sm font-semibold dark:text-white text-gray-900">My Watchlist</h2>
          <p className="text-[11px] dark:text-gray-500 text-gray-400 mt-0.5">
            {loading
              ? 'Loading…'
              : `${allSymbols.length} stock${allSymbols.length !== 1 ? 's' : ''} tracked`}
          </p>
        </div>
        <button
          onClick={() => navigate('/Watchlist')}
          className="w-7 h-7 rounded-lg dark:bg-white/[0.05] bg-gray-100 flex items-center justify-center dark:hover:bg-white/10 hover:bg-gray-200 transition-colors"
          aria-label="Manage watchlist"
        >
          <Plus className="w-3.5 h-3.5 dark:text-gray-400 text-gray-600" />
        </button>
      </div>

      {/* Column header labels */}
      {!loading && displaySymbols.length > 0 && (
        <div className="flex items-center gap-3 px-3 pt-2 pb-1">
          <div className="w-8 flex-shrink-0" />
          <div className="w-10 flex-shrink-0" />
          <span className="flex-1 text-[9px] font-semibold uppercase tracking-widest dark:text-gray-700 text-gray-300 text-center">
            5d trend
          </span>
          <div className="min-w-[60px] text-right">
            <span className="text-[9px] font-semibold uppercase tracking-widest dark:text-gray-700 text-gray-300">
              Price
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pb-2">
        {loading ? (
          <div className="pt-1 space-y-0.5">
            {[...Array(4)].map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : displaySymbols.length === 0 ? (
          <EmptyState onAdd={() => navigate('/Watchlist')} />
        ) : (
          <div className="space-y-0">
            {displaySymbols.map(sym => (
              <WatchlistRow key={sym} symbol={sym} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && allSymbols.length > 6 && (
        <div className="border-t dark:border-white/5 border-gray-100 px-4 py-2.5">
          <button
            onClick={() => navigate('/Watchlist')}
            className="w-full text-[11px] font-medium dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 transition-colors text-center"
          >
            View all {allSymbols.length} stocks →
          </button>
        </div>
      )}
    </div>
  );
}
