import React, { useState } from 'react';
import { useLanguage } from '../components/LanguageContext';
import { useTheme } from '../components/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowLeft, Sun, Moon, Globe, Loader2, AlertCircle } from 'lucide-react';
import AppLogo from '../components/app/AppLogo';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthContext';
import { useSubscription } from '@/components/hooks/useSubscription';
import { useStripeActions } from '@/hooks/useStripeActions';

const PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_PRICE_ID ?? '';

export default function Plans() {
  const { t, lang, setLang, isRTL } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [billing, setBilling] = useState('monthly');
  const navigate = useNavigate();

  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { startCheckout, openPortal, loading: stripeLoading, error: stripeError } = useStripeActions();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return (data ?? []).filter(p => ['free', 'premium', 'pro'].includes(p.key));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const handlePlanAction = async (plan) => {
    const isFree = plan.key === 'free';
    const isPro  = plan.key === 'pro' || plan.key === 'premium';

    if (isFree) {
      // Already on free — just navigate to app
      navigate('/Dashboard');
      return;
    }

    if (isPro) {
      if (!user) {
        // Not logged in — go to auth first
        navigate('/Auth');
        return;
      }
      if (isPremium) {
        // Already subscribed — open portal to manage
        await openPortal();
        return;
      }
      // Start Stripe Checkout
      await startCheckout(PRO_PRICE_ID);
    }
  };

  const getButtonLabel = (plan) => {
    const isFree = plan.key === 'free';
    const isPro  = plan.key === 'pro' || plan.key === 'premium';

    if (isFree) return user ? 'Current Plan' : t('plans_select');
    if (isPro && isPremium) return 'Manage Subscription';
    if (isPro && !user) return 'Get Started';
    return 'Upgrade to Pro';
  };

  const isButtonDisabled = (plan) => {
    const isFree = plan.key === 'free';
    if (isFree && user) return true; // Already on free, nothing to do
    if (stripeLoading) return true;
    return false;
  };

  return (
    <div className="min-h-screen dark:bg-[#0B1220] bg-[#F8FAFC]">
      {/* Navbar */}
      <nav className="border-b dark:border-[#4CBFF5]/10 border-[#DDE4F0] dark:bg-[#0B1220] bg-white shadow-[0_1px_0_0_#DDE4F0] dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo size="w-8 h-8" />
            <span className="font-bold dark:text-white text-gray-900 text-sm">StockPulse<span className="dark:text-[#4CBFF5] text-[#576CA8]">AI</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === 'en' ? 'he' : 'en')} className="p-2 rounded-lg dark:text-gray-400 text-gray-600 hover:bg-[#274690]/5 dark:hover:bg-white/5">
              <Globe className="w-4 h-4" />
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg dark:text-gray-400 text-gray-600 hover:bg-[#274690]/5 dark:hover:bg-white/5">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to={user ? '/Dashboard' : '/'}>
              <Button variant="ghost" size="sm" className="gap-1.5 dark:text-gray-300">
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} /> {t('back')}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-4">{t('plans_title')}</h1>
          <p className="text-lg dark:text-gray-400 text-gray-600">{t('plans_subtitle')}</p>
          <div className="inline-flex items-center gap-2 mt-8 dark:bg-white/5 bg-[#EEF2FA] rounded-xl p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBilling('monthly')}
              className={`rounded-lg ${billing === 'monthly' ? 'dark:bg-white/10 bg-white shadow-sm dark:text-white text-[#274690] font-semibold' : 'dark:text-gray-400 text-gray-500'}`}
            >
              {t('plans_monthly')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBilling('yearly')}
              className={`rounded-lg ${billing === 'yearly' ? 'dark:bg-white/10 bg-white shadow-sm dark:text-white text-[#274690] font-semibold' : 'dark:text-gray-400 text-gray-500'}`}
            >
              {t('plans_yearly')}
            </Button>
          </div>
        </div>

        {/* Stripe error banner */}
        {stripeError && (
          <div className="max-w-md mx-auto mb-8 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{stripeError}</p>
          </div>
        )}

        <div className="flex justify-center gap-5 flex-wrap">
          {isLoading ? (
            [0, 1].map(i => (
              <div key={i} className="w-full max-w-sm p-6 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 animate-pulse">
                <div className="h-5 w-24 dark:bg-white/10 bg-gray-200 rounded mb-4" />
                <div className="h-8 w-16 dark:bg-white/10 bg-gray-200 rounded mb-6" />
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-3 w-full dark:bg-white/5 bg-gray-100 rounded mb-3" />
                ))}
              </div>
            ))
          ) : plans.length === 0 ? (
            <p className="text-sm dark:text-gray-500 text-gray-400 py-16">No plans available at this time.</p>
          ) : (
            plans.map((plan, i) => {
              const price    = billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
              const features = lang === 'he' ? plan.features_he : plan.features_en;
              const disabled = isButtonDisabled(plan);
              const label    = getButtonLabel(plan);
              const isCurrentPro = isPremium && (plan.key === 'pro' || plan.key === 'premium');

              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative w-full max-w-sm p-6 rounded-2xl border transition-all ${
                    plan.popular
                      ? 'dark:bg-blue-500/5 bg-white dark:border-blue-500/20 border-[#274690]/30 ring-2 ring-[#274690]/20 dark:ring-blue-500/20 shadow-lg dark:shadow-none'
                      : 'dark:bg-white/[0.03] bg-white dark:border-white/5 border-[#DDE4F0] shadow-sm dark:shadow-none'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="dark:bg-blue-500 bg-[#274690] text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {t('plans_popular')}
                      </span>
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isCurrentPro && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold dark:text-white text-gray-900">{plan.name}</h3>
                    <div className="mt-3">
                      <span className="text-3xl font-bold dark:text-white text-gray-900">${price}</span>
                      <span className="text-sm dark:text-gray-500 text-gray-500">
                        {billing === 'monthly' ? t('per_month') : t('per_year')}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {(features ?? []).map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm dark:text-gray-300 text-gray-700">
                        <Check className="w-4 h-4 dark:text-blue-400 text-[#274690] mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handlePlanAction(plan)}
                    disabled={disabled}
                    className={`w-full gap-2 ${
                      plan.popular
                        ? 'dark:bg-blue-500 dark:hover:bg-blue-600 bg-[#274690] hover:bg-[#1B264F] text-white disabled:opacity-60'
                        : 'dark:bg-white/5 dark:hover:bg-white/10 dark:text-white bg-[#EEF2FA] hover:bg-[#DDE4F0] text-[#274690] font-medium disabled:opacity-60'
                    }`}
                  >
                    {stripeLoading && plan.popular ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      label
                    )}
                  </Button>

                  {plan.popular && !user && (
                    <p className="text-[11px] dark:text-gray-600 text-gray-400 text-center mt-3">
                      No credit card required to try free
                    </p>
                  )}
                  {plan.popular && user && !isPremium && (
                    <p className="text-[11px] dark:text-gray-600 text-gray-400 text-center mt-3">
                      Cancel anytime · Instant access
                    </p>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
