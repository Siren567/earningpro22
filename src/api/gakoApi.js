/**
 * Gako AI client — browser-side helper.
 *
 * analyzeStock calls /api/gako/analyze proxied via vite.config.js.
 * wyckoffAnalysis uses supabase.functions.invoke() directly so that
 * the Supabase SDK can attach both apikey + Authorization automatically.
 *
 * The Gemini API key is NEVER exposed to the browser — it lives in Supabase secrets.
 */

import { supabase } from '../lib/supabase';

const ANALYZE_URL   = '/api/gako/analyze';

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

  let res, data;
  try {
    res = await fetch(ANALYZE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ symbol, companyName, earningsDate, marketData }),
      signal:  AbortSignal.timeout(30_000), // AI calls can take a few seconds
    });
    data = await res.json();
  } catch (networkErr) {
    console.error('[gakoApi] network error:', networkErr.message);
    throw networkErr;
  }

  if (!res.ok || !data.success) {
    const errMsg = data?.error || `HTTP ${res.status}`;
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

  // supabase.functions is a getter that returns a brand-new FunctionsClient on each
  // access (see SupabaseClient.ts). That client is built with only the static anon-key
  // headers — it has NO automatic session/JWT injection and no setAuth() wiring.
  // invoke() merges: { Content-Type } + { apikey, X-Client-Info } + caller headers.
  // The Authorization header will NEVER appear unless we pass it explicitly here.
  console.log('[gakoApi] attaching Authorization header to invoke — token preview:', accessToken.slice(0, 20) + '…');
  let data, invokeError;
  try {
    ({ data, error: invokeError } = await supabase.functions.invoke('gako-wyckoff', {
      body: { symbol, companyName, priceData },
      headers: { Authorization: `Bearer ${accessToken}` },
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
