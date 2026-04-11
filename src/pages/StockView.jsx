import React, { useState, useEffect, useRef } from 'react';
import { getFmpKeyMetricsBridge } from '@/api/fmpApi';
import { useWatchlist } from '../components/hooks/useWatchlist';
import {
  getStockQuote            as yahooGetStockQuote,
  getStockFundamentals     as yahooGetFundamentals,
  getStockEarningsFromYahoo as yahooGetStockEarnings,
} from '@/api/yahooFinanceApi';
import {
  getCachedStockData as yahooGetStockData,
  searchWithCache    as yahooSearchStocks,
} from '@/lib/stocksCache';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../components/LanguageContext';
import { useMarketDataRefresh } from '../components/hooks/useMarketDataRefresh';
import { useFinnhubWebSocket } from '../components/hooks/useFinnhubWebSocket';
import { Search, TrendingUp, TrendingDown, ArrowRight, Building, Globe, User as UserIcon, ExternalLink, Calendar, Loader2, AlertCircle, Star, Maximize2, Bell, Plus, Lock, Zap, Share2, RefreshCw, Sun, Moon, Clock, Heart, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AdvancedChart from '../components/tradingview/AdvancedChart';
import SearchResultsDropdown from '../components/stock/SearchResultsDropdown';
import UnifiedWatchlistMenu from '../components/watchlist/UnifiedWatchlistMenu';
import { format, differenceInDays } from 'date-fns';
import StockLogo from '../components/stock/StockLogo';
import StockMetrics from '../components/stock/StockMetrics';
import KeyMetricsGrid from '../components/stock/KeyMetricsGrid';
import CompanyOverview from '../components/stock/CompanyOverview';
import LeverageTag, { detectLeverage } from '../components/stock/LeverageTag.jsx';
import StockErrorBoundary from '../components/stock/StockErrorBoundary';
import WyckoffAnalysisCard from '../components/stock/WyckoffAnalysisCard';

const PriceFlash = ({ isVisible, type }) => {
  if (!isVisible) return null;
  return (
    <style>{`
      @keyframes priceFlash {
        0% { background-color: rgba(${type === 'up' ? '16, 185, 129' : '239, 68, 68'}, 0.15); }
        50% { background-color: rgba(${type === 'up' ? '16, 185, 129' : '239, 68, 68'}, 0.08); }
        100% { background-color: transparent; }
      }
      .price-flash {
        animation: priceFlash 500ms cubic-bezier(0.4, 0, 0.2, 1);
      }
    `}</style>
  );
};

const normalizeSymbol = (symbol) => {
  if (!symbol) return '';
  // Preserve exchange suffix (e.g. .TA, .L) — Yahoo requires the full symbol for international listings
  return symbol.toUpperCase();
};

/**
 * formatSymbol — normalise a Yahoo Finance exchange name to its TradingView prefix.
 *
 * Yahoo returns exchange strings in several casing/spacing variants:
 *   "NYSE Arca"  "NYSEArca"  "NasdaqGS"  "NasdaqGM"  "NasdaqCM"  "NYSE"  …
 * We collapse whitespace and lowercase before matching so every variant hits
 * the right bucket regardless of how Yahoo spelled it.
 *
 * TradingView uses "AMEX" for all NYSE Arca listings (ETFs etc.).
 */
const EXCHANGE_MAP = {
  // NYSE Arca — Yahoo sends this with and without a space, and in camelCase
  nysearca:   'AMEX',
  'nyse arca':'AMEX',
  arca:       'AMEX',

  // NASDAQ variants
  nasdaqgs:   'NASDAQ', // Global Select
  nasdaqgm:   'NASDAQ', // Global Market
  nasdaqcm:   'NASDAQ', // Capital Market
  nasdaq:     'NASDAQ',

  // NYSE
  nyse:       'NYSE',

  // Other US
  cboe:       'CBOE',
  bats:       'BATS',
  otcmkts:    'OTC',
  'otc markets':'OTC',
  pink:       'OTC',
};

function formatSymbol(symbol, exchange) {
  if (!symbol) return symbol;
  // Strip Yahoo suffix (e.g. .L, .TA) to get the bare ticker
  const base = symbol.split('.')[0].toUpperCase();
  if (!exchange) return base;

  // Normalise: lowercase + collapse all whitespace
  const key = exchange.toLowerCase().replace(/\s+/g, '');

  // Exact key lookup first
  if (EXCHANGE_MAP[key]) return `${EXCHANGE_MAP[key]}:${base}`;

  // Substring fallback for unexpected variants (e.g. "nysearca2" shouldn't happen, but safe)
  for (const [mapKey, prefix] of Object.entries(EXCHANGE_MAP)) {
    if (key.includes(mapKey.replace(/\s+/g, ''))) return `${prefix}:${base}`;
  }

  // Unknown exchange — return bare ticker; TradingView will auto-resolve
  return base;
}

/**
 * Convert a Yahoo Finance symbol + exchange name to TradingView format.
 * Yahoo exchange strings (fullExchangeName) → TradingView prefix.
 * Applied only to the TradingView chart widget — not Yahoo API calls.
 */
const toTradingViewSymbol = (symbol, exchange) => {
  if (!symbol) return symbol;
  const base = symbol.split('.')[0].toUpperCase();
  const suffix = symbol.includes('.') ? symbol.split('.').pop().toUpperCase() : '';

  // Exchange-suffix based mapping (most reliable for international listings)
  if (suffix === 'TA')  return `TASE:${base}`;
  if (suffix === 'L')   return `LSE:${base}`;
  if (suffix === 'DE')  return `XETR:${base}`;
  if (suffix === 'PA')  return `EURONEXT:${base}`;
  if (suffix === 'AS')  return `EURONEXT:${base}`;
  if (suffix === 'HK')  return `HKEX:${base}`;
  if (suffix === 'T')   return `TSE:${base}`;
  if (suffix === 'AX')  return `ASX:${base}`;
  if (suffix === 'TO')  return `TSX:${base}`;
  if (suffix === 'SI')  return `SGX:${base}`;

  // US / global exchange name → TradingView prefix via formatSymbol
  // This handles all Yahoo casing variants including "NYSEArca" (no space)
  return formatSymbol(base, exchange);
};

const getUSMarketSessionByIsraelTime = () => {
  const now = new Date();
  const israelTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  );
  
  const day = israelTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = israelTime.getHours();
  const minute = israelTime.getMinutes();
  
  // Weekend = CLOSED
  if (day === 0 || day === 6) {
    return "CLOSED";
  }
  
  const totalMinutes = hour * 60 + minute;
  
  // PRE-MARKET: 11:00 – 16:29 (660 – 989 minutes)
  if (totalMinutes >= 660 && totalMinutes < 990) {
    return "PRE";
  }
  
  // OPEN: 16:30 – 22:59 (990 – 1379 minutes)
  if (totalMinutes >= 990 && totalMinutes < 1380) {
    return "REGULAR";
  }
  
  // AFTER HOURS: 23:00 – 03:59 (1380 minutes or >= 0 and < 240)
  if (totalMinutes >= 1380 || totalMinutes < 240) {
    return "POST";
  }
  
  // CLOSED: 04:00 – 10:59
  return "CLOSED";
};

