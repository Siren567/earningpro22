import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => cache.set(key, { data, timestamp: Date.now() });

// Only block clearly non-US foreign listings with explicit exchange suffixes
const FOREIGN_SUFFIX_RE = /\.(L|PA|DE|HK|TO|AX|NS|BO|SI|F|SW|MI|AS|BR|MC|VX|IR|OL|ST|CO|HE|LS|AT|PR|WA|BE|DU|HA|MU|SG|VI|ZU|TW|KQ|SS|SZ|JO|SN|MX|BA|LM|NZ|BK)$/i;

const normalizeSymbol = (sym) =>
  (sym || '').trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '');

// ── Finnhub: general search ───────────────────────────────────────────────────
const searchFinnhub = async (query, apiKey) => {
  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.result || [])
      .filter(item => {
        if (!item.symbol) return false;
        if (FOREIGN_SUFFIX_RE.test(item.symbol)) return false;
        return true;
      })
      .map(item => ({
        symbol: normalizeSymbol(item.symbol.split('.')[0]),
        name: (item.description || item.displaySymbol || item.symbol).trim(),
        exchange: item.displaySymbol?.includes(':') ? item.displaySymbol.split(':')[0] : (item.mic || 'US'),
        source: 'finnhub',
      }))
      .filter(item => item.symbol.length > 0);
  } catch (err) {
    console.warn('[Search] Finnhub error:', err.message);
    return [];
  }
};

// ── FMP: general search (includes ETFs) ──────────────────────────────────────
const searchFMP = async (query, apiKey) => {
  try {
    // Use both general search and ETF-specific search endpoint
    const [generalRes, etfRes] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(query)}&limit=25&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/search-ticker?query=${encodeURIComponent(query)}&limit=25&apikey=${apiKey}`),
    ]);

    const parseResponse = async (settled) => {
      if (settled.status !== 'fulfilled' || !settled.value.ok) return [];
      const data = await settled.value.json();
      return (Array.isArray(data) ? data : [])
        .map(item => ({
          symbol: normalizeSymbol(item.symbol || ''),
          name: (item.name || item.symbol || '').trim(),
          exchange: (item.exchangeShortName || item.stockExchange || 'US').trim(),
          source: 'fmp',
        }))
        .filter(item => item.symbol.length > 0);
    };

    const [general, etf] = await Promise.all([parseResponse(generalRes), parseResponse(etfRes)]);
    // Deduplicate between general and etf results
    const seen = new Set();
    const combined = [];
    for (const r of [...general, ...etf]) {
      if (!seen.has(r.symbol)) {
        seen.add(r.symbol);
        combined.push(r);
      }
    }
    return combined;
  } catch (err) {
    console.warn('[Search] FMP error:', err.message);
    return [];
  }
};

// ── Direct symbol lookup (fallback for exact/near-exact ticker searches) ──────
// Tries multiple endpoints to verify a symbol exists, including quote-only check
const directSymbolLookup = async (symbol, finnhubKey, fmpKey) => {
  const results = [];

  // Run all lookups in parallel: Finnhub profile, Finnhub quote, FMP quote, FMP ETF search
  const [profileResult, quoteResult, fmpQuoteResult, fmpEtfResult] = await Promise.allSettled([
    // 1. Finnhub full profile
    finnhubKey
      ? fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`)
          .then(async r => { if (!r.ok) return null; const d = await r.json(); return d; })
      : Promise.resolve(null),
    // 2. Finnhub quote — returns price even for new ETFs that have no profile yet
    finnhubKey
      ? fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`)
          .then(async r => { if (!r.ok) return null; const d = await r.json(); return d; })
      : Promise.resolve(null),
    // 3. FMP quote — catches ETFs/leveraged products not in Finnhub
    fmpKey
      ? fetch(`https://financialmodelingprep.com/api/v3/quote-short/${encodeURIComponent(symbol)}?apikey=${fmpKey}`)
          .then(async r => { if (!r.ok) return null; const d = await r.json(); return Array.isArray(d) ? d[0] : null; })
      : Promise.resolve(null),
    // 4. FMP ETF profile — specific endpoint for ETFs
    fmpKey
      ? fetch(`https://financialmodelingprep.com/api/v3/etf-holder/${encodeURIComponent(symbol)}?apikey=${fmpKey}`)
          .then(async r => { if (!r.ok) return null; const d = await r.json(); return Array.isArray(d) && d.length > 0 ? { isEtf: true } : null; })
      : Promise.resolve(null),
  ]);

  const profile    = profileResult.status    === 'fulfilled' ? profileResult.value    : null;
  const quote      = quoteResult.status      === 'fulfilled' ? quoteResult.value      : null;
  const fmpQuote   = fmpQuoteResult.status   === 'fulfilled' ? fmpQuoteResult.value   : null;
  const fmpEtf     = fmpEtfResult.status     === 'fulfilled' ? fmpEtfResult.value     : null;

  console.log(`[Search] Direct lookup for ${symbol}:`,
    `profile.ticker=${profile?.ticker},`,
    `finnhub.c=${quote?.c}, finnhub.pc=${quote?.pc},`,
    `fmp.price=${fmpQuote?.price},`,
    `fmpEtf=${!!fmpEtf?.isEtf}`
  );

  // 1. Finnhub profile — richest data
  if (profile?.ticker) {
    results.push({
      symbol: normalizeSymbol(profile.ticker),
      name: profile.name || profile.ticker,
      exchange: profile.exchange || 'US',
      source: 'finnhub-profile',
    });
    console.log(`[Search] Direct profile found: ${profile.ticker} (${profile.name})`);
    return results;
  }

  // 2. Finnhub quote fallback — non-zero price = valid ticker
  const currentPrice  = typeof quote?.c  === 'number' ? quote.c  : null;
  const previousClose = typeof quote?.pc === 'number' ? quote.pc : null;
  if (currentPrice > 0 || previousClose > 0) {
    results.push({
      symbol: normalizeSymbol(symbol),
      name: symbol,
      exchange: 'US',
      source: 'finnhub-quote',
    });
    console.log(`[Search] Finnhub quote fallback for: ${symbol} (c=${currentPrice}, pc=${previousClose})`);
    return results;
  }

  // 3. FMP quote fallback — catches ETFs Finnhub doesn't cover
  const fmpPrice = typeof fmpQuote?.price === 'number' ? fmpQuote.price : null;
  if (fmpPrice > 0) {
    results.push({
      symbol: normalizeSymbol(symbol),
      name: symbol,
      exchange: 'US',
      source: 'fmp-quote',
    });
    console.log(`[Search] FMP quote fallback for: ${symbol} (price=${fmpPrice})`);
    return results;
  }

  // 4. FMP ETF holder data — confirms it's a real ETF even with no quote
  if (fmpEtf?.isEtf) {
    results.push({
      symbol: normalizeSymbol(symbol),
      name: symbol,
      exchange: 'US',
      source: 'fmp-etf',
    });
    console.log(`[Search] FMP ETF holder fallback for: ${symbol}`);
    return results;
  }

  console.log(`[Search] No valid data found for ${symbol} from any source`);
  return results;
};

