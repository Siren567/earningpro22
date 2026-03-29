import React from 'react';
import { useLanguage } from '../LanguageContext';
import { motion } from 'framer-motion';
import { 
  Sparkles, Activity, MessageSquare, History, 
  ShieldAlert, Bell, List, LineChart 
} from 'lucide-react';

export default function Features() {
  const { t } = useLanguage();

  const features = [
    { icon: Sparkles, title: t('feat_ai_score'), desc: t('feat_ai_score_desc'), color: "from-blue-500/20 to-blue-500/5", iconColor: "text-cyan-400" },
    { icon: Activity, title: t('feat_options'), desc: t('feat_options_desc'), color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400" },
    { icon: MessageSquare, title: t('feat_sentiment'), desc: t('feat_sentiment_desc'), color: "from-purple-500/20 to-purple-500/5", iconColor: "text-purple-400" },
    { icon: History, title: t('feat_historical'), desc: t('feat_historical_desc'), color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
    { icon: ShieldAlert, title: t('feat_risk'), desc: t('feat_risk_desc'), color: "from-red-500/20 to-red-500/5", iconColor: "text-red-400" },
    { icon: Bell, title: t('feat_alerts'), desc: t('feat_alerts_desc'), color: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-cyan-400" },
    { icon: List, title: t('feat_watchlist'), desc: t('feat_watchlist_desc'), color: "from-pink-500/20 to-pink-500/5", iconColor: "text-pink-400" },
    { icon: LineChart, title: t('feat_charts'), desc: t('feat_charts_desc'), color: "from-indigo-500/20 to-indigo-500/5", iconColor: "text-indigo-400" },
  ];

  return (
    <section id="features" className="relative py-24 dark:bg-[#0a0a0f] bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-4"
          >
            {t('features_title')}
          </motion.h2>
          <p className="text-lg dark:text-gray-400 text-gray-600">{t('features_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative p-6 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 hover:border-blue-500/30 transition-all duration-300"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${feat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl dark:bg-white/5 bg-gray-100 flex items-center justify-center mb-4">
                  <feat.icon className={`w-6 h-6 ${feat.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold dark:text-white text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}