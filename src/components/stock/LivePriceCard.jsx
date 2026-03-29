import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function LivePriceCard({ stock }) {
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await base44.functions.invoke('getStockQuote', { symbol: stock.symbol });
        setLiveData(res.data);
      } catch (error) {
        console.error('Price fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [stock.symbol]);

  if (loading) {
    return (
      <div className="p-3 rounded-xl dark:bg-white/5 bg-gray-50 animate-pulse">
        <div className="h-4 dark:bg-white/10 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-6 dark:bg-white/10 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  const isPositive = (liveData?.change || 0) >= 0;

  return (
    <div className="p-3 rounded-xl dark:bg-white/5 bg-gray-50">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold dark:text-white text-gray-900 text-sm">{stock.symbol}</p>
          <p className="text-xs dark:text-gray-500 text-gray-500 truncate max-w-32">{stock.company_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold dark:text-white text-gray-900">
            ${liveData?.current?.toFixed(2) || stock.last_price?.toFixed(2)}
          </p>
          {liveData && (
            <div className={`flex items-center gap-0.5 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isPositive ? '+' : ''}{liveData.percentChange?.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}