/**
 * Rank a result based on how well it matches the query.
 * Lower number = higher priority.
 */
const rankResult = (item, query) => {
  const sym  = item.symbol.toUpperCase();
  const name = (item.name || '').toUpperCase();
  const q    = query.toUpperCase();

  if (sym === q)            return 0; // exact symbol match
  if (sym.startsWith(q))   return 1; // symbol prefix match
  if (name === q)           return 2; // exact name match
  if (name.startsWith(q))  return 3; // name prefix match
  if (sym.includes(q))     return 4; // symbol contains
  if (name.includes(q))    return 5; // name contains
  return 6;
};

// ── A query looks like a ticker if it's 1-6 uppercase letters/digits ─────────
const looksLikeTicker = (q) => /^[A-Z0-9]{1,6}$/.test(q);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth is optional for search — mobile sessions may not pass tokens reliably.
    // We still try to verify but don't block on failure.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* allow unauthenticated search */ }

    const body = await req.json();
    const rawQuery = (body?.query || '').replace(/\s+/g, ' ').trim();

    console.log('[Search] Raw input:', JSON.stringify(rawQuery));

    if (!rawQuery || rawQuery.length < 1) return Response.json([]);

    // Normalize: uppercase, collapse spaces, strip non-printable chars
    const query = rawQuery.toUpperCase().replace(/[^\x20-\x7E]/g, '').trim();
    console.log('[Search] Normalized query:', query);

    const cacheKey = `search_v6_${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('[Search] Cache hit, results:', cached.length);
      return Response.json(cached);
    }

    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
    const fmpKey     = Deno.env.get('FMP_API_KEY');

    // Run main search + direct symbol lookup in parallel
    const isTickerLike = looksLikeTicker(query);
    console.log(`[Search] isTickerLike: ${isTickerLike}`);

    const [finnhubResult, fmpResult, directResult] = await Promise.allSettled([
      finnhubKey ? searchFinnhub(query, finnhubKey) : Promise.resolve([]),
      fmpKey     ? searchFMP(query, fmpKey)         : Promise.resolve([]),
      // Always run direct lookup for ticker-like queries to catch ETFs that slip through
      isTickerLike ? directSymbolLookup(query, finnhubKey, fmpKey) : Promise.resolve([]),
    ]);

    const fromFinnhub = finnhubResult.status === 'fulfilled' ? finnhubResult.value : [];
    const fromFMP     = fmpResult.status     === 'fulfilled' ? fmpResult.value     : [];
    const fromDirect  = directResult.status  === 'fulfilled' ? directResult.value  : [];

    console.log(`[Search] Finnhub: ${fromFinnhub.length} | FMP: ${fromFMP.length} | Direct: ${fromDirect.length}`);

    // Merge: direct lookup first (guaranteed match), then FMP, then Finnhub — deduplicate by symbol
    const seen   = new Set();
    const merged = [];

    for (const r of [...fromDirect, ...fromFMP, ...fromFinnhub]) {
      if (!r.symbol || seen.has(r.symbol)) continue;
      seen.add(r.symbol);
      merged.push({ symbol: r.symbol, name: r.name, exchange: r.exchange });
    }

    // Sort by match priority
    merged.sort((a, b) => rankResult(a, query) - rankResult(b, query));

    // Cap at 25 results
    const finalResults = merged.slice(0, 25);

    // Debug log for each result
    finalResults.forEach(r => {
      const rank = rankResult(r, query);
      const matchType = ['exact-symbol', 'symbol-prefix', 'exact-name', 'name-prefix', 'symbol-contains', 'name-contains', 'other'][rank] || 'other';
      console.log(`[Search] Result: ${r.symbol} | match: ${matchType} | name: "${r.name}"`);
    });

    // Log any symbols from direct lookup that didn't make it (shouldn't happen)
    fromDirect.forEach(r => {
      if (!finalResults.find(f => f.symbol === r.symbol)) {
        console.warn(`[Search] EXCLUDED direct result: ${r.symbol} — not in final list`);
      }
    });

    console.log('[Search] Final count:', finalResults.length, '| symbols:', finalResults.map(r => r.symbol).join(', '));

    setCachedData(cacheKey, finalResults);
    return Response.json(finalResults);
  } catch (error) {
    console.error('[Search] Unhandled error:', error.message);
    return Response.json([]);
  }
});