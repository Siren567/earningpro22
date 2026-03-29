import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus, X } from 'lucide-react';

function ListRow({ list, isInList, onAdd, onRemove }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (isInList) {
      onRemove(list.id);
    } else {
      onAdd(list.id);
    }
  };

  return (
    <button
      key={list.id}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:dark:bg-white/5 hover:bg-gray-50 transition-colors text-sm group"
    >
      <span className={`${isInList ? 'dark:text-cyan-400 text-blue-600 font-medium' : 'dark:text-gray-300 text-gray-700'} transition-colors`}>
        {list.name}
      </span>

      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {isInList ? (
          hovered ? (
            <X className="w-3.5 h-3.5 text-red-400 transition-all duration-150" />
          ) : (
            <Check className="w-4 h-4 text-blue-500 transition-all duration-150" />
          )
        ) : (
          <Plus className="w-3.5 h-3.5 dark:text-gray-600 text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-150" />
        )}
      </span>
    </button>
  );
}

export default function UnifiedWatchlistMenu({
  symbol,
  customCategories,
  onAddToList,
  onRemoveFromList,
  onCreateList,
  isOpen,
  onClose,
  stockInLists = {}
}) {
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creating]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await onCreateList(newListName, symbol);
    setNewListName('');
    setCreating(false);
  };

  if (!isOpen) return null;

  const lists = [
    { id: 'my-watchlist', name: 'My Watchlist' },
    ...Object.entries(customCategories).map(([id, cat]) => ({
      id: `custom-${id}`,
      name: cat.name
    }))
  ];

  const getMenuPosition = () => {
    if (!menuRef.current) return {};
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      return { bottom: 0, top: 'auto' };
    }
    return { top: '100%', bottom: 'auto' };
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-1 w-64 dark:bg-[#1a1a1a] bg-white rounded-lg shadow-2xl border dark:border-white/10 border-gray-200 overflow-hidden z-50 flex flex-col max-h-96"
      style={getMenuPosition()}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b dark:border-white/5 border-gray-200 flex-shrink-0">
        <p className="text-xs font-semibold dark:text-gray-400 text-gray-600 uppercase tracking-wider">
          Watchlists
        </p>
      </div>

      {/* Lists */}
      {!creating && (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            {lists.length === 0 ? (
              <div className="px-4 py-3 text-xs dark:text-gray-500 text-gray-600">
                No watchlists yet
              </div>
            ) : (
              lists.map((list) => (
                <ListRow
                  key={list.id}
                  list={list}
                  isInList={!!stockInLists[list.id]}
                  onAdd={(listId) => onAddToList(symbol, listId)}
                  onRemove={(listId) => onRemoveFromList?.(symbol, listId)}
                />
              ))
            )}
          </div>

          {lists.length > 0 && (
            <div className="h-px dark:bg-white/5 bg-gray-200 flex-shrink-0" />
          )}

          <button
            onClick={() => setCreating(true)}
            className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:dark:bg-white/5 hover:bg-gray-50 transition-colors text-sm dark:text-gray-400 text-gray-600 font-medium flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create New List
          </button>
        </>
      )}

      {/* Create List Form */}
      {creating && (
        <div className="px-4 py-3 space-y-2 border-t dark:border-white/5 border-gray-200">
          <input
            ref={inputRef}
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateList();
              if (e.key === 'Escape') { setCreating(false); setNewListName(''); }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-white/5 dark:border-white/10 dark:text-white border border-gray-300 placeholder:dark:text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setCreating(false); setNewListName(''); }}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg dark:bg-white/5 dark:text-gray-400 bg-gray-100 text-gray-600 hover:dark:bg-white/10 hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateList}
              disabled={!newListName.trim()}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}