export default function StockView() {
  const { t, lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [normalizedSymbol, setNormalizedSymbol] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const [priceFlash, setPriceFlash] = useState(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [currentMarketStatus, setCurrentMarketStatus] = useState(null);
  const [watchlistMenuOpen, setWatchlistMenuOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('watchlist_custom_categories');
    return saved ? JSON.parse(saved) : {};
  });
  const prevPriceRef = useRef(null);

  /** Optional: set VITE_FINNHUB_API_KEY for browser WS ticks; otherwise Yahoo polling only (no Base44). */
  const finnhubWsKey = (import.meta.env.VITE_FINNHUB_API_KEY || '').trim() || null;

  // Supabase-backed watchlist (falls back to localStorage for guests)
  const { symbols: watchlistSymbols, isSaved: isInWatchlist, toggle: toggleWatchlist } = useWatchlist();

  useEffect(() => {
    localStorage.setItem('watchlist_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  const getStockWatchlistStatus = (symbol) => {
    const status = {};
    if (isInWatchlist(symbol)) {
      status['my-watchlist'] = true;
    }
    Object.entries(customCategories).forEach(([id, cat]) => {
      if (cat.assets.includes(symbol)) {
        status[`custom-${id}`] = true;
      }
    });
    return status;
  };

  const addToWatchlist = (symbol, listId) => {
    if (listId === 'my-watchlist') {
      toggleWatchlist(symbol, 'stock');
    } else {
      const customId = listId.replace('custom-', '');
      if (customCategories[customId] && !customCategories[customId].assets.includes(symbol)) {
        const updated = { ...customCategories };
        updated[customId] = { ...updated[customId], assets: [...updated[customId].assets, symbol] };
        setCustomCategories(updated);
      }
    }
    setWatchlistMenuOpen(false);
  };

  const removeFromWatchlist = (symbol, listId) => {
    if (listId === 'my-watchlist') {
      toggleWatchlist(symbol, 'stock');
    } else {
      const customId = listId.replace('custom-', '');
      if (customCategories[customId]) {
        const updated = { ...customCategories };
        updated[customId] = { ...updated[customId], assets: updated[customId].assets.filter(s => s !== symbol) };
        setCustomCategories(updated);
      }
    }
    setWatchlistMenuOpen(false);
  };

  const createNewWatchlist = async (name, symbol) => {
    const id = `cat-${Date.now()}`;
    setCustomCategories(prev => ({ ...prev, [id]: { name, assets: [symbol] } }));
    setWatchlistMenuOpen(false);
  };

  const isSaved = normalizedSymbol && (isInWatchlist(normalizedSymbol) || Object.values(getStockWatchlistStatus(normalizedSymbol || '')).some(v => v));

  // Check URL params for initial symbol
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const symbol = params.get('symbol');
    if (symbol) {
      const normalized = normalizeSymbol(symbol);
      setSelectedStock(symbol.toUpperCase());
      setNormalizedSymbol(normalized);
      setSearchQuery('');
    }
  }, []);

  // Normalize symbol when selected
  React.useEffect(() => {
    if (selectedStock) {
      const normalized = normalizeSymbol(selectedStock);
      setNormalizedSymbol(normalized);
      console.log('[StockView] Symbol:', selectedStock, '-> Normalized:', normalized);
    }
  }, [selectedStock]);

  // Debounce search — sanitize and normalize input (mobile-safe)
  useEffect(() => {
    const sanitized = searchQuery.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
    const normalized = sanitized.toUpperCase();
    const timer = setTimeout(() => {
      console.log('[StockView Search] Input:', JSON.stringify(searchQuery), '-> normalized:', normalized);
      setDebouncedQuery(normalized);
      if (normalized.length > 0) setShowDropdown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click/touch
  useEffect(() => {
    const handleOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['stockSearch', debouncedQuery],
    queryFn: async () => {
      console.log('[dataSource] search: Yahoo v1/finance/search', debouncedQuery);
      const data = await yahooSearchStocks(debouncedQuery);
      console.log('[dataSource] search results:', data.length, data.slice(0, 5).map(r => r.symbol).join(', '));
      return data;
    },
    // NOT gated by showDropdown — ensures mobile always fetches even if dropdown state lags
    enabled: debouncedQuery.length >= 1,
    staleTime: 30000,
  });

  const handleSelectStock = (stock) => {
    if (stock) {
      setSelectedStock(stock.symbol);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  const { data: finalStock, isLoading: loadingProfile } = useQuery({
    queryKey: ['stockData', normalizedSymbol],
    queryFn: async () => {
      if (!normalizedSymbol) return null;
      try {
        const data = await yahooGetStockData(normalizedSymbol);
        console.log('[dataSource] profile: Yahoo v8/chart', normalizedSymbol, {
          name: data.companyName, price: data.price, status: data.marketStatus,
        });
        return data;
      } catch (err) {
        console.warn('[StockData] Error:', err.message);
        return null;
      }
    },
    enabled: !!normalizedSymbol,
    staleTime: 60000, // Keep metadata stable for 60s
    gcTime: 300000, // Keep in cache for 5 min
    retry: 1,
  });

  const queryClient = useQueryClient();

  // Determine current market status and refresh interval
  const marketStatusValue = finalStock?.marketStatus || getUSMarketSessionByIsraelTime();
  const refreshInterval = (() => {
    const status = marketStatusValue?.toUpperCase();
    if (status === 'REGULAR') return 5000;
    if (status === 'PRE') return 10000;
    if (status === 'POST') return 10000;
    return 60000;
  })();

  // Update currentMarketStatus when it changes
  useEffect(() => {
    if (marketStatusValue !== currentMarketStatus) {
      setCurrentMarketStatus(marketStatusValue);
    }
  }, [marketStatusValue, currentMarketStatus]);

  const { data: quote, isLoading: loadingQuote, isFetching, status: quoteStatus } = useQuery({
    queryKey: ['stockQuote', normalizedSymbol],
    queryFn: async () => {
      if (!normalizedSymbol) return null;
      try {
        const data = await yahooGetStockQuote(normalizedSymbol);
        console.log('[dataSource] quote: Yahoo v8/chart', normalizedSymbol, 'price:', data.current);
        return data;
      } catch (err) {
        console.warn('[Quote] Error:', err.message);
        return null;
      }
    },
    enabled: !!normalizedSymbol,
    staleTime: 0,
    gcTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Finnhub WebSocket — optional; set VITE_FINNHUB_API_KEY (never use Base44 token)
  const isMarketOpen = marketStatusValue?.toUpperCase() === 'REGULAR';
  const { wsPrice, wsConnected } = useFinnhubWebSocket(
    isMarketOpen && finnhubWsKey ? normalizedSymbol : null,
    finnhubWsKey
  );

  useEffect(() => {
    if (!normalizedSymbol) return;
    console.log('[dataSource] StockView pipeline', normalizedSymbol, {
      quote: 'Yahoo /api/yf',
      fundamentals: 'Yahoo /api/yf|yf2',
      keyMetricsSupplement: 'FMP /api/fmp',
      earnings: 'Yahoo',
      ticks: finnhubWsKey ? 'Finnhub WS (VITE_FINNHUB_API_KEY)' : 'Yahoo poll only',
    });
  }, [normalizedSymbol, finnhubWsKey]);

  // Enable automatic 5-second polling ONLY after initial load completes
  useMarketDataRefresh(
    normalizedSymbol && quoteStatus === 'success' ? [normalizedSymbol] : [],
    ['stockQuote', normalizedSymbol],
    !!normalizedSymbol && quoteStatus === 'success'
  );

  // Detect price changes and trigger flash — prefer wsPrice when available
  const effectiveCurrentPrice = wsPrice ?? quote?.current;
  useEffect(() => {
    if (effectiveCurrentPrice !== undefined && effectiveCurrentPrice !== null) {
      if (prevPriceRef.current !== null && prevPriceRef.current !== effectiveCurrentPrice) {
        const flashType = effectiveCurrentPrice > prevPriceRef.current ? 'up' : 'down';
        setPriceFlash(flashType);
        setTimeout(() => setPriceFlash(null), 600);
      }
      prevPriceRef.current = effectiveCurrentPrice;
    }
  }, [effectiveCurrentPrice]);

  const { data: earnings = null } = useQuery({
    queryKey: ['stockEarnings', normalizedSymbol],
    queryFn: async () => {
      if (!normalizedSymbol) return null;
      const y = await yahooGetStockEarnings(normalizedSymbol);
      if (y?.nextEarningsDate) return y;
      console.log('[dataSource] earnings: none (Yahoo calendarEvents empty)', normalizedSymbol);
      return null;
    },
    enabled: !!normalizedSymbol,
    retry: 0,
  });

  const { data: keyMetricsResponse = null, isLoading: loadingMetrics } = useQuery({
    queryKey: ['keyMetrics', normalizedSymbol],
    queryFn: () => getFmpKeyMetricsBridge(normalizedSymbol),
    enabled: !!normalizedSymbol,
    retry: 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  const keyMetrics = keyMetricsResponse || {
    source: null,
    peRatio: null,
    roe: null,
    debtToEquity: null,
    freeCashFlowPerShare: null,
    revenuePerShare: null,
    netIncomePerShare: null,
    marketCap: null,
    floatShares: null,
    sharesOutstanding: null,
  };

  // Fundamentals from Yahoo v10/quoteSummary — provides marketCap, P/E, EPS TTM, avgVolume
  // which are not available from the v8/chart endpoint used by getStockData.
  const { data: fundamentals = null, isLoading: loadingFundamentals } = useQuery({
    queryKey: ['stockFundamentals', normalizedSymbol],
    queryFn: async () => {
      const f = await yahooGetFundamentals(normalizedSymbol);
      console.log('[dataSource] fundamentals: Yahoo quoteSummary', normalizedSymbol, f ? 'ok' : 'empty');
      return f;
    },
    enabled: !!normalizedSymbol,
    staleTime: 5 * 60 * 1000, // 5 minutes — fundamentals change slowly
    retry: 1,
  });



  const calculateAIScore = () => {
    try {
      if (!finalStock) return 0;
      let score = 50;
      if (finalStock.revenueGrowth != null && Number.isFinite(Number(finalStock.revenueGrowth))) {
        score += Math.min(25, Math.max(0, Number(finalStock.revenueGrowth) * 100));
      }
      if (finalStock.forwardEps && finalStock.eps && Number(finalStock.eps) > 0) {
        const epsGrowth = ((Number(finalStock.forwardEps) - Number(finalStock.eps)) / Number(finalStock.eps)) * 100;
        if (Number.isFinite(epsGrowth)) score += Math.min(20, Math.max(0, epsGrowth));
      }
      const recMap = { 'strong_buy': 15, 'buy': 10, 'hold': 5, 'sell': -5, 'strong_sell': -10 };
      if (finalStock.recommendation) score += recMap[finalStock.recommendation] || 0;
      if (finalStock.volume && finalStock.avgVolume && Number(finalStock.avgVolume) > 0) {
        const volumeRatio = Number(finalStock.volume) / Number(finalStock.avgVolume);
        if (Number.isFinite(volumeRatio)) score += Math.min(10, volumeRatio * 5);
      }
      return Math.round(Math.min(100, Math.max(0, score)));
    } catch { return 0; }
  };

  const getRiskLevel = (score) => {
    if (score >= 75) return { label: 'Low Risk', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    if (score >= 50) return { label: 'Medium Risk', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (score >= 25) return { label: 'High Risk', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { label: 'Very High Risk', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  // Single source of truth per market session
  const safeNum = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
  const safePct = (price, prev) => {
    try {
      if (price == null || prev == null || Number(prev) === 0) return null;
      return ((Number(price) - Number(prev)) / Number(prev)) * 100;
    } catch { return null; }
  };

  const getHeaderPriceData = () => {
    const status = marketStatusValue?.toUpperCase();
    const previousClose = safeNum(quote?.previousClose) ?? safeNum(finalStock?.previousClose);

    // REGULAR MARKET: prefer WebSocket real-time tick price (same source as TradingView)
    if (status === 'REGULAR' && wsPrice !== null) {
      const safeWs = safeNum(wsPrice);
      const change = previousClose != null && safeWs != null ? safeWs - previousClose : safeNum(quote?.change);
      const changePercent = safeWs != null && previousClose != null
        ? safePct(safeWs, previousClose)
        : safeNum(quote?.percentChange);
      return {
        price: safeWs,
        change,
        changePercent,
        previousClose,
        session: 'Real-Time',
        source: wsConnected ? 'Live' : 'Live (reconnecting)',
      };
    }

    // PRE-MARKET: Use pre-market data if available
    if (status === 'PRE') {
      const prePrice = quote?.preMarketPrice || finalStock?.preMarketPrice;
      const preChange = quote?.preMarketChange || finalStock?.preMarketChange;
      const preChangePercent = quote?.preMarketChangePercent || finalStock?.preMarketChangePercent;
      if (prePrice !== null && prePrice !== undefined) {
        return {
          price: prePrice,
          change: preChange,
          changePercent: preChangePercent,
          previousClose,
          session: 'Pre-Market',
          source: quote ? 'Live' : 'Delayed',
        };
      }
    }

    // AFTER-HOURS: Use after-hours data if available
    if (status === 'POST') {
      const afterPrice = quote?.afterHoursPrice || finalStock?.afterHoursPrice;
      const afterChange = quote?.afterHoursChange || finalStock?.afterHoursChange;
      const afterChangePercent = quote?.afterHoursChangePercent || finalStock?.afterHoursChangePercent;
      if (afterPrice !== null && afterPrice !== undefined) {
        return {
          price: afterPrice,
          change: afterChange,
          changePercent: afterChangePercent,
          previousClose,
          session: 'After-Hours',
          source: quote ? 'Live' : 'Delayed',
        };
      }
    }

    // FALLBACK: API quote / static data
    return {
      price: quote?.current !== undefined ? quote.current : finalStock?.price,
      change: quote?.change !== undefined ? quote.change : finalStock?.change,
      changePercent: quote?.percentChange !== undefined ? quote.percentChange : finalStock?.changePercent,
      previousClose,
      session: status === 'REGULAR' ? 'Regular Market' : 'Last Close',
      source: quote ? 'Live' : 'Delayed',
    };
  };

  const headerData = getHeaderPriceData();
  const isPositive = headerData.change != null && Number.isFinite(Number(headerData.change)) ? Number(headerData.change) >= 0 : null;
  const isLoadingData = loadingProfile || loadingQuote;

  // Debug logging for ETF/leveraged assets
  React.useEffect(() => {
    if (!finalStock || !normalizedSymbol) return;
    try {
      const leverageInfo = detectLeverage(finalStock.companyName || '', { ...finalStock, symbol: normalizedSymbol });
      console.log(`[StockView DEBUG] Symbol: ${normalizedSymbol}`);
      console.log(`[StockView DEBUG] companyName: ${finalStock.companyName}`);
      console.log(`[StockView DEBUG] ETF detection result:`, leverageInfo);
      console.log(`[StockView DEBUG] Available fields:`, Object.keys(finalStock).filter(k => finalStock[k] != null));
      console.log(`[StockView DEBUG] Missing/null fields:`, Object.keys(finalStock).filter(k => finalStock[k] == null));
      console.log(`[StockView DEBUG] Full stock object:`, finalStock);
    } catch (e) {
      console.warn('[StockView DEBUG] Logging error:', e?.message);
    }
  }, [finalStock, normalizedSymbol]);

  const livePrice = headerData.price;
  const liveChange = headerData.change;
  const liveChangePercent = headerData.changePercent;

  const aiScore = calculateAIScore();
  const risk = getRiskLevel(aiScore);

  const getMarketStatusValue = () => {
    // Use API marketStatus if available, otherwise fall back to Israel timezone detection
    return finalStock?.marketStatus || getUSMarketSessionByIsraelTime();
  };

  const getMarketStatusDisplay = () => {
    const mktStatus = marketStatusValue?.toUpperCase();
    
    if (mktStatus === 'REGULAR') {
      return { label: 'OPEN', bgColor: 'bg-green-500', icon: Clock, isOpen: true };
    }
    if (mktStatus === 'PRE') {
      return { label: 'PRE-MARKET', bgColor: 'bg-blue-500', icon: Sun, isOpen: false };
    }
    if (mktStatus === 'POST') {
      return { label: 'AFTER HOURS', bgColor: 'bg-orange-500', icon: Moon, isOpen: false };
    }
    return { label: 'CLOSED', bgColor: 'bg-red-600', icon: Clock, isOpen: false };
  };

  const marketStatus = getMarketStatusDisplay();

  // Only show supplementary extended-hours section if it differs from main header
  const getSupplementarySessionData = () => {
    const status = marketStatusValue?.toUpperCase();

    // If we're in PRE and showing pre-market in header, show regular close as supplementary
    if (status === 'PRE' && headerData.session === 'Pre-Market') {
      const regularPrice = quote?.current || finalStock?.price;
      if (regularPrice !== null && regularPrice !== undefined && regularPrice !== headerData.price) {
        return {
          type: 'regular-close',
          label: 'Previous Regular Close',
          price: regularPrice,
          change: quote?.change || finalStock?.change,
          changePercent: quote?.percentChange || finalStock?.changePercent
        };
      }
    }

    // If we're in POST and showing after-hours in header, show regular close as supplementary
    if (status === 'POST' && headerData.session === 'After-Hours') {
      const regularPrice = quote?.current || finalStock?.price;
      if (regularPrice !== null && regularPrice !== undefined && regularPrice !== headerData.price) {
        return {
          type: 'regular-close',
          label: 'Previous Regular Close',
          price: regularPrice,
          change: quote?.change || finalStock?.change,
          changePercent: quote?.percentChange || finalStock?.changePercent
        };
      }
    }

    return null;
  };

  const supplementaryData = getSupplementarySessionData();

  // Manual refresh handler
  const handleRefreshData = async () => {
    if (isManualRefreshing || !normalizedSymbol) return;
    setIsManualRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['stockQuote', normalizedSymbol] });
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Use finalStock as the primary data source
  const profile = finalStock;

  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const timeframes = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y'];

  // Simple chart symbol - let TradingView handle exchange resolution
  const chartSymbol = normalizedSymbol;



  const earningsCountdown = (() => {
    try {
      const dateStr = finalStock?.earningsDate || earnings?.nextEarningsDate;
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return differenceInDays(d, new Date());
    } catch { return null; }
  })();


  const getAISetupLevel = (score) => {
    if (score >= 75) return { level: 'High Opportunity', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    if (score >= 50) return { level: 'Medium Opportunity', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
    return { level: 'Low Opportunity', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

  const aiSetup = getAISetupLevel(aiScore);



  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-2">{t('stock_view_title')}</h1>
        <p className="text-sm dark:text-gray-500 text-gray-500">{t('stock_ai_subtitle')}</p>
      </div>

      {/* Search */}
      <div className="relative" ref={searchWrapperRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400 z-10 pointer-events-none" />
        {isSearching && debouncedQuery.length > 1 && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500 z-10" />
        )}
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onInput={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => { if (debouncedQuery.length >= 1) setShowDropdown(true); }}
          placeholder={t('search_placeholder_long')}
          className="pl-10 pr-10 dark:bg-white/5 dark:border-white/10 dark:text-white rounded-xl h-12 text-base"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          inputMode="text"
          spellCheck="false"
        />
        {showDropdown && (
          <SearchResultsDropdown
            results={searchResults}
            query={debouncedQuery}
            isLoading={isSearching}
            onSelect={handleSelectStock}
          />
        )}
      </div>

      {!selectedStock ? (
        <div className="flex items-center justify-center h-96 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
          <div className="text-center">
            <Search className="w-12 h-12 dark:text-gray-700 text-gray-300 mx-auto mb-3" />
            <p className="dark:text-gray-500 text-gray-500">{t('stock_empty_search')}</p>
          </div>
        </div>
      ) : (isLoadingData && !profile && !quote) ? (
        <div className="flex items-center justify-center h-96 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
      ) : (!finalStock && !quote && !loadingProfile && !loadingQuote) ? (
        <div className="flex items-center justify-center h-96 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 dark:text-gray-700 text-gray-300 mx-auto mb-3" />
            <p className="dark:text-gray-500 text-gray-500">No data found for <span className="font-bold dark:text-white text-gray-900">{normalizedSymbol}</span></p>
          </div>
        </div>
      ) : (
        <StockErrorBoundary
          fallbackProps={{
            symbol: normalizedSymbol,
            price: safeNum(quote?.current) ?? safeNum(finalStock?.price),
            companyName: finalStock?.companyName,
          }}
        >
          <div className="space-y-8">
          {/* Stock Header */}
          {normalizedSymbol && (
            <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden shadow-lg">
              {/* Header */}
              <div className="p-4 md:p-8">
                <div className="flex items-start justify-between mb-7">
                  {/* Company Identity */}
                  <div className="flex-1">
                    {/* Company Name */}
                    <h1 className="text-xl md:text-3xl font-bold dark:text-white text-gray-900 mb-2 leading-tight flex items-baseline flex-wrap gap-0">
                      {finalStock?.companyName || selectedStock}
                      <LeverageTag companyName={finalStock?.companyName} stockData={finalStock ? { ...finalStock, symbol: normalizedSymbol } : null} />
                    </h1>
                    
                    {/* Symbol • Exchange • Market Status • Watchlist */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-base font-bold dark:text-gray-200 text-gray-800">
                        {normalizedSymbol}
                      </span>
                      <span className="dark:text-gray-600 text-gray-400">•</span>
                      <span className="text-sm dark:text-gray-500 text-gray-600 font-medium">
                        {finalStock?.exchange || 'NASDAQ'}
                      </span>
                      <span className="dark:text-gray-600 text-gray-400">•</span>
                      {/* Market Status Badge */}
                      <div className="group relative">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white ${marketStatus.bgColor} cursor-help`}>
                          {marketStatus.icon && <marketStatus.icon className="w-3 h-3" />}
                          {marketStatus.label}
                        </span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                          <div className="dark:bg-gray-900 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap border dark:border-gray-700 border-gray-600 shadow-lg">
                            {marketStatus.label === 'OPEN' && 'US market is currently open'}
                            {marketStatus.label === 'CLOSED' && 'US market is currently closed'}
                            {marketStatus.label === 'PRE-MARKET' && 'Pre-market session is active'}
                            {marketStatus.label === 'AFTER HOURS' && 'After-hours session is active'}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent dark:border-t-gray-900 border-t-gray-800"></div>
                          </div>
                        </div>
                      </div>
                      <span className="dark:text-gray-600 text-gray-400">•</span>
                      <div className="relative">
                        <button
                          onClick={() => setWatchlistMenuOpen(!watchlistMenuOpen)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-colors dark:hover:bg-white/10 hover:bg-gray-200"
                          title="Add to watchlist"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isSaved ? 'fill-blue-500 text-blue-500' : 'dark:text-gray-500 text-gray-500'
                            }`}
                          />
                          <span className="text-xs font-medium dark:text-gray-400 text-gray-600">
                            {isSaved ? 'Saved' : 'Add'}
                          </span>
                        </button>
                        <UnifiedWatchlistMenu
                          symbol={normalizedSymbol}
                          customCategories={customCategories}
                          onAddToList={addToWatchlist}
                          onRemoveFromList={removeFromWatchlist}
                          onCreateList={createNewWatchlist}
                          isOpen={watchlistMenuOpen}
                          onClose={() => setWatchlistMenuOpen(false)}
                          stockInLists={getStockWatchlistStatus(normalizedSymbol || '')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right column: logo + Gecko action stacked */}
                  <div className="flex flex-col items-end gap-3 ml-4 flex-shrink-0">
                    {normalizedSymbol && (
                      <StockLogo
                        symbol={normalizedSymbol}
                        logoUrl={finalStock?.logo}
                        className="w-[72px] h-[72px]"
                      />
                    )}
                    {/* TODO: Hidden until ready — "Analyze with Gecko" button → /gecko/analyze */}
                  </div>
                </div>

                {/* Price Section */}
                <div className={`mt-9 mb-7 transition-colors duration-300 ${priceFlash === 'up' ? 'bg-blue-500/10' : priceFlash === 'down' ? 'bg-red-500/10' : ''} ${priceFlash ? 'price-flash' : ''} rounded-lg px-4 py-3`}>
                  <PriceFlash isVisible={!!priceFlash} type={priceFlash} />
                  {/* Current Price */}
                  <div className="flex items-baseline gap-2 md:gap-3.5 mb-2.5 flex-wrap">
                    <p className="text-4xl md:text-5xl font-bold leading-none dark:text-white text-gray-900">
                      {livePrice != null && Number.isFinite(Number(livePrice))
                        ? `$${Number(livePrice).toFixed(2)}`
                        : 'Not available'}
                    </p>
                    
                    {/* Daily Change + Percent with Direction Icon */}
                    {liveChange != null && Number.isFinite(Number(liveChange)) && (
                      <div className={`flex items-center gap-1 md:gap-1.5 ${isPositive === true ? 'text-green-400' : isPositive === false ? 'text-red-400' : 'text-gray-500'}`}>
                        {isPositive === true ? (
                          <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                        ) : isPositive === false ? (
                          <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />
                        ) : (
                          <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                        )}
                        <span className="text-xl md:text-2xl font-bold">
                          {isPositive === true ? '+' : ''}{Number(liveChange).toFixed(2)}
                        </span>
                        {liveChangePercent != null && Number.isFinite(Number(liveChangePercent)) && (
                          <span className="text-lg md:text-xl font-semibold">
                            ({isPositive === true ? '+' : ''}{Number(liveChangePercent).toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Previous Close with Session Label */}
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs dark:text-gray-600 text-gray-500">
                      Previous Close: 
                      <span className="ml-2 font-semibold dark:text-gray-400 text-gray-600">
                        {headerData.previousClose != null && Number.isFinite(Number(headerData.previousClose))
                          ? `$${Number(headerData.previousClose).toFixed(2)}`
                          : 'Not available'}
                      </span>
                    </p>
                    <p className="text-xs dark:text-gray-500 text-gray-500 italic flex items-center gap-1.5">
                      {wsConnected && isMarketOpen && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                      )}
                      Session: {headerData.session} • {headerData.source}
                    </p>
                  </div>

                  {/* Supplementary Session Data (if different from header) */}
                  {supplementaryData && (
                    <div className="p-3.5 dark:bg-white/5 bg-gray-50 rounded-lg mt-4 border dark:border-white/5 border-gray-200">
                      <p className="text-xs font-semibold dark:text-gray-400 text-gray-600 mb-2">
                        {supplementaryData.label}
                      </p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-lg font-bold dark:text-white text-gray-900">
                          {Number.isFinite(Number(supplementaryData.price)) ? `$${Number(supplementaryData.price).toFixed(2)}` : '—'}
                        </span>
                        {supplementaryData.change != null && Number.isFinite(Number(supplementaryData.change)) && (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold ${Number(supplementaryData.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {Number(supplementaryData.change) >= 0 ? '+' : ''}{Number(supplementaryData.change).toFixed(2)}
                            </span>
                            {supplementaryData.changePercent != null && Number.isFinite(Number(supplementaryData.changePercent)) && (
                              <span className={`text-xs font-semibold ${Number(supplementaryData.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ({Number(supplementaryData.change) >= 0 ? '+' : ''}{Number(supplementaryData.changePercent).toFixed(2)}%)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock Info Row with Refresh Button */}
                <div className="pt-5 border-t dark:border-white/5 border-gray-200">
                  <div className="flex items-center gap-3 flex-wrap text-[11px] dark:text-gray-600 text-gray-500 justify-between">
                    <div className="flex items-center gap-3 flex-wrap" key={quote?.current}>
                      <span>Currency: <span className="dark:text-gray-400 text-gray-600 font-medium">{finalStock?.currency || 'USD'}</span></span>
                      <span className="dark:text-gray-700 text-gray-300">•</span>
                      {/* country / industry come from fundamentals (assetProfile); finalStock.country is always null */}
                      {(fundamentals?.country || finalStock?.country) && (
                        <>
                          <span>Country: <span className="dark:text-gray-400 text-gray-600 font-medium">{fundamentals?.country || finalStock.country}</span></span>
                          <span className="dark:text-gray-700 text-gray-300">•</span>
                        </>
                      )}
                      {(fundamentals?.industry || finalStock?.industry) && (
                        <>
                          <span>Industry: <span className="dark:text-gray-400 text-gray-600 font-medium">{fundamentals?.industry || finalStock.industry}</span></span>
                          <span className="dark:text-gray-700 text-gray-300">•</span>
                        </>
                      )}
                      <span>Updated: <span className="dark:text-gray-400 text-gray-600 font-medium">{format(new Date(), 'MMM d, yyyy HH:mm:ss')}</span></span>
                    </div>
                    <Button
                       variant="ghost"
                       size="sm"
                       onClick={handleRefreshData}
                       disabled={isManualRefreshing || loadingQuote}
                       className="h-7 w-7 p-0 dark:hover:bg-white/15 hover:bg-gray-300 flex-shrink-0 transition-colors duration-150"
                       title="Refresh data (auto-refreshes every 5s)"
                     >
                       <RefreshCw className={`w-3.5 h-3.5 dark:text-gray-400 text-gray-600 transition-transform ${isManualRefreshing ? 'animate-spin' : isFetching ? 'opacity-60' : ''}`} />
                     </Button>
                  </div>
                </div>
              </div>

              {/* Subtle Divider */}
              <div className="h-px dark:bg-gradient-to-r dark:from-transparent dark:via-white/5 dark:to-transparent bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

              {/* Company Overview — sector, industry, country, description from assetProfile/fundProfile */}
              <CompanyOverview fundamentals={fundamentals} isLoading={loadingFundamentals} />

              {/* Key Metrics */}
              <div className="p-4 md:p-8 bg-gradient-to-br dark:from-white/[0.02] dark:to-transparent from-gray-50/50 to-white border-t dark:border-white/5 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold dark:text-white text-gray-900 uppercase tracking-wider">Key Metrics</h3>
                  {loadingMetrics && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                </div>
                <KeyMetricsGrid
                  keyMetrics={keyMetrics}
                  finalStock={finalStock ? { ...finalStock, symbol: normalizedSymbol } : null}
                  quote={quote}
                  fundamentals={fundamentals}
                  lang={lang}
                />
              </div>
            </div>
          )}



          {/* Chart Section */}
          {selectedStock && (
            <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden shadow-lg">
              <div className="p-4 md:p-8 pb-4 md:pb-6 border-b dark:border-white/5 border-gray-200">
                <h3 className="text-lg font-bold dark:text-white text-gray-900">{t('price_chart')}</h3>
              </div>
              <div className="p-2 md:p-8">
                <div style={{ height: '400px' }} className="md:!h-[700px]" key={normalizedSymbol}>
                  <AdvancedChart symbol={toTradingViewSymbol(normalizedSymbol, finalStock?.exchange)} timeframe={selectedTimeframe} />
                </div>
              </div>

              {/* Timeframe Selector */}
              <div className="px-3 md:px-8 pb-4 md:pb-8 flex items-center">
                <div className="flex items-center gap-1 md:gap-2 overflow-x-auto w-full pb-1">
                  {timeframes.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 min-h-[36px] ${
                        selectedTimeframe === tf
                          ? 'dark:bg-blue-500/20 bg-blue-100 text-blue-500'
                          : 'dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-600 dark:hover:bg-white/10 hover:bg-gray-200'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wyckoff AI Analysis — directly below chart/timeframe controls */}
              {normalizedSymbol && (
                <div className="border-t dark:border-white/5 border-gray-200 px-4 md:px-8 py-4 md:py-6">
                  <WyckoffAnalysisCard
                    symbol={normalizedSymbol}
                    companyName={finalStock?.longName ?? finalStock?.shortName ?? normalizedSymbol}
                  />
                </div>
              )}
            </div>
          )}






          </div>
        </StockErrorBoundary>
      )}
    </div>
  );
}