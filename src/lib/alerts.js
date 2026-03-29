/**
 * Supabase service for user earnings alerts.
 *
 * Table: user_alerts
 *   id          uuid  PK  default gen_random_uuid()
 *   user_id     uuid  FK → auth.users(id) on delete cascade
 *   symbol      text  not null
 *   alert_type  text  not null  default 'earnings'
 *   is_enabled  bool  not null  default true
 *   created_at  timestamptz  default now()
 *   UNIQUE (user_id, symbol, alert_type)
 *
 * SQL to run in Supabase dashboard:
 * ─────────────────────────────────
 * create table user_alerts (
 *   id         uuid        default gen_random_uuid() primary key,
 *   user_id    uuid        not null references auth.users(id) on delete cascade,
 *   symbol     text        not null,
 *   alert_type text        not null default 'earnings',
 *   is_enabled boolean     not null default true,
 *   created_at timestamptz default now() not null,
 *   unique (user_id, symbol, alert_type)
 * );
 * alter table user_alerts enable row level security;
 * create policy "select own alerts" on user_alerts
 *   for select using (auth.uid() = user_id);
 * create policy "insert own alerts" on user_alerts
 *   for insert with check (auth.uid() = user_id);
 * create policy "update own alerts" on user_alerts
 *   for update using (auth.uid() = user_id);
 * create policy "delete own alerts" on user_alerts
 *   for delete using (auth.uid() = user_id);
 */

import { supabase } from './supabase';

const TABLE = 'user_alerts';

/** Fetch all alerts for a user. */
export async function fetchAlerts(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Add an earnings alert for a symbol.
 * Uses upsert on the unique (user_id, symbol, alert_type) constraint —
 * safe to call even if the alert already exists (re-enables it instead).
 */
export async function addAlert(userId, symbol, alertType = 'earnings') {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, symbol: symbol.toUpperCase(), alert_type: alertType, is_enabled: true },
      { onConflict: 'user_id,symbol,alert_type', ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Toggle is_enabled on an existing alert row by id. */
export async function toggleAlert(id, isEnabled) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_enabled: isEnabled })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete an alert row by id. */
export async function removeAlert(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
