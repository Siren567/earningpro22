/**
 * SearchModal
 *
 * Search stocks / ETFs / crypto and add them to a watchlist.
 * Clicking "+" opens an inline list-picker showing all user-owned lists.
 * The user selects a list (or creates a new one), then the stock is added.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Plus, Check, Loader2, Star, ChevronRight } from 'lucide-react';
import StockLogo from '../stock/StockLogo';
import { supabase } from '@/lib/supabase';
import { proxyApiUrl } from '@/lib/apiProxyUrls';

export default function SearchModal({
  isOpen,
  onClose,
  metadataMap = {},
  customCategories = {},
  savedSymbols = [],
  onAddToList,
  onCreateList,
  activeListId,
}) {
  const [query, setQuery]               = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pickerSymbol, setPickerSymbol] = useState(null);   // which row has the list-picker open
  const [newListMode, setNewListMode]   = useState(false);  // show "new list" input inside picker
  const [newListName, setNewListName]   = useState('');
  const inputRef = useRef(null);
  const newListRef = useRef(null);

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setPickerSymbol(null);
      setNewListMode(false);
      setNewListName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── Debounce & sanitise query ─────────────────────────────────────────────
  useEffect(() => {
    const normalized = query
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    const timer = setTimeout(() => setDebouncedQuery(normalized), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (pickerSymbol) { setPickerSymbol(null); setNewListMode(false); }
        else onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, pickerSymbol]);

  // ── Focus new-list input when it appears ─────────────────────────────────
  useEffect(() => {
    if (newListMode) setTimeout(() => newListRef.current?.focus(), 50);
  }, [newListMode]);

  // ── Offline fallback dataset ──────────────────────────────────────────────
  const FALLBACK_RESULTS = [
    { symbol: 'AAPL',    name: 'Apple Inc.',                                 exchange: 'NASDAQ'    },
    { symbol: 'NVDA',    name: 'NVIDIA Corporation',                         exchange: 'NASDAQ'    },
    { symbol: 'TSLA',    name: 'Tesla, Inc.',                                exchange: 'NASDAQ'    },
    { symbol: 'MSFT',    name: 'Microsoft Corporation',                      exchange: 'NASDAQ'    },
    { symbol: 'AMZN',    name: 'Amazon.com, Inc.',                           exchange: 'NASDAQ'    },
    { symbol: 'SPY',     name: 'SPDR S&P 500 ETF Trust',                     exchange: 'NYSE Arca' },
    { symbol: 'QQQ',     name: 'Invesco QQQ Trust',                          exchange: 'NASDAQ'    },
    { symbol: 'BMNZ',    name: 'Defiance Daily Target 2X Short Bitcoin ETF', exchange: 'NYSE Arca' },
    { symbol: 'TQQQ',    name: 'ProShares UltraPro QQQ',                     exchange: 'NASDAQ'    },
    { symbol: 'BTC-USD', name: 'Bitcoin USD',                                exchange: 'CCC'       },
  ];

  const ALLOWED_TYPES = new Set(['EQUITY', 'ETF', 'MUTUALFUND', 'CRYPTOCURRENCY', 'FUTURE', 'INDEX']);

  function applyFallback(q) {
    const lower = q.toLowerCase();
    const filtered = FALLBACK_RESULTS.filter(
      r => r.symbol.toLowerCase().includes(lower) || r.name.toLowerCase().includes(lower)
    );
    console.log('[search] fallback filtered:', filtered.map(r => r.symbol));
    return filtered;
  }

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['searchModal', debouncedQuery],
    queryFn: async () => {
      console.log('[search] query:', debouncedQuery);
      try {
        const url = proxyApiUrl('yf', 'v1/finance/search', {
          q: debouncedQuery,
          quotesCount: 20,
          newsCount: 0,
          enableFuzzyQuery: true,
          enableNavLinks: false,
        });
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) {
          console.warn('[search] API returned HTTP', res.status, '— using fallback data');
          return applyFallback(debouncedQuery);
        }
        const json = await res.json();
        const raw  = json.quotes ?? [];
        const mapped = raw
          .filter(q => ALLOWED_TYPES.has(q.quoteType))
          .map(q => ({
            symbol:   q.symbol,
            name:     q.shortname || q.longname || q.symbol,
            exchange: q.exchDisp  || q.exchange || '',
            type:     q.quoteType,
          }));
        console.log('[search] results:', mapped.length, mapped.map(r => r.symbol));
        if (mapped.length > 0) {
          const records = mapped.map(r => ({
            symbol: r.symbol, name: r.name, exchange: r.exchange,
            price: null, change: null, change_percent: null, last_updated: null,
          }));
          supabase.from('stocks')
            .upsert(records, { onConflict: 'symbol', ignoreDuplicates: true })
            .then(({ error }) => { if (error) console.warn('[search] cache upsert:', error.message); });
        }
        if (mapped.length === 0) {
          console.warn('[search] 0 results — raw types:', raw.map(q => q.quoteType));
        }
        return mapped;
      } catch (err) {
        console.error('[search] fetch error:', err.message, '— using fallback data');
        return applyFallback(debouncedQuery);
      }
    },
    enabled: isOpen && debouncedQuery.length >= 1,
    staleTime: 30000,
    retry: 1,
  });

  // ── Membership helpers ────────────────────────────────────────────────────

  /** Is this symbol already in the user's Favorites? */
  const isInFavorites = (symbol) => savedSymbols.includes(symbol);

  /** Is this symbol in a given custom list? */
  const isInCustomList = (symbol, listId) =>
    customCategories[listId]?.assets?.includes(symbol) || false;

  /**
   * Is this symbol in ANY user-owned list?
   * Used to decide whether to show the ✓ check or the + button at the row level.
   */
  const isInAnyList = (symbol) => {
    if (isInFavorites(symbol)) return true;
    return Object.keys(customCategories).some(id => isInCustomList(symbol, id));
  };

  // ── Ordered list of user-owned watchlists for the picker ─────────────────
  const userLists = [
    { id: 'my-watchlist', label: 'Favorites', icon: Star },
    ...Object.entries(customCategories).map(([id, cat]) => ({
      id:    `custom-${id}`,
      label: cat.name,
      icon:  null,
    })),
  ];

  // ── Picker handlers ───────────────────────────────────────────────────────

  const openPicker = (symbol) => {
    console.log('[watchlist] clicked +', symbol);
    setPickerSymbol(prev => prev === symbol ? null : symbol);
    setNewListMode(false);
    setNewListName('');
  };

  const selectList = (symbol, listId, label) => {
    console.log('[watchlist] addToWatchlist', symbol, '→ list:', listId);
    onAddToList(symbol, listId);
    setPickerSymbol(null);
    setNewListMode(false);
    setNewListName('');
  };

  const submitNewList = (symbol) => {
    const name = newListName.trim();
    if (!name) return;
    onCreateList(name, symbol);
    setPickerSymbol(null);
    setNewListMode(false);
    setNewListName('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={() => { setPickerSymbol(null); setNewListMode(false); onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl dark:bg-[#16161e] bg-white border dark:border-white/10 border-gray-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Search input ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-white/5 border-gray-200">
          <Search className="w-4 h-4 dark:text-gray-500 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPickerSymbol(null); }}
            onInput={(e)  => { setQuery(e.target.value); setPickerSymbol(null); }}
            placeholder="Search symbol or company…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="flex-1 bg-transparent dark:text-white text-gray-900 placeholder:dark:text-gray-600 placeholder:text-gray-400 text-sm focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 dark:text-gray-400 text-gray-500" />
          </button>
        </div>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <div className="max-h-[65vh] overflow-y-auto">
          {debouncedQuery.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm dark:text-gray-600 text-gray-400">
              Type to search stocks, ETFs, crypto…
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="px-4 py-8 text-center text-sm dark:text-gray-600 text-gray-400">
              No results for "{query}"
            </div>
          ) : (
            results.map((stock) => {
              const { symbol } = stock;
              const pickerOpen = pickerSymbol === symbol;
              const alreadyInAny = isInAnyList(symbol);

              return (
                <div key={symbol}>
                  {/* ── Result row ─────────────────────────────────────── */}
                  <div className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${
                    pickerOpen
                      ? 'dark:bg-white/[0.05] bg-blue-50/60'
                      : 'dark:hover:bg-white/[0.03] hover:bg-gray-50'
                  }`}>
                    <StockLogo symbol={symbol} className="w-7 h-7 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold dark:text-white text-gray-900 text-sm leading-tight">
                        {symbol}
                      </p>
                      <p className="text-[11px] dark:text-gray-600 text-gray-400 truncate leading-tight">
                        {stock.name || '—'}
                      </p>
                    </div>

                    {stock.exchange && (
                      <span className="text-[9px] dark:text-gray-700 text-gray-400 uppercase tracking-wide flex-shrink-0">
                        {stock.exchange}
                      </span>
                    )}

                    {/* + button — opens list picker */}
                    <button
                      onClick={() => openPicker(symbol)}
                      className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        pickerOpen
                          ? 'dark:bg-blue-500/20 bg-blue-100 dark:text-blue-400 text-blue-600'
                          : alreadyInAny
                          ? 'dark:text-gray-600 text-gray-300 dark:hover:bg-white/5 hover:bg-gray-100'
                          : 'dark:text-gray-400 text-gray-500 dark:hover:bg-white/[0.06] hover:bg-gray-100 dark:hover:text-cyan-400 hover:text-blue-600'
                      }`}
                      title={alreadyInAny ? 'Manage lists' : 'Add to watchlist'}
                    >
                      {alreadyInAny
                        ? <Check className="w-4 h-4 text-blue-500" />
                        : <Plus className="w-4 h-4" />
                      }
                    </button>
                  </div>

                  {/* ── Inline list picker ─────────────────────────────── */}
                  {pickerOpen && (
                    <div className="dark:bg-[#12121a] bg-gray-50 border-t border-b dark:border-white/5 border-gray-100">
                      {/* Picker header */}
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[10px] font-semibold uppercase tracking-widest dark:text-gray-500 text-gray-400">
                          Add <span className="dark:text-gray-300 text-gray-700">{symbol}</span> to…
                        </p>
                      </div>

                      {/* List options */}
                      <div className="py-1">
                        {userLists.map(({ id, label, icon: Icon }) => {
                          const inThisList = id === 'my-watchlist'
                            ? isInFavorites(symbol)
                            : isInCustomList(symbol, id.replace('custom-', ''));

                          return (
                            <button
                              key={id}
                              disabled={inThisList}
                              onClick={() => !inThisList && selectList(symbol, id, label)}
                              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                inThisList
                                  ? 'opacity-50 cursor-default'
                                  : 'dark:hover:bg-white/[0.05] hover:bg-white dark:text-gray-300 text-gray-700 cursor-pointer'
                              }`}
                            >
                              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                {inThisList
                                  ? <Check className="w-3.5 h-3.5 text-blue-500" />
                                  : Icon
                                  ? <Icon className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
                                  : <span className="w-1.5 h-1.5 rounded-full dark:bg-gray-600 bg-gray-300" />
                                }
                              </div>
                              <span className="flex-1 text-left">{label}</span>
                              {inThisList && (
                                <span className="text-[10px] dark:text-gray-600 text-gray-400">Added</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <div className="h-px dark:bg-white/5 bg-gray-200 mx-4" />

                      {/* Create new list */}
                      {newListMode ? (
                        <div className="px-4 py-2.5 flex items-center gap-2">
                          <input
                            ref={newListRef}
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitNewList(symbol);
                              if (e.key === 'Escape') { setNewListMode(false); setNewListName(''); }
                            }}
                            placeholder="List name…"
                            className="flex-1 text-sm bg-transparent dark:text-white text-gray-900 placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none"
                          />
                          <button
                            onClick={() => submitNewList(symbol)}
                            disabled={!newListName.trim()}
                            className="text-xs font-semibold dark:text-blue-400 text-blue-600 dark:hover:text-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-default transition-colors"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => { setNewListMode(false); setNewListName(''); }}
                            className="dark:text-gray-600 text-gray-400 dark:hover:text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNewListMode(true)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 dark:hover:bg-white/[0.03] hover:bg-white transition-colors"
                        >
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                          Create new list
                        </button>
                      )}

                      {/* Close picker */}
                      <div className="px-4 pb-2.5 pt-1">
                        <button
                          onClick={() => { setPickerSymbol(null); setNewListMode(false); }}
                          className="text-[11px] dark:text-gray-600 text-gray-400 dark:hover:text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
