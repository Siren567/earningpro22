import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

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

const cryptoNames = {
  'BTCUSD': 'Bitcoin',
  'ETHUSD': 'Ethereum',
  'SOLUSD': 'Solana',
  'XRPUSD': 'XRP',
  'BNBUSD': 'BNB'
};

const fetchFromFinnhub = async (symbol) => {
  const apiKey = Deno.env.get('FINNHUB_API_KEY');
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    const data = await res.json();

    if (!data || data.error) return null;

    return {
      symbol: symbol,
      current: data.c,
      change: data.d,
      percentChange: data.dp,
      exchange: 'Crypto',
      companyName: cryptoNames[symbol] || symbol,
      source: 'Finnhub'
    };
  } catch (error) {
    console.error('[Finnhub Crypto] Error:', error.message);
    return null;
  }
};

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

    const cacheKey = `crypto_quote_${symbol}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    let quote = await fetchFromFinnhub(symbol);

    if (!quote) {
      // Return minimal fallback to prevent breaking the watchlist
      quote = {
        symbol: symbol,
        current: null,
        change: null,
        percentChange: null,
        exchange: 'Crypto',
        companyName: cryptoNames[symbol] || symbol,
        partial: true
      };
    }

    setCachedData(cacheKey, quote);
    return Response.json(quote);
  } catch (error) {
    console.error('[Crypto Quote] Error:', error.message);
    return Response.json(
      { error: 'Failed to fetch quote', partial: true },
      { status: 500 }
    );
  }
});