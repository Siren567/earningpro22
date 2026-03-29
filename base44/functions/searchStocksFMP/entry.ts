import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, limit = 10 } = await req.json();
    
    if (!query || query.trim().length === 0) {
      return Response.json({ results: [] });
    }

    const apiKey = Deno.env.get('FMP_API_KEY');
    const url = `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=${limit}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});