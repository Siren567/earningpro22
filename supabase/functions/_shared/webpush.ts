/**
 * Shared web-push sending utility for Supabase Edge Functions.
 * Used by both send-push and check-earnings-alerts.
 */

// @ts-ignore
import webpush from 'npm:web-push@3.6.7';

export interface PushPayload {
  title: string;
  body:  string;
  tag?:  string;
  icon?: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  sent:         number;
  failed:       number;
  staleRemoved: number;
  message?:     string;
}

/**
 * Send a push notification to every active subscription for a user.
 * Automatically cleans up expired (410/404) subscriptions from the DB.
 */
export async function sendPushToUser(
  // @ts-ignore
  supabaseAdmin: any,
  userId:  string,
  payload: PushPayload,
): Promise<PushResult> {
  const { data: subs, error } = await supabaseAdmin
    .from('user_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subs || subs.length === 0) {
    console.log('[webpush] no subscriptions found for user:', userId);
    return { sent: 0, failed: 0, staleRemoved: 0, message: 'No push subscriptions found for this user.' };
  }

  console.log('[webpush] subscriptions found:', subs.length, '— sending to all endpoints');
  configureVapid();

  const raw      = JSON.stringify(payload);
  const staleIds: string[] = [];

  const results = await Promise.allSettled(
    subs.map((sub: { id: string; endpoint: string; p256dh: string; auth: string }) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          raw,
        )
        .then(() => {
          console.log('[webpush] sent OK → endpoint:', sub.endpoint.slice(0, 60) + '…');
        })
        .catch((err: { statusCode?: number; message?: string }) => {
          console.error('[webpush] failed → endpoint:', sub.endpoint.slice(0, 60) + '…', '| status:', err.statusCode, '| message:', err.message);
          if (err.statusCode === 410 || err.statusCode === 404) staleIds.push(sub.id);
          throw err;
        }),
    ),
  );

  if (staleIds.length > 0) {
    console.log('[webpush] removing', staleIds.length, 'stale subscription(s)');
    await supabaseAdmin.from('user_push_subscriptions').delete().in('id', staleIds);
  }

  return {
    sent:         results.filter(r => r.status === 'fulfilled').length,
    failed:       results.filter(r => r.status === 'rejected').length,
    staleRemoved: staleIds.length,
  };
}

/** Configure VAPID once per invocation. */
let vapidConfigured = false;
function configureVapid() {
  if (vapidConfigured) return;
  // @ts-ignore
  webpush.setVapidDetails(
    // @ts-ignore
    Deno.env.get('VAPID_SUBJECT')!,
    // @ts-ignore
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    // @ts-ignore
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );
  vapidConfigured = true;
}
