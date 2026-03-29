/**
 * AlertsSettingsPreview
 *
 * Static locked preview of the Alerts & Notifications feature.
 * Shown inside Settings → Preferences with a "Coming Soon" overlay.
 * No real data is fetched — this is purely a UI placeholder.
 */

import React from 'react';
import {
  Bell, BellOff, CalendarClock, CheckCircle2, Clock,
  FlaskConical, Loader2, Trash2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// Static placeholder rows to give the card a realistic look
const PLACEHOLDER_ALERTS = [
  { id: 1, symbol: 'AAPL', is_enabled: true  },
  { id: 2, symbol: 'NVDA', is_enabled: true  },
  { id: 3, symbol: 'TSLA', is_enabled: false },
];

export default function AlertsSettingsPreview() {
  return (
    <div className="relative rounded-2xl overflow-hidden">

      {/* ── Coming Soon badge ──────────────────────────────────────────────── */}
      <span className="absolute top-3.5 right-3.5 z-20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
        Coming Soon
      </span>

      {/* ── Overlay — blocks all interaction ──────────────────────────────── */}
      <div
        className="absolute inset-0 z-10 cursor-not-allowed"
        style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(2px)' }}
        onClick={e => e.stopPropagation()}
      />

      {/* ── Inner content at reduced opacity ──────────────────────────────── */}
      <div className="space-y-3 pointer-events-none select-none" style={{ opacity: 0.65 }}>

        {/* Push Notifications card */}
        <section className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b dark:border-white/5 border-gray-100">
            <Bell className="w-4 h-4 dark:text-gray-500 text-gray-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider dark:text-gray-300 text-gray-700">
              Push Notifications
            </h3>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 mt-0.5 flex-shrink-0 dark:text-gray-400 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold dark:text-gray-400 text-gray-500">Not enabled</p>
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5 leading-relaxed">
                  Enable push notifications to receive real-time earnings alerts.
                </p>
              </div>
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white opacity-60"
              >
                <Bell className="w-3.5 h-3.5" /> Enable
              </button>
            </div>
          </div>
        </section>

        {/* Earnings Alerts card */}
        <section className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/5 border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 dark:text-gray-500 text-gray-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider dark:text-gray-300 text-gray-700">
                Earnings Alerts
              </h3>
            </div>
            <span className="text-xs dark:text-gray-600 text-gray-400">
              {PLACEHOLDER_ALERTS.length} alerts
            </span>
          </div>

          <ul className="p-4 space-y-1.5">
            {PLACEHOLDER_ALERTS.map(alert => (
              <li
                key={alert.id}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border ${
                  alert.is_enabled
                    ? 'dark:bg-white/[0.03] bg-gray-50 dark:border-white/5 border-gray-200'
                    : 'dark:border-white/[0.03] border-gray-100 opacity-55'
                }`}
              >
                {/* Symbol placeholder avatar */}
                <div className="w-8 h-8 rounded-full dark:bg-white/10 bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold dark:text-gray-400 text-gray-500">
                    {alert.symbol.slice(0, 2)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold dark:text-white text-gray-900 leading-tight">
                      {alert.symbol}
                    </p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      alert.is_enabled
                        ? 'dark:bg-green-500/10 bg-green-50 text-green-500'
                        : 'dark:bg-white/5 bg-gray-100 dark:text-gray-600 text-gray-400'
                    }`}>
                      {alert.is_enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-[11px] dark:text-gray-600 text-gray-400 mt-0.5">
                    Earnings alert
                  </p>
                </div>

                <button disabled className="p-1.5 rounded-lg dark:text-gray-600 text-gray-400">
                  <FlaskConical className="w-3.5 h-3.5" />
                </button>

                <Switch checked={alert.is_enabled} disabled aria-hidden="true" />

                <button disabled className="p-1.5 rounded-lg text-red-400 flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[11px] dark:text-gray-700 text-gray-400 text-center pb-1">
          Notifications delivered to this device · Scheduler triggers 1 hour before earnings
        </p>
      </div>
    </div>
  );
}
