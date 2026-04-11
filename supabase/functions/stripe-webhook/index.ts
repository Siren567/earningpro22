import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map Stripe subscription status → app subscription_plan value */
function planFromStatus(status: string): "pro" | "free" {
  return ["active", "trialing"].includes(status) ? "pro" : "free";
}

/** Write subscription state to profiles row identified by stripe_customer_id */
async function syncSubscription(
  db: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription,
  customerId: string
) {
  const plan       = planFromStatus(subscription.status);
  const periodEnd  = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const { error } = await db
    .from("profiles")
    .update({
      subscription_plan:            plan,
      stripe_subscription_id:       subscription.id,
      stripe_subscription_status:   subscription.status,
      subscription_period_end:      periodEnd,
    })
    .eq("stripe_customer_id", customerId);

  if (error) throw error;

  console.log(
    `[stripe-webhook] synced sub ${subscription.id}` +
    ` | status: ${subscription.status}` +
    ` | plan: ${plan}` +
    ` | customer: ${customerId}`
  );
}

/** Downgrade profile to free after cancellation */
async function handleCancellation(
  db: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  const { error } = await db
    .from("profiles")
    .update({
      subscription_plan:            "free",
      stripe_subscription_id:       subscription.id,
      stripe_subscription_status:   "canceled",
      subscription_period_end:      null,
    })
    .eq("stripe_customer_id", customerId);

  if (error) throw error;

  console.log(
    `[stripe-webhook] canceled sub ${subscription.id}` +
    ` | customer: ${customerId} → downgraded to free`
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Webhooks don't need CORS — they come from Stripe servers, not browsers.
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("[stripe-webhook] missing stripe-signature header");
    return new Response("Missing stripe-signature", { status: 400 });
  }

  // Read raw body BEFORE any other operations (required for signature verification)
  const body = await req.text();

  const stripe         = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const webhookSecret  = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  // Verify signature
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] signature verification failed:", msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  console.log("[stripe-webhook] event received:", event.type, "| id:", event.id);

  // Service-role client for DB writes — bypasses RLS
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {

      // ── Checkout session completed (initial subscription start) ──────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerId     = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Retrieve full subscription to get current_period_end and status
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(db, subscription, customerId);
        break;
      }

      // ── Subscription created / updated ───────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId   = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
        await syncSubscription(db, subscription, customerId);
        break;
      }

      // ── Subscription deleted (canceled at period end, now ended) ─────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCancellation(db, subscription);
        break;
      }

      // ── Payment failed — mark as past_due without removing access yet ────────
      case "invoice.payment_failed": {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as Stripe.Customer).id;

        await db
          .from("profiles")
          .update({ stripe_subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);

        console.log("[stripe-webhook] payment_failed for customer:", customerId);
        break;
      }

      // ── Payment succeeded — ensure status is active ───────────────────────────
      case "invoice.payment_succeeded": {
        const invoice        = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId   = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        await syncSubscription(db, subscription, customerId);
        break;
      }

      default:
        console.log("[stripe-webhook] unhandled event:", event.type);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] handler error for", event.type, ":", message);
    // Return 500 so Stripe retries — but avoid infinite loops for permanent errors
    return new Response(`Handler error: ${message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
