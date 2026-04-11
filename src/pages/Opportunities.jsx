import React, { useState, useEffect } from 'react';
import { getStockData } from '@/api/yahooFinanceApi';
import { useQuery } from '@tanstack/react-query';
import { Activity, TrendingUp, AlertCircle, Loader2, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Curated liquid names — replaces Base44 Stock.list (no backend required). */
const OPPORTUNITIES_SEED = [
  { id: 'AAPL', symbol: 'AAPL', company_name: 'Apple Inc.' },
  { id: 'MSFT', symbol: 'MSFT', company_name: 'Microsoft Corporation' },
  { id: 'GOOGL', symbol: 'GOOGL', company_name: 'Alphabet Inc.' },
  { id: 'AMZN', symbol: 'AMZN', company_name: 'Amazon.com Inc.' },
  { id: 'NVDA', symbol: 'NVDA', company_name: 'NVIDIA Corporation' },
  { id: 'META', symbol: 'META', company_name: 'Meta Platforms Inc.' },
  { id: 'TSLA', symbol: 'TSLA', company_name: 'Tesla Inc.' },
  { id: 'AVGO', symbol: 'AVGO', company_name: 'Broadcom Inc.' },
  { id: 'ORCL', symbol: 'ORCL', company_name: 'Oracle Corporation' },
  { id: 'CRM', symbol: 'CRM', company_name: 'Salesforce Inc.' },
  { id: 'AMD', symbol: 'AMD', company_name: 'Advanced Micro Devices' },
  { id: 'INTC', symbol: 'INTC', company_name: 'Intel Corporation' },
  { id: 'QCOM', symbol: 'QCOM', company_name: 'Qualcomm Inc.' },
  { id: 'NFLX', symbol: 'NFLX', company_name: 'Netflix Inc.' },
  { id: 'DIS', symbol: 'DIS', company_name: 'The Walt Disney Company' },
  { id: 'JPM', symbol: 'JPM', company_name: 'JPMorgan Chase & Co.' },
  { id: 'BAC', symbol: 'BAC', company_name: 'Bank of America Corp.' },
  { id: 'XOM', symbol: 'XOM', company_name: 'Exxon Mobil Corporation' },
  { id: 'CVX', symbol: 'CVX', company_name: 'Chevron Corporation' },
  { id: 'WMT', symbol: 'WMT', company_name: 'Walmart Inc.' },
  { id: 'JNJ', symbol: 'JNJ', company_name: 'Johnson & Johnson' },
  { id: 'UNH', symbol: 'UNH', company_name: 'UnitedHealth Group' },
  { id: 'LLY', symbol: 'LLY', company_name: 'Eli Lilly and Company' },
  { id: 'V', symbol: 'V', company_name: 'Visa Inc.' },
  { id: 'MA', symbol: 'MA', company_name: 'Mastercard Inc.' },
  { id: 'PG', symbol: 'PG', company_name: 'Procter & Gamble' },
  { id: 'HD', symbol: 'HD', company_name: 'Home Depot Inc.' },
  { id: 'MRK', symbol: 'MRK', company_name: 'Merck & Co.' },
  { id: 'ABBV', symbol: 'ABBV', company_name: 'AbbVie Inc.' },
  { id: 'COST', symbol: 'COST', company_name: 'Costco Wholesale' },
  { id: 'PEP', symbol: 'PEP', company_name: 'PepsiCo Inc.' },
  { id: 'KO', symbol: 'KO', company_name: 'The Coca-Cola Company' },
  { id: 'MCD', symbol: 'MCD', company_name: "McDonald's Corporation" },
  { id: 'CSCO', symbol: 'CSCO', company_name: 'Cisco Systems Inc.' },
  { id: 'ADBE', symbol: 'ADBE', company_name: 'Adobe Inc.' },
  { id: 'PFE', symbol: 'PFE', company_name: 'Pfizer Inc.' },
  { id: 'TMO', symbol: 'TMO', company_name: 'Thermo Fisher Scientific' },
  { id: 'ACN', symbol: 'ACN', company_name: 'Accenture plc' },
  { id: 'DHR', symbol: 'DHR', company_name: 'Danaher Corporation' },
  { id: 'VZ', symbol: 'VZ', company_name: 'Verizon Communications' },
  { id: 'NKE', symbol: 'NKE', company_name: 'Nike Inc.' },
  { id: 'PM', symbol: 'PM', company_name: 'Philip Morris International' },
  { id: 'TXN', symbol: 'TXN', company_name: 'Texas Instruments' },
  { id: 'NEE', symbol: 'NEE', company_name: 'NextEra Energy' },
  { id: 'RTX', symbol: 'RTX', company_name: 'RTX Corporation' },
  { id: 'HON', symbol: 'HON', company_name: 'Honeywell International' },
  { id: 'LOW', symbol: 'LOW', company_name: "Lowe's Companies Inc." },
  { id: 'UPS', symbol: 'UPS', company_name: 'United Parcel Service' },
  { id: 'SPGI', symbol: 'SPGI', company_name: 'S&P Global Inc.' },
  { id: 'INTU', symbol: 'INTU', company_name: 'Intuit Inc.' },
  { id: 'IBM', symbol: 'IBM', company_name: 'IBM Corporation' },
];

export default function Opportunities() {
  const [searchQuery, setSearchQuery] = useState('');

  const topStocks = OPPORTUNITIES_SEED;

  useEffect(() => {
    console.log('[dataSource] Opportunities:', topStocks.length, 'seed symbols; quotes: Yahoo /api/yf');
  }, [topStocks.length]);

  const { data: quotes = {}, isLoading: loadingQuotes } = useQuery({
    queryKey: ['opportunitiesQuotes', topStocks.map(s => s.symbol).join(',')],
    queryFn: async () => {
      if (topStocks.length === 0) return {};

      // Volume + avgVolume need v8 chart series — same /api/yf?_fp= proxy as watchlist
      const promises = topStocks.map(stock =>
        getStockData(stock.symbol)
          .then((d) => ({
            symbol: stock.symbol,
            data: d
              ? {
                  current: d.price,
                  volume: d.volume,
                  avgVolume: d.avgVolume,
                }
              : null,
          }))
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

  const isLoading = loadingQuotes;

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