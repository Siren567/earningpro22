import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();
    if (!query || query.trim().length === 0) {
      return Response.json([]);
    }

    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
    if (!finnhubKey) {
      console.error('[SEARCH] FINNHUB_API_KEY not configured');
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Use Finnhub's symbol search API which is more reliable
    const searchUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${finnhubKey}`;
    const searchRes = await fetch(searchUrl);
    
    let results = [];
    
    if (searchRes.ok) {
      try {
        const data = await searchRes.json();
        // Finnhub returns { result: [...] }
        results = (data && data.result) ? data.result : [];
      } catch (e) {
        console.error('[SEARCH] Parse error:', e.message);
        results = [];
      }
    }

    // Map the response correctly - Finnhub returns different field names
    const mapped = results
      .filter(item => item.symbol && item.symbol.trim()) // Only include items with symbols
      .map(item => ({
        symbol: item.symbol || '',
        name: item.description || '',
        currency: '',
        exchange: item.displaySymbol ? item.displaySymbol.split('.')[1] || '' : '',
        sector: '',
        industry: ''
      }))
      .slice(0, 30);

    return Response.json(mapped);
  } catch (error) {
    console.error('[SEARCH] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});