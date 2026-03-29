import React from 'react';
import { useLanguage } from '../LanguageContext';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = {
  en: [
    { name: "Michael R.", role: "Day Trader", text: "The AI score helped me catch a 23% move on NVDA before their earnings. The options flow data is incredibly accurate.", rating: 5, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces" },
    { name: "Sarah K.", role: "Swing Trader", text: "I've tried many scanners but this is the first one that actually combines sentiment with options data. Game changer.", rating: 5, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces" },
    { name: "David L.", role: "Portfolio Manager", text: "The risk classification system saved me from several bad trades. The red flags are always spot on.", rating: 5, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces" },
    { name: "Emma T.", role: "Retail Investor", text: "Clean interface, real-time data, and the AI watchlist is like having a professional analyst on your team.", rating: 4, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces" },
  ],
  he: [
    { name: "מיכאל ר.", role: "סוחר יומי", text: "ציון ה-AI עזר לי לתפוס מהלך של 23% ב-NVDA לפני הדוחות. נתוני זרימת האופציות מדויקים להפליא.", rating: 5, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces" },
    { name: "שרה כ.", role: "סוחרת סווינג", text: "ניסיתי סורקים רבים אבל זה הראשון שמשלב סנטימנט עם נתוני אופציות. משנה כללי משחק.", rating: 5, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces" },
    { name: "דוד ל.", role: "מנהל תיקים", text: "מערכת סיווג הסיכון הצילה אותי מכמה עסקאות גרועות. הדגלים האדומים תמיד מדויקים.", rating: 5, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces" },
    { name: "אמה ת.", role: "משקיעה פרטית", text: "ממשק נקי, נתונים בזמן אמת, ורשימת ה-AI היא כמו לקבל אנליסט מקצועי בצוות שלך.", rating: 4, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces" },
  ]
};

export default function Testimonials() {
  const { t, lang } = useLanguage();
  const items = testimonials[lang] || testimonials.en;

  return (
    <section className="relative py-24 dark:bg-[#0d0d14] bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-4"
          >
            {t('testimonials_title')}
          </motion.h2>
          <p className="text-lg dark:text-gray-400 text-gray-600">{t('testimonials_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className={`w-4 h-4 ${s < item.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
                ))}
              </div>
              <p className="text-sm dark:text-gray-300 text-gray-700 leading-relaxed mb-4">"{item.text}"</p>
              <div className="flex items-center gap-3">
                <img 
                  src={item.avatar} 
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold dark:text-white text-gray-900">{item.name}</p>
                  <p className="text-xs dark:text-gray-500 text-gray-500">{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}