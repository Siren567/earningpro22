import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // All headers the Supabase JS client may send (case-insensitive per spec,
  // but listing both cases avoids edge cases in some proxy layers).
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, Content-Type",
  "Access-Control-Max-Age": "86400", // cache preflight for 24 h
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

Deno.serve(async (req) => {
  // ── Preflight — must return 204 with CORS headers and no body ────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    // ── [1] Authorization header ──────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    console.log("[stripe-checkout] 1. authorization header present:", !!authHeader, "| value prefix:", authHeader.slice(0, 15));

    if (!authHeader) {
      console.log("[stripe-checkout] 401 reason: Authorization header is missing entirely");
      return respond({ error: "401: Authorization header is missing" }, 401);
    }

    // ── [2] Bearer prefix check ───────────────────────────────────────────────
    if (!authHeader.startsWith("Bearer ")) {
      console.log("[stripe-checkout] 401 reason: Authorization header is not a Bearer token — got:", authHeader.slice(0, 20));
      return respond({ error: "401: Authorization header must use Bearer scheme" }, 401);
    }

    const token = authHeader.slice(7).trim();
    console.log("[stripe-checkout] 2. token extracted, length:", token.length);

    if (!token) {
      console.log("[stripe-checkout] 401 reason: Bearer token is empty string");
      return respond({ error: "401: Bearer token is empty" }, 401);
    }

    // ── [3/4] Resolve authenticated user ─────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // IMPORTANT: use getUser(token) — NOT getUser().
    // getUser() with no args requires a stored session. In an edge function
    // context a fresh client has no session, so it returns AuthSessionMissingError.
    // getUser(token) is the fast path: it makes a direct HTTP GET /auth/v1/user
    // with Authorization: Bearer <token>, bypassing the session lock entirely.
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    console.log("[stripe-checkout] 3. getUser error:", authError?.message ?? "none");
    console.log("[stripe-checkout] 4. getUser userId:", user?.id ?? "null — no user returned");

    if (authError) {
      console.log("[stripe-checkout] 401 reason: supabase.auth.getUser() returned error:", authError.message);
      return respond({ error: `401: Auth token validation failed — ${authError.message}` }, 401);
    }
    if (!user) {
      console.log("[stripe-checkout] 401 reason: supabase.auth.getUser() returned no user (token may be expired or invalid)");
      return respond({ error: "401: No authenticated user — token may be expired or invalid" }, 401);
    }

    console.log("[stripe-checkout] user authenticated:", user.id, "| email:", user.email);

    // ── Parse body ────────────────────────────────────────────────────────────
    const { price_id } = await req.json();
    if (!price_id) return respond({ error: "'price_id' is required" }, 400);

    // ── [5] Stripe secret guard ───────────────────────────────────────────────
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      console.log("[stripe-checkout] 401 reason: STRIPE_SECRET_KEY secret is not set in Supabase");
      return respond({ error: "401: STRIPE_SECRET_KEY is not configured on the server" }, 401);
    }

    // ── Stripe + DB setup ─────────────────────────────────────────────────────
    const stripe   = new Stripe(stripeSecret);
    const db       = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const origin   = req.headers.get("origin") ?? "https://stockpulse.app";

    // Get or create Stripe customer ───────────────────────────────────────────
    const { data: profile } = await db
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await db
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      console.log("[stripe-checkout] created Stripe customer:", customerId);
    } else {
      console.log("[stripe-checkout] existing Stripe customer:", customerId);
    }

    // ── Create Checkout Session ───────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer:               customerId,
      mode:                   "subscription",
      line_items:             [{ price: price_id, quantity: 1 }],
      success_url:            `${origin}/checkout-return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:             `${origin}/Plans`,
      allow_promotion_codes:  true,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      // Pre-fill customer email at checkout
      customer_update: {
        address: "auto",
      },
    });

    console.log("[stripe-checkout] created session:", session.id);
    return respond({ url: session.url });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe-checkout] unhandled error:", message);
    return respond({ error: message }, 500);
  }
});
