import React from 'react';
import { X, TrendingUp, TrendingDown, ExternalLink, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getStockQuote } from '@/api/yahooFinanceApi';
import { getCachedStockData } from '@/lib/stocksCache';

export default function StockPreviewPanel({ symbol, name, isOpen, onClose }) {
  const { data: quote, isLoading: loadingQuote } = useQuery({
    queryKey: ['previewQuote', symbol],
    queryFn: async () => {
      // Live quote via /api/yf?_fp=… (not Base44 /api/functions — avoids prod 404)
      try {
        const q = await getStockQuote(symbol);
        console.log('[dataSource] StockPreviewPanel quote: Yahoo', symbol);
        return q;
      } catch {
        return null;
      }
    },
    enabled: isOpen && !!symbol,
    staleTime: 15000,
    retry: 0,
  });

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['previewProfile', symbol],
    queryFn: () => getCachedStockData(symbol),
    enabled: isOpen && !!symbol,
    staleTime: 300000,
    retry: 0,
  });

  if (!isOpen) return null;

  const price = quote?.current ?? profile?.price;
  const change = quote?.change ?? profile?.change;
  const changePercent = quote?.percentChange ?? profile?.changePercent;
  const volume = quote?.volume ?? profile?.volume;
  const marketStatus = profile?.marketStatus ?? quote?.marketStatus;
  const description = profile?.description;
  const isPositive = changePercent != null ? changePercent >= 0 : null;
  const isLoading = loadingQuote || loadingProfile;

  const statusLabel = (() => {
    const s = marketStatus?.toUpperCase();
    if (s === 'REGULAR') return { text: 'Market Open', color: 'text-blue-500' };
    if (s === 'PRE')     return { text: 'Pre-Market',  color: 'text-blue-400' };
    if (s === 'POST')    return { text: 'After Hours', color: 'text-orange-400' };
    return { text: 'Market Closed', color: 'dark:text-gray-500 text-gray-400' };
  })();

  return (
    <div className="w-full dark:bg-[#111] bg-gray-50 rounded-xl border dark:border-white/5 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b dark:border-white/5 border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold dark:text-white text-gray-900 uppercase tracking-wider">{symbol}</span>
          <span className={`text-[10px] font-medium ${statusLabel.color}`}>· {statusLabel.text}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-gray-200 transition-colors"
        >
          <X className="w-3.5 h-3.5 dark:text-gray-400 text-gray-500" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Price Row */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold dark:text-white text-gray-900">
                {price != null ? `$${Number(price).toFixed(2)}` : '—'}
              </span>
              {changePercent != null && (
                <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isPositive ? '+' : ''}{Number(changePercent).toFixed(2)}%
                  {change != null && (
                    <span className="font-normal text-xs">
                      ({isPositive ? '+' : ''}{Number(change).toFixed(2)})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Volume */}
            {volume != null && (
              <div className="flex items-center gap-2 text-xs">
                <span className="dark:text-gray-500 text-gray-500">Volume</span>
                <span className="dark:text-gray-300 text-gray-700 font-medium">{Number(volume).toLocaleString()}</span>
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-xs dark:text-gray-500 text-gray-500 leading-relaxed line-clamp-2">{description}</p>
            )}

            {/* Open in Stock View */}
            <a
              href={`/StockView?symbol=${symbol}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-cyan-400 transition-colors"
            >
              Open full view
              <ExternalLink className="w-3 h-3" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}