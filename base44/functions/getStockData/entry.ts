import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Simple in-memory cache (60 seconds TTL)
const cache = new Map();
const CACHE_TTL = 60000;

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

// Fetch from Financial Modeling Prep
const fetchFromFMP = async (symbol) => {
  const apiKey = Deno.env.get('FMP_API_KEY');
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    const profile = Array.isArray(data) ? data[0] : data;
    
    if (!profile || !profile.symbol) return null;

    return {
      symbol: profile.symbol,
      companyName: profile.companyName,
      logo: profile.image,
      price: profile.price,
      changePercent: profile.changes,
      marketCap: profile.mktCap,
      sector: profile.sector,
      industry: profile.industry,
      exchange: profile.exchangeShortName,
      description: profile.description,
      website: profile.website,
      ceo: profile.ceo,
      country: profile.country,
      currency: profile.currency,
      source: 'FMP'
    };
  } catch (error) {
    console.error('[FMP] Error:', error.message);
    return null;
  }
};

// Fetch from Finnhub
const fetchFromFinnhub = async (symbol) => {
  const apiKey = Deno.env.get('FINNHUB_API_KEY');
  if (!apiKey) return null;

  try {
    const [profileRes, quoteRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
    ]);

    const profile = profileRes.ok ? await profileRes.json() : null;
    const quote   = quoteRes.ok  ? await quoteRes.json()   : null;

    // Quote-only fallback: brand-new ETFs have price data but no profile yet
    const hasPrice = quote && (typeof quote.c === 'number' && quote.c > 0 || typeof quote.pc === 'number' && quote.pc > 0);

    if (!profile?.ticker && hasPrice) {
      console.log(`[Finnhub] Quote-only fallback for ${symbol}: c=${quote.c}, pc=${quote.pc}`);
      return {
        symbol,
        companyName: symbol,            // use symbol as name — will be overridden if Yahoo provides one
        logo: null,
        price: quote.c || quote.pc,
        previousClose: quote.pc || null,
        change: quote.d || null,
        changePercent: quote.dp || null,
        marketCap: null,
        sector: '',
        industry: 'Leveraged / Inverse ETF',
        exchange: 'US',
        description: '',
        website: null,
        country: 'US',
        source: 'Finnhub-QuoteOnly',
        isEtfFallback: true,
      };
    }

    if (!profile || !profile.ticker) return null;

    // Finnhub returns market cap in millions, convert to actual value
    const marketCapInMillions = profile.marketCapitalization;
    const actualMarketCap = marketCapInMillions ? marketCapInMillions * 1e6 : null;

    return {
      symbol: profile.ticker,
      companyName: profile.name,
      logo: profile.logo,
      price: quote.c,
      changePercent: quote.dp,
      marketCap: actualMarketCap,
      sector: '',
      industry: profile.finnhubIndustry,
      exchange: profile.exchange,
      description: '',
      website: profile.weburl,
      country: profile.country,
      source: 'Finnhub'
    };
  } catch (error) {
    console.error('[Finnhub] Error:', error.message);
    return null;
  }
};

