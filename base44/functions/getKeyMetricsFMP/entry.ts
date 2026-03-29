import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably for read-only market data
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    const { symbol } = await req.json();
    if (!symbol) {
      return Response.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('FMP_API_KEY');

    // Fetch all endpoints in parallel
    const [profileRes, keyMetricsRes, incomeRes, cashFlowRes, balanceRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/stable/key-metrics-ttm?symbol=${symbol}&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/stable/income-statement?symbol=${symbol}&period=ttm&limit=1&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/stable/cash-flow-statement?symbol=${symbol}&period=ttm&limit=1&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/stable/balance-sheet-statement?symbol=${symbol}&period=ttm&limit=1&apikey=${apiKey}`)
    ]);

    const [profileData, keyMetricsData, incomeData, cashFlowData, balanceData] = await Promise.all([
      profileRes.json(),
      keyMetricsRes.json(),
      incomeRes.json(),
      cashFlowRes.json(),
      balanceRes.json()
    ]);

    const profile = Array.isArray(profileData) ? profileData[0] : null;
    const km = Array.isArray(keyMetricsData) ? keyMetricsData[0] : null;
    const income = Array.isArray(incomeData) ? incomeData[0] : null;
    const cashFlow = Array.isArray(cashFlowData) ? cashFlowData[0] : null;
    const balance = Array.isArray(balanceData) ? balanceData[0] : null;

    // P/E: derived from earningsYieldTTM (1 / earningsYield = P/E)
    const earningsYield = km?.earningsYieldTTM;
    const peRatio = (earningsYield && Number.isFinite(Number(earningsYield)) && earningsYield !== 0)
      ? 1 / earningsYield
      : null;

    // Debt/Equity: totalDebt / totalStockholdersEquity from balance sheet
    const totalDebt = balance?.totalDebt ?? null;
    const equity = balance?.totalStockholdersEquity ?? null;
    const debtToEquity = (totalDebt !== null && equity !== null && Number(equity) !== 0)
      ? Number(totalDebt) / Number(equity)
      : null;

    const eps = income?.epsdiluted ?? income?.eps ?? null;

    // Derive shares outstanding from marketCap / price (most reliable cross-source method)
    const price = profile?.price ?? null;
    const marketCap = profile?.marketCap ?? null;
    const sharesOutstanding = (price && marketCap && Number(price) !== 0)
      ? Number(marketCap) / Number(price)
      : null;

    // Per-share: prefer TTM key-metrics fields, fall back to derived
    const revenue    = income?.revenue    ?? null;
    const netIncome  = income?.netIncome  ?? null;
    const freeCashFlow = cashFlow?.freeCashFlow ?? null;

    const revenuePerShare = (revenue !== null && sharesOutstanding !== null && sharesOutstanding > 0)
      ? Number(revenue) / sharesOutstanding
      : null;
    const netIncomePerShare = (netIncome !== null && sharesOutstanding !== null && sharesOutstanding > 0)
      ? Number(netIncome) / sharesOutstanding
      : eps ?? null;
    const freeCashFlowPerShare = (freeCashFlow !== null && sharesOutstanding !== null && sharesOutstanding > 0)
      ? Number(freeCashFlow) / sharesOutstanding
      : null;

    const result = {
      marketCap: profile?.marketCap ?? null,
      peRatio,
      eps,
      revenue,
      netIncome,
      freeCashFlow,
      debtToEquity,
      roe: km?.returnOnEquityTTM ?? null,
      revenuePerShare,
      netIncomePerShare,
      freeCashFlowPerShare,
    };

    return Response.json({ keyMetrics: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});