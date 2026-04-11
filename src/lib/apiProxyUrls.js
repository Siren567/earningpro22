/**
 * Same-origin URLs for Yahoo/FMP proxies (/api/yf, /api/yf2, /api/fmp).
 * Uses import.meta.env.BASE_URL so subpath deployments resolve correctly.
 * Always returns root-relative absolute paths (leading slash), never bare query segments.
 */

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
  let url = `${base}/api/${proxy}/${path}`;

  if (query == null) return url;

  const sp =
    query instanceof URLSearchParams
      ? new URLSearchParams(query)
      : typeof query === 'string'
        ? new URLSearchParams(query.startsWith('?') ? query.slice(1) : query)
        : new URLSearchParams(
            Object.entries(query).map(([k, v]) => [k, v == null ? '' : String(v)])
          );

  const qs = sp.toString();
  return qs ? `${url}?${qs}` : url;
}
