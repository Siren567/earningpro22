import React, { useState } from 'react';
import { Star, MoreHorizontal, Trash2, Pencil, Check, X } from 'lucide-react';

export default function PersonalListsSection({
  customCategories,
  activeTab,
  onSelectList,
  onDeleteList,
  onRenameList,
}) {
  const [menuOpen, setMenuOpen] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (id, currentName) => {
    setRenaming(id);
    setRenameValue(currentName);
    setMenuOpen(null);
  };

  const commitRename = (id) => {
    if (renameValue.trim()) onRenameList(id, renameValue.trim());
    setRenaming(null);
  };

  return (
    <div className="space-y-0.5">
      {/* Favorites */}
      <button
        onClick={() => onSelectList('my-watchlist')}
        className={`w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
          activeTab === 'my-watchlist'
            ? 'dark:bg-blue-500/15 dark:text-cyan-400 bg-blue-50 text-blue-700'
            : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-gray-50'
        }`}
      >
        <Star className="w-3.5 h-3.5 flex-shrink-0" />
        Favorites
      </button>

      {/* Custom lists */}
      {Object.entries(customCategories).map(([id, cat]) => {
        const isActive = activeTab === `custom-${id}`;
        const isRenamingThis = renaming === id;

        return (
          <div key={id} className="relative group">
            {isRenamingThis ? (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  className="flex-1 text-xs bg-transparent dark:text-white text-gray-900 border-b dark:border-white/20 border-gray-300 focus:outline-none focus:border-blue-500 pb-0.5"
                />
                <button onClick={() => commitRename(id)} className="p-0.5 text-blue-500 hover:text-cyan-400">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setRenaming(null)} className="p-0.5 dark:text-gray-500 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSelectList(`custom-${id}`)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium transition-all pr-7 ${
                  isActive
                    ? 'dark:bg-blue-500/15 dark:text-cyan-400 bg-blue-50 text-blue-700'
                    : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-gray-50'
                }`}
              >
                <span className="truncate block">{cat.name}</span>
              </button>
            )}

            {/* Options menu trigger */}
            {!isRenamingThis && (
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === id ? null : id); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 dark:hover:bg-white/10 hover:bg-gray-200 transition-all"
              >
                <MoreHorizontal className="w-3 h-3 dark:text-gray-400 text-gray-500" />
              </button>
            )}

            {/* Dropdown */}
            {menuOpen === id && (
              <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg dark:bg-[#1a1a1a] bg-white border dark:border-white/10 border-gray-200 shadow-xl overflow-hidden">
                <button
                  onClick={() => startRename(id, cat.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs dark:text-gray-300 text-gray-700 dark:hover:bg-white/5 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Rename
                </button>
                <button
                  onClick={() => { onDeleteList(id); setMenuOpen(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 dark:hover:bg-white/5 hover:bg-gray-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}