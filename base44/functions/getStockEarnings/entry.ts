import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably for read-only market data
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    const { symbol } = await req.json();
    const eodhdKey = Deno.env.get('EODHD_API_KEY');

    // Get earnings data
    const earningsRes = await fetch(
      `https://eodhd.com/api/calendar/earnings?api_token=${eodhdKey}&symbols=${symbol}&fmt=json`
    );
    const earningsData = await earningsRes.json();

    if (!earningsData || earningsData.length === 0) {
      return Response.json({
        nextEarningsDate: null,
        previousEarningsDate: null,
        estimatedEPS: null,
        actualEPS: null,
        history: []
      });
    }

    // Sort by date
    const sorted = earningsData.sort((a, b) => new Date(b.date) - new Date(a.date));
    const upcoming = sorted.filter(e => new Date(e.date) > new Date());
    const past = sorted.filter(e => new Date(e.date) <= new Date());

    const next = upcoming.length > 0 ? upcoming[upcoming.length - 1] : null;
    const previous = past.length > 0 ? past[0] : null;

    return Response.json({
      nextEarningsDate: next?.date || null,
      nextEstimatedEPS: next?.epsEstimated || null,
      previousEarningsDate: previous?.date || null,
      previousEstimatedEPS: previous?.epsEstimated || null,
      previousActualEPS: previous?.eps || null,
      history: sorted.slice(0, 8).map(e => ({
        date: e.date,
        estimated: e.epsEstimated,
        actual: e.eps,
        revenue: e.revenueEstimated
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});