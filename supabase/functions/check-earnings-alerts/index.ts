/**
 * Supabase Edge Function: check-earnings-alerts
 *
 * Processes all enabled earnings alerts and sends push notifications
 * when a symbol's earnings event is within the trigger window.
 *
 * ── Trigger timing ──────────────────────────────────────────────────────────
 *   • Time known   → send once when earnings is ≤ 1 hour away (window: 0–70 min)
 *   • Time unknown → send at 09:00 UTC on the earnings date (pre-market)
 *
 * ── Deduplication ───────────────────────────────────────────────────────────
 *   Each user_alerts row stores:
 *     last_event_key    text  — e.g. "TSLA_2026-04-21"
 *     last_triggered_at timestamptz
 *   If last_event_key matches the current event key the alert is skipped.
 *   One push per (user, symbol, earnings-date) guaranteed.
 *
 * ── How to invoke ───────────────────────────────────────────────────────────
 *   Manual / test:
 *     curl -X POST https://<project>.supabase.co/functions/v1/check-earnings-alerts \
 *       -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
 *
 *   Scheduled (recommended: every 30 min via pg_cron or external cron):
 *     select cron.schedule(
 *       'check-earnings-alerts',
 *       '*/30 * * * *',
 *       $$
 *         select net.http_post(
 *           url := 'https://<project>.supabase.co/functions/v1/check-earnings-alerts',
 *           headers := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb
 *         )
 *       $$
 *     );
 *
 * ── SQL required (add to user_alerts) ──────────────────────────────────────
 *   alter table user_alerts
 *     add column if not exists last_event_key    text,
 *     add column if not exists last_triggered_at timestamptz;
 *
 * ── Secrets needed ──────────────────────────────────────────────────────────
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set)
 */

// @ts-ignore
import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushToUser } from '../_shared/webpush.ts';

// ── Timing constants ─────────────────────────────────────────────────────────
const TRIGGER_WINDOW_SECS   = 70 * 60;  // send if earnings ≤ 70 min away
const TRIGGER_LEAD_SECS     = 60 * 60;  // "in 1 hour" label
const DATE_ONLY_TRIGGER_UTC = 9;        // 09:00 UTC for date-only events
const DATE_ONLY_WINDOW_MINS = 30;       // accept ±30 min around target hour

// Yahoo Finance — works server-side (no CORS)
const YF_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';

/** Fetch earnings timestamps for a batch of symbols from Yahoo Finance. */
async function fetchYahooEarnings(
  symbols: string[],
): Promise<Record<string, { ts: number | null; date: string | null; name: string }>> {
  if (symbols.length === 0) return {};

  const url = `${YF_QUOTE_URL}?symbols=${encodeURIComponent(symbols.join(','))}` +
    `&fields=earningsTimestamp,earningsTimestampStart,shortName,longName`;

  let json: Record<string, unknown>;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GakoBot/1.0)',
        'Accept':     'application/json',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return {};
    json = await res.json() as Record<string, unknown>;
  } catch {
    return {};
  }

  const quotes = (json?.quoteResponse as Record<string, unknown>)?.result as Record<string, unknown>[] ?? [];
  const nowTs  = Math.floor(Date.now() / 1000);

  const out: Record<string, { ts: number | null; date: string | null; name: string }> = {};

  for (const q of quotes) {
    const symbol = String(q.symbol ?? '').toUpperCase();
    if (!symbol) continue;

    // Prefer earningsTimestampStart (start of window) over earningsTimestamp (past event)
    const tsStart = Number(q.earningsTimestampStart ?? 0);
    const tsLast  = Number(q.earningsTimestamp      ?? 0);

    // Use the future-most timestamp
    const ts = tsStart > nowTs ? tsStart : tsLast > nowTs ? tsLast : null;

    // Derive an ISO date string (YYYY-MM-DD) in UTC for event_key
    const date = ts
      ? new Date(ts * 1000).toISOString().slice(0, 10)
      : null;

    const name = String(q.shortName ?? q.longName ?? symbol);
    out[symbol] = { ts, date, name };
  }

  return out;
}

