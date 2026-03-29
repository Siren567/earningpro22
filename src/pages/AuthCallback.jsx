import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2 } from 'lucide-react';

const REDIRECT_DELAY = 1500;   // ms to show success before redirecting
const FALLBACK_TIMEOUT = 8000; // ms before giving up and sending to /Auth

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  // Prevent handleConfirmed from firing twice (getSession + onAuthStateChange can both resolve)
  const confirmedRef = useRef(false);

  useEffect(() => {
    // Bug fix 1: handle INITIAL_SESSION — in Supabase v2 this is the event fired when
    // the page loads with hash tokens, NOT SIGNED_IN. Also keep SIGNED_IN for explicit logins.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        handleConfirmed();
      } else if (event === 'SIGNED_OUT') {
        handleFailed('Your session has ended. Please log in.');
      }
    });

    // Fallback: getSession covers the case where onAuthStateChange fired before we subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleConfirmed();
      }
    });

    // Fallback timeout: if neither path resolves in time, the token is likely expired/used
    const giveUpTimer = setTimeout(() => {
      if (!confirmedRef.current) {
        // Redirect to /Auth with a flag so Auth.jsx can show "confirmed, please log in"
        window.location.replace('/Auth?confirmed=true');
      }
    }, FALLBACK_TIMEOUT);

    return () => {
      subscription.unsubscribe();
      clearTimeout(giveUpTimer);
    };
  }, []);

  function handleConfirmed() {
    if (confirmedRef.current) return; // already handled
    confirmedRef.current = true;
    setStatus('confirmed');

    // Bug fix 2: use window.location.replace instead of navigate() so AuthContext
    // re-initializes on a fresh page load and reads the session from localStorage.
    // navigate() keeps the same page load where AuthContext may still have user=null.
    setTimeout(() => {
      window.location.replace('/Dashboard');
    }, REDIRECT_DELAY);
  }

  function handleFailed(message) {
    if (confirmedRef.current) return;
    setError(message);
    setStatus('error');
  }

  return (
    <div className="min-h-screen dark:bg-[#0B1220] bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-5 w-full max-w-sm">

        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#4CBFF5] mx-auto" />
            <p className="text-sm dark:text-gray-400 text-gray-500">Confirming your account…</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div
              className="w-16 h-16 rounded-full bg-[#4CBFF5]/10 border border-[#4CBFF5]/25 flex items-center justify-center mx-auto"
              style={{ boxShadow: '0 0 24px rgba(76,191,245,0.2)' }}
            >
              <CheckCircle2 className="w-8 h-8 text-[#4CBFF5]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                Account confirmed!
              </h2>
              <p className="text-sm dark:text-gray-400 text-gray-500">
                Redirecting you to your dashboard…
              </p>
            </div>
            <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#4CBFF5]"
                style={{ animation: `grow ${REDIRECT_DELAY}ms linear forwards` }}
              />
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-2xl text-red-400">✕</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold dark:text-white text-gray-900">
                Confirmation failed
              </h2>
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button
              onClick={() => navigate('/Auth')}
              className="text-sm text-[#4CBFF5] hover:underline"
            >
              Back to Login
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes grow {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  );
}
