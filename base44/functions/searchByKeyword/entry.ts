import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyword } = await req.json();
    if (!keyword) {
      return Response.json({ error: 'Keyword required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('FMP_API_KEY');
    
    // Search by sector/industry keyword
    const sectorResponse = await fetch(`https://financialmodelingprep.com/api/v3/stock-screener?sector=${encodeURIComponent(keyword)}&limit=50&apikey=${apiKey}`);
    const sectorData = await sectorResponse.json();

    // Also search by company name
    const nameResponse = await fetch(`https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(keyword)}&limit=50&apikey=${apiKey}`);
    const nameData = await nameResponse.json();

    // Combine and deduplicate results
    const combined = [...(sectorData || []), ...(nameData || [])];
    const uniqueSymbols = new Set();
    const results = combined
      .filter(item => {
        if (uniqueSymbols.has(item.symbol)) return false;
        uniqueSymbols.add(item.symbol);
        return true;
      })
      .map(item => ({
        symbol: item.symbol,
        name: item.companyName || item.name,
        exchange: item.exchangeShortName || item.exchange,
        sector: item.sector,
        industry: item.industry,
        price: item.price
      }))
      .slice(0, 30);

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});