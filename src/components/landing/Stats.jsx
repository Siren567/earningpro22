import React from 'react';
import { useLanguage } from '../LanguageContext';
import { motion } from 'framer-motion';
import { BarChart3, FileText, Cpu, Users } from 'lucide-react';

export default function Stats() {
  const { t } = useLanguage();

  const stats = [
    { icon: BarChart3, value: "12,847", label: t('stats_stocks_scanned'), color: "text-blue-400" },
    { icon: FileText, value: "3,421", label: t('stats_earnings_analyzed'), color: "text-purple-400" },
    { icon: Cpu, value: "87.3%", label: t('stats_ai_success'), color: "text-cyan-400" },
    { icon: Users, value: "24,500+", label: t('stats_active_users'), color: "text-amber-400" },
  ];

  return (
    <section className="relative py-20 dark:bg-[#0d0d14] bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200"
            >
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
              <div className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm dark:text-gray-500 text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}