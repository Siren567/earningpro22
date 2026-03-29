/**
 * Supabase Edge Function: send-push
 *
 * Sends a web push notification to all active subscriptions for a user.
 * Called directly from the client (manual test, per-alert test).
 * Also callable server-to-server from check-earnings-alerts.
 *
 * Required secrets (supabase secrets set ...):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   SUPABASE_URL (auto-set), SERVICE_ROLE_KEY (set via: supabase secrets set SERVICE_ROLE_KEY=...)
 *
 * Body: { userId, title, body, tag?, icon?, data? }
 */

// @ts-ignore
import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushToUser } from '../_shared/webpush.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Log every inbound request — including OPTIONS — before anything else.
  console.log('[send-push] REQUEST RECEIVED —', req.method, new URL(req.url).pathname);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── Env diagnostics (presence only — never print secret values) ──────
    // @ts-ignore
    const supabaseUrl     = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const serviceRoleKey  = Deno.env.get('SERVICE_ROLE_KEY');
    console.log('[send-push] env SUPABASE_URL present:', !!supabaseUrl);
    console.log('[send-push] env SERVICE_ROLE_KEY present:', !!serviceRoleKey);

    // Log the actual URL so we can confirm it matches the project the JWT was issued from.
    console.log('[send-push] SUPABASE_URL value:', supabaseUrl);

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[send-push] FATAL: missing required env vars — cannot validate JWT');
      return json({ error: 'Server misconfiguration: missing Supabase env vars' }, 500);
    }

    // ── Authenticate caller ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const tokenParts = token.split('.');
    console.log('[send-push] Authorization header present:', !!authHeader);
    console.log('[send-push] token length:', token.length, '| parts:', tokenParts.length);
    console.log('[send-push] token first 30 chars:', token.slice(0, 30));

    if (tokenParts.length !== 3) {
      console.error('[send-push] malformed token — part count:', tokenParts.length);
      return json({ error: 'Unauthorized', detail: 'Malformed JWT' }, 401);
    }

    // Decode JWT header (first part) to confirm algorithm and issuer without exposing the token.
    try {
      const headerJson = atob(tokenParts[0].replace(/-/g, '+').replace(/_/g, '/'));
      console.log('[send-push] JWT header:', headerJson);
    } catch {
      console.warn('[send-push] could not decode JWT header');
    }

    // admin.auth.getUser(token) validates the JWT against this project's JWT secret.
    // Requires SERVICE_ROLE_KEY to be set as a Supabase secret.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let user: { id: string } | null = null;
    try {
      const { data, error: authErr } = await admin.auth.getUser(token);
      if (authErr) {
        console.error('[send-push] getUser error — status:', (authErr as any).status,
          '| code:', authErr.code, '| message:', authErr.message);
        console.error('[send-push] getUser full error:', JSON.stringify(authErr));
        return json({ error: 'Unauthorized', detail: authErr.message }, 401);
      }
      user = data.user;
    } catch (getUserErr) {
      console.error('[send-push] getUser threw:', getUserErr instanceof Error ? getUserErr.message : getUserErr);
      return json({ error: 'Unauthorized', detail: 'Token validation threw an exception' }, 401);
    }

    if (!user) {
      console.error('[send-push] getUser returned no user and no error — token may be from wrong project');
      return json({ error: 'Unauthorized', detail: 'No user returned' }, 401);
    }
    console.log('[send-push] authenticated as user:', user.id);

    // ── Parse & validate body ───────────────────────────────────────────
    const body = await req.json() as {
      userId?: string; title: string; body: string;
      tag?: string; icon?: string; data?: Record<string, unknown>;
    };

    // Users may only push to their own subscriptions
    const targetId = body.userId ?? user!.id;
    if (targetId !== user.id) return json({ error: 'Forbidden' }, 403);

    const result = await sendPushToUser(admin, targetId, {
      title: body.title,
      body:  body.body,
      tag:   body.tag,
      icon:  body.icon,
      data:  body.data ?? { url: '/alerts' },
    });

    console.log('[send-push] result:', JSON.stringify(result));
    return json(result, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
