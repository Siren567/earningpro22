// Vercel serverless — proxies Yahoo Finance query1.
// Path is taken from the request URL (not only req.query.path) for reliable routing.

import { parseProxyPath } from '../lib/parseProxyPath.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export default async function handler(req, res) {
  const parsed = parseProxyPath(req, '/api/yf');
  if (!parsed) {
    return res.status(404).json({ error: 'Not found' });
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
