import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// ADMIN AUTH GUARD
// ─────────────────────────────────────────────────────────────────────────────

type AdminUser = { userId: string; email: string };

async function requireAdmin(req: Request): Promise<AdminUser | null> {
  const rawAuth = req.headers.get("authorization") ?? "";
  const token   = rawAuth.replace(/^Bearer\s+/i, "").trim();

  console.log("[requireAdmin] authorization header present:", !!rawAuth);
  console.log("[requireAdmin] token extracted, length:", token.length, "| preview:", token.slice(0, 20) + "…");

  if (!token) {
    console.log("[requireAdmin] FAIL — no token in Authorization header");
    return null;
  }

  // Log whether env vars are actually set — empty values silently create an anon client
  const supabaseUrl     = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  console.log("[requireAdmin] SUPABASE_URL set:", !!supabaseUrl, "| SERVICE_ROLE_KEY set:", !!serviceRoleKey);

  const svc = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Validate user JWT via service role client (bypasses RLS on the auth call)
  const { data: authData, error: authError } = await svc.auth.getUser(token);
  console.log("[requireAdmin] getUser — userId:", authData?.user?.id ?? "null", "| error:", authError?.message ?? "none");

  if (!authData?.user) {
    console.log("[requireAdmin] FAIL — token did not resolve to a user");
    return null;
  }

  // Fetch role from public.profiles using service role client (bypasses RLS)
  const { data: profile, error: profileError } = await svc
    .schema("public")
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  console.log("[requireAdmin] profile row:", JSON.stringify(profile ?? null), "| profileError:", profileError?.message ?? "none");

  if (!profile) {
    console.log("[requireAdmin] FAIL — no profile row found for userId:", authData.user.id);
    return null;
  }

  const role = (profile as { role?: string }).role;
  console.log("[requireAdmin] role:", role, "| isAdmin:", role === "admin");

  if (role !== "admin") {
    console.log("[requireAdmin] FAIL — role is not admin (got:", role ?? "null/undefined", ")");
    return null;
  }

  console.log("[requireAdmin] PASS — confirmed admin:", authData.user.email);
  return { userId: authData.user.id, email: authData.user.email ?? "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER TESTERS
// Each returns { ok, latency_ms, model?, error? }
// ─────────────────────────────────────────────────────────────────────────────

type TestResult = { ok: boolean; latency_ms: number; model?: string; error?: string };

const TEST_PROMPT_BODY = "Reply with exactly one word: ok";
const TIMEOUT_MS       = 20_000;

async function testAnthropic(apiKey: string, model: string): Promise<TestResult> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: TEST_PROMPT_BODY }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json() as { error?: { message?: string } };
        if (errBody?.error?.message) errorMsg = errBody.error.message;
      } catch { /* ignore json parse error */ }
      return { ok: false, latency_ms, error: errorMsg };
    }
    const data = await res.json() as { model?: string };
    return { ok: true, latency_ms, model: data?.model ?? model };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t0, error: (e as Error).message };
  }
}

async function testOpenAI(apiKey: string, model: string): Promise<TestResult> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: "user", content: TEST_PROMPT_BODY }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json() as { error?: { message?: string } };
        if (errBody?.error?.message) errorMsg = errBody.error.message;
      } catch { /* ignore json parse error */ }
      return { ok: false, latency_ms, error: errorMsg };
    }
    const data = await res.json() as { model?: string };
    return { ok: true, latency_ms, model: data?.model ?? model };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t0, error: (e as Error).message };
  }
}

async function testGemini(apiKey: string, model: string): Promise<TestResult> {
  const t0 = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: TEST_PROMPT_BODY }] }],
        generationConfig: { maxOutputTokens: 16 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errBody = await res.json() as { error?: { message?: string } };
        if (errBody?.error?.message) errorMsg = errBody.error.message;
      } catch { /* ignore json parse error */ }
      return { ok: false, latency_ms, error: errorMsg };
    }
    return { ok: true, latency_ms, model };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t0, error: (e as Error).message };
  }
}

function runTest(provider: string, apiKey: string, model: string): Promise<TestResult> {
  if (provider === "anthropic") return testAnthropic(apiKey, model);
  if (provider === "openai")    return testOpenAI(apiKey, model);
  if (provider === "gemini")    return testGemini(apiKey, model);
  return Promise.resolve({ ok: false, latency_ms: 0, error: `Unknown provider: ${provider}` });
}

