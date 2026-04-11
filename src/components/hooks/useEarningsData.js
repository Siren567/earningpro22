/**
 * useEarningsData — shared hook for Earnings Calendar and Dashboard.
 *
 * Both pages query ['earningsScreeners'] — React Query deduplicates the
 * request and serves the cached result to both consumers.
 *
 * Data shape per item:
 *   { symbol, companyName, earningsTimestamp (Unix s), date (yyyy-MM-dd), isEstimate }
 */

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { proxyApiUrl } from '@/lib/apiProxyUrls';

export const SCREENER_IDS = [
  'most_actives',
  'day_gainers',
  'day_losers',
  'undervalued_growth_stocks',
  'growth_technology_stocks',
  'aggressive_small_caps',
];

async function fetchScreener(id) {
  const url = proxyApiUrl('yf', 'v1/finance/screener/predefined/saved', {
    scrIds: id,
    formatted: false,
    lang: 'en-US',
    region: 'US',
    count: 100,
  });
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.finance?.result?.[0]?.quotes || [];
}

export async function fetchEarningsData() {
  console.log('[dataSource] earnings calendar: Yahoo screener/saved ×', SCREENER_IDS.length, 'ids');
  const nowTs = Math.floor(Date.now() / 1000);
  const allResults = await Promise.allSettled(SCREENER_IDS.map(fetchScreener));
  const allQuotes = allResults.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  const seen = new Set();
  const upcoming = [];

  for (const q of allQuotes) {
    if (seen.has(q.symbol)) continue;
    seen.add(q.symbol);
    const ts = q.earningsTimestampStart ?? q.earningsTimestamp;
    if (!ts || ts <= nowTs) continue;
    upcoming.push({
      symbol:           q.symbol,
      companyName:      q.shortName || q.longName || q.symbol,
      earningsTimestamp: ts,
      date:             format(new Date(ts * 1000), 'yyyy-MM-dd'),
      isEstimate:       !!q.isEarningsDateEstimate,
    });
  }

  return upcoming.sort((a, b) => a.earningsTimestamp - b.earningsTimestamp);
}

/**
 * Returns timing label derived from the Unix timestamp.
 * Approximate ET buckets (works for both EST/EDT):
 *   UTC hour < 14  → Before Market Open  (i.e. before ~10 AM ET)
 *   UTC hour >= 20 → After Market Close  (i.e. after  ~4 PM ET)
 *   otherwise      → null (during market / unknown)
 */
export function getEarningsTiming(ts) {
  if (!ts) return null;
  const utcHour = new Date(ts * 1000).getUTCHours();
  if (utcHour < 14)  return 'BMO';
  if (utcHour >= 20) return 'AMC';
  return null;
}

/**
 * Human-readable countdown to an earnings timestamp.
 * e.g. "in 4h 30m", "tomorrow", "in 3 days"
 */
export function getCountdown(ts) {
  const diff = ts * 1000 - Date.now();
  if (diff <= 0) return null;
  const totalMins = Math.floor(diff / 60000);
  const hours     = Math.floor(totalMins / 60);
  const mins      = totalMins % 60;
  if (hours < 1)   return `in ${mins}m`;
  if (hours < 24)  return `in ${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  const days = Math.floor(hours / 24);
  if (days === 1)  return 'tomorrow';
  return `in ${days} days`;
}

export function useEarningsData() {
  return useQuery({
    queryKey: ['earningsScreeners'],
    queryFn:  fetchEarningsData,
    staleTime: 60 * 60 * 1000,       // 1 h
    gcTime:    2  * 60 * 60 * 1000,  // 2 h
    refetchOnWindowFocus: false,
  });
}
