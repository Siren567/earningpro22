import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Always HTTP 200 — the client reads success/reply fields, never the status
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type Skill = {
  name:         string;
  description:  string | null;
  instructions: string | null;
  slug?:        string;
};

// ─────────────────────────────────────────────────────────────
// AUTH — require authenticated user
// ─────────────────────────────────────────────────────────────

type AuthUser = { userId: string; email: string; role: string | null };

async function requireUser(req: Request): Promise<AuthUser | null> {
  const rawAuth = req.headers.get("authorization") ?? "";
  const token   = rawAuth.replace(/^Bearer\s+/i, "").trim();

  console.log("[requireUser] auth header present:", !!rawAuth, "| token length:", token.length);

  if (!token) {
    console.log("[requireUser] FAIL — no token in Authorization header");
    return null;
  }

  const supabaseUrl    = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  console.log("[requireUser] SUPABASE_URL set:", !!supabaseUrl, "| SERVICE_ROLE_KEY set:", !!serviceRoleKey);

  const svc = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await svc.auth.getUser(token);
  console.log("[requireUser] getUser — userId:", authData?.user?.id ?? "null", "| error:", authError?.message ?? "none");

  if (!authData?.user) {
    console.log("[requireUser] FAIL — token did not resolve to a user");
    return null;
  }

  // Fetch profile to log role (non-blocking — chat is open to all authenticated users)
  const { data: profile, error: profileError } = await svc
    .schema("public")
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  console.log("[requireUser] profile:", JSON.stringify(profile ?? null), "| profileError:", profileError?.message ?? "none");

  const role = (profile as { role?: string } | null)?.role ?? null;
  console.log("[requireUser] userId:", authData.user.id, "| role:", role);

  return { userId: authData.user.id, email: authData.user.email ?? "", role };
}

// ─────────────────────────────────────────────────────────────
// LANGUAGE DETECTION
// ─────────────────────────────────────────────────────────────

function isHebrew(text: string): boolean {
  return /[\u0590-\u05FF\uFB1D-\uFB4F]/.test(text);
}

// ─────────────────────────────────────────────────────────────
// GEMINI CALL
// ─────────────────────────────────────────────────────────────

const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

async function callGemini(
  prompt: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  console.log("[gemini] sending request, model:", model, "| prompt length:", prompt.length);

  const res = await fetch(`${url}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      // NOTE: no safetySettings — BLOCK_NONE is rejected by free-tier keys.
      // Gemini's default thresholds are sufficient for financial content.
    }),
  });

  console.log("[gemini] response status:", res.status);

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[gemini] error body:", errBody);
    throw new Error(`Gemini API ${res.status}: ${errBody}`);
  }

  // Parse response safely
  let data: unknown;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Gemini response JSON parse failed: ${(e as Error).message}`);
  }

  console.log("[gemini] raw response keys:", Object.keys(data as object));

  // Navigate the response tree with full null safety
  const candidates = (data as Record<string, unknown>)?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const promptFeedback = (data as Record<string, unknown>)?.promptFeedback;
    console.error("[gemini] no candidates. promptFeedback:", JSON.stringify(promptFeedback));
    throw new Error(
      `Gemini returned no candidates. Prompt may have been blocked. Details: ${JSON.stringify(promptFeedback) ?? "none"}`,
    );
  }

  const candidate   = candidates[0] as Record<string, unknown>;
  const finishReason: string = (candidate?.finishReason as string) ?? "UNKNOWN";
  console.log("[gemini] finishReason:", finishReason);

  // content can be absent when finishReason is SAFETY or RECITATION
  const content = candidate?.content as Record<string, unknown> | undefined;
  if (!content) {
    throw new Error(`Gemini blocked response. finishReason: ${finishReason}`);
  }

  const parts = content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error(`Gemini response has no parts. finishReason: ${finishReason}`);
  }

  const text: string | undefined = (parts[0] as Record<string, unknown>)?.text as string | undefined;

  if (typeof text !== "string" || text.trim() === "") {
    throw new Error(`Gemini text field is empty or missing. finishReason: ${finishReason}`);
  }

  console.log("[gemini] got text, length:", text.length);
  return text.trim();
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────

