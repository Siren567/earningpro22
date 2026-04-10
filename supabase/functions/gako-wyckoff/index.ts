import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEBUG_MARKER = "wyckoff-fix-live";

// ─── Auth ─────────────────────────────────────────────────────────────────────
type AuthUser = { userId: string; email: string; role: string };
type AuthFail = { code: string; details: string };
type AuthResult = { user: AuthUser; fail: null } | { user: null; fail: AuthFail };

async function requireAdmin(req: Request): Promise<AuthResult> {
  const rawAuth = req.headers.get("authorization") ?? "";
  console.log("[auth] header present:", !!rawAuth, "| length:", rawAuth.length);

  if (!rawAuth) {
    console.log("[auth] RETURN 401 - Authorization header absent");
    return {
      user: null,
      fail: {
        code: "missing_authorization_header",
        details: "Authorization header absent",
      },
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  console.log("[auth] SUPABASE_URL set:", !!supabaseUrl, "| ANON_KEY set:", !!anonKey);

  if (!supabaseUrl || !anonKey) {
    return {
      user: null,
      fail: {
        code: "missing_supabase_env",
        details: "SUPABASE_URL or SUPABASE_ANON_KEY is missing",
      },
    };
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: rawAuth,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("[auth] getUser error:", error?.message ?? "none", "| hasUser:", !!user, "| userId:", user?.id ?? "null");

    if (error || !user) {
      return {
        user: null,
        fail: {
          code: "invalid_user",
          details: error?.message ?? "No user",
        },
      };
    }

    console.log("[auth] PASS - userId:", user.id);

    return {
      user: {
        userId: user.id,
        email: user.email ?? "",
        role: "authenticated",
      },
      fail: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.log("[auth] getUser threw:", message);
    return {
      user: null,
      fail: {
        code: "auth_exception",
        details: message,
      },
    };
  }
}

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify({ ...(body as object), debug_marker: DEBUG_MARKER }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// ─── Types ────────────────────────────────────────────────────────────────────
interface PriceCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface WyckoffRequest {
  symbol: string;
  companyName: string;
  priceData: PriceCandle[];
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(req: WyckoffRequest): string {
  const candles = req.priceData.slice(-60);
  const high = Math.max(...candles.map((d) => d.high)).toFixed(2);
  const low = Math.min(...candles.map((d) => d.low)).toFixed(2);
  const current = candles[candles.length - 1]?.close?.toFixed(2) ?? "?";
  const startDate = candles[0]?.date ?? "";
  const endDate = candles[candles.length - 1]?.date ?? "";

  const rows = candles
    .map(
      (d) =>
        `${d.date} O:${d.open?.toFixed(2)} H:${d.high?.toFixed(2)} ` +
        `L:${d.low?.toFixed(2)} C:${d.close?.toFixed(2)} ` +
        `V:${Math.round((d.volume ?? 0) / 1000)}K`
    )
    .join("\n");

  return `You are an expert in the Wyckoff Method. Analyze ${req.symbol} (${req.companyName}).

OHLCV DATA — ${candles.length} daily sessions (${startDate} → ${endDate}):
${rows}

Current: $${current} | Range in dataset: $${low} – $${high}

Apply the Wyckoff Method fully:
• Phase identification: Accumulation / Distribution / Markup / Markdown / Re-accumulation / Re-distribution
• Key events (identify ONLY those visible in the data):
  – SC (Selling Climax), AR (Automatic Rally), ST (Secondary Test)
  – Spring (false break of support + recovery)
  – SOS (Sign of Strength), LPS (Last Point of Support)
  – SOW (Sign of Weakness), LPSY (Last Point of Supply)
  – BC (Buying Climax), PSY (Preliminary Supply)
  – UTAD (Upthrust After Distribution), BU/BUEC (Back-Up to Edge of Creek)
• Support and resistance levels
• Invalidation level

Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON:

{
  "summary": {
    "phase": "<Accumulation|Distribution|Markup|Markdown|Re-accumulation|Re-distribution|Unknown>",
    "bias": "<concise bias statement, e.g. Bullish above $17.50>",
    "invalidation": "<price and condition, e.g. Close below $16.80>",
    "rating": <integer 1–10, clarity of the setup>
  },
  "analysis": {
    "trend": "<one sentence: dominant price structure>",
    "wyckoff_logic": "<1-2 sentences: Wyckoff interpretation>",
    "trade_idea": "<actionable direction and key condition>"
  },
  "drawings": [
    { "type": "horizontal_line", "price": 0.00, "label": "Support", "color": "green" },
    { "type": "horizontal_line", "price": 0.00, "label": "Resistance", "color": "red" },
    { "type": "zone", "price_low": 0.00, "price_high": 0.00, "label": "Value Area", "color": "green" },
    { "type": "point", "time": "YYYY-MM-DD", "price": 0.00, "color": "purple", "title": "Spring", "explanation": "One sentence." },
    { "type": "trend_line", "start_time": "YYYY-MM-DD", "start_price": 0.00, "end_time": "YYYY-MM-DD", "end_price": 0.00, "label": "Trend", "color": "blue" }
  ]
}

STRICT RULES:
1. 3–8 drawings max. Prefer quality over quantity.
2. "point" type: use ONLY exact dates from the OHLCV data above.
3. All prices must come from the actual data — no invented values.
4. Colors: green=support/strength, red=resistance/weakness, yellow=test/ambiguous, blue=breakout/confirmation, purple=key structural event.
5. If the setup is unclear, return 2-3 horizontal_lines only and set rating ≤ 4.
6. Do not hallucinate. Omit any event you cannot clearly identify.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: CORS });
    }

    if (req.method !== "POST") {
      return respond({ success: false, error: "Method not allowed" }, 405);
    }

    const { user: authUser, fail: authFail } = await requireAdmin(req);

    if (!authUser) {
      console.log("[gako-wyckoff] auth FAIL - code:", authFail.code, "| details:", authFail.details);
      return respond(
        {
          success: false,
          error: authFail.code,
          details: authFail.details,
        },
        401
      );
    }

    console.log(`[gako-wyckoff] auth OK - userId: ${authUser.userId} | role: ${authUser.role}`);

    let body: WyckoffRequest;
    try {
      body = (await req.json()) as WyckoffRequest;
    } catch {
      return respond({ success: false, error: "Request body must be valid JSON" }, 400);
    }

    const { symbol, companyName, priceData } = body;

    if (!symbol || typeof symbol !== "string") {
      return respond({ success: false, error: "'symbol' is required" }, 400);
    }

    if (!companyName || typeof companyName !== "string") {
      return respond({ success: false, error: "'companyName' is required" }, 400);
    }

    if (!Array.isArray(priceData) || priceData.length < 10) {
      return respond({ success: false, error: "'priceData' must be an array of ≥ 10 candles" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[gako-wyckoff] GEMINI_API_KEY secret is not configured");
      return respond({ success: false, error: "Gako is not configured. GEMINI_API_KEY missing." }, 500);
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildPrompt({ symbol, companyName, priceData });

    console.log(`[gako-wyckoff] analyzing ${symbol} with ${priceData.length} candles`);

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    let rawText: string | undefined;
    try {
      rawText = geminiResponse.text?.trim();
    } catch (textErr) {
      console.warn("[gako-wyckoff] response.text threw, trying candidates path:", textErr);
      try {
        rawText = (geminiResponse as Record<string, any>)?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
        rawText = rawText?.trim();
      } catch {
        rawText = undefined;
      }
    }

    if (!rawText) {
      console.error("[gako-wyckoff] empty text from Gemini for", symbol);
      return respond({ success: false, error: "Gemini returned an empty response" }, 502);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("[gako-wyckoff] no JSON object found in Gemini response for", symbol);
        return respond({ success: false, error: "Gemini response was not valid JSON" }, 502);
      }

      try {
        parsed = JSON.parse(match[0]) as Record<string, unknown>;
      } catch (parseErr) {
        console.error("[gako-wyckoff] JSON parse failed for", symbol, parseErr);
        return respond({ success: false, error: "Gemini response JSON could not be parsed" }, 502);
      }
    }

    const analysis = {
      summary: (parsed.summary ?? {}) as Record<string, unknown>,
      analysis: (parsed.analysis ?? {}) as Record<string, unknown>,
      drawings: Array.isArray(parsed.drawings) ? parsed.drawings : [],
    };

    console.log(
      `[gako-wyckoff] success - symbol: ${symbol}` +
        ` phase: ${String((analysis.summary as Record<string, unknown>)?.phase ?? "unknown")}` +
        ` drawings: ${analysis.drawings.length}`
    );

    return respond({ success: true, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[gako-wyckoff] unhandled error:", message, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        debug_marker: DEBUG_MARKER,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS },
      }
    );
  }
});