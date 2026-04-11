import { PROXY_FORWARD_PARAM } from './proxyConstants.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {{ path: string, searchParams: URLSearchParams } | null}
 */
export function getForwardedUpstream(req) {
  const host =
    (req.headers['x-forwarded-host'] && String(req.headers['x-forwarded-host']).split(',')[0].trim()) ||
    req.headers.host ||
    'localhost';

  const raw = req.url || '/';
  let u;
  try {
    u = new URL(raw, `http://${host}`);
  } catch {
    return null;
  }

  const fp = u.searchParams.get(PROXY_FORWARD_PARAM);
  if (fp == null || String(fp).trim() === '') return null;

  const path = String(fp).trim().replace(/^\/+/, '').replace(/\/{2,}/g, '/');
  if (!path || path.includes('..')) return null;
  if (/^https?:/i.test(path) || path.startsWith('//')) return null;

  u.searchParams.delete(PROXY_FORWARD_PARAM);
  return { path, searchParams: u.searchParams };
}

export function isYahooUpstreamPath(path) {
  return /^v\d+\//.test(path);
}

export function isFmpUpstreamPath(path) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(path);
}