// Default models used when no model is specified in the test request
const DEFAULT_TEST_MODELS: Record<string, string> = {
  anthropic: "claude-haiku-3-5",
  openai:    "gpt-4o-mini",
  gemini:    "gemini-2.5-flash",
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return respond({ success: false, error: "Method not allowed" }, 405);

  // ── Auth guard ────────────────────────────────────────────────────────────
  const admin = await requireAdmin(req);
  if (!admin) return respond({ success: false, error: "Unauthorized — admin only" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const action = body.action as string;

  // Service-role client for DB reads that bypass RLS
  const svc = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // ── action: check_secrets ─────────────────────────────────────────────────
  // Reports which API keys are available (env secrets AND db-stored active keys)
  if (action === "check_secrets") {
    const envSecrets: Record<string, boolean> = {
      anthropic: !!(Deno.env.get("ANTHROPIC_API_KEY")),
      openai:    !!(Deno.env.get("OPENAI_API_KEY")),
      gemini:    !!(Deno.env.get("GEMINI_API_KEY")),
    };

    const { data: dbKeys } = await svc
      .from("gako_api_keys")
      .select("provider")
      .eq("is_active", true);

    const dbActive: Record<string, boolean> = {};
    for (const k of (dbKeys ?? [])) {
      const row = k as { provider: string };
      dbActive[row.provider] = true;
    }

    return respond({ success: true, env_secrets: envSecrets, db_keys: dbActive });
  }

  // ── action: test ──────────────────────────────────────────────────────────
  // Tests the active key for a provider (DB key first, env secret fallback)
  if (action === "test") {
    const provider = body.provider as string;
    const modelRaw = body.model as string | undefined;
    const model    = (modelRaw ?? "").trim() || DEFAULT_TEST_MODELS[provider] || "gemini-2.5-flash";

    if (!provider) return respond({ success: false, error: "'provider' is required" }, 400);

    let apiKey:    string | null = null;
    let keyId:     string | null = null;
    let keySource: string        = "env";

    // 1. Try active DB key for this provider
    const { data: dbKey } = await svc
      .from("gako_api_keys")
      .select("id, key_value")
      .eq("provider", provider)
      .eq("is_active", true)
      .maybeSingle();

    const dbRow = dbKey as { id: string; key_value: string } | null;
    if (dbRow?.key_value) {
      apiKey    = dbRow.key_value;
      keyId     = dbRow.id;
      keySource = "db";
    } else {
      // 2. Fall back to env secret
      const envMap: Record<string, string> = {
        anthropic: "ANTHROPIC_API_KEY",
        openai:    "OPENAI_API_KEY",
        gemini:    "GEMINI_API_KEY",
      };
      const envVar = envMap[provider];
      if (envVar) apiKey = Deno.env.get(envVar) ?? null;
    }

    if (!apiKey) {
      return respond({
        success: false,
        error: `No API key configured for "${provider}". Add one in API Keys or set ${provider.toUpperCase()}_API_KEY as a Supabase secret.`,
      });
    }

    console.log(`[gako-config] testing ${provider}/${model} (key source: ${keySource})`);
    const result = await runTest(provider, apiKey, model);
    console.log(`[gako-config] test result ok=${result.ok} latency=${result.latency_ms}ms`);

    // Persist test result back to DB key row (if key came from DB)
    if (keyId) {
      await svc.from("gako_api_keys").update({
        last_tested_at:  new Date().toISOString(),
        last_tested_ok:  result.ok,
        test_latency_ms: result.latency_ms,
        test_error:      result.error ?? null,
        ...(result.ok ? { validated_at: new Date().toISOString() } : {}),
      }).eq("id", keyId);
    }

    // Write audit log entry
    await svc.from("gako_audit_log").insert({
      admin_email: admin.email,
      action:      "key_tested",
      details:     { provider, model, ok: result.ok, latency_ms: result.latency_ms, key_source: keySource },
    });

    return respond({ success: true, key_source: keySource, ...result });
  }

  return respond({ success: false, error: `Unknown action: "${action}"` }, 400);
});
