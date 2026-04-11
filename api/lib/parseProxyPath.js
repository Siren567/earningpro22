/**
 * Parse same-origin proxy requests from req.url (Vercel / Node).
 * Avoids relying on [...path] catch-all query shape, which can differ by runtime.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} apiPrefix e.g. '/api/yf' (no trailing slash)
 * @returns {{ path: string, searchParams: URLSearchParams } | null}
 */
export function parseProxyPath(req, apiPrefix) {
  const prefix = apiPrefix.endsWith('/') ? apiPrefix.slice(0, -1) : apiPrefix;
  const host =
    (req.headers['x-forwarded-host'] && String(req.headers['x-forwarded-host']).split(',')[0].trim()) ||
    req.headers.host ||
    'localhost';
  const proto =
    (req.headers['x-forwarded-proto'] && String(req.headers['x-forwarded-proto']).split(',')[0].trim()) ||
    'https';

  const raw = req.url || '/';
  let pathname;
  let searchParams;

  try {
    const u = new URL(raw, `${proto}://${host}`);
    pathname = u.pathname;
    searchParams = u.searchParams;
  } catch {
    return null;
  }

  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
    return null;
  }

  const path = pathname === prefix ? '' : pathname.slice(prefix.length + 1);
  return { path, searchParams };
}
