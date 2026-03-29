import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { savePushSubscription, removePushSubscription } from '@/lib/pushSubscriptions';
import { supabase } from '@/lib/supabase';

/**
 * Single source of truth for the VAPID application server key.
 *
 * Reads import.meta.env.VITE_VAPID_PUBLIC_KEY fresh on each call,
 * sanitizes it, converts base64url → Uint8Array, and validates
 * the decoded length is exactly 65 bytes (P-256 uncompressed point).
 *
 * Throws a descriptive error for any invalid state so the caller
 * never silently passes a wrong key to pushManager.subscribe().
 */
function getValidatedApplicationServerKey() {
  const raw = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
  console.log('[push:key] raw length:', raw.length, '| value:', JSON.stringify(raw));

  const sanitized = raw
    .trim()
    .replace(/^["']|["']$/g, '')      // strip accidental wrapping quotes
    .replace(/[^A-Za-z0-9\-_]/g, ''); // strip non-base64url characters
  console.log('[push:key] sanitized length:', sanitized.length, '(expected 87)');

  if (!sanitized) {
    throw new Error(
      'VITE_VAPID_PUBLIC_KEY is not set. Check .env and restart the dev server.',
    );
  }

  const padding = '='.repeat((4 - (sanitized.length % 4)) % 4);
  const base64  = (sanitized + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const key     = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    key[i] = rawData.charCodeAt(i);
  }

  console.log('[push:key] decoded length:', key.length, '(expected 65)');
  console.log('[push:key] is Uint8Array:', key instanceof Uint8Array);

  if (key.length !== 65) {
    throw new Error(
      `VAPID key decoded to ${key.length} bytes (expected 65). ` +
      `Sanitized key is ${sanitized.length} chars (expected 87). ` +
      `Check VITE_VAPID_PUBLIC_KEY in .env and restart the dev server.`,
    );
  }

  return key;
}

/** Check if the current browser supports web push. */
function isBrowserSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification'    in window &&
    'serviceWorker'   in navigator &&
    'PushManager'     in window
  );
}