// Fetch from Yahoo Finance via YH Finance RapidAPI
const fetchFromYahoo = async (symbol) => {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) {
    console.warn('[Yahoo] API key not configured');
    return null;
  }

  try {
    const headers = {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
    };

    const modules = 'price,summaryDetail,defaultKeyStatistics,financialData,calendarEvents,assetProfile';
    const url = `https://yh-finance.p.rapidapi.com/stock/v2/get-summary?symbol=${symbol}&region=US&modules=${modules}`;
    
    console.log('\n========================================================');
    console.log(`YAHOO FETCH FOR ${symbol}`);
    console.log('========================================================');
    console.log('Request URL:', url);
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('========================================================\n');
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.warn('[Yahoo] HTTP error:', response.status);
      return null;
    }

    const data = await response.json();
    
    console.log('\n========================================================');
    console.log('RAW YAHOO API RESPONSE');
    console.log('========================================================');
    console.log(JSON.stringify(data, null, 2));
    console.log('========================================================\n');

    if (!data || data.error) {
      console.warn('[Yahoo] API error:', data?.error);
      return null;
    }

    console.log('\n--- Response Root Keys ---');
    console.log('Top-level keys:', Object.keys(data));
    if (data.quoteSummary) {
      console.log('quoteSummary keys:', Object.keys(data.quoteSummary));
      if (data.quoteSummary.result) {
        console.log('quoteSummary.result is array:', Array.isArray(data.quoteSummary.result));
        console.log('quoteSummary.result length:', data.quoteSummary.result?.length);
      }
    }
    console.log('========================================================\n');

    // Extract from correct path: data.quoteSummary.result[0]
    const stock = data?.quoteSummary?.result?.[0];
    
    if (!stock) {
      console.warn('[Yahoo] No stock data in quoteSummary.result[0]');
      console.warn('[Yahoo] Available paths:', Object.keys(data));
      return null;
    }

    console.log('\n========================================================');
    console.log('RESOLVED STOCK ROOT OBJECT');
    console.log('========================================================');
    console.log('Stock root keys:', Object.keys(stock));
    console.log('Has price module:', !!stock.price);
    console.log('Has summaryDetail module:', !!stock.summaryDetail);
    console.log('Has defaultKeyStatistics module:', !!stock.defaultKeyStatistics);
    console.log('Has financialData module:', !!stock.financialData);
    console.log('Has calendarEvents module:', !!stock.calendarEvents);
    console.log('Has assetProfile module:', !!stock.assetProfile);
    console.log('\nFull stock object:');
    console.log(JSON.stringify(stock, null, 2));
    console.log('========================================================\n');

    const price = stock.price || {};
    const summaryDetail = stock.summaryDetail || {};
    const financialData = stock.financialData || {};
    const keyStats = stock.defaultKeyStatistics || {};
    const calendarEvents = stock.calendarEvents || {};
    const assetProfile = stock.assetProfile || {};

    const getRaw = (obj, key) => {
      if (!obj || !key) return null;
      const value = obj[key];
      if (value && typeof value === 'object' && 'raw' in value) {
        return value.raw;
      }
      return value;
    };

    // Earnings date extraction
    let earningsDate = null;
    if (calendarEvents?.earnings?.earningsDate) {
      const earningsArray = calendarEvents.earnings.earningsDate;
      if (Array.isArray(earningsArray) && earningsArray.length > 0) {
        const firstDate = earningsArray[0];
        const timestamp = (firstDate && typeof firstDate === 'object' && 'raw' in firstDate) 
          ? firstDate.raw 
          : firstDate;
        if (timestamp) {
          earningsDate = new Date(timestamp * 1000).toISOString().split('T')[0];
        }
      }
    }

    // LAYER 1: Extracted Yahoo Object - with detailed field-by-field logging
    console.log('\n========================================================');
    console.log('FIELD-BY-FIELD EXTRACTION');
    console.log('========================================================');
    
    console.log('\n--- Price Module Fields ---');
    console.log('price object exists:', !!price);
    console.log('price.regularMarketPrice:', price.regularMarketPrice);
    console.log('price.regularMarketPreviousClose:', price.regularMarketPreviousClose);
    console.log('price.regularMarketChange:', price.regularMarketChange);
    console.log('price.regularMarketChangePercent:', price.regularMarketChangePercent);
    console.log('price.marketCap:', price.marketCap);
    
    console.log('\n--- SummaryDetail Module Fields ---');
    console.log('summaryDetail object exists:', !!summaryDetail);
    console.log('summaryDetail.volume:', summaryDetail.volume);
    console.log('summaryDetail.averageVolume:', summaryDetail.averageVolume);
    console.log('summaryDetail.fiftyTwoWeekHigh:', summaryDetail.fiftyTwoWeekHigh);
    console.log('summaryDetail.fiftyTwoWeekLow:', summaryDetail.fiftyTwoWeekLow);
    console.log('summaryDetail.beta:', summaryDetail.beta);
    
    console.log('\n--- DefaultKeyStatistics Module Fields ---');
    console.log('keyStats object exists:', !!keyStats);
    console.log('keyStats.trailingEps:', keyStats.trailingEps);
    console.log('keyStats.forwardEps:', keyStats.forwardEps);
    console.log('keyStats.beta:', keyStats.beta);
    
    console.log('\n--- FinancialData Module Fields ---');
    console.log('financialData object exists:', !!financialData);
    console.log('financialData.targetMeanPrice:', financialData.targetMeanPrice);
    console.log('financialData.recommendationKey:', financialData.recommendationKey);
    console.log('========================================================\n');

    const extractedYahoo = {
      price: getRaw(price, 'regularMarketPrice'),
      previousClose: getRaw(price, 'regularMarketPreviousClose'),
      change: getRaw(price, 'regularMarketChange'),
      changePercent: getRaw(price, 'regularMarketChangePercent'),
      marketStatus: price.marketState,
      preMarketPrice: getRaw(price, 'preMarketPrice'),
      preMarketChange: getRaw(price, 'preMarketChange'),
      preMarketChangePercent: getRaw(price, 'preMarketChangePercent'),
      afterHoursPrice: getRaw(price, 'postMarketPrice'),
      afterHoursChange: getRaw(price, 'postMarketChange'),
      afterHoursChangePercent: getRaw(price, 'postMarketChangePercent'),
      marketCap: getRaw(price, 'marketCap'),
      exchange: price.exchangeName,
      companyName: price.shortName,
      symbol: price.symbol,
      volume: getRaw(summaryDetail, 'volume'),
      avgVolume: getRaw(summaryDetail, 'averageVolume'),
      fiftyTwoWeekHigh: getRaw(summaryDetail, 'fiftyTwoWeekHigh'),
      fiftyTwoWeekLow: getRaw(summaryDetail, 'fiftyTwoWeekLow'),
      beta: getRaw(summaryDetail, 'beta') || getRaw(keyStats, 'beta'),
      eps: getRaw(keyStats, 'trailingEps'),
      forwardEps: getRaw(keyStats, 'forwardEps'),
      peRatio: getRaw(keyStats, 'trailingPE'),
      forwardPeRatio: getRaw(keyStats, 'forwardPE'),
      targetPrice: getRaw(financialData, 'targetMeanPrice'),
      revenueGrowth: getRaw(financialData, 'revenueGrowth'),
      profitMargin: getRaw(financialData, 'profitMargins'),
      roe: getRaw(financialData, 'returnOnEquity'),
      recommendation: financialData.recommendationKey,
      earningsDate: earningsDate,
      sector: assetProfile.sector,
      industry: assetProfile.industry,
      description: assetProfile.longBusinessSummary,
      website: assetProfile.website
    };

    console.log('\n========================================================');
    console.log('EXTRACTED YAHOO OBJECT');
    console.log('========================================================');
    console.log(JSON.stringify(extractedYahoo, null, 2));
    console.log('========================================================\n');
    
    console.log('\n========================================================');
    console.log('VALIDATION CHECK FOR AAPL');
    console.log('========================================================');
    console.log('✓ Has previousClose?', extractedYahoo.previousClose !== null && extractedYahoo.previousClose !== undefined);
    console.log('✓ Has volume?', extractedYahoo.volume !== null && extractedYahoo.volume !== undefined);
    console.log('✓ Has avgVolume?', extractedYahoo.avgVolume !== null && extractedYahoo.avgVolume !== undefined);
    console.log('✓ Has fiftyTwoWeekHigh?', extractedYahoo.fiftyTwoWeekHigh !== null && extractedYahoo.fiftyTwoWeekHigh !== undefined);
    console.log('✓ Has fiftyTwoWeekLow?', extractedYahoo.fiftyTwoWeekLow !== null && extractedYahoo.fiftyTwoWeekLow !== undefined);
    console.log('✓ Has beta?', extractedYahoo.beta !== null && extractedYahoo.beta !== undefined);
    console.log('✓ Has eps or forwardEps?', (extractedYahoo.eps !== null && extractedYahoo.eps !== undefined) || (extractedYahoo.forwardEps !== null && extractedYahoo.forwardEps !== undefined));
    console.log('✓ Has targetPrice?', extractedYahoo.targetPrice !== null && extractedYahoo.targetPrice !== undefined);
    console.log('========================================================\n');

    // Return Yahoo data with stock object for manual merging
    return { stock, source: 'Yahoo' };
  } catch (error) {
    console.error('[Yahoo] Error:', error.message);
    return null;
  }
};

