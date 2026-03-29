import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchWatchlist, addToWatchlist, removeFromWatchlist } from '../../lib/watchlist';

const LS_KEY = 'watchlist_items';

/**
 * Watchlist hook — Supabase-backed for authenticated users, localStorage for guests.
 *
 * Returns:
 *   symbols   string[]   — ordered list of saved symbols
 *   loading   boolean    — true while initial fetch is in progress
 *   isSaved   (symbol) => boolean
 *   toggle    (symbol, assetType?) => Promise<void>  — add if absent, remove if present
 */
export function useWatchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]); // [{ symbol, asset_type }]
  const [loading, setLoading] = useState(false);

  const symbols = items.map(i => i.symbol);

  // Load watchlist when user changes
  useEffect(() => {
    if (!user) {
      // Guest — read from localStorage (symbols only, default type 'stock')
      try {
        const saved = localStorage.getItem(LS_KEY);
        const syms = saved ? JSON.parse(saved) : [];
        setItems(syms.map(s => ({ symbol: s, asset_type: 'stock' })));
      } catch {
        setItems([]);
      }
      return;
    }

    // Authenticated — fetch from Supabase
    setLoading(true);
    console.log('[useWatchlist] fetching for user:', user.id);
    fetchWatchlist(user.id)
      .then(rows => {
        console.log('[useWatchlist] fetched rows:', rows);
        setItems(rows.map(r => ({ symbol: r.symbol, asset_type: r.asset_type })));
      })
      .catch(err => {
        console.error('[useWatchlist] fetch error:', err?.message ?? err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const isSaved = useCallback(
    (symbol) => symbols.includes(symbol),
    [symbols]
  );

  /**
   * Toggle a symbol: adds if not present, removes if present.
   * Optimistic update — reverts on error.
   */
  const toggle = useCallback(async (symbol, assetType = 'stock') => {
    const wasIn = symbols.includes(symbol);

    if (!user) {
      // Guest path — localStorage only
      setItems(prev => {
        const next = wasIn ? prev.filter(i => i.symbol !== symbol) : [{ symbol, asset_type: assetType }, ...prev];
        try { localStorage.setItem(LS_KEY, JSON.stringify(next.map(i => i.symbol))); } catch {}
        return next;
      });
      return;
    }

    // Optimistic update
    setItems(prev => wasIn
      ? prev.filter(i => i.symbol !== symbol)
      : [{ symbol, asset_type: assetType }, ...prev]
    );

    try {
      if (wasIn) {
        await removeFromWatchlist(user.id, symbol);
      } else {
        await addToWatchlist(user.id, symbol, assetType);
      }
    } catch (err) {
      console.warn('[useWatchlist] toggle failed, reverting:', err.message);
      // Revert
      setItems(prev => wasIn
        ? [{ symbol, asset_type: assetType }, ...prev]
        : prev.filter(i => i.symbol !== symbol)
      );
    }
  }, [user, symbols]);

  return { items, symbols, loading, isSaved, toggle };
}
