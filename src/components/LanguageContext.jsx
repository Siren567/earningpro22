import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Nav
    nav_login: "Login / Register",
    nav_dashboard: "Dashboard",
    nav_earnings: "Earnings Calendar",
    nav_watchlist: "Watchlist",
    nav_alerts: "Alerts",
    nav_stock_view: "Stock View",
    nav_settings: "Settings",
    nav_admin: "Admin Panel",
    nav_logout: "Logout",
    nav_plans: "See Plans",
    
    // Hero
    hero_title: "AI-Powered Stock Opportunity Scanner",
    hero_subtitle: "Before Earnings Reports",
    hero_desc: "Our AI system scans market data, options flow, sentiment analysis, and historical behavior to identify high-probability stock opportunities before earnings announcements.",
    hero_cta: "See Plans",
    hero_cta_secondary: "Learn More",
    
    // Stats
    stats_stocks_scanned: "Stocks Scanned",
    stats_earnings_analyzed: "Earnings Analyzed",
    stats_ai_success: "AI Success Rate",
    stats_active_users: "Active Users",
    
    // Features
    features_title: "Platform Capabilities",
    features_subtitle: "Discover what makes our AI engine different",
    feat_ai_score: "AI Opportunity Score",
    feat_ai_score_desc: "Each stock is analyzed by our AI model based on options flow, sentiment analysis, historical behavior, and volatility to generate a proprietary opportunity score.",
    feat_options: "Options Flow Analysis",
    feat_options_desc: "Real-time monitoring of unusual options activity, large block trades, and smart money movements to detect institutional positioning before earnings.",
    feat_sentiment: "Market Sentiment Engine",
    feat_sentiment_desc: "Natural language processing of news, social media, and analyst reports to gauge market sentiment and predict price movements.",
    feat_historical: "Historical Pattern Recognition",
    feat_historical_desc: "Deep learning analysis of historical earnings reactions, seasonal patterns, and price behaviors to identify recurring opportunities.",
    feat_risk: "Risk Classification System",
    feat_risk_desc: "Multi-factor risk assessment providing clear green, yellow, orange, and red classifications to help manage position sizing.",
    feat_alerts: "Smart Alert Engine",
    feat_alerts_desc: "Configurable alerts via email, SMS, Discord, and Telegram for price movements, earnings dates, and AI score changes.",
    feat_watchlist: "Dynamic Watchlists",
    feat_watchlist_desc: "Create custom watchlists, follow AI-recommended lists, and discover opportunities shared by the community.",
    feat_charts: "Advanced Charting",
    feat_charts_desc: "Interactive TradingView-style charts with multiple timeframes, technical indicators, and real-time price data.",
    
    // Testimonials
    testimonials_title: "What Traders Say",
    testimonials_subtitle: "Real results from real users",
    
    // FAQ
    faq_title: "Frequently Asked Questions",
    faq_q1: "What does the AI analyze?",
    faq_a1: "Our AI analyzes options flow, market sentiment, historical earnings behavior, volatility patterns, and institutional activity to generate opportunity scores and risk classifications.",
    faq_q2: "Is this financial advice?",
    faq_a2: "No. This platform aggregates and analyzes publicly available market data. It does not provide financial advice. All investment decisions are your own responsibility.",
    faq_q3: "How often are opportunities updated?",
    faq_a3: "Opportunities are updated in real-time throughout market hours. AI scores are recalculated every 15 minutes based on the latest data.",
    faq_q4: "What markets are covered?",
    faq_a4: "We currently cover NYSE, NASDAQ, and major global exchanges. Coverage is expanding regularly.",
    faq_q5: "Can I cancel my subscription?",
    faq_a5: "Yes. You can cancel your subscription at any time from your account settings. Your access continues until the end of the billing period.",
    
    // Footer
    footer_credits: "© 2026 StockPulse AI. All rights reserved.",
    footer_terms: "Terms of Service",
    footer_privacy: "Privacy Policy",
    footer_sitemap: "Site Map",
    footer_contact: "Contact",
    
    // Dashboard
    dash_title: "Dashboard",
    dash_stocks_tracked: "Stocks Tracked",
    dash_avg_ai_score: "Avg AI Score",
    dash_weekly_estimate: "Weekly Estimate",
    dash_categories: "Categories Followed",
    dash_activity: "Recent Activity",
    dash_top_opportunities: "Top Opportunities",
    
    // Earnings
    earnings_title: "Earnings Calendar",
    earnings_calendar_view: "Calendar",
    earnings_list_view: "List",
    earnings_companies_reporting: "companies reporting",
    earnings_risk: "AI Risk",
    
    // Watchlist
    watchlist_title: "Watchlist",
    watchlist_ai_picks: "AI Recommendations",
    watchlist_my_lists: "My Watchlists",
    watchlist_create: "Create Watchlist",
    watchlist_search: "Search stocks...",
    watchlist_add: "Add to Watchlist",
    watchlist_global: "Global Majors",
    
    // Alerts
    alerts_title: "Alerts",
    alerts_active: "Active Alerts",
    alerts_create: "Create Alert",
    alerts_channels: "Notification Channels",
    alerts_default: "Default Alerts",
    alerts_custom: "Custom Alerts",
    alert_market_open: "Market Open",
    alert_market_close: "Market Close",
    alert_earnings: "Earnings Report",
    alert_entry: "Entry Price",
    alert_exit: "Exit Price",
    alert_threshold: "Price Threshold",
    
    // Stock View
    stock_view_title: "Stock View",
    stock_hours: "Hours",
    stock_days: "Days",
    stock_weeks: "Weeks",
    stock_months: "Months",
    
    // Settings
    settings_title: "Settings",
    settings_profile: "Profile",
    settings_security: "Security",
    settings_subscription: "Subscription",
    settings_preferences: "Preferences",
    settings_change_password: "Change Password",
    settings_change_email: "Change Email",
    settings_payment: "Update Payment",
    settings_upload_avatar: "Upload Avatar",
    settings_language: "Language",
    settings_theme: "Theme",
    
    // Admin
    admin_title: "Admin Panel",
    admin_users: "User Management",
    admin_stocks: "AI Stock Management",
    admin_subscriptions: "Subscription Plans",
    admin_suspend: "Suspend",
    admin_delete: "Delete",
    admin_add_user: "Add User",
    admin_upgrade: "Upgrade",
    admin_downgrade: "Downgrade",
    
    // Plans
    plans_title: "Choose Your Plan",
    plans_subtitle: "Start discovering opportunities today",
    plans_monthly: "Monthly",
    plans_yearly: "Yearly",
    plans_free: "Free",
    plans_premium: "Premium",
    plans_select: "Select Plan",
    plans_current: "Current Plan",
    plans_popular: "Most Popular",
    
    // Disclaimer
    disclaimer_title: "Legal Disclaimer",
    disclaimer_text: "This platform does not provide financial advice. It only aggregates and analyzes publicly available market data. All investment decisions are your own responsibility.",
    disclaimer_accept: "I Understand & Accept",
    
    // Risk levels
    risk_low: "Low Risk",
    risk_medium: "Medium Risk",
    risk_high: "High Risk",
    risk_very_high: "Very High Risk",
    
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    create: "Create",
    search: "Search",
    loading: "Loading...",
    no_data: "No data available",
    price: "Price",
    change: "Change",
    volume: "Volume",
    score: "Score",
    date: "Date",
    time: "Time",
    name: "Name",
    email: "Email",
    password: "Password",
    confirm: "Confirm",
    close: "Close",
    back: "Back",
    next: "Next",
    of: "of",
    per_month: "/mo",
    per_year: "/yr",
  },
  he: {
    // Nav
    nav_login: "התחברות / הרשמה",
    nav_dashboard: "לוח בקרה",
    nav_earnings: "לוח דוחות",
    nav_watchlist: "רשימת מעקב",
    nav_alerts: "התראות",
    nav_stock_view: "תצוגת מניה",
    nav_settings: "הגדרות",
    nav_admin: "פאנל ניהול",
    nav_logout: "התנתקות",
    nav_plans: "צפה בתוכניות",
    
    // Hero
    hero_title: "סורק הזדמנויות מניות מונע AI",
    hero_subtitle: "לפני דוחות רווחים",
    hero_desc: "מערכת ה-AI שלנו סורקת נתוני שוק, זרימת אופציות, ניתוח סנטימנט והתנהגות היסטורית לזיהוי הזדמנויות מניות בהסתברות גבוהה לפני הכרזות רווחים.",
    hero_cta: "צפה בתוכניות",
    hero_cta_secondary: "למד עוד",
    
    // Stats
    stats_stocks_scanned: "מניות נסרקו",
    stats_earnings_analyzed: "דוחות נותחו",
    stats_ai_success: "אחוז הצלחת AI",
    stats_active_users: "משתמשים פעילים",
    
    // Features
    features_title: "יכולות הפלטפורמה",
    features_subtitle: "גלו מה הופך את מנוע ה-AI שלנו לשונה",
    feat_ai_score: "ציון הזדמנות AI",
    feat_ai_score_desc: "כל מניה מנותחת על ידי מודל ה-AI שלנו על בסיס זרימת אופציות, ניתוח סנטימנט, התנהגות היסטורית ותנודתיות ליצירת ציון הזדמנות ייחודי.",
    feat_options: "ניתוח זרימת אופציות",
    feat_options_desc: "מעקב בזמן אמת אחר פעילות אופציות חריגה, עסקאות בלוק גדולות ותנועות כסף חכם לזיהוי מיצוב מוסדי לפני דוחות.",
    feat_sentiment: "מנוע סנטימנט שוק",
    feat_sentiment_desc: "עיבוד שפה טבעית של חדשות, רשתות חברתיות ודוחות אנליסטים למדידת סנטימנט שוק וחיזוי תנועות מחיר.",
    feat_historical: "זיהוי דפוסים היסטוריים",
    feat_historical_desc: "ניתוח למידה עמוקה של תגובות רווחים היסטוריות, דפוסים עונתיים והתנהגויות מחיר לזיהוי הזדמנויות חוזרות.",
    feat_risk: "מערכת סיווג סיכון",
    feat_risk_desc: "הערכת סיכון רב-גורמית המספקת סיווגים ברורים של ירוק, צהוב, כתום ואדום לניהול גודל פוזיציות.",
    feat_alerts: "מנוע התראות חכם",
    feat_alerts_desc: "התראות מותאמות אישית באימייל, SMS, דיסקורד וטלגרם לתנועות מחיר, תאריכי דוחות ושינויי ציון AI.",
    feat_watchlist: "רשימות מעקב דינמיות",
    feat_watchlist_desc: "צרו רשימות מעקב מותאמות, עקבו אחר רשימות מומלצות AI וגלו הזדמנויות שנשתפו על ידי הקהילה.",
    feat_charts: "גרפים מתקדמים",
    feat_charts_desc: "גרפים אינטראקטיביים בסגנון TradingView עם מסגרות זמן מרובות, אינדיקטורים טכניים ונתוני מחיר בזמן אמת.",
    
    // Testimonials
    testimonials_title: "מה סוחרים אומרים",
    testimonials_subtitle: "תוצאות אמיתיות ממשתמשים אמיתיים",
    
    // FAQ
    faq_title: "שאלות נפוצות",
    faq_q1: "מה ה-AI מנתח?",
    faq_a1: "ה-AI שלנו מנתח זרימת אופציות, סנטימנט שוק, התנהגות רווחים היסטורית, דפוסי תנודתיות ופעילות מוסדית ליצירת ציוני הזדמנות וסיווגי סיכון.",
    faq_q2: "האם זו ייעוץ השקעות?",
    faq_a2: "לא. הפלטפורמה אוספת ומנתחת נתוני שוק הזמינים לציבור. היא אינה מספקת ייעוץ השקעות. כל החלטות ההשקעה הן באחריותכם.",
    faq_q3: "באיזו תדירות מתעדכנות הזדמנויות?",
    faq_a3: "הזדמנויות מתעדכנות בזמן אמת לאורך שעות המסחר. ציוני AI מחושבים מחדש כל 15 דקות על בסיס הנתונים העדכניים.",
    faq_q4: "אילו שווקים מכוסים?",
    faq_a4: "אנו מכסים כרגע את NYSE, NASDAQ ובורסות גלובליות מרכזיות. הכיסוי מתרחב באופן קבוע.",
    faq_q5: "האם ניתן לבטל מנוי?",
    faq_a5: "כן. ניתן לבטל את המנוי בכל עת מהגדרות החשבון. הגישה ממשיכה עד סוף תקופת החיוב.",
    
    // Footer
    footer_credits: "© 2026 StockPulse AI. כל הזכויות שמורות.",
    footer_terms: "תנאי שימוש",
    footer_privacy: "מדיניות פרטיות",
    footer_sitemap: "מפת אתר",
    footer_contact: "צור קשר",
    
    // Dashboard
    dash_title: "לוח בקרה",
    dash_stocks_tracked: "מניות במעקב",
    dash_avg_ai_score: "ציון AI ממוצע",
    dash_weekly_estimate: "הערכה שבועית",
    dash_categories: "קטגוריות במעקב",
    dash_activity: "פעילות אחרונה",
    dash_top_opportunities: "הזדמנויות מובילות",
    
    // Earnings
    earnings_title: "לוח דוחות רווחים",
    earnings_calendar_view: "לוח שנה",
    earnings_list_view: "רשימה",
    earnings_companies_reporting: "חברות מדווחות",
    earnings_risk: "סיכון AI",
    
    // Watchlist
    watchlist_title: "רשימת מעקב",
    watchlist_ai_picks: "המלצות AI",
    watchlist_my_lists: "הרשימות שלי",
    watchlist_create: "צור רשימה",
    watchlist_search: "חפש מניות...",
    watchlist_add: "הוסף לרשימה",
    watchlist_global: "מניות גלובליות מובילות",
    
    // Alerts
    alerts_title: "התראות",
    alerts_active: "התראות פעילות",
    alerts_create: "צור התראה",
    alerts_channels: "ערוצי התראות",
    alerts_default: "התראות ברירת מחדל",
    alerts_custom: "התראות מותאמות",
    alert_market_open: "פתיחת שוק",
    alert_market_close: "סגירת שוק",
    alert_earnings: "דוח רווחים",
    alert_entry: "מחיר כניסה",
    alert_exit: "מחיר יציאה",
    alert_threshold: "סף מחיר",
    
    // Stock View
    stock_view_title: "תצוגת מניה",
    stock_hours: "שעות",
    stock_days: "ימים",
    stock_weeks: "שבועות",
    stock_months: "חודשים",
    
    // Settings
    settings_title: "הגדרות",
    settings_profile: "פרופיל",
    settings_security: "אבטחה",
    settings_subscription: "מנוי",
    settings_preferences: "העדפות",
    settings_change_password: "שנה סיסמה",
    settings_change_email: "שנה אימייל",
    settings_payment: "עדכן תשלום",
    settings_upload_avatar: "העלה תמונה",
    settings_language: "שפה",
    settings_theme: "ערכת נושא",
    
    // Admin
    admin_title: "פאנל ניהול",
    admin_users: "ניהול משתמשים",
    admin_stocks: "ניהול מניות AI",
    admin_subscriptions: "תוכניות מנוי",
    admin_suspend: "השעה",
    admin_delete: "מחק",
    admin_add_user: "הוסף משתמש",
    admin_upgrade: "שדרג",
    admin_downgrade: "הורד",
    
    // Plans
    plans_title: "בחר את התוכנית שלך",
    plans_subtitle: "התחל לגלות הזדמנויות היום",
    plans_monthly: "חודשי",
    plans_yearly: "שנתי",
    plans_free: "חינם",
    plans_premium: "פרימיום",
    plans_select: "בחר תוכנית",
    plans_current: "תוכנית נוכחית",
    plans_popular: "הכי פופולרי",
    
    // Disclaimer
    disclaimer_title: "הצהרה משפטית",
    disclaimer_text: "פלטפורמה זו אינה מספקת ייעוץ השקעות. היא רק אוספת ומנתחת נתוני שוק הזמינים לציבור. כל החלטות ההשקעה הן באחריותכם.",
    disclaimer_accept: "אני מבין ומסכים",
    
    // Risk levels
    risk_low: "סיכון נמוך",
    risk_medium: "סיכון בינוני",
    risk_high: "סיכון גבוה",
    risk_very_high: "סיכון גבוה מאוד",
    
    // Common
    save: "שמור",
    cancel: "ביטול",
    delete: "מחק",
    edit: "ערוך",
    create: "צור",
    search: "חפש",
    loading: "טוען...",
    no_data: "אין נתונים זמינים",
    price: "מחיר",
    change: "שינוי",
    volume: "נפח",
    score: "ציון",
    date: "תאריך",
    time: "שעה",
    name: "שם",
    email: "אימייל",
    password: "סיסמה",
    confirm: "אישור",
    close: "סגור",
    back: "חזור",
    next: "הבא",
    of: "מתוך",
    per_month: "/חודש",
    per_year: "/שנה",
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;
  const isRTL = lang === 'he';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;