/**
 * Supabase service for web push subscriptions.
 *
 * Table: user_push_subscriptions
 *   id         uuid         PK   default gen_random_uuid()
 *   user_id    uuid         FK → auth.users(id) on delete cascade
 *   endpoint   text         not null
 *   p256dh     text         not null
 *   auth       text         not null
 *   user_agent text         (optional, max 255 chars)
 *   created_at timestamptz  default now()
 *   UNIQUE (user_id, endpoint)
 *
 * SQL to run in Supabase dashboard:
 * ─────────────────────────────────
 * create table user_push_subscriptions (
 *   id         uuid        default gen_random_uuid() primary key,
 *   user_id    uuid        not null references auth.users(id) on delete cascade,
 *   endpoint   text        not null,
 *   p256dh     text        not null,
 *   auth       text        not null,
 *   user_agent text,
 *   created_at timestamptz default now() not null,
 *   unique (user_id, endpoint)
 * );
 * alter table user_push_subscriptions enable row level security;
 * create policy "select own subs"  on user_push_subscriptions for select using (auth.uid() = user_id);
 * create policy "insert own subs"  on user_push_subscriptions for insert with check (auth.uid() = user_id);
 * create policy "update own subs"  on user_push_subscriptions for update using (auth.uid() = user_id);
 * create policy "delete own subs"  on user_push_subscriptions for delete using (auth.uid() = user_id);
 *
 * Edge function also needs SERVICE ROLE access (bypasses RLS) to read/write
 * when sending on behalf of users — set SUPABASE_SERVICE_ROLE_KEY secret.
 */

import { supabase } from './supabase';

const TABLE = 'user_push_subscriptions';

/**
 * Upsert a push subscription for the current user.
 * Safe to call on every page load — deduplicates by (user_id, endpoint).
 */
export async function savePushSubscription(userId, subscription) {
  const json = subscription.toJSON();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id:    userId,
        endpoint:   json.endpoint,
        p256dh:     json.keys?.p256dh  ?? '',
        auth:       json.keys?.auth    ?? '',
        user_agent: navigator.userAgent.slice(0, 255),
      },
      { onConflict: 'user_id,endpoint', ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Remove a specific push subscription by endpoint. */
export async function removePushSubscription(userId, endpoint) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  if (error) throw error;
}

/** Fetch all subscriptions for a user (useful for displaying devices). */
export async function fetchPushSubscriptions(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, endpoint, user_agent, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
