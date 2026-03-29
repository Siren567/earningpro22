import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus } from 'lucide-react';

export default function AddStockToList({
  currentAssets,
  allAvailableStocks,
  onAddStock,
  getCompanyName,
  metadataMap = {},
  quotesData = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!searchQuery) {
      setResults([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    const filtered = allAvailableStocks.filter((symbol) => {
      if (currentAssets.includes(symbol)) return false;
      const name = getCompanyName(symbol).toLowerCase();
      return symbol.toLowerCase().includes(q) || name.includes(q);
    });

    setResults(filtered.slice(0, 5));
  }, [searchQuery, currentAssets, allAvailableStocks, getCompanyName]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (symbol) => {
    onAddStock(symbol);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-lg text-sm font-medium dark:bg-blue-500/10 dark:text-cyan-400 dark:border dark:border-blue-500/30 bg-blue-50 text-blue-700 border border-blue-200 hover:dark:bg-blue-500/15 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Stock
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 dark:bg-[#1a1a1a] bg-white rounded-lg shadow-xl border dark:border-white/10 border-gray-200 overflow-hidden z-40">
          <div className="p-2 border-b dark:border-white/5 border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 dark:text-gray-600 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol or name..."
                autoFocus
                className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md dark:bg-white/5 dark:border-white/10 dark:text-white border border-gray-300 bg-white placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {searchQuery && (
            <div className="max-h-40 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-3 py-2 text-xs dark:text-gray-500 text-gray-500 text-center">No results found</div>
              ) : (
                results.map((symbol) => {
                  const metadata = metadataMap?.[symbol];
                  const logo = metadata?.logo && typeof metadata.logo === 'string' && metadata.logo.trim() ? metadata.logo : null;
                  const name = getCompanyName(symbol);
                  
                  return (
                    <button
                      key={symbol}
                      onClick={() => handleSelect(symbol)}
                      className="w-full px-3 py-2 text-left text-xs dark:text-gray-300 text-gray-700 dark:hover:bg-white/5 hover:bg-gray-50 transition-colors border-b dark:border-white/5 border-gray-100 last:border-0 flex items-center gap-2"
                    >
                      {/* Logo / Fallback Icon */}
                      <div className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center dark:bg-white/10 bg-gray-100 overflow-hidden">
                        {logo ? (
                          <img src={logo} alt={symbol} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                          <span className="text-xs font-bold dark:text-gray-400 text-gray-600">{symbol[0]}</span>
                        )}
                      </div>
                      {/* Stock Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{symbol}</div>
                        <div className="dark:text-gray-600 text-gray-500 truncate text-xs">{name}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}