function buildSystemPrompt(skills: Skill[], basePrompt: string, hebrew: boolean): string {
  const parts: string[] = [];

  // Base identity
  parts.push(
    basePrompt.trim() ||
    "You are Gako AI, a financial analysis assistant specialized in stock market analysis, earnings research, and trade setups. Be concise, accurate, and data-driven.",
  );

  // Inject active skills
  if (skills.length > 0) {
    parts.push("\n\n── Active Skills ──");
    for (const skill of skills) {
      parts.push(`\n[Skill: ${skill.name}]`);
      if (skill.description)  parts.push(`Description: ${skill.description}`);
      if (skill.instructions) parts.push(`Instructions: ${skill.instructions}`);
    }
  }

  // Formatting + language instruction
  parts.push(
    "\n\n── Response Format ──",
    "Use clear section headings with emojis (e.g. 📊 Market Expectations).",
    "Use bullet points (•) for lists — no markdown bold/italic/headers.",
    "Keep responses focused and professional.",
    hebrew
      ? "The user is writing in Hebrew. Respond ENTIRELY in Hebrew."
      : "Respond in the same language as the user.",
  );

  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ── CORS preflight ────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const t0 = Date.now();

  // Outer try — always returns HTTP 200, never crashes
  try {
    // ── 1. Parse request body ─────────────────────────────────
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (e) {
      console.warn("[parse] body JSON parse failed:", (e as Error).message);
    }

    console.log("[request] body keys:", Object.keys(body));

    const prompt: string = (
      (body.prompt ?? body.message ?? "") as string
    ).trim();

    console.log("[request] prompt:", prompt);

    if (!prompt) {
      return json({ success: false, reply: "Please send a message to Gako.", error: "prompt is required" });
    }

    // ── 2. Detect language ────────────────────────────────────
    const hebrew = isHebrew(prompt);
    console.log("[language] hebrew detected:", hebrew);

    // ── 3. Supabase client ────────────────────────────────────
    const supabaseUrl     = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase        = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // ── 4. Require authenticated user ─────────────────────────
    const authUser = await requireUser(req);
    if (!authUser) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
    const userId = authUser.userId;
    console.log("[auth] userId:", userId, "| role:", authUser.role);

    // ── 5. Fetch active skills ────────────────────────────────
    const { data: skillRows, error: skillsErr } = await supabase
      .from("gako_skills")
      .select("name, description, instructions, slug")
      .eq("enabled", true)
      .eq("visible", true)
      .order("updated_at", { ascending: false });

    if (skillsErr) console.warn("[skills] fetch error:", skillsErr.message);
    const skills: Skill[] = skillRows ?? [];
    console.log("[skills] loaded:", skills.length);

    // ── 6. Fetch active config (provider, model, temperature, max_tokens, system_prompt) ──
    const { data: settings, error: settingsErr } = await supabase
      .from("gako_settings")
      .select("provider, model_name, temperature, max_tokens, system_prompt")
      .eq("enabled", true)
      .maybeSingle();

    if (settingsErr) console.warn("[settings] fetch error:", settingsErr.message);

    const configSource   = settings ? "db" : "fallback";
    const modelUsed      = (settings?.model_name  as string  | null) ?? GEMINI_FALLBACK_MODEL;
    const providerUsed   = (settings?.provider    as string  | null) ?? "google";
    const temperature    = (settings?.temperature as number  | null) ?? 0.7;
    const maxTokens      = (settings?.max_tokens  as number  | null) ?? 2048;
    const basePrompt     = (settings?.system_prompt as string | null) ?? "";

    console.log("[config] provider used:", providerUsed, "| model used:", modelUsed, "| source:", configSource);
    console.log("[config] temperature:", temperature, "| max_tokens:", maxTokens);
    console.log("[settings] base prompt length:", basePrompt.length);

    // ── 7. Build prompt ───────────────────────────────────────
    const systemPrompt = buildSystemPrompt(skills, basePrompt, hebrew);
    const fullPrompt   = `${systemPrompt}\n\nUser: ${prompt}\n\nGako:`;
    console.log("[prompt] full prompt length:", fullPrompt.length);

    // ── 8. Determine skill match ──────────────────────────────
    const lower = prompt.toLowerCase();
    const matchedSkill = skills.find(s =>
      (s.slug && lower.includes(s.slug)) ||
      lower.includes(s.name.toLowerCase()),
    );
    const skillUsed = matchedSkill?.name ?? "general";
    console.log("[skill] matched:", skillUsed);

    // ── 9. Call Gemini ────────────────────────────────────────
    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    if (!apiKey) {
      console.error("[gemini] GEMINI_API_KEY secret is missing");
      return json({
        success: false,
        reply:   "Gako is not configured yet. GEMINI_API_KEY secret is missing.",
        error:   "GEMINI_API_KEY not set",
      });
    }

    let reply: string;
    try {
      reply = await callGemini(fullPrompt, apiKey, modelUsed, temperature, maxTokens);
    } catch (geminiErr) {
      const msg = (geminiErr as Error).message ?? String(geminiErr);
      console.error("[gemini] call failed:", msg);

      const duration_ms = Date.now() - t0;
      // Log failure (non-blocking)
      supabase.from("gako_logs").insert({
        user_id: userId, input: prompt, output: null,
        skill_used: skillUsed, provider: providerUsed, model_used: modelUsed,
        success: false, duration_ms,
      }).then(({ error }) => { if (error) console.warn("gako_logs insert failed:", error.message); });

      return json({
        success: false,
        reply:   "Gako could not generate a response right now. Please try again.",
        error:   msg,
        duration_ms,
      });
    }

    const duration_ms = Date.now() - t0;
    console.log("[done] duration_ms:", duration_ms);

    // ── 10. Log success (non-blocking) ────────────────────────
    supabase.from("gako_logs").insert({
      user_id: userId, input: prompt, output: reply,
      skill_used: skillUsed, provider: providerUsed, model_used: modelUsed,
      success: true, duration_ms,
    }).then(({ error }) => { if (error) console.warn("gako_logs insert failed:", error.message); });

    return json({
      success:     true,
      reply,
      provider:    providerUsed,
      model:       modelUsed,
      skillUsed,
      duration_ms,
    });

  } catch (fatal) {
    // Should never reach here — every known error path is handled above
    const msg = (fatal as Error).message ?? String(fatal);
    console.error("[fatal] unhandled error:", msg);
    return json({
      success: false,
      reply:   "Gako encountered an unexpected error. Please try again.",
      error:   msg,
      duration_ms: Date.now() - t0,
    });
  }
});
