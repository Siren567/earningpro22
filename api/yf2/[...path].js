// Vercel serverless function — proxies Yahoo Finance query2
// Adds the required User-Agent header so Yahoo doesn't reject the request.
// Matches any path under /api/yf2/*, used as a fallback by yahooFinanceApi.js

export default async function handler(req, res) {
  const { path: pathParts, ...query } = req.query;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const qs = new URLSearchParams(query).toString();
  const url = `https://query2.finance.yahoo.com/${pathStr}${qs ? '?' + qs : ''}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/json',
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
