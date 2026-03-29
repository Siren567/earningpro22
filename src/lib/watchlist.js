/**
 * Supabase watchlist service.
 *
 * Table: user_watchlist
 *   id          uuid PK
 *   user_id     uuid FK → auth.users
 *   symbol      text
 *   asset_type  text ('stock' | 'crypto' | 'commodity')
 *   created_at  timestamptz
 *   UNIQUE (user_id, symbol)
 *
 * SQL to run in Supabase dashboard:
 * ─────────────────────────────────
 * create table user_watchlist (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid not null references auth.users(id) on delete cascade,
 *   symbol text not null,
 *   asset_type text not null default 'stock'
 *     check (asset_type in ('stock', 'crypto', 'commodity')),
 *   created_at timestamptz default now() not null,
 *   unique (user_id, symbol)
 * );
 *
 * alter table user_watchlist enable row level security;
 *
 * create policy "select own" on user_watchlist
 *   for select using (auth.uid() = user_id);
 * create policy "insert own" on user_watchlist
 *   for insert with check (auth.uid() = user_id);
 * create policy "delete own" on user_watchlist
 *   for delete using (auth.uid() = user_id);
 */

import { supabase } from './supabase';

/** Fetch all watchlist items for a user. Returns array of { symbol, asset_type }. */
export async function fetchWatchlist(userId) {
  const { data, error } = await supabase
    .from('user_watchlist')
    .select('symbol, asset_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Add a symbol. Silently ignores duplicate (unique constraint on server).
 * asset_type defaults to 'stock'.
 */
export async function addToWatchlist(userId, symbol, assetType = 'stock') {
  const { error } = await supabase
    .from('user_watchlist')
    .insert({ user_id: userId, symbol, asset_type: assetType });
  // Ignore unique-violation — already saved is fine
  if (error && error.code !== '23505') throw error;
}

/** Remove a symbol from the user's watchlist. */
export async function removeFromWatchlist(userId, symbol) {
  const { error } = await supabase
    .from('user_watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('symbol', symbol);
  if (error) throw error;
}
