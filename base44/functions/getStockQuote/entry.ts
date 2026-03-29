import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const cache = new Map();
const CACHE_TTL = 10000; // 10 seconds — keep header price close to live chart

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

const normalizeSymbol = (symbol) => {
  if (!symbol) return '';
  return symbol.split('.')[0].toUpperCase();
};

// Fetch quote from Finnhub
const fetchQuoteFinnhub = async (symbol) => {
  const apiKey = Deno.env.get('FINNHUB_API_KEY');
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
    );
    const data = await response.json();
    
    if (data.c === null || data.c === undefined) return null;

    return {
      current: data.c,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      change: data.d,
      percentChange: data.dp,
      timestamp: data.t,
      volume: null,
      source: 'Finnhub'
    };
  } catch (error) {
    console.error('[Finnhub Quote] Error:', error.message);
    return null;
  }
};

// Fetch quote from Yahoo Finance via RapidAPI
const fetchQuoteYahoo = async (symbol) => {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) return null;

  try {
    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/yahoo/qu/quote/${symbol}`,
      {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
        }
      }
    );
    
    const data = await response.json();
    if (!data || data.error) return null;

    const quote = data[0] || data;
    if (!quote.regularMarketPrice) return null;

    return {
      current: quote.regularMarketPrice,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      open: quote.regularMarketOpen,
      previousClose: quote.regularMarketPreviousClose,
      change: quote.regularMarketChange,
      percentChange: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      source: 'Yahoo-RapidAPI'
    };
  } catch (error) {
    console.error('[Yahoo RapidAPI Quote] Error:', error.message);
    return null;
  }
};

// Fetch quote from FMP
const fetchQuoteFMP = async (symbol) => {
  const apiKey = Deno.env.get('FMP_API_KEY');
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`
    );
    const data = await response.json();
    const quote = Array.isArray(data) ? data[0] : data;
    
    if (!quote || !quote.price) return null;

    return {
      current: quote.price,
      high: quote.dayHigh,
      low: quote.dayLow,
      open: quote.open,
      previousClose: quote.previousClose,
      change: quote.change,
      percentChange: quote.changesPercentage,
      volume: quote.volume,
      source: 'FMP'
    };
  } catch (error) {
    console.error('[FMP Quote] Error:', error.message);
    return null;
  }
};

/**
 * Build a unified quote from a single primary source.
 * FMP is prioritized because TradingView uses the same underlying data for many symbols,
 * giving the best header ↔ chart price alignment.
 * Change and percentChange are ALWAYS recalculated from (current - previousClose)
 * so they stay internally consistent regardless of what the API returned.
 */
const buildCanonicalQuote = (fmpQuote, finnhubQuote, yahooQuote, symbol) => {
  // Priority: FMP → Finnhub → Yahoo
  const primary = fmpQuote || finnhubQuote || yahooQuote;
  if (!primary) return null;

  const current = primary.current;
  const previousClose = primary.previousClose
    ?? finnhubQuote?.previousClose
    ?? yahooQuote?.previousClose;

  // Always derive change/% from the same current price to stay in sync
  const change = (current != null && previousClose != null)
    ? Number((current - previousClose).toFixed(4))
    : primary.change ?? null;

  const percentChange = (current != null && previousClose != null && previousClose !== 0)
    ? Number((((current - previousClose) / previousClose) * 100).toFixed(4))
    : primary.percentChange ?? null;

  const result = {
    current,
    high:          primary.high          ?? finnhubQuote?.high          ?? yahooQuote?.high,
    low:           primary.low           ?? finnhubQuote?.low           ?? yahooQuote?.low,
    open:          primary.open          ?? finnhubQuote?.open          ?? yahooQuote?.open,
    previousClose,
    change,
    percentChange,
    volume:        primary.volume        ?? finnhubQuote?.volume        ?? yahooQuote?.volume,
    timestamp:     Date.now(),
    priceSource:   primary.source,
    sources:       [fmpQuote, finnhubQuote, yahooQuote].filter(Boolean).map(s => s.source),
  };

  // Debug logging for specific symbols
  const debugSymbols = ['BMNU', 'BMNZ'];
  if (debugSymbols.includes(symbol?.toUpperCase())) {
    console.log(`\n[PRICE DEBUG] Symbol: ${symbol}`);
    console.log(`[PRICE DEBUG] Primary source: ${primary.source}`);
    console.log(`[PRICE DEBUG] FMP price: ${fmpQuote?.current ?? 'N/A'}`);
    console.log(`[PRICE DEBUG] Finnhub price: ${finnhubQuote?.current ?? 'N/A'}`);
    console.log(`[PRICE DEBUG] Yahoo price: ${yahooQuote?.current ?? 'N/A'}`);
    console.log(`[PRICE DEBUG] → Displayed price: ${current}`);
    console.log(`[PRICE DEBUG] → Previous close: ${previousClose}`);
    console.log(`[PRICE DEBUG] → Calculated change: ${change}`);
    console.log(`[PRICE DEBUG] → Calculated change%: ${percentChange}`);
    console.log(`[PRICE DEBUG] Chart uses TradingView widget (independent feed)`);
  }

  return result;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably for read-only market data
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    let { symbol } = await req.json();
    symbol = normalizeSymbol(symbol);

    const cacheKey = `quote_${symbol}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    // Run all sources in parallel; FMP first in priority
    const [fmpQuote, finnhubQuote, yahooQuote] = await Promise.all([
      fetchQuoteFMP(symbol),
      fetchQuoteFinnhub(symbol),
      fetchQuoteYahoo(symbol),
    ]);

    const canonicalQuote = buildCanonicalQuote(fmpQuote, finnhubQuote, yahooQuote, symbol);

    if (!canonicalQuote?.current) {
      return Response.json({ 
        error: 'Quote data temporarily unavailable',
        partial: true 
      }, { status: 404 });
    }

    setCachedData(cacheKey, canonicalQuote);

    return Response.json(canonicalQuote);
  } catch (error) {
    console.error('[Quote] Error:', error.message);
    return Response.json({ 
      error: 'Some data is temporarily unavailable',
      partial: true 
    }, { status: 500 });
  }
});