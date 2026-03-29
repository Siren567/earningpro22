import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Simple in-memory cache (6 hours TTL for metadata)
const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const normalizeSymbol = (symbol) => {
  if (!symbol) return '';
  return symbol.split('.')[0].toUpperCase();
};

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

const fetchMetadataFromFinnhub = async (symbol) => {
  const apiKey = Deno.env.get('FINNHUB_API_KEY');
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`);
    const data = await res.json();

    if (!data || !data.ticker) return null;

    return {
      symbol: data.ticker,
      companyName: data.name,
      exchange: data.exchange,
      logo: data.logo,
      industry: data.finnhubIndustry,
      country: data.country,
      weburl: data.weburl,
      source: 'Finnhub'
    };
  } catch (error) {
    console.error('[Finnhub Metadata] Error:', error.message);
    return null;
  }
};

const fetchMetadataFromFMP = async (symbol) => {
  const apiKey = Deno.env.get('FMP_API_KEY');
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const profile = Array.isArray(data) ? data[0] : data;

    if (!profile || !profile.symbol) return null;

    return {
      symbol: profile.symbol,
      companyName: profile.companyName,
      exchange: profile.exchangeShortName,
      logo: profile.image,
      industry: profile.industry,
      sector: profile.sector,
      country: profile.country,
      website: profile.website,
      source: 'FMP'
    };
  } catch (error) {
    console.error('[FMP Metadata] Error:', error.message);
    return null;
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably for read-only market data
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    const { symbol } = await req.json();
    const normalized = normalizeSymbol(symbol);

    // Check cache first
    const cacheKey = `metadata_${normalized}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    // Try Finnhub first (faster), then FMP as fallback
    let metadata = await fetchMetadataFromFinnhub(normalized);
    if (!metadata) {
      metadata = await fetchMetadataFromFMP(normalized);
    }

    if (!metadata) {
      return Response.json(
        { error: 'Metadata not found', partial: true },
        { status: 404 }
      );
    }

    // Cache the result for 6 hours
    setCachedData(cacheKey, metadata);

    return Response.json(metadata);
  } catch (error) {
    console.error('[Asset Metadata] Error:', error.message);
    return Response.json(
      { error: 'Failed to fetch metadata', partial: true },
      { status: 500 }
    );
  }
});