import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BarChart3, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Hero() {
  const { t, isRTL } = useLanguage();

  const handleGetStarted = () => {
    window.location.href = '/Dashboard';
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14 sm:pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 dark:bg-[#0B1220] bg-gray-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-blue-500/8 rounded-full blur-3xl" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#4CBFF5]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4CBFF5]/40 to-transparent" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative w-full max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 text-center py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border dark:border-[#4CBFF5]/25 border-blue-500/30 dark:bg-[#4CBFF5]/5 bg-blue-50 mb-6 sm:mb-8 glow-accent-sm">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4CBFF5]" />
            <span className="text-xs sm:text-sm font-medium text-[#4CBFF5]">{t('hero_ai_powered')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold dark:text-white text-gray-900 tracking-tight mb-3 sm:mb-4 leading-[1.15]">
            {t('hero_title')}
          </h1>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-semibold text-[#4CBFF5] mb-5 sm:mb-8">
            {t('hero_subtitle')}
          </h2>
          <p className="max-w-xl mx-auto text-base sm:text-lg dark:text-gray-400 text-gray-600 mb-8 sm:mb-12 leading-relaxed px-1">
            {t('hero_desc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <Button
              onClick={handleGetStarted}
              className="gradient-primary gradient-primary-hover text-white h-12 px-8 text-base font-medium rounded-xl gap-2 w-full sm:w-auto border-0"
            >
              {t('hero_get_started')}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
            <a href="#features" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-12 px-8 text-base font-medium rounded-xl dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 w-full"
              >
                {t('hero_cta_secondary')}
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}