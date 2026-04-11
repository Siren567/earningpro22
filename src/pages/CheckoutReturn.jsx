/**
 * CheckoutReturn
 *
 * Landing page after Stripe Checkout completes.
 * URL: /checkout-return?session_id=cs_...
 *
 * We give the webhook a moment to fire, show a brief success state,
 * then redirect the user into the app. The profile refetch in AuthContext
 * will pick up the updated subscription_plan automatically.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import AppLogo from '../components/app/AppLogo';
import { useAuth } from '@/components/auth/AuthContext';

const REDIRECT_DELAY_MS = 2800;
const WEBHOOK_SETTLE_MS = 1800; // brief wait before showing success

export default function CheckoutReturn() {
  const navigate            = useNavigate();
  const [params]            = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const { refreshProfile }  = useAuth();

  const sessionId = params.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    // Give the Stripe webhook time to process, then refresh profile + show success.
    const settleTimer = setTimeout(async () => {
      // Pull fresh subscription_plan into AuthContext before redirecting.
      // This way the UI immediately reflects Pro status on the next page.
      try { await refreshProfile(); } catch { /* non-fatal */ }
      setStatus('success');
    }, WEBHOOK_SETTLE_MS);

    return () => clearTimeout(settleTimer);
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'success') return;
    const redirectTimer = setTimeout(() => {
      navigate('/Dashboard', { replace: true });
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(redirectTimer);
  }, [status, navigate]);

  return (
    <div className="min-h-screen dark:bg-[#0B1220] bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10">
        <Link to="/" className="flex items-center gap-2">
          <AppLogo size="w-8 h-8" />
          <span className="font-bold dark:text-white text-gray-900 text-sm">
            StockPulse<span className="dark:text-[#4CBFF5] text-[#576CA8]">AI</span>
          </span>
        </Link>
      </div>

      <div className="text-center max-w-sm w-full">

        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-2xl dark:bg-blue-500/10 bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-xl font-bold dark:text-white text-gray-900 mb-2">
              Activating your Pro plan…
            </h1>
            <p className="text-sm dark:text-gray-400 text-gray-500">
              Please wait while we confirm your subscription.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold dark:text-white text-gray-900 mb-2">
              Welcome to Pro! 🎉
            </h1>
            <p className="text-sm dark:text-gray-400 text-gray-500 mb-6">
              Your subscription is active. Redirecting you to the app…
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => navigate('/Dashboard', { replace: true })}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold dark:text-white text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm dark:text-gray-400 text-gray-500 mb-6">
              Your payment may not have completed. If you were charged, please contact support.
            </p>
            <div className="flex gap-2 justify-center">
              <Link
                to="/Plans"
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Back to Plans
              </Link>
              <Link
                to="/Dashboard"
                className="px-5 py-2.5 dark:bg-white/5 dark:hover:bg-white/10 bg-gray-100 hover:bg-gray-200 dark:text-white text-gray-700 rounded-xl text-sm font-semibold transition-colors"
              >
                Go to App
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
