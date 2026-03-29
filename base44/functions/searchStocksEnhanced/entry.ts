import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();
    const fmpKey = Deno.env.get('FMP_API_KEY');

    // Search stocks by symbol or name
    const searchRes = await fetch(
      `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=20&apikey=${fmpKey}`
    );
    const results = await searchRes.json();

    return Response.json(
      results.map(item => ({
        symbol: item.symbol,
        name: item.name,
        currency: item.currency,
        stockExchange: item.stockExchange,
        exchangeShortName: item.exchangeShortName
      }))
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});