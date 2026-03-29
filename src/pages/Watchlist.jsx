import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../components/LanguageContext';
import { useMarketDataRefresh } from '../components/hooks/useMarketDataRefresh';
import { useWatchlist } from '../components/hooks/useWatchlist';
import { useCustomLists } from '../components/hooks/useCustomLists';
import { getStockData as yahooGetStockData } from '@/api/yahooFinanceApi';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Star, TrendingUp, TrendingDown, Plus,
  Eye, Loader2, RefreshCw
} from 'lucide-react';
import UnifiedWatchlistMenu from '../components/watchlist/UnifiedWatchlistMenu';
import StockPreviewPanel from '../components/watchlist/StockPreviewPanel';
import PersonalListsSection from '../components/watchlist/PersonalListsSection';
import { showToast, WatchlistToastContainer } from '../components/watchlist/WatchlistToast';
import AssetIcon from '../components/watchlist/AssetIcon';
import StockLogo from '../components/stock/StockLogo';
import { CRYPTO_MOCK, RESOURCES_MOCK, getMockAsset, isMockAsset } from '../lib/mockMarketData';
import SearchModal from '../components/watchlist/SearchModal';

// ─── Deduplication: each symbol belongs to only the first category that claims it ─
function deduplicateCategories(cats) {
  const seen = new Set();
  return cats.map(cat => ({
    ...cat,
    assets: cat.assets.filter(s => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    }),
  }));
}

// ─── Market categories ────────────────────────────────────────────────────────
// enabled: true  → shown by default in sidebar
// enabled: false → defined for deduplication + future user-settings toggle
const marketCategories = deduplicateCategories([
  {
    id: 'banks',
    name: 'Banks',
    enabled: false, // reserved — enable via user preferences
    assets: [
      'JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'USB', 'TFC', 'PNC', 'COF',
      'BK', 'STT', 'SCHW', 'MTB', 'KEY', 'RF', 'HBAN', 'CFG',
      'HSBC', 'BCS', 'SAN', 'DB', 'ING', 'UBS', 'BNP.PA', 'ACA.PA', 'GLE.PA',
      'POALIM.TA', 'LEUMI.TA', 'MIZRAHI.TA', 'DISCOUNT.TA', 'FIBI.TA',
    ],
  },
  {
    id: 'health',
    name: 'Healthcare',
    enabled: false, // reserved — enable via user preferences
    assets: [
      'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'BMY', 'AMGN', 'GILD', 'LLY',
      'MDT', 'ABT', 'TMO', 'DHR', 'ISRG', 'HCA', 'CVS', 'ELV', 'CI',
      'TEVA', 'MRNA', 'BIIB', 'VRTX', 'REGN', 'ZTS', 'BDX', 'SYK', 'BSX',
      'IQV', 'MCK', 'CAH', 'CNC', 'HUM',
    ],
  },
  {
    id: 'big-tech',
    name: 'Big Tech',
    enabled: true,
    assets: [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', '005930.KS', 'TSM',
      'ORCL', 'SAP', 'CRM', 'SHOP', 'NFLX', 'SNAP', 'PINS', 'SPOT',
      'UBER', 'ABNB', 'BABA', 'JD', 'PDD', 'SE', 'GRAB', 'TWLO', 'ZM',
    ],
  },
  {
    id: 'ai-chips',
    name: 'AI & Chips',
    enabled: true,
    assets: [
      'NVDA', 'AMD', 'INTC', 'ASML', 'ARM', 'MU', 'SMCI',
      'QCOM', 'TXN', 'AVGO', 'ON', 'MCHP', 'ADI', 'KLAC',
      'AMAT', 'LRCX', 'MRVL', 'MSTR', 'PLTR', 'AI', 'SOUN',
    ],
  },
  {
    id: 'ev-energy',
    name: 'EV & Clean Energy',
    enabled: true,
    assets: [
      'TSLA', 'BYDDF', 'RIVN', 'NIO', 'LCID', 'LI', 'XPEV', 'ENPH', 'FSLR',
      'CHPT', 'BLNK', 'BE', 'PLUG', 'SEDG', 'ARRY', 'STEM', 'RUN', 'NOVA',
    ],
  },
  {
    id: 'aviation-space',
    name: 'Aviation & Space',
    enabled: true,
    assets: [
      'DAL', 'UAL', 'RYAAY', 'BA', 'RKLB', 'IRDM',
      'AAL', 'LUV', 'JBLU', 'ALK', 'SPCE', 'EADSY', 'HEI', 'TDG',
    ],
  },
  {
    id: 'defense',
    name: 'Defense',
    enabled: true,
    assets: [
      'LMT', 'RTX', 'NOC', 'GD', 'HII', 'ESLT', 'TXT', 'LDOS',
      'LHX', 'AXON', 'BAH', 'SAIC', 'CACI', 'KTOS', 'BWXT', 'CW',
    ],
  },
  {
    id: 'crypto',
    name: 'Crypto',
    enabled: true,
    assets: CRYPTO_MOCK.map(c => c.symbol),
  },
  {
    id: 'resources',
    name: 'Resources',
    enabled: true,
    assets: RESOURCES_MOCK.map(r => r.symbol),
  },
]);

