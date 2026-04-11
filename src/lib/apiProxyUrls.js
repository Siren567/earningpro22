/**
 * Same-origin URLs for Yahoo/FMP proxies (/api/yf, /api/yf2, /api/fmp).
 * Uses import.meta.env.BASE_URL so subpath deployments resolve correctly.
 *
 * Production (Vercel): upstream path is sent as a single query param `_fp` because Vercel's
 * filesystem routing for `api/yf/[...path].js` only matches ONE path segment after /api/yf/,
 * so URLs like /api/yf/v8/finance/chart/AAPL never reached the function and returned 404.
 * Dev: Vite proxy expands `_fp` into the real Yahoo/FMP path (see vite.config.js).
 *
 * Consumers: yahooFinanceApi.js, fmpApi.js (profile, shares-float, stock_news, logos),
 * useEarningsData.js, SearchModal.jsx, WyckoffAnalysisCard.jsx, SearchResultsDropdown.jsx.
 */

import { PROXY_FORWARD_PARAM } from '../../lib/proxyConstants.js';

function appBasePath() {
  const raw = import.meta.env.BASE_URL ?? '/';
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed === '' || trimmed === '/' ? '' : trimmed;
}

/**
 * @param {'yf' | 'yf2' | 'fmp'} proxy
 * @param {string} resourcePath e.g. "v8/finance/chart/AAPL" (no leading slash)
 * @param {Record<string, string | number | boolean> | URLSearchParams | string | null | undefined} [query]
 */
export function proxyApiUrl(proxy, resourcePath, query) {
  const base = appBasePath();
  const path = String(resourcePath).replace(/^\/+/, '');

  const sp = new URLSearchParams();
  sp.set(PROXY_FORWARD_PARAM, path);

  if (query != null) {
    const extra =
      query instanceof URLSearchParams
        ? new URLSearchParams(query)
        : typeof query === 'string'
          ? new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
          : new URLSearchParams(
              Object.entries(query).map(([k, v]) => [k, v == null ? '' : String(v)])
            );
    extra.forEach((v, k) => {
      if (k !== PROXY_FORWARD_PARAM) sp.set(k, v);
    });
  }

  const qs = sp.toString();
  if (!sp.get(PROXY_FORWARD_PARAM)) {
    throw new Error(`proxyApiUrl: ${PROXY_FORWARD_PARAM} is required (Yahoo/FMP path as query, not URL segments)`);
  }

  const href = `${base}/api/${proxy}?${qs}`;

  // Guard: never ship path-style /api/yf/v8/... (Vercel 404). Correct shape is /api/yf?_fp=v8%2F...
  if (typeof window !== 'undefined') {
    try {
      const u = new URL(href, window.location.origin);
      const p = u.pathname;
      if (p.includes('/api/yf/v') || p.includes('/api/yf2/v')) {
        console.error('[proxyApiUrl] BLOCKED legacy path — must use ?_fp= only:', href);
      }
      const ok =
        p.endsWith('/api/yf') || p.endsWith('/api/yf2') || p.endsWith('/api/fmp');
      if (!ok) {
        console.warn('[proxyApiUrl] unexpected pathname (expected …/api/yf|yf2|fmp):', p);
      }
    } catch {
      /* ignore */
    }
  }

  return href;
}
