import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';

const CONDITION_LABELS = {
  price_above:   'Price above',
  price_below:   'Price below',
  percent_above: '% change above',
  percent_below: '% change below',
};

const CHANNEL_ICONS = {
  discord:  { icon: MessageSquare, color: 'text-indigo-400' },
  telegram: { icon: Send,          color: 'text-sky-400' },
};

export default function AlertRow({ alert, onToggle, onEdit, onDelete }) {
  const condLabel = CONDITION_LABELS[alert.condition_type] || alert.condition_type || '';
  const isPercent = alert.condition_type?.includes('percent');
  const valueStr = isPercent
    ? `${Number(alert.target_value) >= 0 ? '+' : ''}${Number(alert.target_value).toFixed(2)}%`
    : `$${Number(alert.target_value).toFixed(2)}`;

  const humanCondition = `${condLabel} ${valueStr}`;
  const channels = alert.channels || [];

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
      alert.is_active
        ? 'dark:bg-white/[0.03] bg-white dark:border-white/5 border-gray-200'
        : 'dark:bg-white/[0.01] bg-gray-50 dark:border-white/[0.03] border-gray-100 opacity-60'
    }`}>
      {/* Symbol + info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold dark:text-white text-gray-900">{alert.stock_symbol}</span>
          {alert.asset_name && (
            <span className="text-xs dark:text-gray-500 text-gray-500 truncate max-w-[140px]">{alert.asset_name}</span>
          )}
          {!alert.is_active && (
            <span className="text-[10px] font-semibold uppercase tracking-wide dark:text-gray-600 text-gray-400 border dark:border-white/10 border-gray-200 rounded px-1.5 py-0.5">Paused</span>
          )}
        </div>
        <p className="text-xs dark:text-gray-500 text-gray-500">{humanCondition}</p>
        {alert.last_triggered_at && (
          <p className="text-[10px] dark:text-gray-600 text-gray-400 mt-0.5">
            Last triggered {format(new Date(alert.last_triggered_at), 'MMM d, HH:mm')}
            {alert.trigger_count > 1 && ` · ${alert.trigger_count}x`}
          </p>
        )}
      </div>

      {/* Channels */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {channels.map(ch => {
          const cfg = CHANNEL_ICONS[ch];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <span key={ch} title={ch.charAt(0).toUpperCase() + ch.slice(1)}>
              <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
            </span>
          );
        })}
      </div>

      {/* Toggle */}
      <Switch
        checked={!!alert.is_active}
        onCheckedChange={(v) => onToggle(alert.id, v)}
        className="flex-shrink-0"
      />

      {/* Edit */}
      <button
        onClick={() => onEdit(alert)}
        className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors flex-shrink-0"
        title="Edit"
      >
        <Pencil className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(alert.id)}
        className="p-1.5 rounded-lg dark:hover:bg-red-500/15 hover:bg-red-50 transition-colors flex-shrink-0"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
}