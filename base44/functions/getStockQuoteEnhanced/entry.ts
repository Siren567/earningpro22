import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await req.json();
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');

    // Get real-time quote from Finnhub
    const quoteRes = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`
    );
    const quote = await quoteRes.json();

    return Response.json({
      current: quote.c,
      change: quote.d,
      percentChange: quote.dp,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      previousClose: quote.pc,
      timestamp: quote.t
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});