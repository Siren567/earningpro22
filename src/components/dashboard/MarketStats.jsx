import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStockQuote } from '@/api/yahooFinanceApi';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MarketStats() {
  const { data: marketData } = useQuery({
    queryKey: ['marketStats'],
    queryFn: async () => {
      const symbols = ['AAPL', 'SPY', 'QQQ'];
      console.log('[dataSource] MarketStats: Yahoo v8/chart', symbols.join(', '));
      const quotes = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const data = await getStockQuote(symbol);
            return { symbol, ...data };
          } catch {
            return null;
          }
        })
      );
      return quotes.filter(q => q);
    },
    refetchInterval: 30000,
  });

  if (!marketData || marketData.length === 0) return null;

  return (
    <div className="flex items-center gap-4 overflow-x-auto pb-2">
      {marketData.map((quote) => {
        const isPositive = (quote.percentChange || 0) >= 0;
        return (
          <div key={quote.symbol} className="flex items-center gap-2 px-3 py-2 rounded-lg dark:bg-white/5 bg-gray-100 min-w-fit">
            <span className="font-semibold dark:text-white text-gray-900 text-sm">{quote.symbol}</span>
            <span className="dark:text-gray-400 text-gray-600 text-sm">${quote.current?.toFixed(2)}</span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{quote.percentChange?.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}