/**
 * Push notification state:
 *   'unsupported'  — browser has no push API
 *   'loading'      — checking current state
 *   'default'      — user hasn't been asked yet
 *   'denied'       — user blocked notifications
 *   'subscribed'   — active push subscription exists
 *   'unsubscribed' — permission granted but no subscription saved
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus]             = useState('loading');
  const [subscription, setSubscription] = useState(null);
  const [actionLoading, setLoading]     = useState(false);
  const [error, setError]               = useState(null);

  const supported = isBrowserSupported();

  // ── Detect current push state on mount ─────────────────────────────────────
  useEffect(() => {
    if (!supported) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) {
          setSubscription(sub);
          setStatus('subscribed');
        } else {
          setStatus(Notification.permission === 'granted' ? 'unsubscribed' : 'default');
        }
      })
      .catch(() => setStatus('default'));
  }, [supported]);

  // ── Subscribe ───────────────────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    if (!user || !supported) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Validate key — throws before any SW interaction if the key is wrong.
      //    getValidatedApplicationServerKey() is the only place the env var is read.
      const applicationServerKey = getValidatedApplicationServerKey();

      // 2. Ensure the service worker is installed and active.
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;
      console.log('[sw] Service worker ready');

      // 3. Clear any stale subscription from prior failed attempts.
      const stale = await registration.pushManager.getSubscription();
      if (stale) await stale.unsubscribe();

      // 4. Ask for permission (after key and SW are confirmed valid).
      const permission = await Notification.requestPermission();
      if (permission === 'denied') { setStatus('denied'); return; }
      if (permission !== 'granted') { setStatus('default'); return; }

      // 5. Final runtime checks immediately before the subscribe call.
      console.log('[push:sub] applicationServerKey instanceof Uint8Array:', applicationServerKey instanceof Uint8Array);
      console.log('[push:sub] applicationServerKey.length:', applicationServerKey.length);
      console.log('[push:sub] caller: usePushNotifications.js › subscribe()');

      // 6. The only pushManager.subscribe() call in the codebase.
      //    Called on `registration` (from navigator.serviceWorker.ready) — never on navigator.
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly:  true,
        applicationServerKey,   // Uint8Array(65) — validated above
      });

      await savePushSubscription(user.id, sub);
      setSubscription(sub);
      setStatus('subscribed');
    } catch (err) {
      console.error('[push] subscribe error:', err);
      setError(err.message || 'Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  }, [user, supported]);

  // ── Unsubscribe ─────────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    if (!subscription || !user) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await removePushSubscription(user.id, endpoint);
      setSubscription(null);
      setStatus('unsubscribed');
    } catch (err) {
      console.error('[push] unsubscribe error:', err);
      setError(err.message || 'Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  }, [subscription, user]);

  // ── Send test notification (calls edge function) ────────────────────────────
  const sendTestNotification = useCallback(async () => {
    if (!user || status !== 'subscribed') return;
    setLoading(true);
    setError(null);

    const FUNCTION_NAME = 'send-push';
    const payload = {
      userId: user.id,
      title:  'Gako Test 🚀',
      body:   'Push notifications are working',
      tag:    'gako-test',
      data:   { url: '/alerts', symbol: 'TEST' },
    };

    // Log the exact URL the client will POST to — confirms correct project is targeted.
    console.log('[push:test] invoking edge function:', FUNCTION_NAME);
    console.log('[push:test] target URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`);
    console.log('[push:test] payload:', JSON.stringify(payload));

    try {
      // ── Session diagnostics ──────────────────────────────────────────────
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('[push:test] sessionError:', sessionError?.message ?? 'none');
      console.log('[push:test] session exists:', !!sessionData?.session);
      console.log('[push:test] access_token exists:', !!sessionData?.session?.access_token);
      if (sessionData?.session?.access_token) {
        console.log('[push:test] access_token first 30 chars:', sessionData.session.access_token.slice(0, 30));
        console.log('[push:test] session user id:', sessionData.session.user?.id);
      }

      const rawToken = sessionData?.session?.access_token;
      if (!rawToken) {
        setError('Please sign in again.');
        return;
      }

      // Sanitize: strip whitespace, wrapping quotes, and any accidental "Bearer " prefix
      // that would cause a double-prefix when we add it below.
      const token = rawToken
        .trim()
        .replace(/^["']|["']$/g, '')   // remove wrapping quotes
        .replace(/^Bearer\s+/i, '');   // remove accidental prefix

      // Validate JWT structure — must be exactly 3 dot-separated parts.
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[push:test] malformed JWT — part count:', parts.length, '| length:', token.length);
        setError('Session token is invalid. Please sign in again.');
        return;
      }

      console.log('[push:test] token length:', token.length, '| parts:', parts.length);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke(FUNCTION_NAME, {
        headers: { Authorization: `Bearer ${token}` },  // exactly one "Bearer " prefix
        body: payload,
      });

      // Full network-level result — reveals whether request was sent, what came back.
      console.log('[push:test] invoke result — data:', JSON.stringify(data), '| error name:', fnError?.name, '| error message:', fnError?.message);

      if (fnError) {
        // Classify the supabase-js function error type for a targeted message.
        const errName = fnError.name ?? '';
        let userMsg;

        if (errName === 'FunctionsFetchError') {
          // Network-level — function not reachable at all.
          console.error('[push:test] FunctionsFetchError — function not reachable');
          console.error('[push:test] Is "send-push" deployed? Run: supabase functions deploy send-push');
          userMsg = 'Edge function unreachable. Make sure "send-push" is deployed (supabase functions deploy send-push).';
        } else if (errName === 'FunctionsHttpError') {
          // Function was reached but returned a non-2xx status.
          const status = fnError.context?.status ?? '?';
          let body = '';
          try { body = await fnError.context.text(); } catch { /* ignore */ }
          console.error('[push:test] FunctionsHttpError — HTTP', status, body);
          if (status === 401 || status === 403) {
            userMsg = 'Session expired. Please reload or sign in again.';
          } else if (status === 404) {
            userMsg = 'Function "send-push" not found (404). Check the deployed function name.';
          } else {
            userMsg = `Edge function returned ${status}: ${body || fnError.message}`;
          }
        } else {
          // FunctionsRelayError or unknown.
          console.error('[push:test] function error:', errName, fnError.message);
          userMsg = fnError.message || 'Test notification failed';
        }

        setError(userMsg);
        return;
      }

      console.log('[push:test] success — response:', data);
    } catch (err) {
      console.error('[push:test] unexpected error:', err);
      setError(err?.message || 'Test notification failed');
    } finally {
      setLoading(false);
    }
  }, [user, status]);

  return {
    supported,
    status,        // 'unsupported'|'loading'|'default'|'denied'|'subscribed'|'unsubscribed'
    subscription,
    actionLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
