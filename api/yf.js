// Vercel: single route /api/yf — multi-segment Yahoo paths go in ?_fp= (see lib/proxyConstants.js).
// Vercel's builder only maps [...path] to one URL segment, so /api/yf/v8/... used to 404 in production.

import { getForwardedUpstream, isYahooUpstreamPath } from '../lib/apiProxyShared.js';
import { PROXY_FORWARD_PARAM } from '../lib/proxyConstants.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export default async function handler(req, res) {
  // Vercel logs: confirms handler ran and raw URL (if 404 before this, route not deployed / rewrite ate request)
  const rawUrl = req.url || '';
  console.log('[api/yf]', req.method, rawUrl.slice(0, 200));

  const parsed = getForwardedUpstream(req);
  if (!parsed || !isYahooUpstreamPath(parsed.path)) {
    console.warn('[api/yf] reject _fp', { parsed: parsed?.path, rawUrl: rawUrl.slice(0, 160) });
    return res.status(400).json({
      error: `Missing or invalid ${PROXY_FORWARD_PARAM} (expected Yahoo path like v8/finance/chart/SYMBOL)`,
    });
  }

  const { path, searchParams } = parsed;
  const target = new URL(`https://query1.finance.yahoo.com/${path}`);
  searchParams.forEach((v, k) => {
    target.searchParams.set(k, v);
  });

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
      },
    });
    const body = await upstream.text();
    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (err) {
    res.status(502).json({ error: 'Yahoo Finance proxy error', detail: err.message });
  }
}
