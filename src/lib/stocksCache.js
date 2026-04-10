import { supabase } from './supabase';
import {
  searchStocks as yahooSearchStocks,
  getStockData  as yahooGetStockData,
} from '../api/yahooFinanceApi';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isFresh(lastUpdated) {
  if (!lastUpdated) return false;
  return Date.now() - new Date(lastUpdated).getTime() < CACHE_TTL_MS;
}

/** Write/refresh one row — stores all profile fields needed by StockView. */
async function upsertStock(stock) {
  const { error } = await supabase.from('stocks').upsert(
    {
      symbol:               stock.symbol,
      name:                 stock.companyName        ?? null,
      exchange:             stock.exchange           ?? null,
      price:                stock.price              ?? null,
      change:               stock.change             ?? null,
      change_percent:       stock.changePercent      ?? null,
      open:                 stock.open               ?? null,
      fifty_two_week_low:   stock.fiftyTwoWeekLow    ?? null,
      fifty_two_week_high:  stock.fiftyTwoWeekHigh   ?? null,
      day_low:              stock.dayLow             ?? null,
      day_high:             stock.dayHigh            ?? null,
      volume:               stock.volume             ?? null,
      avg_volume:           stock.avgVolume          ?? null,
      last_updated:         new Date().toISOString(),
    },
    { onConflict: 'symbol' }
  );
  if (error) console.warn('[stocksCache] upsert error:', error.message);
}

/**
 * getCachedStockData(symbol)
 *
 * Returns the same full shape as yahooGetStockData so StockView works correctly.
 * Cache hit (< 5 min): returns all stored profile fields from DB — no API call.
 * Cache miss/stale: fetches full data from Yahoo, persists to DB, returns it.
 */
export async function getCachedStockData(symbol) {
  // 1. Check DB
  const { data: cached } = await supabase
    .from('stocks')
    .select('*')
    .eq('symbol', symbol)
    .maybeSingle();

  if (cached && isFresh(cached.last_updated)) {
    // Return full shape — mirrors yahooGetStockData return value
    return {
      symbol:           cached.symbol,
      companyName:      cached.name,
      exchange:         cached.exchange,
      price:            cached.price,
      change:           cached.change,
      changePercent:    cached.change_percent,
      open:             cached.open              ?? null,
      fiftyTwoWeekLow:  cached.fifty_two_week_low  ?? null,
      fiftyTwoWeekHigh: cached.fifty_two_week_high ?? null,
      dayLow:           cached.day_low           ?? null,
      dayHigh:          cached.day_high          ?? null,
      volume:           cached.volume            ?? null,
      avgVolume:        cached.avg_volume        ?? null,
      // Fields only available from fundamentals query (not cached here)
      marketCap: null, peRatio: null, eps: null,
      beta: null, dividendYield: null, sector: null, industry: null,
      description: null, currency: null, marketStatus: null,
      _fromCache: true,
    };
  }

  // 2. Fetch full data from Yahoo
  const fresh = await yahooGetStockData(symbol);
  if (!fresh) return null;

  // 3. Persist all profile fields (non-blocking)
  upsertStock(fresh);

  return fresh;
}

/**
 * searchWithCache(query)
 *
 * Always calls Yahoo (search queries aren't cacheable by query string).
 * Side-effect: upserts symbol metadata for new symbols only.
 */
export async function searchWithCache(query) {
  const results = await yahooSearchStocks(query);
  if (!results?.length) return results;

  const records = results.map(r => ({
    symbol:         r.symbol,
    name:           r.name,
    exchange:       r.exchange,
    price:          null,
    change:         null,
    change_percent: null,
    last_updated:   null,
  }));

  supabase
    .from('stocks')
    .upsert(records, { onConflict: 'symbol', ignoreDuplicates: true })
    .then(({ error }) => {
      if (error) console.warn('[stocksCache] search upsert error:', error.message);
    });

  return results;
}
