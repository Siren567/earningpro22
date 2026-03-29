import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../components/LanguageContext';
import { Activity, TrendingUp, AlertCircle, Loader2, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Opportunities() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [stocks, setStocks] = useState([]);

  // Fetch top stocks to scan for volume spikes
  const { data: topStocks = [], isLoading: loadingStocks } = useQuery({
    queryKey: ['opportunitiesStocks'],
    queryFn: async () => {
      try {
        const res = await base44.entities.Stock.list('-ai_score', 50);
        return res || [];
      } catch (err) {
        console.warn('[Opportunities] Error fetching stocks:', err.message);
        return [];
      }
    },
    staleTime: 60000,
  });

  // Fetch quotes for volume spike calculation
  const { data: quotes = {}, isLoading: loadingQuotes } = useQuery({
    queryKey: ['opportunitiesQuotes', topStocks.map(s => s.symbol).join(',')],
    queryFn: async () => {
      if (topStocks.length === 0) return {};

      const promises = topStocks.map(stock =>
        base44.functions.invoke('getStockQuote', { symbol: stock.symbol })
          .then(res => ({ symbol: stock.symbol, data: res.data || null }))
          .catch(() => ({ symbol: stock.symbol, data: null }))
      );

      const results = {};
      const responses = await Promise.all(promises);
      responses.forEach(({ symbol, data }) => {
        results[symbol] = data;
      });
      return results;
    },
    enabled: topStocks.length > 0,
    staleTime: 60000,
  });

  // Calculate volume spikes
  const getVolumeSpike = (symbol) => {
    const quote = quotes[symbol];
    if (!quote?.volume || !quote?.avgVolume) return null;
    return quote.volume / quote.avgVolume;
  };

  const getVolumeSpikeBadge = (spike) => {
    if (spike === null || spike === undefined) return { label: '-', icon: null, color: 'text-gray-500' };
    
    if (spike >= 3) {
      return { label: 'Very High Activity', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' };
    }
    if (spike >= 2) {
      return { label: 'High Activity', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' };
    }
    if (spike >= 1.5) {
      return { label: 'Moderate Activity', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    }
    return { label: 'Normal', icon: Activity, color: 'text-gray-500', bg: 'bg-gray-500/10' };
  };

  // Filter and sort stocks by volume spike
  const filteredStocks = topStocks.filter(stock => {
    if (!searchQuery) return true;
    return (
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).sort((a, b) => {
    const spikeA = getVolumeSpike(a.symbol) || 0;
    const spikeB = getVolumeSpike(b.symbol) || 0;
    return spikeB - spikeA;
  });

  const isLoading = loadingStocks || loadingQuotes;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white text-gray-900">Opportunities</h1>
        <p className="text-sm dark:text-gray-500 text-gray-500 mt-1">Volume spike scanner for unusual market activity</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by symbol or company name..."
          className="pl-10 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-xl h-11"
        />
      </div>

      {/* Opportunities Table */}
      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden shadow-lg">
        <div className="p-6 border-b dark:border-white/5 border-gray-200">
          <h3 className="text-sm font-semibold dark:text-white text-gray-900 uppercase tracking-wider">Volume Spike Scanner</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <AlertCircle className="w-12 h-12 dark:text-gray-700 text-gray-300 mb-3" />
            <p className="dark:text-gray-500 text-gray-500">No stocks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-white/5 border-gray-200">
                  <th className="text-left py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Symbol</th>
                  <th className="text-left py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Company</th>
                  <th className="text-right py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Price</th>
                  <th className="text-right py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Volume</th>
                  <th className="text-right py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Avg Volume</th>
                  <th className="text-right py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Spike Ratio</th>
                  <th className="text-center py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Activity Status</th>
                  <th className="text-center py-3 px-6 font-semibold dark:text-gray-400 text-gray-600 text-xs uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => {
                  const spike = getVolumeSpike(stock.symbol);
                  const badge = getVolumeSpikeBadge(spike);
                  const IconComponent = badge.icon;
                  const quote = quotes[stock.symbol];

                  return (
                    <tr key={stock.id} className="border-b dark:border-white/5 border-gray-200 dark:hover:bg-white/[0.02] hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 font-bold dark:text-white text-gray-900">{stock.symbol}</td>
                      <td className="py-4 px-6 dark:text-gray-400 text-gray-600 text-sm">{stock.company_name}</td>
                      <td className="py-4 px-6 text-right dark:text-white text-gray-900 font-semibold">
                        {quote?.current !== undefined ? `$${quote.current.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-4 px-6 text-right dark:text-gray-400 text-gray-600 text-sm">
                        {quote?.volume ? (quote.volume / 1e6).toFixed(1) + 'M' : '—'}
                      </td>
                      <td className="py-4 px-6 text-right dark:text-gray-400 text-gray-600 text-sm">
                        {quote?.avgVolume ? (quote.avgVolume / 1e6).toFixed(1) + 'M' : '—'}
                      </td>
                      <td className="py-4 px-6 text-right dark:text-white text-gray-900 font-semibold">
                        {spike !== null ? spike.toFixed(2) + 'x' : '—'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${badge.bg || 'bg-gray-500/10'}`}>
                          {IconComponent && <IconComponent className={`w-4 h-4 ${badge.color}`} />}
                          <span className={badge.color}>{badge.label}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => window.location.href = `/StockView?symbol=${stock.symbol}`}
                          className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-gray-200 transition-colors"
                          title="View stock details"
                        >
                          <Eye className="w-4 h-4 dark:text-gray-500 hover:dark:text-cyan-400 text-gray-500 hover:text-blue-600 transition-colors" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}