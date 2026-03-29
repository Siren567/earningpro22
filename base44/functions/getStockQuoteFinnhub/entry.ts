import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { symbol } = await req.json();
    
    // Normalize symbol: remove exchange suffix
    if (symbol) {
      symbol = symbol.split('.')[0].toUpperCase();
    }

    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');

    console.log('[QUOTE] Attempting to load symbol:', symbol);

    // Get real-time quote
    const quoteRes = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`
    );
    const quoteData = await quoteRes.json();

    console.log('[QUOTE] Finnhub response status:', quoteRes.status);

    // Check if we got valid data
    if (quoteData.c === null || quoteData.c === undefined) {
      console.error('[QUOTE] Invalid or missing quote data for:', symbol);
      return Response.json({ error: 'Symbol not found' }, { status: 404 });
    }

    return Response.json({
      current: quoteData.c,
      high: quoteData.h,
      low: quoteData.l,
      open: quoteData.o,
      previousClose: quoteData.pc,
      change: quoteData.d,
      percentChange: quoteData.dp,
      timestamp: quoteData.t
    });
  } catch (error) {
    console.error('[QUOTE] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});