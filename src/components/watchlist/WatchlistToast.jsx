import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

let toastIdCounter = 0;
let listeners = [];
let toasts = [];

function dispatch(toast) {
  toasts = [...toasts, toast];
  listeners.forEach(l => l([...toasts]));
}

function dismiss(id) {
  toasts = toasts.filter(t => t.id !== id);
  listeners.forEach(l => l([...toasts]));
}

export function showToast({ title, description }) {
  const id = ++toastIdCounter;
  dispatch({ id, title, description });
  return id;
}

function ToastItem({ toast, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const duration = 3500;

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 30);
    return () => clearInterval(interval);
  }, [handleDismiss]);

  return (
    <div
      className={`relative flex items-start gap-3 px-4 py-3 rounded-xl
        dark:bg-[#1a1f2e] bg-white
        border dark:border-white/10 border-gray-200
        shadow-lg dark:shadow-black/40
        overflow-hidden
        transition-all duration-250 ease-out
        ${exiting ? 'opacity-0 translate-y-1 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}
      style={{ minWidth: '260px', maxWidth: '320px' }}
    >
      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold dark:text-white text-gray-900 leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5 truncate">{toast.description}</p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 rounded-md dark:hover:bg-white/10 hover:bg-gray-100 transition-colors mt-0.5"
      >
        <X className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 dark:bg-white/5 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function WatchlistToastContainer() {
  const [activeToasts, setActiveToasts] = useState([]);

  useEffect(() => {
    listeners.push(setActiveToasts);
    return () => { listeners = listeners.filter(l => l !== setActiveToasts); };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {activeToasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}