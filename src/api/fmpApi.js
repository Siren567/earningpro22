/**
 * FMP (Financial Modeling Prep) client — browser-side.
 *
 * All requests go through the /api/fmp Vite proxy which injects the API key
 * server-side. The key is never present in the compiled JS bundle.
 *
 * Endpoints used:
 *   /stable/profile        → mktCap, price  (derive sharesOutstanding = mktCap / price)
 *   /stable/shares-float   → floatShares (outstandingShares, freeFloat)
 *   /api/v3/stock_news     → headlines (StockView news strip)
 *
 * Why two endpoints:
 *   /stable/profile does NOT include sharesOutstanding or floatShares fields.
 *   sharesOutstanding is reliably derived from mktCap / price (no extra call needed).
 *   floatShares requires the dedicated shares-float endpoint.
 */

import { proxyApiUrl } from '@/lib/apiProxyUrls';

const fmp = (path, query) => proxyApiUrl('fmp', path, query);

// In-memory cache: symbol → { data, fetchedAt }
const _cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function isFresh(entry) {
  return entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/**
 * getFmpProfile(symbol)
 *
 * Returns { marketCap, sharesOutstanding, floatShares } from FMP.
 * Fetches profile + shares-float in parallel.
 * Results are cached for 15 minutes to avoid unnecessary API calls.
 */
export async function getFmpProfile(symbol) {
  if (!symbol) return null;

  const key = symbol.toUpperCase();
  if (isFresh(_cache.get(key))) {
    console.log('[fmp] cache hit:', key);
    return _cache.get(key).data;
  }

  try {
    const opts = { signal: AbortSignal.timeout(6000) };

    // Fetch profile and shares-float in parallel
    const [profileRes, floatRes] = await Promise.allSettled([
      fetch(fmp('stable/profile', { symbol: key }), opts),
      fetch(fmp('stable/shares-float', { symbol: key }), opts),
    ]);

    // ── Profile → marketCap + derive sharesOutstanding ─────────────────────
    let marketCap         = null;
    let sharesOutstanding = null;

    if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
      const json    = await profileRes.value.json();
      const profile = Array.isArray(json) ? json[0] : json ?? null;

      if (profile) {
        const mktCap = profile.mktCap ?? profile.marketCap ?? null;
        const price  = profile.price  ?? null;

        marketCap = mktCap;

        // sharesOutstanding is not in the profile response — derive from mktCap / price
        if (mktCap != null && price != null && Number(price) > 0) {
          sharesOutstanding = Math.round(Number(mktCap) / Number(price));
        }
      }
    }

    // ── Shares-float → floatShares ────────────────────────────────────────
    let floatShares = null;

    if (floatRes.status === 'fulfilled' && floatRes.value.ok) {
      const json       = await floatRes.value.json();
      const floatEntry = Array.isArray(json) ? json[0] : json ?? null;

      if (floatEntry) {
        // FMP shares-float response: { symbol, date, freeFloat, floatShares, outstandingShares }
        floatShares = floatEntry.floatShares
          ?? floatEntry.outstandingShares  // fallback field name
          ?? floatEntry.sharesFloat        // older API alias
          ?? null;
      }
    }

    const data = (marketCap != null || sharesOutstanding != null || floatShares != null)
      ? { marketCap, sharesOutstanding, floatShares }
      : null;

    _cache.set(key, { data, fetchedAt: Date.now() });
    console.log('[fmp] loaded:', key, { marketCap, sharesOutstanding, floatShares });
    return data;
  } catch (err) {
    console.warn('[fmp] failed for', key, '—', err.message);
    return null;
  }
}

const EMPTY_KEY_METRICS = {
  source: null,
  marketCap: null,
  floatShares: null,
  sharesOutstanding: null,
  peRatio: null,
  roe: null,
  debtToEquity: null,
  freeCashFlowPerShare: null,
  revenuePerShare: null,
  netIncomePerShare: null,
};

/**
 * Supplement KeyMetricsGrid: float / shares / mcap when Yahoo gaps.
 * Logs [dataSource] for production debugging.
 */
export async function getFmpKeyMetricsBridge(symbol) {
  if (!symbol) return { ...EMPTY_KEY_METRICS };
  const p = await getFmpProfile(symbol);
  if (!p) {
    console.log('[dataSource] keyMetrics supplement: none — Yahoo fundamentals only', symbol);
    return { ...EMPTY_KEY_METRICS };
  }
  console.log('[dataSource] keyMetrics supplement: FMP (mcap/float/shares)', symbol);
  return {
    ...EMPTY_KEY_METRICS,
    source: 'FMP',
    marketCap: p.marketCap,
    floatShares: p.floatShares,
    sharesOutstanding: p.sharesOutstanding,
  };
}

/**
 * Company news headlines (Finnhub-shaped objects) via FMP v3.
 */
export async function getFmpStockNews(symbol, limit = 12) {
  if (!symbol) return [];
  const key = symbol.toUpperCase();
  const url = fmp('api/v3/stock_news', { tickers: key, limit });
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn('[dataSource] news: FMP HTTP', res.status, key);
      return [];
    }
    const rows = await res.json();
    if (!Array.isArray(rows)) {
      console.warn('[dataSource] news: FMP empty payload', key);
      return [];
    }
    const out = rows.slice(0, limit).map((article) => ({
      title: article.title ?? article.headline ?? '',
      source: article.site ?? article.source ?? 'FMP',
      url: article.url ?? '',
      publishedAt: article.publishedDate
        ? new Date(article.publishedDate).toISOString()
        : null,
      summary: article.text ?? article.summary ?? null,
      image: article.image ?? null,
    }));
    console.log('[dataSource] news: FMP', key, out.length, 'articles');
    return out;
  } catch (err) {
    console.warn('[dataSource] news: FMP error', key, err?.message ?? err);
    return [];
  }
}
