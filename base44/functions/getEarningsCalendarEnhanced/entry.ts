import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from, to } = await req.json();
    const fmpKey = Deno.env.get('FMP_API_KEY');
    
    // Get earnings calendar from FMP
    const url = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${fmpKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.length === 0) {
      return Response.json([]);
    }

    return Response.json(
      data.map(item => ({
        symbol: item.symbol,
        name: item.name || item.symbol,
        date: item.date,
        eps: item.eps,
        epsEstimated: item.epsEstimated,
        time: item.time,
        revenue: item.revenue,
        revenueEstimated: item.revenueEstimated,
        fiscalDateEnding: item.fiscalDateEnding
      }))
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});