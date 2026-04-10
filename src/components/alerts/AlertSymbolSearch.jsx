import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { searchWithCache } from '@/lib/stocksCache';
import { Search, Loader2, X } from 'lucide-react';

// Normalize: strip non-printable/non-ASCII, collapse spaces, uppercase
const normalizeQuery = (raw) =>
  raw.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

export default function AlertSymbolSearch({ value, assetName, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Reset when parent clears the value
  useEffect(() => {
    if (!value) { setQuery(''); setDebounced(''); }
  }, [value]);

  // Debounce + normalize — always normalize regardless of open state
  useEffect(() => {
    const normalized = normalizeQuery(query);
    const t = setTimeout(() => {
      console.log('[AlertSearch] raw:', JSON.stringify(query), '| normalized:', normalized);
      setDebounced(normalized);
      if (normalized.length > 0) setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click/touch
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Query is ALWAYS enabled by debounced length — NOT gated by open state
  // This ensures mobile keyboards that don't reliably trigger onFocus still work
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['alertSymbolSearch', debounced],
    queryFn: async () => {
      console.log('[AlertSearch] Querying for:', debounced);
      const data = await searchWithCache(debounced);
      console.log('[AlertSearch] Results count:', data.length, '| symbols:', data.slice(0, 5).map(r => r.symbol).join(', '));
      return data;
    },
    enabled: debounced.length >= 1,
    staleTime: 30000,
  });

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    onChange(val);
  };

  const handleSelect = (stock) => {
    setQuery(stock.symbol);
    setOpen(false);
    onSelect({ symbol: stock.symbol, name: stock.name || stock.companyName || stock.symbol });
  };

  const handleClear = () => {
    setQuery('');
    setDebounced('');
    setOpen(false);
    onSelect({ symbol: '', name: '' });
    inputRef.current?.focus();
  };

  const showDropdown = open && debounced.length >= 1;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 dark:text-gray-500 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          value={query}
          onChange={handleInput}
          onInput={handleInput}
          onFocus={() => { if (debounced.length >= 1) setOpen(true); }}
          placeholder="Search symbol or company..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 dark:text-white text-gray-900 placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
        />
        {isLoading && debounced.length > 0 && (
          <Loader2 className="absolute right-3 w-4 h-4 animate-spin text-blue-500" />
        )}
        {query && !isLoading && (
          <button
            onPointerDown={(e) => { e.preventDefault(); handleClear(); }}
            className="absolute right-3 p-0.5 rounded dark:hover:bg-white/10 hover:bg-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
          </button>
        )}
      </div>

      {assetName && (
        <p className="mt-1 text-xs dark:text-gray-500 text-gray-500 pl-1">{assetName}</p>
      )}

      {showDropdown && (
        <div className="absolute top-full mt-1 w-full dark:bg-[#1a1a2e] bg-white rounded-xl shadow-2xl border dark:border-white/10 border-gray-200 z-50 overflow-hidden max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm dark:text-gray-500 text-gray-500 px-4 py-3">No results for "{debounced}"</p>
          ) : (
            results.slice(0, 8).map((stock) => (
              <button
                key={stock.symbol}
                onPointerDown={(e) => { e.preventDefault(); handleSelect(stock); }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 dark:hover:bg-white/5 hover:bg-gray-50 transition-colors border-b dark:border-white/5 border-gray-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold dark:text-white text-gray-900">{stock.symbol}</p>
                  <p className="text-xs dark:text-gray-500 text-gray-500 truncate">{stock.name || stock.companyName}</p>
                </div>
                <span className="text-[10px] dark:text-gray-600 text-gray-400 uppercase flex-shrink-0">{stock.exchange}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}