import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably for read-only market data
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    const { symbols } = await req.json();
    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');

    if (!symbols || symbols.length === 0) {
      return Response.json([]);
    }

    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`
          );
          const data = await res.json();
          
          return {
            symbol,
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            high: data.h,
            low: data.l,
            open: data.o,
            previousClose: data.pc
          };
        } catch {
          return { symbol, price: 0, change: 0, changePercent: 0 };
        }
      })
    );

    return Response.json(quotes);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});