// Fetch from Alpha Vantage
const fetchFromAlphaVantage = async (symbol) => {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
  if (!apiKey) return null;

  try {
    const [overviewRes, quoteRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`),
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`)
    ]);

    const overview = await overviewRes.json();
    const quoteData = await quoteRes.json();
    const quote = quoteData['Global Quote'];

    if (!overview.Symbol && !quote) return null;

    return {
      symbol: overview.Symbol || symbol,
      companyName: overview.Name,
      price: parseFloat(quote?.['05. price']),
      changePercent: parseFloat(quote?.['10. change percent']?.replace('%', '')),
      marketCap: parseInt(overview.MarketCapitalization),
      sector: overview.Sector,
      industry: overview.Industry,
      exchange: overview.Exchange,
      description: overview.Description,
      source: 'AlphaVantage'
    };
  } catch (error) {
    console.error('[AlphaVantage] Error:', error.message);
    return null;
  }
};

// Get logo with fallback
const getLogoWithFallback = async (symbol, website) => {
  // Try FMP logo
  const fmpLogo = `https://financialmodelingprep.com/image-stock/${symbol}.png`;
  try {
    const response = await fetch(fmpLogo, { method: 'HEAD' });
    if (response.ok) return fmpLogo;
  } catch (e) {}

  // Try Clearbit logo
  if (website) {
    try {
      const domain = new URL(website).hostname;
      const clearbitLogo = `https://logo.clearbit.com/${domain}`;
      const response = await fetch(clearbitLogo, { method: 'HEAD' });
      if (response.ok) return clearbitLogo;
    } catch (e) {}
  }

  return null;
};

