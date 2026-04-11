// Vercel serverless — proxies Financial Modeling Prep with server-side API key.

import { parseProxyPath } from '../lib/parseProxyPath.js';

export default async function handler(req, res) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FMP_API_KEY environment variable is not configured' });
  }

  const parsed = parseProxyPath(req, '/api/fmp');
  if (!parsed) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { path, searchParams } = parsed;
  const sp = new URLSearchParams(searchParams);
  sp.set('apikey', apiKey);

  const target = new URL(`https://financialmodelingprep.com/${path}`);
  sp.forEach((v, k) => {
    target.searchParams.set(k, v);
  });

  try {
    const upstream = await fetch(target.toString());
    const body = await upstream.text();
    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (err) {
    res.status(502).json({ error: 'FMP proxy error', detail: err.message });
  }
}
