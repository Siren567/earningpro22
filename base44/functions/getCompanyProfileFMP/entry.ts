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
      return Response.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('FMP_API_KEY');
    const url = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});