// Manual field-by-field mapping from Yahoo with Finnhub fallback
const mergeStockData = async (yahooData, finnhubData) => {
  const finalStock = {
    symbol: null,
    companyName: null,
    logo: null,
    price: null,
    previousClose: null,
    change: null,
    changePercent: null,
    marketStatus: null,
    preMarketPrice: null,
    preMarketChange: null,
    preMarketChangePercent: null,
    afterHoursPrice: null,
    afterHoursChange: null,
    afterHoursChangePercent: null,
    marketCap: null,
    volume: null,
    avgVolume: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    beta: null,
    eps: null,
    forwardEps: null,
    peRatio: null,
    forwardPeRatio: null,
    earningsDate: null,
    targetPrice: null,
    recommendation: null,
    revenueGrowth: null,
    profitMargin: null,
    roe: null,
    volatility: null,
    sector: null,
    industry: null,
    exchange: null,
    description: null,
    website: null,
    ceo: null,
    country: null,
    currency: null,
    sources: [],
    fieldSources: {}
  };

  // Start with Finnhub as base (fallback)
  if (finnhubData) {
    finalStock.sources.push('Finnhub');
    finalStock.symbol = finnhubData.symbol;
    finalStock.companyName = finnhubData.companyName;
    finalStock.logo = finnhubData.logo;
    finalStock.price = finnhubData.price;
    finalStock.changePercent = finnhubData.changePercent;
    finalStock.marketCap = finnhubData.marketCap;
    finalStock.industry = finnhubData.industry;
    finalStock.exchange = finnhubData.exchange;
    finalStock.website = finnhubData.website;
    finalStock.country = finnhubData.country;
    finalStock.currency = finnhubData.currency || null;
    
    Object.keys(finalStock).forEach(key => {
      if (finalStock[key] != null && key !== 'sources' && key !== 'fieldSources') {
        finalStock.fieldSources[key] = 'Finnhub';
      }
    });
  }

  // Override with Yahoo data (manual field-by-field)
  if (yahooData && yahooData.stock) {
    finalStock.sources.push('Yahoo');
    const stock = yahooData.stock;

    // Price fields
    if (stock.price?.regularMarketPrice?.raw != null) {
      finalStock.price = stock.price.regularMarketPrice.raw;
      finalStock.fieldSources.price = 'Yahoo';
    }
    if (stock.price?.regularMarketPreviousClose?.raw != null) {
      finalStock.previousClose = stock.price.regularMarketPreviousClose.raw;
      finalStock.fieldSources.previousClose = 'Yahoo';
    }
    if (stock.price?.regularMarketChange?.raw != null) {
      finalStock.change = stock.price.regularMarketChange.raw;
      finalStock.fieldSources.change = 'Yahoo';
    }
    if (stock.price?.regularMarketChangePercent?.raw != null) {
      finalStock.changePercent = stock.price.regularMarketChangePercent.raw;
      finalStock.fieldSources.changePercent = 'Yahoo';
    }
    if (stock.price?.marketState != null) {
      finalStock.marketStatus = stock.price.marketState;
      finalStock.fieldSources.marketStatus = 'Yahoo';
    }

    // Pre-market
    if (stock.price?.preMarketPrice?.raw != null) {
      finalStock.preMarketPrice = stock.price.preMarketPrice.raw;
      finalStock.fieldSources.preMarketPrice = 'Yahoo';
    }
    if (stock.price?.preMarketChange?.raw != null) {
      finalStock.preMarketChange = stock.price.preMarketChange.raw;
      finalStock.fieldSources.preMarketChange = 'Yahoo';
    }
    if (stock.price?.preMarketChangePercent?.raw != null) {
      finalStock.preMarketChangePercent = stock.price.preMarketChangePercent.raw;
      finalStock.fieldSources.preMarketChangePercent = 'Yahoo';
    }

    // After-hours
    if (stock.price?.postMarketPrice?.raw != null) {
      finalStock.afterHoursPrice = stock.price.postMarketPrice.raw;
      finalStock.fieldSources.afterHoursPrice = 'Yahoo';
    }
    if (stock.price?.postMarketChange?.raw != null) {
      finalStock.afterHoursChange = stock.price.postMarketChange.raw;
      finalStock.fieldSources.afterHoursChange = 'Yahoo';
    }
    if (stock.price?.postMarketChangePercent?.raw != null) {
      finalStock.afterHoursChangePercent = stock.price.postMarketChangePercent.raw;
      finalStock.fieldSources.afterHoursChangePercent = 'Yahoo';
    }

    // Market cap
    if (stock.price?.marketCap?.raw != null) {
      finalStock.marketCap = stock.price.marketCap.raw;
      finalStock.fieldSources.marketCap = 'Yahoo';
    }

    // Company info
    if (stock.price?.symbol != null) {
      finalStock.symbol = stock.price.symbol;
      finalStock.fieldSources.symbol = 'Yahoo';
    }
    if (stock.price?.shortName != null) {
      finalStock.companyName = stock.price.shortName;
      finalStock.fieldSources.companyName = 'Yahoo';
    }
    if (stock.price?.exchangeName != null) {
      finalStock.exchange = stock.price.exchangeName;
      finalStock.fieldSources.exchange = 'Yahoo';
    }

    // Volume
    if (stock.summaryDetail?.volume?.raw != null) {
      finalStock.volume = stock.summaryDetail.volume.raw;
      finalStock.fieldSources.volume = 'Yahoo';
    }
    if (stock.summaryDetail?.averageVolume?.raw != null) {
      finalStock.avgVolume = stock.summaryDetail.averageVolume.raw;
      finalStock.fieldSources.avgVolume = 'Yahoo';
    }

    // 52-week range
    if (stock.summaryDetail?.fiftyTwoWeekHigh?.raw != null) {
      finalStock.fiftyTwoWeekHigh = stock.summaryDetail.fiftyTwoWeekHigh.raw;
      finalStock.fieldSources.fiftyTwoWeekHigh = 'Yahoo';
    }
    if (stock.summaryDetail?.fiftyTwoWeekLow?.raw != null) {
      finalStock.fiftyTwoWeekLow = stock.summaryDetail.fiftyTwoWeekLow.raw;
      finalStock.fieldSources.fiftyTwoWeekLow = 'Yahoo';
    }

    // Beta
    if (stock.summaryDetail?.beta?.raw != null) {
      finalStock.beta = stock.summaryDetail.beta.raw;
      finalStock.fieldSources.beta = 'Yahoo';
    }

    // EPS
    if (stock.defaultKeyStatistics?.trailingEps?.raw != null) {
      finalStock.eps = stock.defaultKeyStatistics.trailingEps.raw;
      finalStock.fieldSources.eps = 'Yahoo';
    }
    if (stock.defaultKeyStatistics?.forwardEps?.raw != null) {
      finalStock.forwardEps = stock.defaultKeyStatistics.forwardEps.raw;
      finalStock.fieldSources.forwardEps = 'Yahoo';
    }

    // PE ratios
    if (stock.defaultKeyStatistics?.trailingPE?.raw != null) {
      finalStock.peRatio = stock.defaultKeyStatistics.trailingPE.raw;
      finalStock.fieldSources.peRatio = 'Yahoo';
    }
    if (stock.defaultKeyStatistics?.forwardPE?.raw != null) {
      finalStock.forwardPeRatio = stock.defaultKeyStatistics.forwardPE.raw;
      finalStock.fieldSources.forwardPeRatio = 'Yahoo';
    }

    // Financial data
    if (stock.financialData?.targetMeanPrice?.raw != null) {
      finalStock.targetPrice = stock.financialData.targetMeanPrice.raw;
      finalStock.fieldSources.targetPrice = 'Yahoo';
    }
    if (stock.financialData?.revenueGrowth?.raw != null) {
      finalStock.revenueGrowth = stock.financialData.revenueGrowth.raw;
      finalStock.fieldSources.revenueGrowth = 'Yahoo';
    }
    if (stock.financialData?.profitMargins?.raw != null) {
      finalStock.profitMargin = stock.financialData.profitMargins.raw;
      finalStock.fieldSources.profitMargin = 'Yahoo';
    }
    if (stock.financialData?.returnOnEquity?.raw != null) {
      finalStock.roe = stock.financialData.returnOnEquity.raw;
      finalStock.fieldSources.roe = 'Yahoo';
    }
    if (stock.financialData?.recommendationKey != null) {
      finalStock.recommendation = stock.financialData.recommendationKey;
      finalStock.fieldSources.recommendation = 'Yahoo';
    }

    // Earnings date
    if (stock.calendarEvents?.earnings?.earningsDate?.[0]?.raw != null) {
      const timestamp = stock.calendarEvents.earnings.earningsDate[0].raw;
      finalStock.earningsDate = new Date(timestamp * 1000).toISOString().split('T')[0];
      finalStock.fieldSources.earningsDate = 'Yahoo';
    }

    // Company profile
    if (stock.assetProfile?.sector != null) {
      finalStock.sector = stock.assetProfile.sector;
      finalStock.fieldSources.sector = 'Yahoo';
    }
    if (stock.assetProfile?.industry != null) {
      finalStock.industry = stock.assetProfile.industry;
      finalStock.fieldSources.industry = 'Yahoo';
    }
    if (stock.assetProfile?.longBusinessSummary != null) {
      finalStock.description = stock.assetProfile.longBusinessSummary;
      finalStock.fieldSources.description = 'Yahoo';
    }
    if (stock.assetProfile?.website != null) {
      finalStock.website = stock.assetProfile.website;
      finalStock.fieldSources.website = 'Yahoo';
    }
    if (stock.assetProfile?.companyOfficers?.[0]?.name != null) {
      finalStock.ceo = stock.assetProfile.companyOfficers[0].name;
      finalStock.fieldSources.ceo = 'Yahoo';
    }
    if (stock.assetProfile?.country != null) {
      finalStock.country = stock.assetProfile.country;
      finalStock.fieldSources.country = 'Yahoo';
    }

    // Currency from price module
    if (stock.price?.currency != null) {
      finalStock.currency = stock.price.currency;
      finalStock.fieldSources.currency = 'Yahoo';
    }

    // Volatility
    if (finalStock.changePercent != null) {
      finalStock.volatility = Math.abs(finalStock.changePercent);
      finalStock.fieldSources.volatility = finalStock.fieldSources.changePercent;
    }
  }

  // Get logo with fallback
  if (!finalStock.logo) {
    finalStock.logo = await getLogoWithFallback(finalStock.symbol, finalStock.website);
  }

  // Set default values for sector/industry if still missing
  if (!finalStock.sector) finalStock.sector = 'Unknown Sector';
  if (!finalStock.industry) finalStock.industry = 'Unknown Industry';

  console.log('\n=================================================');
  console.log('FIELD SOURCES TRACKING');
  console.log('=================================================');
  console.log(JSON.stringify(finalStock.fieldSources, null, 2));
  console.log('=================================================\n');

  return finalStock;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably for read-only market data
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    let { symbol } = await req.json();
    const originalSymbol = symbol;
    symbol = normalizeSymbol(symbol);

    // Check cache
    const cacheKey = `stock_${symbol}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    // Fetch from Yahoo (primary) and Finnhub (fallback)
    const [yahooData, finnhubData] = await Promise.all([
      fetchFromYahoo(symbol),
      fetchFromFinnhub(symbol)
    ]);

    // Manual merge with Yahoo priority
    const mergedData = await mergeStockData(yahooData, finnhubData);

    // Validate we have minimum required data
    // For ETFs, symbol alone is enough — companyName can fall back to symbol
    if (!mergedData.symbol) {
      console.error('[Multi-Source] Insufficient data after all providers');
      return Response.json({ 
        error: 'Symbol not found',
        partial: true 
      }, { status: 404 });
    }
    // Ensure companyName always has a value
    if (!mergedData.companyName) {
      mergedData.companyName = mergedData.symbol;
    }

    // Cache the result
    setCachedData(cacheKey, mergedData);

    console.log('[Multi-Source] Success. Sources used:', mergedData.sources);

    return Response.json(mergedData);
  } catch (error) {
    console.error('[Multi-Source] Error:', error.message);
    return Response.json({ 
      error: 'Some data is temporarily unavailable',
      partial: true 
    }, { status: 500 });
  }
});