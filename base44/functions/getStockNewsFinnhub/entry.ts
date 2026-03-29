import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably for read-only market data
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    const { symbol } = await req.json();
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');

    // Get last 7 days of news
    const to = Math.floor(Date.now() / 1000);
    const from = to - (7 * 24 * 60 * 60);

    const newsRes = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${new Date(from * 1000).toISOString().split('T')[0]}&to=${new Date(to * 1000).toISOString().split('T')[0]}&token=${finnhubKey}`
    );
    const newsData = await newsRes.json();

    return Response.json(
      (newsData || []).slice(0, 10).map(article => ({
        title: article.headline,
        source: article.source,
        url: article.url,
        publishedAt: new Date(article.datetime * 1000).toISOString(),
        summary: article.summary,
        image: article.image
      }))
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});