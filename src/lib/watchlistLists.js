/**
 * Supabase service for user-created watchlist lists.
 *
 * Tables:
 *
 * user_watchlist_lists
 *   id          uuid PK
 *   user_id     uuid FK → auth.users
 *   name        text
 *   created_at  timestamptz
 *
 * user_watchlist_items
 *   id          uuid PK
 *   list_id     uuid FK → user_watchlist_lists (on delete cascade)
 *   symbol      text
 *   asset_type  text ('stock' | 'crypto' | 'commodity')
 *   created_at  timestamptz
 *   UNIQUE (list_id, symbol)
 *
 * SQL to run in Supabase dashboard:
 * ─────────────────────────────────
 * create table user_watchlist_lists (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid not null references auth.users(id) on delete cascade,
 *   name text not null,
 *   created_at timestamptz default now() not null
 * );
 * alter table user_watchlist_lists enable row level security;
 * create policy "select own lists" on user_watchlist_lists for select using (auth.uid() = user_id);
 * create policy "insert own lists" on user_watchlist_lists for insert with check (auth.uid() = user_id);
 * create policy "update own lists" on user_watchlist_lists for update using (auth.uid() = user_id);
 * create policy "delete own lists" on user_watchlist_lists for delete using (auth.uid() = user_id);
 *
 * create table user_watchlist_items (
 *   id uuid default gen_random_uuid() primary key,
 *   list_id uuid not null references user_watchlist_lists(id) on delete cascade,
 *   symbol text not null,
 *   asset_type text not null default 'stock'
 *     check (asset_type in ('stock', 'crypto', 'commodity')),
 *   created_at timestamptz default now() not null,
 *   unique (list_id, symbol)
 * );
 * alter table user_watchlist_items enable row level security;
 * create policy "select own items" on user_watchlist_items for select using (
 *   exists (select 1 from user_watchlist_lists l where l.id = list_id and l.user_id = auth.uid())
 * );
 * create policy "insert own items" on user_watchlist_items for insert with check (
 *   exists (select 1 from user_watchlist_lists l where l.id = list_id and l.user_id = auth.uid())
 * );
 * create policy "delete own items" on user_watchlist_items for delete using (
 *   exists (select 1 from user_watchlist_lists l where l.id = list_id and l.user_id = auth.uid())
 * );
 */

import { supabase } from './supabase';

/**
 * Fetch all lists with their items for a user.
 * Returns { [listId]: { name, assets: string[] } }
 */
export async function fetchListsWithItems(userId) {
  const { data: lists, error: listsErr } = await supabase
    .from('user_watchlist_lists')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (listsErr) throw listsErr;

  if (!lists || lists.length === 0) return {};

  const listIds = lists.map(l => l.id);
  const { data: items, error: itemsErr } = await supabase
    .from('user_watchlist_items')
    .select('list_id, symbol')
    .in('list_id', listIds)
    .order('created_at', { ascending: true });
  if (itemsErr) throw itemsErr;

  const result = {};
  lists.forEach(l => { result[l.id] = { name: l.name, assets: [] }; });
  (items || []).forEach(item => {
    if (result[item.list_id]) result[item.list_id].assets.push(item.symbol);
  });
  return result;
}

/** Create a new list. Returns the new list's UUID. */
export async function createList(userId, name) {
  const { data, error } = await supabase
    .from('user_watchlist_lists')
    .insert({ user_id: userId, name })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Delete a list (cascade removes its items). */
export async function deleteList(listId) {
  const { error } = await supabase
    .from('user_watchlist_lists')
    .delete()
    .eq('id', listId);
  if (error) throw error;
}

/** Rename a list. */
export async function renameList(listId, name) {
  const { error } = await supabase
    .from('user_watchlist_lists')
    .update({ name })
    .eq('id', listId);
  if (error) throw error;
}

/** Add a symbol to a list. Silently ignores duplicate. */
export async function addItemToList(listId, symbol, assetType = 'stock') {
  const { error } = await supabase
    .from('user_watchlist_items')
    .insert({ list_id: listId, symbol, asset_type: assetType });
  if (error && error.code !== '23505') throw error;
}

/** Remove a symbol from a list. */
export async function removeItemFromList(listId, symbol) {
  const { error } = await supabase
    .from('user_watchlist_items')
    .delete()
    .eq('list_id', listId)
    .eq('symbol', symbol);
  if (error) throw error;
}