// Only categories shown in the sidebar by default
const visibleMarketCategories = marketCategories.filter(c => c.enabled);

export default function Watchlist() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('my-watchlist');
  const [sortBy, setSortBy] = useState('symbol');
  const [visibleCount, setVisibleCount] = useState(30);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [relativeTime, setRelativeTime] = useState('just now');

  useEffect(() => {
    const update = () => {
      const diffMin = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setRelativeTime(diffMin < 1 ? 'just now' : diffMin === 1 ? '1 min ago' : `${diffMin} min ago`);
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [lastUpdated]);
  const [previewOpen, setPreviewOpen] = useState(null);
  const [watchlistMenuOpen, setWatchlistMenuOpen] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Supabase-backed watchlist (falls back to localStorage for guests)
  const {
    items: watchlistItems,
    symbols: savedSymbols,
    isSaved: isInWatchlist,
    toggle: toggleWatchlist,
  } = useWatchlist();

  const {
    customCategories,
    createCustomList,
    deleteCustomList,
    renameCustomList,
    addSymbolToList,
    removeSymbolFromList,
  } = useCustomLists();

  // ─── Metadata map (stub — Base44 dead; Yahoo data comes via quotesData below) ─
  const allMarketAssets = useMemo(() => [...new Set(marketCategories.flatMap(c => c.assets))], []);
  const metadataMap = {}; // No longer fetched from Base44; company names come from Yahoo

  // ─── Current assets for active tab ──────────────────────────────────────────
  const currentAssets = useMemo(() => {
    if (activeTab === 'my-watchlist') return savedSymbols;
    if (activeTab.startsWith('custom-')) {
      const id = activeTab.replace('custom-', '');
      return customCategories[id]?.assets || [];
    }
    const cat = marketCategories.find(c => c.id === activeTab);
    if (!cat) return [];
    // All market categories: show all assets — Yahoo handles stocks, crypto, and futures
    return cat.assets;
  }, [activeTab, savedSymbols, customCategories, metadataMap]);

  // ─── Market data via Yahoo Finance ───────────────────────────────────────────
  // Yahoo v8/finance/chart supports stocks, crypto (BTC-USD), and futures (GC=F).
  // All asset types use the same getStockData call — one normalized shape for all.
  // Mock metadata (name, logo) is merged at render time; prices always come from Yahoo.
  const { data: quotesData = {}, isLoading, isFetching, status: quoteStatus } = useQuery({
    queryKey: ['watchlistQuotes', currentAssets.join(',')],
    queryFn: async () => {
      if (currentAssets.length === 0) return {};
      setLastUpdated(new Date());
      const results = {};
      const responses = await Promise.all(
        currentAssets.map(symbol =>
          yahooGetStockData(symbol)
            .then(data => ({ symbol, data }))
            .catch(() => ({ symbol, data: null }))
        )
      );
      responses.forEach(({ symbol, data }) => {
        results[symbol] = data || { symbol, price: null, changePercent: null };
      });
      return results;
    },
    enabled: currentAssets.length > 0,
    staleTime: 30000,
    gcTime: 120000,
    refetchOnWindowFocus: false,
  });

  useMarketDataRefresh(
    currentAssets.length > 0 && quoteStatus === 'success' ? currentAssets : [],
    ['watchlistQuotes', currentAssets.join(',')],
    currentAssets.length > 0 && quoteStatus === 'success'
  );

  // Search is now handled by SearchModal component

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const getPrice = (symbol) => quotesData[symbol]?.price ?? null;
  const getChange = (symbol) => quotesData[symbol]?.changePercent ?? null;
  const getMarketStatus = (symbol) => quotesData[symbol]?.marketStatus ?? null;
  const getLogo = (symbol) => getMockAsset(symbol)?.logoUrl || null;

  const getDisplaySymbol = (symbol) => {
    const mock = getMockAsset(symbol);
    if (mock) return mock.displaySymbol;
    if (symbol.includes('-USD')) return symbol.replace('-USD', '');
    if (symbol.includes('=F')) return symbol.replace('=F', '');
    return symbol;
  };

  const getCompanyName = (symbol) => {
    const mock = getMockAsset(symbol);
    if (mock) return mock.name;
    return quotesData[symbol]?.companyName || '—';
  };
  const getExchange = (symbol) => {
    const mock = getMockAsset(symbol);
    if (mock) return mock.exchange;
    return quotesData[symbol]?.exchange || '—';
  };
  const getAssetType = (symbol) => {
    const item = watchlistItems.find(i => i.symbol === symbol);
    return item?.asset_type || 'stock';
  };
  const getStockWatchlistStatus = (symbol) => {
    const status = {};
    if (isInWatchlist(symbol)) status['my-watchlist'] = true;
    Object.entries(customCategories).forEach(([id, cat]) => {
      if (cat.assets.includes(symbol)) status[`custom-${id}`] = true;
    });
    return status;
  };

  // ─── Watchlist actions ───────────────────────────────────────────────────────
  const addToWatchlist = (symbol, listId) => {
    console.log('[watchlist] addToWatchlist', symbol, '→ list:', listId);

    if (listId === 'my-watchlist') {
      if (!isInWatchlist(symbol)) {
        toggleWatchlist(symbol, 'stock');
        showToast({ title: 'Added', description: `${symbol} added to Favorites` });
      }
    } else if (listId?.startsWith('custom-')) {
      const customId = listId.replace('custom-', '');
      if (customCategories[customId]) {
        if (!customCategories[customId].assets.includes(symbol)) {
          addSymbolToList(symbol, customId);
          showToast({ title: 'Added', description: `${symbol} added to ${customCategories[customId].name}` });
        }
      } else {
        // Custom list ID no longer exists — fall back to Favorites
        console.warn('[watchlist] custom list not found:', customId, '— falling back to Favorites');
        if (!isInWatchlist(symbol)) {
          toggleWatchlist(symbol, 'stock');
          showToast({ title: 'Added', description: `${symbol} added to Favorites` });
        }
      }
    } else {
      // Market / built-in category tab passed through (should not happen after SearchModal fix,
      // but kept as a safety net) — add to Favorites
      console.warn('[watchlist] unrecognised listId:', listId, '— falling back to Favorites');
      if (!isInWatchlist(symbol)) {
        toggleWatchlist(symbol, 'stock');
        showToast({ title: 'Added', description: `${symbol} added to Favorites` });
      }
    }

    setWatchlistMenuOpen(null);
  };

  const removeFromWatchlist = (symbol, listId) => {
    if (listId === 'my-watchlist') {
      toggleWatchlist(symbol, 'stock');
      showToast({ title: 'Removed', description: `${symbol} removed from Favorites` });
    } else {
      const customId = listId.replace('custom-', '');
      if (customCategories[customId]) {
        removeSymbolFromList(symbol, customId);
        showToast({ title: 'Removed', description: `${symbol} removed from ${customCategories[customId].name}` });
      }
    }
    setWatchlistMenuOpen(null);
  };

  // Toggle star: add if not in any list, remove from all lists if saved
  const toggleStar = (symbol) => {
    const status = getStockWatchlistStatus(symbol);
    const savedLists = Object.keys(status);
    if (savedLists.length === 0) {
      // Not saved anywhere — open menu to pick a list
      setWatchlistMenuOpen(symbol);
    } else {
      // Already saved — remove from all lists immediately
      savedLists.forEach(listId => removeFromWatchlist(symbol, listId));
    }
  };

  const createNewWatchlist = async (name, symbol) => {
    const id = await createCustomList(name);
    if (id && symbol) addSymbolToList(symbol, id);
    showToast({ title: 'List Created', description: `Created "${name}"` });
    setWatchlistMenuOpen(null);
  };

  const createCustomCategory = async (name) => {
    if (!name?.trim()) return;
    const id = await createCustomList(name.trim());
    setNewListName('');
    setShowCreateModal(false);
    if (id) setActiveTab(`custom-${id}`);
    showToast({ title: 'List Created', description: `Created "${name.trim()}"` });
  };

  const deleteCustomCategory = (id) => {
    deleteCustomList(id);
    if (activeTab === `custom-${id}`) setActiveTab('my-watchlist');
  };

  const renameCustomCategory = (id, newName) => {
    renameCustomList(id, newName);
  };

  const addToCustomCategory = (symbol, categoryId) => {
    addSymbolToList(symbol, categoryId);
  };

  const removeFromCustomCategory = (symbol, categoryId) => {
    removeSymbolFromList(symbol, categoryId);
  };

  const addStockToCurrentList = (symbol) => {
    if (activeTab === 'my-watchlist') {
      if (!isInWatchlist(symbol)) {
        toggleWatchlist(symbol, 'stock');
        showToast({ title: 'Added', description: `${symbol} added to Favorites` });
      }
    } else if (activeTab.startsWith('custom-')) {
      const id = activeTab.replace('custom-', '');
      addSymbolToList(symbol, id);
      showToast({ title: 'Added', description: `${symbol} added to ${customCategories[id]?.name}` });
    }
  };

  const handleRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: ['watchlistQuotes', currentAssets.join(',')] });
      setLastUpdated(new Date());
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // ─── Sorted + filtered assets ────────────────────────────────────────────────
  const sortedAssets = useMemo(() => {
    if (!Array.isArray(currentAssets)) return [];
    let filtered = [...currentAssets];

    filtered.sort((a, b) => {
      if (sortBy === 'price') return (getPrice(b) || 0) - (getPrice(a) || 0);
      if (sortBy === 'change') return (getChange(b) || 0) - (getChange(a) || 0);
      return a.localeCompare(b);
    });
    return filtered;
  }, [currentAssets, sortBy, quotesData, activeTab]);

  useEffect(() => { setVisibleCount(30); }, [activeTab]);

  const visibleAssets = sortedAssets.slice(0, visibleCount);
  const isPersonalTab = activeTab === 'my-watchlist' || activeTab.startsWith('custom-');
  const activeMarketCat = marketCategories.find(c => c.id === activeTab);

  // ─── Active tab display name ──────────────────────────────────────────────────
  const getTabName = () => {
    if (activeTab === 'my-watchlist') return localStorage.getItem('favorites_name') || 'Favorites';
    if (activeTab.startsWith('custom-')) {
      const id = activeTab.replace('custom-', '');
      return customCategories[id]?.name || 'List';
    }
    return activeMarketCat?.name || 'Watchlist';
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">{t('watchlist_title')}</h1>
          <p className="text-sm dark:text-gray-500 text-gray-500 mt-0.5">Track and manage your favorite assets</p>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-4 items-start">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <div className="rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.3)] overflow-hidden">
            {/* Sidebar header */}
            <div className="px-3 py-3 border-b dark:border-white/5 border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest dark:text-gray-400 text-gray-500">My Watchlists</span>
              <button
                onClick={() => setShowCreateModal(true)}
                title="Create new list"
                className="w-6 h-6 rounded-md flex items-center justify-center dark:bg-white/5 dark:hover:bg-blue-500/20 bg-gray-100 hover:bg-blue-50 dark:text-gray-400 text-gray-500 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Personal lists */}
            <div className="p-2">
              <PersonalListsSection
                customCategories={customCategories}
                activeTab={activeTab}
                onSelectList={setActiveTab}
                onDeleteList={deleteCustomCategory}
                onRenameList={renameCustomCategory}
                onCreateList={createCustomCategory}
                onAddStockToList={addToCustomCategory}
                onRemoveStockFromList={removeFromCustomCategory}
                allAvailableStocks={allMarketAssets}
                getCompanyName={getCompanyName}
                quotesData={quotesData}
                metadataMap={metadataMap}
                savedSymbols={savedSymbols}
              />
            </div>

            {/* Market Categories */}
            <div className="border-t dark:border-white/5 border-gray-100 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest dark:text-gray-600 text-gray-400 mb-2">Browse Markets</p>
              <div className="space-y-0.5">
                {visibleMarketCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center h-8 ${
                      activeTab === cat.id
                        ? 'dark:bg-blue-500/15 dark:text-cyan-400 bg-blue-50 text-blue-700'
                        : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Content header bar */}
          <div className="rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              {/* Active list name + count */}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold dark:text-white text-gray-900 text-sm truncate">{getTabName()}</h2>
                <p className="text-[11px] dark:text-gray-600 text-gray-400 mt-0.5">{sortedAssets.length} asset{sortedAssets.length !== 1 ? 's' : ''} · Updated {relativeTime}</p>
              </div>

              {/* Mobile: category dropdown */}
              <div className="md:hidden">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="h-7 text-xs dark:bg-white/5 dark:border-white/10 dark:text-white border-gray-200 rounded-lg w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#1a1a2e] bg-white dark:border-white/10">
                    <SelectItem value="my-watchlist" className="text-xs">Favorites</SelectItem>
                    {Object.entries(customCategories).map(([id, cat]) => (
                      <SelectItem key={id} value={`custom-${id}`} className="text-xs">{cat.name}</SelectItem>
                    ))}
                    {visibleMarketCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              {currentAssets.length > 0 && (
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-7 text-xs dark:bg-white/5 dark:border-white/10 dark:text-white border-gray-200 rounded-lg px-2.5 w-auto gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#1a1a2e] bg-white dark:border-white/10">
                    <SelectItem value="symbol" className="text-xs">Symbol</SelectItem>
                    <SelectItem value="price" className="text-xs">Price</SelectItem>
                    <SelectItem value="change" className="text-xs">Change %</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Search */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-1.5 rounded-lg dark:bg-white/5 dark:hover:bg-white/10 bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Search stocks"
              >
                <Search className="w-3.5 h-3.5 dark:text-gray-400 text-gray-500" />
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isManualRefreshing || isLoading}
                className="p-1.5 rounded-lg dark:bg-white/5 dark:hover:bg-white/10 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Refresh prices"
              >
                <RefreshCw className={`w-3.5 h-3.5 dark:text-gray-400 text-gray-500 ${(isManualRefreshing || isFetching) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.3)] overflow-hidden">
            {currentAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <Star className="w-12 h-12 dark:text-gray-700 text-gray-300 mb-3" />
                <h3 className="text-base font-semibold dark:text-white text-gray-900 mb-1">
                  {isPersonalTab ? 'This list is empty' : 'No data available'}
                </h3>
                <p className="text-sm dark:text-gray-500 text-gray-500 max-w-xs">
                  {isPersonalTab ? 'Use the search or browse market categories to add stocks.' : 'Data is loading...'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-white/5 border-gray-200">
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500">Symbol</th>
                        <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500 hidden sm:table-cell">Name</th>
                        <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500">Price</th>
                        <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500">Change</th>
                        <th className="text-center py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading && visibleAssets.length === 0
                        ? Array.from({ length: Math.min(5, currentAssets.length) }).map((_, i) => (
                          <tr key={i} className="border-b dark:border-white/5 border-gray-100 animate-pulse">
                            <td className="py-4 px-4"><div className="h-5 dark:bg-white/5 bg-gray-200 rounded w-16" /></td>
                            <td className="py-4 px-4 hidden sm:table-cell"><div className="h-4 dark:bg-white/5 bg-gray-200 rounded w-28" /></td>
                            <td className="py-4 px-4"><div className="h-4 dark:bg-white/5 bg-gray-200 rounded w-16 ml-auto" /></td>
                            <td className="py-4 px-4"><div className="h-4 dark:bg-white/5 bg-gray-200 rounded w-16 ml-auto" /></td>
                            <td className="py-4 px-4"><div className="h-6 dark:bg-white/5 bg-gray-200 rounded w-8 mx-auto" /></td>
                          </tr>
                        ))
                        : visibleAssets.map(symbol => {
                          const price = getPrice(symbol);
                          const change = getChange(symbol);
                          const isPositive = change === null ? null : change >= 0;
                          const logo = getLogo(symbol);
                          const name = getCompanyName(symbol);
                          const assetType = getAssetType(symbol);
                          const stockStatus = getStockWatchlistStatus(symbol);
                          const isSaved = Object.keys(stockStatus).length > 0;
                          const isPreview = previewOpen === symbol;
                          const isMenuOpen = watchlistMenuOpen === symbol;

                          return (
                            <React.Fragment key={symbol}>
                              <tr
                                className="border-b dark:border-white/5 border-gray-100 dark:hover:bg-white/[0.03] hover:bg-gray-50 transition-colors"
                              >
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <StockLogo
                                      symbol={symbol}
                                      logoUrl={logo}
                                      avatarBg={getMockAsset(symbol)?.color}
                                      initials={getMockAsset(symbol)?.initials}
                                      className="w-8 h-8"
                                    />
                                    <div>
                                      <span className="font-bold dark:text-white text-gray-900 text-sm block">{getDisplaySymbol(symbol)}</span>
                                      <span className="text-[10px] dark:text-gray-600 text-gray-400 capitalize">{assetType}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 dark:text-gray-400 text-gray-600 text-sm hidden sm:table-cell truncate max-w-[160px]">{name}</td>
                                <td className="py-3.5 px-4 text-right font-semibold dark:text-white text-gray-900 text-sm">
                                  {price !== null ? `$${price.toFixed(2)}` : <span className="dark:text-gray-600 text-gray-400">—</span>}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {change !== null ? (
                                    <span className={`inline-flex items-center gap-1 font-semibold text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                      {isPositive ? '+' : ''}{change.toFixed(2)}%
                                    </span>
                                  ) : <span className="dark:text-gray-600 text-gray-400">—</span>}
                                </td>
                                <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => window.location.href = `/StockView?symbol=${symbol}`}
                                      className="p-1.5 rounded-lg dark:hover:bg-blue-500/20 hover:bg-blue-50 transition-colors"
                                      title="Open full view"
                                    >
                                      <Eye className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400 dark:hover:text-cyan-400 hover:text-blue-600 transition-colors" />
                                    </button>
                                    <div className="relative">
                                      {/* Star: toggles save/remove; if not saved, opens list picker */}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleStar(symbol); }}
                                        className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
                                        title={isSaved ? 'Remove from lists' : 'Add to list'}
                                      >
                                        <Star className={`w-3.5 h-3.5 transition-colors ${isSaved ? 'fill-blue-500 text-blue-500' : 'dark:text-gray-600 text-gray-400'}`} />
                                      </button>
                                      <UnifiedWatchlistMenu
                                        symbol={symbol}
                                        customCategories={customCategories}
                                        onAddToList={addToWatchlist}
                                        onRemoveFromList={removeFromWatchlist}
                                        onCreateList={createNewWatchlist}
                                        isOpen={isMenuOpen}
                                        onClose={() => setWatchlistMenuOpen(null)}
                                        stockInLists={stockStatus}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {isPreview && (
                                <tr>
                                  <td colSpan="6" className="p-0 dark:bg-white/[0.02] bg-gray-50/50 border-b dark:border-white/5 border-gray-200">
                                    <div className="px-4 py-3">
                                      <StockPreviewPanel symbol={symbol} name={name} isOpen={true} onClose={() => setPreviewOpen(null)} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Load more / total */}
                <div className="px-4 py-3 border-t dark:border-white/5 border-gray-100 text-center">
                  {visibleCount < sortedAssets.length ? (
                    <button
                      onClick={() => setVisibleCount(prev => Math.min(prev + 15, sortedAssets.length))}
                      className="text-xs font-medium dark:text-cyan-400 text-blue-600 dark:hover:text-blue-300 hover:text-blue-700 transition-colors"
                    >
                      Load more ({visibleCount} of {sortedAssets.length})
                    </button>
                  ) : (
                    <p className="text-[11px] dark:text-gray-600 text-gray-400">All {sortedAssets.length} assets shown</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        metadataMap={metadataMap}
        customCategories={customCategories}
        savedSymbols={savedSymbols}
        onAddToList={addToWatchlist}
        onCreateList={createNewWatchlist}
        activeListId={activeTab}
      />

      {/* Toast notifications */}
      <WatchlistToastContainer />

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl dark:bg-[#16161e] bg-white border dark:border-white/10 border-gray-200 shadow-2xl p-6">
            <h3 className="text-base font-bold dark:text-white text-gray-900 mb-4">New Watchlist</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g. My Swing Trades"
              className="w-full px-3.5 py-2.5 rounded-xl dark:bg-white/5 dark:border-white/10 dark:text-white border border-gray-300 bg-white placeholder:dark:text-gray-600 placeholder:text-gray-400 mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') createCustomCategory(newListName); if (e.key === 'Escape') setShowCreateModal(false); }}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowCreateModal(false); setNewListName(''); }} className="flex-1 py-2 rounded-xl text-sm font-medium dark:bg-white/5 dark:text-gray-300 bg-gray-100 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={() => createCustomCategory(newListName)} disabled={!newListName.trim()} className="flex-1 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}