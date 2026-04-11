import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  fetchListsWithItems,
  createList,
  deleteList,
  renameList,
  addItemToList,
  removeItemFromList,
} from '../../lib/watchlistLists';

const LS_KEY = 'watchlist_custom_categories';

/**
 * Custom watchlist lists hook — Supabase-backed for authenticated users,
 * localStorage for guests.
 *
 * Returns:
 *   customCategories   { [id]: { name, assets: string[] } }
 *   listsLoading       boolean
 *   createCustomList   (name) => Promise<id>
 *   deleteCustomList   (id) => void
 *   renameCustomList   (id, newName) => void
 *   addSymbolToList    (symbol, listId, assetType?) => void
 *   removeSymbolFromList (symbol, listId) => void
 */
export function useCustomLists() {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const [customCategories, setCustomCategories] = useState({});
  const [listsLoading, setListsLoading] = useState(false);

  // Load on mount / user change
  useEffect(() => {
    if (!user) {
      try {
        setCustomCategories(JSON.parse(localStorage.getItem(LS_KEY) || '{}'));
      } catch {
        setCustomCategories({});
      }
      return;
    }

    setListsLoading(true);
    fetchListsWithItems(user.id)
      .then(setCustomCategories)
      .catch(() => setCustomCategories({}))
      .finally(() => setListsLoading(false));
  }, [user?.id]);

  // Guest: persist to localStorage on every change
  useEffect(() => {
    if (!user) {
      localStorage.setItem(LS_KEY, JSON.stringify(customCategories));
    }
  }, [user, customCategories]);

  const createCustomList = useCallback(async (name) => {
    if (!name?.trim()) return null;
    if (!user) {
      const id = `cat-${Date.now()}`;
      setCustomCategories(prev => ({ ...prev, [id]: { name: name.trim(), assets: [] } }));
      return id;
    }
    const id = await createList(user.id, name.trim());
    setCustomCategories(prev => ({ ...prev, [id]: { name: name.trim(), assets: [] } }));
    return id;
  }, [user]);

  const deleteCustomList = useCallback(async (id) => {
    setCustomCategories(prev => { const next = { ...prev }; delete next[id]; return next; });
    if (user) deleteList(id).catch(console.warn);
  }, [user]);

  const renameCustomList = useCallback(async (id, newName) => {
    setCustomCategories(prev => ({ ...prev, [id]: { ...prev[id], name: newName } }));
    if (user) renameList(id, newName).catch(console.warn);
  }, [user]);

  const addSymbolToList = useCallback(async (symbol, listId, assetType = 'stock') => {
    setCustomCategories(prev => {
      if (!prev[listId] || prev[listId].assets.includes(symbol)) return prev;
      return { ...prev, [listId]: { ...prev[listId], assets: [...prev[listId].assets, symbol] } };
    });
    if (user) addItemToList(listId, symbol, assetType).catch(console.warn);
  }, [user]);

  const removeSymbolFromList = useCallback(async (symbol, listId) => {
    setCustomCategories(prev => {
      if (!prev[listId]) return prev;
      return { ...prev, [listId]: { ...prev[listId], assets: prev[listId].assets.filter(s => s !== symbol) } };
    });
    if (user) removeItemFromList(listId, symbol).catch(console.warn);
  }, [user]);

  return {
    customCategories,
    listsLoading,
    createCustomList,
    deleteCustomList,
    renameCustomList,
    addSymbolToList,
    removeSymbolFromList,
  };
}
