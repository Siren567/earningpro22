import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function EarningsCard({ earning, onClick }) {
  const hasActual = earning.actualEPS !== null && earning.actualEPS !== undefined;
  const beat = hasActual && earning.actualEPS > earning.estimatedEPS;
  const miss = hasActual && earning.actualEPS < earning.estimatedEPS;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl dark:bg-white/5 bg-gray-50 dark:hover:bg-white/10 hover:bg-gray-100 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold dark:text-white text-gray-900 text-sm">{earning.symbol}</p>
          <p className="text-xs dark:text-gray-500 text-gray-500 truncate max-w-48">{earning.name}</p>
        </div>
        {hasActual && (
          <div className={`flex items-center gap-1 text-xs ${beat ? 'text-blue-500' : miss ? 'text-red-400' : 'text-gray-500'}`}>
            {beat && <TrendingUp className="w-3 h-3" />}
            {miss && <TrendingDown className="w-3 h-3" />}
            <span>{beat ? 'Beat' : miss ? 'Miss' : 'Met'}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs dark:text-gray-500 text-gray-500">
        <Calendar className="w-3 h-3" />
        <span>{format(new Date(earning.date), 'MMM d, yyyy')}</span>
        {earning.estimatedEPS && (
          <span className="ml-2">Est: ${earning.estimatedEPS.toFixed(2)}</span>
        )}
      </div>
    </button>
  );
}