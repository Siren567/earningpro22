/**
 * Yahoo Finance public API — browser-direct via Vite proxy, no API key required.
 * Replaces broken Base44/Deno function calls for core stock data.
 *
 * Endpoints:
 *   /v1/finance/search  — symbol/company search (CORS-safe autocomplete)
 *   /v8/finance/chart   — OHLCV + quote meta (price, change, day range, 52w, extended hours)
 *
 * Proxy config in vite.config.js: /api/yf → query1.finance.yahoo.com
 * For production: configure nginx/Vercel rewrite for the same path.
 *
 * International symbols (e.g. NICE.TA, VOD.L) are passed as-is — the chart endpoint
 * handles exchange-suffixed symbols natively.
 *
 * Note: /v7/finance/quote returns HTTP 401 without auth cookies (not usable browser-side).
 * Fields not available from /v8/finance/chart (marketCap, PE, EPS, avgVolume) remain null.
 */

import { proxyApiUrl } from '@/lib/apiProxyUrls';

const yf = (path, query) => proxyApiUrl('yf', path, query);
const yf2 = (path, query) => proxyApiUrl('yf2', path, query);

// Yahoo marketState → internal status enum
const MARKET_STATE_MAP = {
  REGULAR:  'REGULAR',
  PRE:      'PRE',
  PREPRE:   'PRE',
  POST:     'POST',
  POSTPOST: 'POST',
  CLOSED:   'CLOSED',
};

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

/**
 * Derive US market state from the `currentTradingPeriod` timestamps
 * embedded in every Yahoo Finance chart response.
 */
function deriveMarketState(tp) {
  if (!tp) return 'CLOSED';
  const now = Math.floor(Date.now() / 1000);
  if (now >= tp.pre?.start     && now < tp.regular?.start) return 'PRE';
  if (now >= tp.regular?.start && now < tp.regular?.end)   return 'REGULAR';
  if (now >= tp.post?.start    && now < tp.post?.end)      return 'POST';
  return 'CLOSED';
}

/** Calculate price change and % from current price and previous close. */
function calcChange(price, prevClose) {
  if (price == null || prevClose == null || prevClose === 0) return { change: null, changePercent: null };
  const change = price - prevClose;
  return { change, changePercent: (change / prevClose) * 100 };
}

// ─────────────────────────────────────────────
// 1. SEARCH
// ─────────────────────────────────────────────

/**
 * Search stocks by symbol or company name.
 * Returns normalised list: { symbol, name, exchange, type }
 * Symbol is returned exactly as Yahoo provides it — including exchange suffix
 * for international stocks (e.g. NICE.TA, VOD.L, SAP.DE).
 */
