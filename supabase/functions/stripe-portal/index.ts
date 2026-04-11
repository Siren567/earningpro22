import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, X-Client-Info, apikey, content-type, Content-Type",
  "Access-Control-Max-Age": "86400",
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const rawAuth = req.headers.get("authorization") ?? "";
    const jwt = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7) : rawAuth;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);

    if (authError || !user) {
      console.log("[stripe-portal] auth failed:", authError?.message ?? "no user");
      return respond({ error: "Unauthorized" }, 401);
    }

    console.log("[stripe-portal] user:", user.id);

    // ── Get Stripe customer from profile ──────────────────────────────────────
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: profile } = await db
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return respond({ error: "No active subscription found. Please subscribe first." }, 400);
    }

    // ── Create Customer Portal session ────────────────────────────────────────
    const stripe  = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const origin  = req.headers.get("origin") ?? "https://stockpulse.app";

    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${origin}/Settings`,
    });

    console.log("[stripe-portal] created portal session for customer:", profile.stripe_customer_id);
    return respond({ url: session.url });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe-portal] unhandled error:", message);
    return respond({ error: message }, 500);
  }
});
