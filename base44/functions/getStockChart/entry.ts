import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol, interval = '5m', range = '1d' } = await req.json();
    
    const cacheKey = `chart_${symbol}_${interval}_${range}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const url = `https://yh-finance.p.rapidapi.com/stock/v3/get-chart?symbol=${symbol}&region=US&interval=${interval}&range=${range}`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      return Response.json({ error: 'Chart data unavailable' }, { status: 404 });
    }

    const data = await response.json();
    
    if (!data?.chart?.result?.[0]) {
      return Response.json({ error: 'Invalid chart data' }, { status: 404 });
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const candles = timestamps.map((time, i) => ({
      time: time,
      open: quotes.open?.[i],
      high: quotes.high?.[i],
      low: quotes.low?.[i],
      close: quotes.close?.[i],
      volume: quotes.volume?.[i]
    })).filter(c => c.open && c.close);

    const chartData = {
      symbol: result.meta?.symbol,
      candles: candles,
      currency: result.meta?.currency,
      exchange: result.meta?.exchangeName
    };

    setCachedData(cacheKey, chartData);

    return Response.json(chartData);
  } catch (error) {
    console.error('[Chart] Error:', error.message);
    return Response.json({ error: 'Chart data unavailable' }, { status: 500 });
  }
});