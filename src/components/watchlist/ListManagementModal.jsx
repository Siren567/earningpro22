import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StockLogo from '../stock/StockLogo';

export default function ListManagementModal({
  isOpen,
  onClose,
  listId,
  listName,
  listAssets,
  onUpdateListName,
  onAddStockToList,
  onRemoveStockFromList,
  customCategories,
  allAvailableStocks,
  getCompanyName,
  quotesData,
  metadataMap,
}) {
  const [editingName, setEditingName] = useState(listName);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sortBy, setSortBy] = useState('symbol');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const modalRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle outside click to close modal
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Close dropdown when clicking outside search area
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };

    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchDropdown]);

  // Update search results based on debounced query
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    const q = debouncedQuery.toLowerCase();
    const filtered = allAvailableStocks.filter((symbol) => {
      if (listAssets.includes(symbol)) return false;
      const name = getCompanyName(symbol).toLowerCase();
      return symbol.toLowerCase().includes(q) || name.includes(q);
    });

    setSearchResults(filtered.slice(0, 12));
    setIsSearching(false);
  }, [debouncedQuery, listAssets, allAvailableStocks, getCompanyName]);

  const handleSaveName = () => {
    if (editingName.trim() && editingName !== listName) {
      onUpdateListName(listId, editingName.trim());
    }
    setEditingName(listName);
  };

  const handleAddStock = (symbol) => {
    onAddStockToList(symbol, listId);
    setSearchQuery('');
  };

  const getLivePrice = (symbol) => {
    const quote = quotesData[symbol];
    return quote?.current !== undefined ? quote.current : null;
  };

  const getLiveChangePercent = (symbol) => {
    const quote = quotesData[symbol];
    return quote?.percentChange !== undefined ? quote.percentChange : null;
  };

  const getLogo = (symbol) => {
    const metadata = metadataMap[symbol];
    return metadata?.logo || null;
  };

  // Sort stocks based on selected option
  const sortedStocks = React.useMemo(() => {
    const stocks = [...listAssets];
    
    switch (sortBy) {
      case 'symbol':
        return stocks.sort((a, b) => a.localeCompare(b));
      case 'name':
        return stocks.sort((a, b) =>
          getCompanyName(a).localeCompare(getCompanyName(b))
        );
      case 'price':
        return stocks.sort((a, b) =>
          (getLivePrice(b) || 0) - (getLivePrice(a) || 0)
        );
      case 'change':
        return stocks.sort((a, b) =>
          (getLiveChangePercent(b) || 0) - (getLiveChangePercent(a) || 0)
        );
      case 'gainers':
        return stocks.sort((a, b) =>
          (getLiveChangePercent(b) || 0) - (getLiveChangePercent(a) || 0)
        );
      case 'losers':
        return stocks.sort((a, b) =>
          (getLiveChangePercent(a) || 0) - (getLiveChangePercent(b) || 0)
        );
      default:
        return stocks;
    }
  }, [listAssets, sortBy, quotesData, metadataMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl dark:bg-[#0f0f0f] bg-white border dark:border-gray-800 border-gray-200 overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b dark:border-gray-800 border-gray-200 flex items-center justify-between flex-shrink-0 bg-gradient-to-r dark:from-gray-900 dark:to-gray-950 from-gray-50 to-white">
          <h2 className="text-xl font-bold dark:text-white text-gray-900">Manage Watchlist</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 dark:text-gray-400 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b dark:from-gray-950 dark:to-gray-900 from-white to-gray-50">
          <div className="p-8 space-y-8">
            {/* List Name Section */}
            <div>
              <label className="text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider mb-2 block">
                List Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg dark:bg-white/5 dark:border-white/10 dark:text-white border border-gray-300 bg-white placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveName}
                  disabled={editingName === listName || !editingName.trim()}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Search and Sort Row */}
            <div>
              <label className="text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider mb-3 block">
                Add Stocks
              </label>
              <div className="relative" ref={searchContainerRef}>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-600 text-gray-400 pointer-events-none z-10" />
                  {isSearching && debouncedQuery && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500 z-10" />
                  )}
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => searchQuery && setShowSearchDropdown(true)}
                    placeholder="Search by symbol or company name..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg dark:bg-white/5 dark:border-white/10 dark:text-white border border-gray-300 bg-white placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Search Results Dropdown - StockView Style */}
                {showSearchDropdown && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 dark:bg-[#1a1a1a] bg-white rounded-lg shadow-xl border dark:border-gray-800 border-gray-200 overflow-hidden z-50">
                    <div className="max-h-64 overflow-y-auto">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((symbol) => (
                          <button
                            key={symbol}
                            onClick={() => handleAddStock(symbol)}
                            className="w-full px-4 py-3 text-left dark:hover:bg-white/5 hover:bg-gray-50 transition-colors border-b dark:border-gray-800 border-gray-100 last:border-0 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center dark:bg-white/5 bg-gray-100">
                                {getLogo(symbol) ? (
                                  <img
                                    src={getLogo(symbol)}
                                    alt={symbol}
                                    className="w-full h-full object-cover rounded"
                                    onError={(e) => (e.target.style.display = 'none')}
                                  />
                                ) : (
                                  <StockLogo symbol={symbol} className="w-5 h-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm dark:text-white text-gray-900">
                                  {symbol}
                                </p>
                                <p className="text-xs dark:text-gray-500 text-gray-600 truncate">
                                  {getCompanyName(symbol)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-xs dark:text-gray-500 text-gray-600 text-center">
                          No stocks found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stocks in List Section */}
            {listAssets.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
                    Stocks in List ({listAssets.length})
                  </label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-auto dark:bg-white/5 dark:border-white/10 dark:text-white rounded-lg h-8 px-2.5 text-xs font-medium border dark:border-white/10 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#1a1a1a] bg-white dark:border-white/10 border-gray-200">
                      <SelectItem value="symbol">Sort by Symbol</SelectItem>
                      <SelectItem value="name">Sort by Name</SelectItem>
                      <SelectItem value="price">Sort by Price</SelectItem>
                      <SelectItem value="change">Sort by Change %</SelectItem>
                      <SelectItem value="gainers">Gainers First</SelectItem>
                      <SelectItem value="losers">Losers First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sortedStocks.map((symbol) => {
                    const price = getLivePrice(symbol);
                    const changePercent = getLiveChangePercent(symbol);
                    const isPositive = changePercent === null ? null : changePercent >= 0;

                    return (
                      <div
                        key={symbol}
                        className="p-3 rounded-lg dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200 flex items-center justify-between hover:dark:bg-white/10 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center dark:bg-white/5 bg-gray-200">
                            {getLogo(symbol) ? (
                              <img
                                src={getLogo(symbol)}
                                alt={symbol}
                                className="w-full h-full object-cover rounded"
                                onError={(e) => (e.target.style.display = 'none')}
                              />
                            ) : (
                              <StockLogo symbol={symbol} className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm dark:text-white text-gray-900">
                              {symbol}
                            </p>
                            <p className="text-xs dark:text-gray-500 text-gray-600 truncate">
                              {getCompanyName(symbol)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                          {price !== null && (
                            <span className="text-sm font-semibold dark:text-white text-gray-900">
                              ${price.toFixed(2)}
                            </span>
                          )}
                          {changePercent !== null && (
                            <div className={`flex items-center gap-1 text-xs font-semibold ${
                              isPositive ? 'text-blue-500' : 'text-red-400'
                            }`}>
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                            </div>
                          )}
                          <button
                            onClick={() => onRemoveStockFromList(symbol, listId)}
                            className="p-1.5 rounded-lg dark:hover:bg-red-500/20 hover:bg-red-100 transition-colors flex-shrink-0"
                            title="Remove from list"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {listAssets.length === 0 && (
              <div className="text-center py-8">
                <p className="dark:text-gray-500 text-gray-500 text-sm">
                  No stocks in this list yet. Search above to add stocks.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t dark:border-gray-800 border-gray-200 bg-gradient-to-r dark:from-gray-900 dark:to-gray-950 from-gray-50 to-white flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}