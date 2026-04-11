/**
 * useStripeActions
 *
 * Thin bridge between the frontend and the Stripe edge functions.
 * Uses supabase.functions.setAuth() + invoke() — the correct pattern for
 * this SDK version where functions is a getter returning a fresh client.
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useStripeActions() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  /** Get a fresh JWT from the stored session */
  async function getToken() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? null;
    if (!token) throw new Error('You must be signed in to continue.');
    return token;
  }

  /** Invoke a Stripe edge function with the current session JWT */
  async function invokeStripe(fnName, body = {}) {
    const token = await getToken();
    const { data, error: invokeError } = await supabase.functions.invoke(fnName, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (invokeError) throw new Error(invokeError.message ?? `${fnName} failed`);
    if (data?.error) throw new Error(data.error);
    return data;
  }

  /**
   * Redirect user to Stripe Checkout for the given price_id.
   * @param {string} priceId  - Stripe Price ID (price_...)
   */
  async function startCheckout(priceId) {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeStripe('stripe-checkout', { price_id: priceId });
      if (!data?.url) throw new Error('No checkout URL returned.');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);  // only clear loading on error; on success we're navigating away
    }
  }

  /**
   * Redirect user to Stripe Customer Portal to manage / cancel subscription.
   */
  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const data = await invokeStripe('stripe-portal');
      if (!data?.url) throw new Error('No portal URL returned.');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return { startCheckout, openPortal, loading, error };
}
