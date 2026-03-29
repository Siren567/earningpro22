import React, { useState } from 'react';
import { useLanguage } from '../components/LanguageContext';
import { useTheme } from '../components/ThemeContext';
import { Link } from 'react-router-dom';
import { Check, Sparkles, ArrowLeft, Sun, Moon, Globe, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const plans = [
  {
    id: 'free',
    price_monthly: 0,
    price_yearly: 0,
    features_en: ['Up to 5 watchlist stocks', 'Up to 3 alerts', 'Basic AI scores', 'Daily updates', 'Community access', 'Limited Earnings Calendar (next 7 days only)'],
    features_he: ['עד 5 מניות ברשימת מעקב', 'עד 3 התראות', 'ציוני AI בסיסיים', 'עדכונים יומיים', 'גישה לקהילה', 'לוח דוחות מוגבל (7 ימים קדימה בלבד)'],
  },
  {
    id: 'premium',
    price_monthly: 29,
    price_yearly: 290,
    popular: true,
    features_en: ['Unlimited watchlists', 'Unlimited alerts', 'Premium AI scores', 'Full Earnings Calendar access', 'Advanced charts', 'All notification channels', 'Priority support'],
    features_he: ['רשימות מעקב ללא הגבלה', 'התראות ללא הגבלה', 'ציוני AI פרימיום', 'גישה מלאה ללוח דוחות', 'גרפים מתקדמים', 'כל ערוצי ההתראה', 'תמיכה מועדפת'],
  },
];

export default function Plans() {
  const { t, lang, setLang, isRTL } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50">
      {/* Navbar */}
      <nav className="border-b dark:border-white/5 border-gray-200 dark:bg-[#0a0a0f] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold dark:text-white text-gray-900 text-sm">StockPulse<span className="text-blue-500">AI</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === 'en' ? 'he' : 'en')} className="p-2 rounded-lg dark:text-gray-400 text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5">
              <Globe className="w-4 h-4" />
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-lg dark:text-gray-400 text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/">
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
          <div className="inline-flex items-center gap-2 mt-8 dark:bg-white/5 bg-gray-100 rounded-xl p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBilling('monthly')}
              className={`rounded-lg ${billing === 'monthly' ? 'dark:bg-white/10 bg-white shadow-sm dark:text-white' : 'dark:text-gray-400'}`}
            >
              {t('plans_monthly')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBilling('yearly')}
              className={`rounded-lg ${billing === 'yearly' ? 'dark:bg-white/10 bg-white shadow-sm dark:text-white' : 'dark:text-gray-400'}`}
            >
              {t('plans_yearly')}
            </Button>
          </div>
        </div>

        <div className="flex justify-center gap-5">
          {plans.map((plan, i) => {
            const name = t(`plans_${plan.id}`);
            const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const features = lang === 'he' ? plan.features_he : plan.features_en;
            return (
              <motion.div
                className="w-full max-w-sm"
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-6 rounded-2xl border transition-all ${
                  plan.popular
                    ? 'dark:bg-blue-500/5 bg-blue-50 dark:border-blue-500/20 border-blue-200 ring-1 ring-blue-500/20'
                    : 'dark:bg-white/[0.03] bg-white dark:border-white/5 border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {t('plans_popular')}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold dark:text-white text-gray-900">{name}</h3>
                  <div className="mt-3">
                    <span className="text-3xl font-bold dark:text-white text-gray-900">${price}</span>
                    <span className="text-sm dark:text-gray-500 text-gray-500">{billing === 'monthly' ? t('per_month') : t('per_year')}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm dark:text-gray-300 text-gray-700">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'dark:bg-white/5 dark:hover:bg-white/10 dark:text-white bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                >
                  {t('plans_select')}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}