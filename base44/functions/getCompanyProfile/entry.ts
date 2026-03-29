import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol } = await req.json();
    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('FMP_API_KEY');
    const response = await fetch(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`);
    const data = await response.json();

    if (!data || data.length === 0) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = data[0];
    return Response.json({
      symbol: company.symbol,
      companyName: company.companyName,
      price: company.price,
      changes: company.changes,
      industry: company.industry,
      sector: company.sector,
      ceo: company.ceo,
      website: company.website,
      description: company.description,
      exchange: company.exchange,
      marketCap: company.mktCap,
      volume: company.volAvg,
      image: company.image
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});