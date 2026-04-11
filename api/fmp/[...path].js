// Vercel serverless function — proxies Financial Modeling Prep (FMP)
// Injects the FMP_API_KEY from Vercel environment variables server-side.
// The key is NEVER sent to or bundled in the browser.

export default async function handler(req, res) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'FMP_API_KEY environment variable is not configured' });
  }

  const { path: pathParts, ...query } = req.query;
  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts ?? '');
  const qs = new URLSearchParams({ ...query, apikey: apiKey }).toString();
  const url = `https://financialmodelingprep.com/${pathStr}?${qs}`;

  try {
    const upstream = await fetch(url);
    const body = await upstream.text();
    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(body);
  } catch (err) {
    res.status(502).json({ error: 'FMP proxy error', detail: err.message });
  }
}