/** Build a human-readable time label like "1 hour" or "40 minutes". */
function timeLabel(secondsUntil: number): string {
  const mins = Math.round(secondsUntil / 60);
  if (mins >= 55) return '1 hour';
  if (mins >= 45) return 'about 1 hour';
  if (mins >= 30) return 'about 30 minutes';
  if (mins >= 10) return `${mins} minutes`;
  return 'shortly';
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // Service-role callers only (not exposed to regular users)
  const authHeader = req.headers.get('Authorization') ?? '';
  // @ts-ignore
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const admin = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
  );

  // ── 1. Fetch all enabled earnings alerts ────────────────────────────────
  const { data: alerts, error: alertsErr } = await admin
    .from('user_alerts')
    .select('id, user_id, symbol, last_event_key')
    .eq('alert_type', 'earnings')
    .eq('is_enabled', true);

  if (alertsErr || !alerts || alerts.length === 0) {
    return respond({ checked: 0, sent: 0, skipped: 0, errors: alertsErr?.message ?? 'no alerts' });
  }

  // ── 2. Fetch earnings data for unique symbols ───────────────────────────
  const symbols = [...new Set(alerts.map((a: { symbol: string }) => a.symbol.toUpperCase()))];
  const earnings = await fetchYahooEarnings(symbols);

  const nowTs      = Math.floor(Date.now() / 1000);
  const nowUTCHour = new Date().getUTCHours();
  const nowUTCMin  = new Date().getUTCMinutes();

  let sent = 0, skipped = 0, errors = 0;

  // ── 3. Evaluate each alert ──────────────────────────────────────────────
  for (const alert of alerts as Array<{
    id: string; user_id: string; symbol: string; last_event_key: string | null
  }>) {
    const sym     = alert.symbol.toUpperCase();
    const earning = earnings[sym];

    if (!earning || !earning.date) { skipped++; continue; }

    const eventKey = `${sym}_${earning.date}`;

    // ── Deduplication: skip if already sent for this event ──────────────
    if (alert.last_event_key === eventKey) { skipped++; continue; }

    let shouldSend      = false;
    let secondsUntil    = 0;
    let bodyText        = '';

    if (earning.ts !== null) {
      // Time is known — trigger window: [earnings - 70min, earnings]
      secondsUntil = earning.ts - nowTs;
      if (secondsUntil >= 0 && secondsUntil <= TRIGGER_WINDOW_SECS) {
        shouldSend = true;
        bodyText = `${earning.name} reports earnings in ${timeLabel(secondsUntil)}.`;
      }
    } else {
      // Time unknown — trigger at 09:00 UTC ± 30 min on the earnings date
      const todayUTC = new Date().toISOString().slice(0, 10);
      if (
        earning.date === todayUTC &&
        nowUTCHour === DATE_ONLY_TRIGGER_UTC &&
        nowUTCMin  < DATE_ONLY_WINDOW_MINS
      ) {
        shouldSend   = true;
        secondsUntil = 0;
        bodyText = `${earning.name} is reporting earnings today.`;
      }
    }

    if (!shouldSend) { skipped++; continue; }

    // ── Send push notification ──────────────────────────────────────────
    try {
      await sendPushToUser(admin, alert.user_id, {
        title: `📊 ${sym} Earnings`,
        body:  bodyText,
        tag:   `earnings-${sym}-${earning.date}`,   // browser deduplicates by tag
        data:  {
          url:    `/Earnings`,
          symbol: sym,
        },
      });

      // ── Update deduplication fields ─────────────────────────────────
      await admin
        .from('user_alerts')
        .update({
          last_event_key:    eventKey,
          last_triggered_at: new Date().toISOString(),
        })
        .eq('id', alert.id);

      sent++;
    } catch (err) {
      console.error(`[check-earnings] send failed for ${sym}:`, err);
      errors++;
    }
  }

  return respond({ checked: alerts.length, sent, skipped, errors });
});

function respond(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
