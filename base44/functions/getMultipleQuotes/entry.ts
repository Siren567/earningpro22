import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols } = await req.json();
    if (!symbols || !Array.isArray(symbols)) {
      return Response.json({ error: 'Symbols array required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
          const data = await response.json();
          return {
            symbol,
            current: data.c,
            change: data.d,
            percentChange: data.dp,
            high: data.h,
            low: data.l,
            open: data.o,
            previousClose: data.pc
          };
        } catch (error) {
          return { symbol, error: error.message };
        }
      })
    );

    return Response.json(quotes);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});