export async function searchStocks(query) {
  const q = query.replace(/[^\x20-\x7E]/g, '').trim();
  if (!q) return [];

  const url = yf('v1/finance/search', {
    q,
    quotesCount: 10,
    newsCount: 0,
    lang: 'en-US',
    region: 'US',
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`);

  const json = await res.json();
  const quotes = json.quotes ?? [];

  console.log('[yahooSearch] raw results count:', quotes.length);

  return quotes
    .filter(item => ['EQUITY', 'ETF', 'MUTUALFUND'].includes(item.quoteType))
    .map(item => ({
      symbol:   item.symbol,                             // Full symbol — e.g. NICE.TA, VOD.L
      name:     item.shortname || item.longname || item.symbol,
      exchange: item.exchDisp  || item.exchange  || '',
      type:     item.quoteType,
    }))
    .slice(0, 10);
}

// ─────────────────────────────────────────────
// 2. STOCK DATA — profile + fundamentals
// ─────────────────────────────────────────────

/**
 * Full stock data for any Yahoo symbol (US or international).
 * Uses /v8/finance/chart with range=5d to get shortName/longName in meta.
 *
 * Fields directly from Yahoo v8/chart meta:
 *   price, previousClose, change (calculated), changePercent (calculated),
 *   dayHigh, dayLow, open, volume, fiftyTwoWeekHigh/Low,
 *   currency, exchange, marketStatus (derived from currentTradingPeriod timestamps),
 *   extended hours prices (pre/post market)
 *
 * Fields not available from v8/chart (remain null):
 *   marketCap, peRatio, eps, avgVolume, roe, debtToEquity,
 *   beta, dividendYield, sector, industry, description
 */
export async function getStockData(symbol) {
  // range=60d gives 60 daily candles — used to compute avgVolume.
  // Meta fields (price, 52w, etc.) are unaffected by range.
  const url = yf(`v8/finance/chart/${encodeURIComponent(symbol)}`, {
    interval: '1d',
    range: '60d',
    includePrePost: true,
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stock data failed (HTTP ${res.status})`);

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('No chart data returned from Yahoo Finance for: ' + symbol);

  const m = result.meta;
  const prevClose = m.chartPreviousClose ?? null;
  const price     = m.regularMarketPrice ?? null;
  const { change, changePercent } = calcChange(price, prevClose);
  const marketStatus = deriveMarketState(m.currentTradingPeriod);

  // Compute 60-day average daily volume from the candle series.
  // Yahoo's v10/quoteSummary (which provided avgVolume) returns 401 without
  // browser auth cookies, so we derive it from the chart data instead.
  const rawVolumes = result.indicators?.quote?.[0]?.volume ?? [];
  const validVols  = rawVolumes.filter(v => v != null && Number.isFinite(v) && v > 0);
  const avgVolume  = validVols.length
    ? Math.round(validVols.reduce((sum, v) => sum + v, 0) / validVols.length)
    : null;

  console.log('[yahooChart] loaded', m.symbol, {
    name: m.shortName, price, change: change?.toFixed(2),
    changePercent: changePercent?.toFixed(2), marketStatus, avgVolume,
  });

  return {
    symbol:           m.symbol,
    companyName:      m.shortName || m.longName || m.symbol,
    price,
    previousClose:    prevClose,
    change,
    changePercent,
    open:             m.regularMarketOpen    ?? null,
    dayHigh:          m.regularMarketDayHigh ?? null,
    dayLow:           m.regularMarketDayLow  ?? null,
    volume:           m.regularMarketVolume  ?? null,
    avgVolume,                                          // computed from 60-day candles
    fiftyTwoWeekHigh: m.fiftyTwoWeekHigh     ?? null,
    fiftyTwoWeekLow:  m.fiftyTwoWeekLow      ?? null,
    exchange:         m.fullExchangeName || m.exchangeName || null,
    currency:         m.currency || 'USD',
    marketStatus,
    // Extended hours
    preMarketPrice:          m.preMarketPrice          ?? null,
    preMarketChange:         m.preMarketChange         ?? null,
    preMarketChangePercent:  m.preMarketChangePercent  ?? null,
    afterHoursPrice:         m.postMarketPrice         ?? null,
    afterHoursChange:        m.postMarketChange        ?? null,
    afterHoursChangePercent: m.postMarketChangePercent ?? null,
    // Not available from v8/chart
    marketCap: null, peRatio: null, eps: null,
    beta: null, dividendYield: null, revenueGrowth: null,
    roe: null, debtToEquity: null,
    sector: null, industry: null, description: null,
    website: null, ceo: null, country: null, logo: null,
    earningsDate: null, targetPrice: null, recommendation: null,
    revenuePerShare: null, netIncomePerShare: null, freeCashFlowPerShare: null,
  };
}

// ─────────────────────────────────────────────
// 3. FUNDAMENTALS — market cap, P/E, EPS, avg volume
// ─────────────────────────────────────────────

/**
 * Normalise a Yahoo Finance field value.
 * Yahoo quoteSummary returns values in two forms depending on the endpoint
 * and `formatted` parameter:
 *   • Object form:  { raw: 2904832622592, fmt: "2.90T" }  → extract .raw
 *   • Plain form:   2904832622592                          → use as-is
 * Returns null for missing / non-numeric values.
 */
function rawVal(v) {
  if (v == null) return null;
  if (typeof v === 'object' && 'raw' in v) {
    const r = v.raw;
    return r != null && Number.isFinite(Number(r)) ? Number(r) : null;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Fetch fundamental metrics via Yahoo Finance v10/quoteSummary.
 *
 * Strategy — 4 parallel attempts across two proxy hosts and two URL variants:
 *   1. query1 + formatted=true  (returns {raw,fmt} objects — most compatible)
 *   2. query2 + formatted=true  (secondary host fallback)
 *   3. query1 + no formatted param
 *   4. query2 + no formatted param
 *
 * The first attempt that returns a valid result is used.
 * This covers: host-level 401/5xx, CORS issues, and parameter quirks.
 *
 * Modules requested:
 *   summaryDetail       → marketCap, trailingPE, beta, dividendYield, averageVolume
 *   defaultKeyStatistics→ trailingEps, forwardPE, priceToBook
 *   price               → alternate marketCap, averageDailyVolume10Day/3Month
 *   assetProfile        → sector, industry, country, longBusinessSummary
 *   fundProfile         → categoryName, family (ETFs / mutual funds)
 *   financialData       → totalRevenue, operatingMargins, profitMargins, returnOnEquity, debtToEquity
 *
 * Multi-source strategy:
 *   query1.finance.yahoo.com (primary)  — fetched first
 *   query2.finance.yahoo.com (secondary) — hot standby; used if query1 returns no data
 *   Fields from different modules are merged: quoteSummary modules act as independent
 *   data sources, each with its own update cadence (summaryDetail ≠ financialData).
 */
export async function getStockFundamentals(symbol) {
  const enc     = encodeURIComponent(symbol);
  const modules = 'summaryDetail,defaultKeyStatistics,price,assetProfile,fundProfile,financialData';

  const attempts = [
    yf(`v10/finance/quoteSummary/${enc}`, {
      modules,
      formatted: true,
      corsDomain: 'finance.yahoo.com',
    }),
    yf2(`v10/finance/quoteSummary/${enc}`, {
      modules,
      formatted: true,
      corsDomain: 'finance.yahoo.com',
    }),
    yf(`v10/finance/quoteSummary/${enc}`, { modules }),
    yf2(`v10/finance/quoteSummary/${enc}`, { modules }),
  ];

  // Fire all 4 in parallel; take the first fulfilled result with usable data
  const settled = await Promise.allSettled(
    attempts.map((url, i) =>
      fetch(url, { signal: AbortSignal.timeout(6000) })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json().then(json => ({ json, attempt: i }));
        })
    )
  );

  let result = null;
  let usedAttempt = -1;

  for (const r of settled) {
    if (r.status === 'fulfilled') {
      const candidate = r.value.json?.quoteSummary?.result?.[0];
      if (candidate) {
        result      = candidate;
        usedAttempt = r.value.attempt;
        break;
      }
    }
  }

  // Log outcome of each attempt for debugging
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[metrics] attempt ${i} failed:`, r.reason?.message ?? r.reason);
    } else {
      const hasData = !!r.value.json?.quoteSummary?.result?.[0];
      console.log(`[metrics] attempt ${i} ${hasData ? '✓ data' : '✗ empty'}`);
    }
  });

  if (!result) {
    console.warn('[metrics] all attempts failed for', symbol);
    return null;
  }

  console.log('[metrics] using attempt', usedAttempt, 'for', symbol);

  // ── Module extraction ────────────────────────────────────────────────────
  const sd = result.summaryDetail        ?? {};
  const ks = result.defaultKeyStatistics ?? {};
  const pr = result.price                ?? {};
  const ap = result.assetProfile         ?? {};
  const fp = result.fundProfile          ?? {};
  const fd = result.financialData        ?? {};

  // ── Source A: summaryDetail + defaultKeyStatistics ───────────────────────
  const sourceA = {
    marketCap:         rawVal(sd.marketCap),
    peRatio:           rawVal(sd.trailingPE),
    eps:               rawVal(ks.trailingEps),
    beta:              rawVal(sd.beta),
    dividendYield:     rawVal(sd.dividendYield) ?? rawVal(sd.trailingAnnualDividendYield),
    avgVolume:         rawVal(sd.averageVolume10days) ?? rawVal(sd.averageVolume),
    forwardPE:         rawVal(ks.forwardPE),
    priceToBook:       rawVal(ks.priceToBook),
    sharesOutstanding: rawVal(ks.sharesOutstanding) ?? rawVal(ks.impliedSharesOutstanding),
    floatShares:       rawVal(ks.floatShares),
  };
  console.log('[metrics] sourceA (summaryDetail/keyStats):', sourceA);

  // ── Source B: price module — often more up-to-date marketCap/volume for ETFs ──
  const sourceB = {
    marketCap: rawVal(pr.marketCap),
    avgVolume: rawVal(pr.averageDailyVolume10Day) ?? rawVal(pr.averageDailyVolume3Month),
  };
  console.log('[metrics] sourceB (price module):', sourceB);

  // ── Source C: financialData module — revenue, margins, ROE, debt/equity ──
  // Independently updated from summaryDetail; covers financials not in keyStats.
  const sourceC = {
    totalRevenue:     rawVal(fd.totalRevenue),
    revenuePerShare:  rawVal(fd.revenuePerShare),
    operatingMargin:  rawVal(fd.operatingMargins),   // decimal: 0.312 = 31.2%
    profitMargin:     rawVal(fd.profitMargins),       // decimal: 0.253 = 25.3%
    returnOnEquity:   rawVal(fd.returnOnEquity),      // decimal: 1.604 = 160.4%
    debtToEquity:     rawVal(fd.debtToEquity),        // already a ratio, e.g. 180.0
    currentRatio:     rawVal(fd.currentRatio),
    quickRatio:       rawVal(fd.quickRatio),
  };
  console.log('[metrics] sourceC (financialData):', sourceC);

  // ── Merge: A wins; B fills gaps; C adds financial fields ─────────────────
  const merged = {
    // Valuation
    marketCap:         sourceA.marketCap         ?? sourceB.marketCap ?? null,
    peRatio:           sourceA.peRatio            ?? null,
    forwardPE:         sourceA.forwardPE          ?? null,
    eps:               sourceA.eps                ?? null,
    priceToBook:       sourceA.priceToBook        ?? null,
    // Volume / shares
    avgVolume:         sourceA.avgVolume          ?? sourceB.avgVolume ?? null,
    sharesOutstanding: sourceA.sharesOutstanding  ?? null,
    floatShares:       sourceA.floatShares        ?? null,
    // Risk / income
    beta:              sourceA.beta               ?? null,
    dividendYield:     sourceA.dividendYield      ?? null,
    // Financials (sourceC)
    totalRevenue:      sourceC.totalRevenue       ?? null,
    revenuePerShare:   sourceC.revenuePerShare    ?? null,
    operatingMargin:   sourceC.operatingMargin    ?? null,
    profitMargin:      sourceC.profitMargin       ?? null,
    returnOnEquity:    sourceC.returnOnEquity     ?? null,
    debtToEquity:      sourceC.debtToEquity       ?? null,
    currentRatio:      sourceC.currentRatio       ?? null,
    quickRatio:        sourceC.quickRatio         ?? null,
    // Company profile — plain strings in assetProfile (no raw wrapper)
    sector:      ap.sector              || null,
    industry:    ap.industry            || null,
    country:     ap.country             || null,
    description: ap.longBusinessSummary || null,
    // ETF / fund profile fields — fundProfile module
    fundCategory: fp.categoryName || null,
    fundFamily:   fp.family       || null,
  };

  console.log('[metrics] merged data:', {
    ...merged,
    description: merged.description ? `${merged.description.slice(0, 80)}…` : null,
  });

  return merged;
}

// ─────────────────────────────────────────────
// 4. INDEX DATA — market overview cards
// ─────────────────────────────────────────────

/**
 * Lightweight index/ETF data for market overview cards.
 * Returns price, change, changePercent, and a sparkline array
 * (5 daily closes → usable as a mini chart without extra calls).
 */
export async function getIndexData(symbol) {
  const url = yf(`v8/finance/chart/${encodeURIComponent(symbol)}`, {
    interval: '1d',
    range: '5d',
    includePrePost: false,
  });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) return null;

    const m       = result.meta;
    const closes  = result.indicators?.quote?.[0]?.close ?? [];
    const prevClose = m.chartPreviousClose ?? null;
    const price     = m.regularMarketPrice ?? null;
    const { change, changePercent } = calcChange(price, prevClose);

    return {
      symbol:        m.symbol,
      price,
      change,
      changePercent,
      // Filter out null/NaN candles (market closed days return nulls)
      sparkline: closes.filter(v => v != null && Number.isFinite(v)),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 5. REAL-TIME QUOTE — lightweight polling
// ─────────────────────────────────────────────

/**
 * Real-time quote for polling — maps to the `quote` shape expected by StockView.
 * Uses 1-minute interval for the most recent OHLCV tick.
 * Works for all exchange-suffixed symbols (NICE.TA, VOD.L, etc.).
 */
export async function getStockQuote(symbol) {
  const url = yf(`v8/finance/chart/${encodeURIComponent(symbol)}`, {
    interval: '1m',
    range: '1d',
    includePrePost: true,
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Quote failed (HTTP ${res.status})`);

  const json = await res.json();
  const m = json.chart?.result?.[0]?.meta;
  if (!m) throw new Error('No quote data from Yahoo Finance for: ' + symbol);

  const prevClose = m.chartPreviousClose ?? null;
  const price     = m.regularMarketPrice ?? null;
  const { change, changePercent } = calcChange(price, prevClose);

  return {
    current:                 price,
    change,
    percentChange:           changePercent,
    previousClose:           prevClose,
    high:                    m.regularMarketDayHigh ?? null,
    low:                     m.regularMarketDayLow  ?? null,
    open:                    m.regularMarketOpen    ?? null,
    volume:                  m.regularMarketVolume  ?? null,
    preMarketPrice:          m.preMarketPrice          ?? null,
    preMarketChange:         m.preMarketChange         ?? null,
    preMarketChangePercent:  m.preMarketChangePercent  ?? null,
    afterHoursPrice:         m.postMarketPrice         ?? null,
    afterHoursChange:        m.postMarketChange        ?? null,
    afterHoursChangePercent: m.postMarketChangePercent ?? null,
  };
}
