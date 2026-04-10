import React, { useState } from 'react';
import {
  Bell, Trash2, CalendarClock, Loader2,
  BellRing, BellOff, ShieldAlert, CheckCircle2, FlaskConical, Clock, Crown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { useAlerts } from '../components/hooks/useAlerts';
import { useAuth } from '../components/auth/AuthContext';
import { usePushNotifications } from '../components/hooks/usePushNotifications';
import { supabase } from '@/lib/supabase';
import StockLogo from '../components/stock/StockLogo';

// ── Push status config ─────────────────────────────────────────────────────
const PUSH_STATES = {
  loading: {
    icon:  Loader2,
    label: 'Checking…',
    sub:   '',
    color: 'dark:text-gray-500 text-gray-400',
    spin:  true,
  },
  unsupported: {
    icon:  BellOff,
    label: 'Not supported',
    sub:   'Your browser does not support web push notifications.',
    color: 'dark:text-gray-500 text-gray-400',
  },
  denied: {
    icon:  ShieldAlert,
    label: 'Notifications blocked',
    sub:   'Allow notifications in your browser settings to receive earnings alerts.',
    color: 'text-red-400',
  },
  default: {
    icon:  BellOff,
    label: 'Not enabled',
    sub:   'Enable push notifications to receive real-time earnings alerts.',
    color: 'dark:text-gray-400 text-gray-500',
  },
  unsubscribed: {
    icon:  BellOff,
    label: 'Not enabled',
    sub:   'Push permission granted. Click Enable to activate notifications.',
    color: 'dark:text-gray-400 text-gray-500',
  },
  subscribed: {
    icon:  CheckCircle2,
    label: 'Push enabled',
    sub:   'You will receive push notifications for all active earnings alerts on this device.',
    color: 'text-green-400',
  },
};

export default function Alerts() {
  const { user } = useAuth();
  const { alerts, isLoading, toggleAlert, removeAlert, alertsLimit, isAtAlertsLimit, plan } = useAlerts();
  const {
    status: pushStatus,
    actionLoading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const earningsAlerts = alerts.filter(a => a.alert_type === 'earnings');
  const activeCount    = earningsAlerts.filter(a => a.is_enabled).length;
  const ps             = PUSH_STATES[pushStatus] ?? PUSH_STATES.loading;
  const PushIcon       = ps.icon;
  const pushSubscribed = pushStatus === 'subscribed';

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <Bell className="w-12 h-12 dark:text-gray-700 text-gray-300" />
        <p className="text-base font-semibold dark:text-white text-gray-900">Sign in to manage alerts</p>
        <p className="text-sm dark:text-gray-500 text-gray-500">Your earnings alerts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white text-gray-900">Alerts</h1>
        <p className="text-sm dark:text-gray-500 text-gray-500 mt-0.5">
          {isLoading
            ? 'Loading…'
            : activeCount > 0
            ? `${activeCount} active earnings alert${activeCount !== 1 ? 's' : ''}`
            : 'No active alerts'}
        </p>
      </div>

      {/* ── Push notification status ───────────────────────────────────────── */}
      <section className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/5 border-gray-100">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 dark:text-gray-500 text-gray-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider dark:text-gray-300 text-gray-700">
              Push Notifications
            </h2>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <PushIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ps.color} ${ps.spin ? 'animate-spin' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${ps.color}`}>{ps.label}</p>
              {ps.sub && (
                <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5 leading-relaxed">{ps.sub}</p>
              )}
              {pushError && <p className="text-xs text-red-400 mt-1">{pushError}</p>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {pushSubscribed && (
                <button
                  onClick={sendTestNotification}
                  disabled={pushLoading}
                  title="Send a generic test push to verify this device"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 dark:hover:bg-white/10 hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {pushLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <FlaskConical className="w-3.5 h-3.5" />
                  }
                  Test device
                </button>
              )}

              {(pushStatus === 'default' || pushStatus === 'unsubscribed') && (
                <button
                  onClick={subscribe}
                  disabled={pushLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                >
                  {pushLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Enable
                </button>
              )}

              {pushSubscribed && (
                <button
                  onClick={unsubscribe}
                  disabled={pushLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-600 dark:hover:bg-red-500/10 hover:bg-red-50 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {pushLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
                  Disable
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Earnings Alerts ───────────────────────────────────────────────── */}
      <section className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/5 border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 dark:text-gray-500 text-gray-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider dark:text-gray-300 text-gray-700">
              Earnings Alerts
            </h2>
          </div>
          <span className="text-xs dark:text-gray-600 text-gray-400">
            {earningsAlerts.length} alert{earningsAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Free plan usage bar */}
        {plan === 'free' && !isLoading && (
          <div className={`flex items-center justify-between px-5 py-2.5 border-b dark:border-white/5 border-gray-100 ${
            isAtAlertsLimit
              ? 'dark:bg-amber-500/5 bg-amber-50'
              : 'dark:bg-white/[0.02] bg-gray-50/60'
          }`}>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: alertsLimit }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-5 rounded-full ${
                      i < earningsAlerts.length
                        ? isAtAlertsLimit ? 'bg-amber-400' : 'bg-blue-500'
                        : 'dark:bg-white/10 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-[11px] font-medium ${
                isAtAlertsLimit
                  ? 'text-amber-400'
                  : 'dark:text-gray-500 text-gray-500'
              }`}>
                {earningsAlerts.length}/{alertsLimit} alerts used · Free plan
              </span>
            </div>
            {isAtAlertsLimit && (
              <Link
                to="/Plans"
                className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Crown className="w-3 h-3" />
                Upgrade
              </Link>
            )}
          </div>
        )}

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-14 gap-2 dark:text-gray-600 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading alerts…</span>
            </div>
          ) : earningsAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
              <Bell className="w-10 h-10 dark:text-gray-700 text-gray-300" />
              <p className="text-sm font-semibold dark:text-white text-gray-900">No alerts yet</p>
              <p className="text-xs dark:text-gray-500 text-gray-500 max-w-xs leading-relaxed">
                Open the Earnings Calendar and tap the bell icon on any stock to start tracking its next earnings report.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {earningsAlerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  pushSubscribed={pushSubscribed}
                  userId={user.id}
                  onToggle={(v) => toggleAlert(alert.id, v)}
                  onRemove={() => removeAlert(alert.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-[11px] dark:text-gray-700 text-gray-400 text-center">
        Notifications delivered to this device · Scheduler triggers 1 hour before earnings
      </p>
    </div>
  );
}

// ── Alert row ──────────────────────────────────────────────────────────────
function AlertRow({ alert, pushSubscribed, userId, onToggle, onRemove }) {
  const [testing, setTesting] = useState(false);
  const created     = alert.created_at     ? format(new Date(alert.created_at), 'MMM d, yyyy') : '—';
  const lastSent    = alert.last_triggered_at
    ? formatDistanceToNow(new Date(alert.last_triggered_at), { addSuffix: true })
    : null;

  const handleTestPush = async () => {
    if (!pushSubscribed || testing) return;
    setTesting(true);
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          userId,
          title: `📊 ${alert.symbol} Earnings`,
          body:  `Test: ${alert.symbol} earnings alert is working. You'll be notified 1 hour before the report.`,
          tag:   `gako-test-${alert.symbol}`,
          data:  { url: '/Earnings', symbol: alert.symbol },
        },
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <li className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-colors ${
      alert.is_enabled
        ? 'dark:bg-white/[0.03] bg-gray-50 dark:border-white/5 border-gray-200'
        : 'dark:border-white/[0.03] border-gray-100 opacity-55'
    }`}>

      <StockLogo symbol={alert.symbol} className="w-8 h-8 flex-shrink-0" />

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
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] dark:text-gray-600 text-gray-400">
            Earnings · added {created}
          </p>
          {lastSent && (
            <>
              <span className="text-[11px] dark:text-gray-700 text-gray-300">·</span>
              <span className="flex items-center gap-0.5 text-[11px] dark:text-gray-600 text-gray-400">
                <Clock className="w-2.5 h-2.5" />
                sent {lastSent}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Per-alert test push */}
      {pushSubscribed && (
        <button
          onClick={handleTestPush}
          disabled={testing}
          title={`Send a test push for ${alert.symbol}`}
          className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 dark:text-gray-600 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 transition-colors disabled:opacity-40"
        >
          {testing
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <FlaskConical className="w-3.5 h-3.5" />
          }
        </button>
      )}

      <Switch
        checked={alert.is_enabled}
        onCheckedChange={onToggle}
        aria-label={alert.is_enabled ? 'Pause alert' : 'Enable alert'}
      />

      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg dark:hover:bg-red-500/10 hover:bg-red-50 text-red-400 transition-colors flex-shrink-0"
        aria-label="Remove alert"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
