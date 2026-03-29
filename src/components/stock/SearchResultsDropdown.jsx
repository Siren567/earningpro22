import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import StockLogo from './StockLogo';

const highlightText = (text, query) => {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? 
      <span key={i} className="bg-blue-500/30 text-blue-300 font-medium">{part}</span> : 
      part
  );
};



export default function SearchResultsDropdown({
  results = [],
  query = '',
  isLoading = false,
  onSelect,
  selectedIndex = 0
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const maxResults = 10;
  const displayResults = results.slice(0, maxResults);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, results]);

  const handleKeyDown = (e) => {
    if (!displayResults.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < displayResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : displayResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (displayResults[highlightedIndex]) {
          onSelect(displayResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onSelect(null);
        break;
      default:
        break;
    }
  };

  if (!query.length) return null;

  return (
    <div 
      className="absolute top-full mt-2 w-full dark:bg-[#0f1419] bg-white rounded-xl shadow-2xl border dark:border-white/10 border-gray-200 overflow-hidden z-50"
      onKeyDown={handleKeyDown}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : displayResults.length === 0 ? (
        <div className="text-center py-8 px-4">
          <p className="text-sm dark:text-gray-500 text-gray-500">No results found for "{query}"</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {displayResults.map((stock, idx) => (
            <button
              key={idx}
              onPointerDown={(e) => { e.preventDefault(); onSelect(stock); }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={cn(
                'w-full px-4 py-3.5 text-left transition-all border-b dark:border-white/5 border-gray-100 last:border-0',
                'flex items-center justify-between gap-4',
                highlightedIndex === idx 
                  ? 'dark:bg-blue-500/15 bg-blue-50 dark:border-b-blue-500/30 border-b-blue-200' 
                  : 'dark:hover:bg-white/5 hover:bg-gray-50'
              )}
            >
              {/* Logo & Company Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <StockLogo symbol={stock.symbol} logoUrl={`https://financialmodelingprep.com/image-stock/${stock.symbol}.png`} className="w-8 h-8" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold dark:text-white text-gray-900 text-sm truncate">
                    {highlightText(stock.name, query)}
                  </p>
                  <p className="text-xs dark:text-gray-500 text-gray-600 mt-0.5">
                    <span className="font-medium dark:text-cyan-400 text-blue-600">{stock.symbol}</span>
                    <span className="dark:text-gray-600 text-gray-400"> • </span>
                    <span>{stock.exchange}</span>
                  </p>
                </div>
              </div>

              {/* Arrow Icon */}
              <ChevronRight className="w-4 h-4 dark:text-gray-600 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}