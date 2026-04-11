/**
 * Gako AI client — browser-side helper.
 *
 * Both analyzeStock and wyckoffAnalysis use supabase.functions.invoke() so that
 * the Supabase SDK attaches apikey + Authorization automatically.
 *
 * The Gemini API key is NEVER exposed to the browser — it lives in Supabase secrets.
 */

import { supabase } from '../lib/supabase';

/**
 * analyzeStock({ symbol, companyName, earningsDate?, marketData? })
 *
 * Returns a GakoAnalysis object on success:
 *   { summary, rating, riskLevel, marketExpectations, keyPoints }
 *
 * On failure, returns the fallback object (with _fallback: true) if the server
 * provided one, otherwise throws.
 *
 * @param {object} params
 * @param {string} params.symbol       - Ticker symbol, e.g. "AAPL"
 * @param {string} params.companyName  - Full company name, e.g. "Apple Inc."
 * @param {string} [params.earningsDate] - ISO date string, e.g. "2025-01-30"
 * @param {object} [params.marketData]   - Any relevant market data (price, volume, etc.)
 * @returns {Promise<object>}
 */
export async function analyzeStock({ symbol, companyName, earningsDate, marketData } = {}) {
  if (!symbol)      throw new Error('[gakoApi] analyzeStock: symbol is required');
  if (!companyName) throw new Error('[gakoApi] analyzeStock: companyName is required');

  let data, invokeError;
  try {
    ({ data, error: invokeError } = await supabase.functions.invoke('gako-analyze', {
      body: { symbol, companyName, earningsDate, marketData },
    }));
  } catch (networkErr) {
    console.error('[gakoApi] network error:', networkErr.message);
    throw networkErr;
  }

  if (invokeError) {
    const errMsg = invokeError.message ?? 'Edge function error';
    console.error('[gakoApi] analyzeStock invoke error:', errMsg);
    throw new Error(errMsg);
  }

  if (!data?.success) {
    const errMsg = data?.error || 'gako-analyze returned no result';
    console.error('[gakoApi] analyzeStock failed:', errMsg);

    // Return server-provided fallback so callers can still render something
    if (data?.fallback) {
      console.warn('[gakoApi] using fallback analysis');
      return { ...data.fallback, _fallback: true };
    }

    throw new Error(errMsg);
  }

  return data.analysis;
}

/**
 * wyckoffAnalysis({ symbol, companyName, priceData, accessToken })
 *
 * Sends OHLCV data to the gako-wyckoff edge function and returns structured
 * Wyckoff analysis including phase, bias, invalidation, and drawing annotations.
 *
 * @param {object} params
 * @param {string}   params.symbol       - Ticker symbol, e.g. "AAPL"
 * @param {string}   params.companyName  - Full company name
 * @param {Array}    params.priceData    - Array of { date, open, high, low, close, volume }
 * @param {string}   params.accessToken  - Supabase session access_token (required by edge function)
 * @returns {Promise<{ summary, analysis, drawings }>}
 */
export async function wyckoffAnalysis({ symbol, companyName, priceData, accessToken } = {}) {
  if (!symbol)      throw new Error('[gakoApi] wyckoffAnalysis: symbol is required');
  if (!priceData)   throw new Error('[gakoApi] wyckoffAnalysis: priceData is required');
  if (!accessToken) throw new Error('[gakoApi] wyckoffAnalysis: accessToken is required — call supabase.auth.refreshSession() first');

  // Log project URL so we can confirm client and function are on the same project
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '(not set)';
  console.log('[gakoApi] supabase project URL:', supabaseUrl);
  console.log('[gakoApi] function being called: gako-wyckoff on project:', supabaseUrl);

  // Decode token claims to verify issuer matches this project
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    console.log('[gakoApi] token iss:', payload.iss, '| aud:', payload.aud, '| exp:', new Date((payload.exp ?? 0) * 1000).toISOString());
  } catch { /* non-fatal */ }

  console.log(
    `[gakoApi] wyckoffAnalysis → supabase.functions.invoke(gako-wyckoff)` +
    ` | symbol: ${symbol}` +
    ` | candles: ${priceData.length}` +
    ` | token preview: ${accessToken.slice(0, 20)}…`
  );

  // supabase.functions is a getter — each access returns a new FunctionsClient.
  // Capture ONE instance and call setAuth() on it so the Authorization header is
  // set via the SDK's own mechanism before invoke() reads this.headers.
  // This avoids passing headers directly to invoke() while still correctly wiring
  // the Bearer token through the FunctionsClient's setAuth() API.
  const fns = supabase.functions;
  fns.setAuth(accessToken);
  console.log('[gakoApi] setAuth() called on FunctionsClient — token preview:', accessToken.slice(0, 20) + '…');
  let data, invokeError;
  try {
    ({ data, error: invokeError } = await fns.invoke('gako-wyckoff', {
      body: { symbol, companyName, priceData },
    }));
  } catch (networkErr) {
    console.error('[gakoApi] wyckoffAnalysis network error:', networkErr.message);
    throw networkErr;
  }

  if (invokeError) {
    const errMsg = invokeError.message ?? 'Edge function error';
    console.error('[gakoApi] wyckoffAnalysis invoke error:', errMsg);
    throw new Error(errMsg);
  }

  if (!data?.success) {
    const errMsg = data?.error || 'Wyckoff analysis returned no result';
    console.error('[gakoApi] wyckoffAnalysis failed:', errMsg);
    throw new Error(errMsg);
  }

  return data.analysis;
}
