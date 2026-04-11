/**
 * Same-origin URLs for Yahoo/FMP proxies (/api/yf, /api/yf2, /api/fmp).
 * Uses import.meta.env.BASE_URL so subpath deployments resolve correctly.
 *
 * Production (Vercel): upstream path is sent as a single query param `_fp` because Vercel's
 * filesystem routing for `api/yf/[...path].js` only matches ONE path segment after /api/yf/,
 * so URLs like /api/yf/v8/finance/chart/AAPL never reached the function and returned 404.
 * Dev: Vite proxy expands `_fp` into the real Yahoo/FMP path (see vite.config.js).
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
  return `${base}/api/${proxy}?${qs}`;
}
