import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "npm:@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyzeRequest {
  symbol:       string;
  companyName:  string;
  earningsDate?: string;
  marketData?:  Record<string, unknown>;
}

interface GakoAnalysis {
  summary:            string;
  rating:             "Bullish" | "Neutral" | "Bearish";
  riskLevel:          "Low" | "Medium" | "High";
  marketExpectations: string;
  keyPoints:          string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(req: AnalyzeRequest): string {
  const marketDataStr = req.marketData
    ? JSON.stringify(req.marketData, null, 2)
    : "Not provided";

  const earningsStr = req.earningsDate
    ? `Upcoming earnings date: ${req.earningsDate}`
    : "No upcoming earnings date provided";

  return `You are Gako, an institutional-grade stock analysis AI.

Analyze the following stock and return ONLY a valid JSON object with no markdown, no code fences, and no additional text.

── Stock ──────────────────────────────────────
Symbol:  ${req.symbol.toUpperCase()}
Company: ${req.companyName}
${earningsStr}

── Market Data ────────────────────────────────
${marketDataStr}

── Required JSON Output ───────────────────────
{
  "summary":            "2-3 sentence analysis of the stock's current market position and momentum",
  "rating":             "Bullish | Neutral | Bearish",
  "riskLevel":          "Low | Medium | High",
  "marketExpectations": "What the market is pricing in for this stock, including any catalyst or earnings expectations",
  "keyPoints":          ["Concise point 1", "Concise point 2", "Concise point 3"]
}

Rules:
- rating must be exactly one of: Bullish, Neutral, Bearish
- riskLevel must be exactly one of: Low, Medium, High
- keyPoints must be an array of 3 to 5 strings
- Return ONLY the JSON object — no markdown, no backticks, no explanation`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validate(raw: unknown): GakoAnalysis {
  if (!raw || typeof raw !== "object") {
    throw new Error("Gemini response is not a JSON object");
  }

  const d = raw as Record<string, unknown>;

  if (typeof d.summary !== "string" || !d.summary.trim()) {
    throw new Error("Field 'summary' is missing or empty");
  }
  if (!["Bullish", "Neutral", "Bearish"].includes(d.rating as string)) {
    throw new Error(`Field 'rating' must be Bullish/Neutral/Bearish, got: ${d.rating}`);
  }
  if (!["Low", "Medium", "High"].includes(d.riskLevel as string)) {
    throw new Error(`Field 'riskLevel' must be Low/Medium/High, got: ${d.riskLevel}`);
  }
  if (typeof d.marketExpectations !== "string" || !d.marketExpectations.trim()) {
    throw new Error("Field 'marketExpectations' is missing or empty");
  }
  if (!Array.isArray(d.keyPoints) || d.keyPoints.length === 0) {
    throw new Error("Field 'keyPoints' must be a non-empty array");
  }

  return {
    summary:            d.summary.trim(),
    rating:             d.rating as "Bullish" | "Neutral" | "Bearish",
    riskLevel:          d.riskLevel as "Low" | "Medium" | "High",
    marketExpectations: d.marketExpectations.trim(),
    keyPoints:          (d.keyPoints as unknown[]).map(p => String(p)).slice(0, 5),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI SERVICE
// ─────────────────────────────────────────────────────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<GakoAnalysis> {
  const ai = new GoogleGenAI({ apiKey });

  console.log("[gemini] calling gemini-2.5-flash, prompt length:", prompt.length);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature:      0.4,
      maxOutputTokens:  1024,
    },
  });

  const rawText = response.text;
  console.log("[gemini] response length:", rawText?.length ?? 0);

  if (!rawText || rawText.trim() === "") {
    throw new Error("Gemini returned an empty response");
  }

  // Parse JSON — responseMimeType: application/json should guarantee valid JSON,
  // but we parse defensively in case of edge cases.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    console.error("[gemini] JSON parse failed. Raw text (first 300 chars):", rawText.slice(0, 300));
    throw new Error(`Gemini response is not valid JSON: ${(e as Error).message}`);
  }

  return validate(parsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return respond({ success: false, error: "Method not allowed" }, 405);
  }

  const t0 = Date.now();

  try {
    // ── 1. Parse body ─────────────────────────────────────────────────────────
    let body: AnalyzeRequest;
    try {
      body = await req.json() as AnalyzeRequest;
    } catch {
      return respond({ success: false, error: "Request body must be valid JSON" }, 400);
    }

    const { symbol, companyName, earningsDate, marketData } = body;

    if (!symbol || typeof symbol !== "string") {
      return respond({ success: false, error: "'symbol' is required" }, 400);
    }
    if (!companyName || typeof companyName !== "string") {
      return respond({ success: false, error: "'companyName' is required" }, 400);
    }

    console.log(`[gako-analyze] request: ${symbol} (${companyName})`);

    // ── 2. Get API key ────────────────────────────────────────────────────────
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[gako-analyze] GEMINI_API_KEY secret is not configured");
      return respond({
        success: false,
        error:   "Gako is not configured. GEMINI_API_KEY secret is missing.",
      }, 500);
    }

    // ── 3. Build prompt and call Gemini ───────────────────────────────────────
    const prompt   = buildPrompt({ symbol, companyName, earningsDate, marketData });
    const analysis = await callGemini(prompt, apiKey);

    const duration_ms = Date.now() - t0;
    console.log(`[gako-analyze] success for ${symbol} in ${duration_ms}ms`);

    return respond({
      success:    true,
      symbol:     symbol.toUpperCase(),
      analysis,
      duration_ms,
    });

  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[gako-analyze] error:", msg);

    return respond({
      success:  false,
      error:    msg,
      fallback: {
        summary:            "Analysis is temporarily unavailable. Please try again in a moment.",
        rating:             "Neutral",
        riskLevel:          "Medium",
        marketExpectations: "Unable to assess market expectations at this time.",
        keyPoints:          ["Service error — analysis could not be completed."],
      },
      duration_ms: Date.now() - t0,
    }, 500);
  }
});
