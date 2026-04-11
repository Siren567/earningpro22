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

    // Suspension
    suspended_title: "Account Suspended",
    suspended_desc: "Your account has been suspended. Please contact support if you believe this is an error.",
    suspended_sign_out: "Sign out",

    // Mobile nav
    mobile_home: "Home",
    mobile_stocks: "Stocks",
    mobile_watchlist_short: "Watchlist",
    mobile_earnings_short: "Earnings",

    // Dashboard
    dash_gecko_picks: "Top Gecko Picks",
    dash_gecko_subtitle: "Surfacing opportunities before they become headlines",
    dash_updated: "Updated",
    dash_premium_feature: "Premium feature",
    dash_upgrade_unlock: "Upgrade to unlock",
    dash_geckovic_premium: "GeckoVision is a Premium feature",
    dash_geckovic_desc: "Upgrade to unlock AI chart analysis, pattern detection, and real-time signals.",
    dash_upgrade_premium: "Upgrade to Premium",

    // Greetings
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",
    greeting_night: "Good night",
    markets_live: "Markets live",

    // Earnings page extra
    earnings_upcoming_reports: "upcoming reports",
    earnings_companies: "companies",
    earnings_company: "company",
    earnings_click_gako: "click a card to open Gako Insights",
    earnings_no_upcoming: "No upcoming earnings found",
    earnings_check_back: "Check back later",
    earnings_symbol: "Symbol",
    earnings_dismiss: "Dismiss",
    earnings_free_showing: "Showing earnings for the next",
    earnings_free_plan: "— Free plan",
    earnings_upgrade_full: "Upgrade for full calendar →",
    earnings_today_badge: "Today",
    earnings_trend: "Trend",
    earnings_risk_label: "Risk",
    earnings_confidence_score: "Confidence Score",
    earnings_market_exp: "Market Expectations",
    earnings_bull: "Bull Scenario",
    earnings_bear: "Bear Scenario",
    earnings_summary: "Summary",
    earnings_gako_insights: "Gako Insights",
    earnings_open_stock: "Open Stock View",
    earnings_high_conf: "High confidence",
    earnings_med_conf: "Medium confidence",
    earnings_low_conf: "Low confidence",

    // Calendar days
    day_sun: "Sun",
    day_mon: "Mon",
    day_tue: "Tue",
    day_wed: "Wed",
    day_thu: "Thu",
    day_fri: "Fri",
    day_sat: "Sat",

    // Watchlist sidebar
    watchlist_sidebar_title: "My Watchlist",
    watchlist_no_stocks: "No stocks yet",
    watchlist_no_stocks_desc: "Save stocks from the Watchlist to track them here",
    watchlist_go: "Go to Watchlist",
    watchlist_view_all: "View all",
    watchlist_stocks: "stocks",
    watchlist_stock: "stock",
    watchlist_tracked: "tracked",
    watchlist_price_col: "Price",

    // Earnings sidebar
    upcoming_earnings: "Upcoming Earnings",
    no_upcoming_earnings: "No upcoming earnings",
    earnings_tomorrow: "Tomorrow",
    earnings_in_days: "in",

    // Notifications
    notifications_title: "Notifications",
    notifications_unread: "unread",
    no_notifications: "No notifications",

    // AI card
    gecko_score: "Gecko Score",
    gecko_insight: "Gecko Insight",
    confidence_label: "confidence",
    view_label: "View",

    // Settings extra
    settings_last_name: "Last Name",
    settings_member_since: "Member Since",
    settings_plan_label: "Plan",
    settings_status: "Status",
    settings_renewal: "Renewal / Expiry",
    settings_free_plan: "Free Plan",
    settings_on_free: "You are currently on the free plan",
    settings_upgrade_plan: "Upgrade Plan",
    settings_saving: "Saving…",
    settings_change_password_title: "Change Password",
    settings_current_password: "Current Password",
    settings_new_password: "New Password",
    settings_confirm_password: "Confirm New Password",
    settings_generate: "Generate",
    settings_updating: "Updating...",
    settings_logout_title: "Logout",
    settings_current_lang: "Current language:",
    settings_notifications_tab: "Notifications",
    settings_dark: "Dark",
    settings_light: "Light",
    settings_active: "Active",
    settings_expired: "Expired",
    settings_expires_in: "Expires in",
    settings_days_remaining: "days remaining",
    settings_active_days: "Active —",
    settings_your_name: "Your Name",

    // PWA / Install app
    pwa_install_title: "Install StockPulse",
    pwa_install_desc:
      "Install the app for quick access, offline support, and a full-screen experience — like a native app on your device.",
    pwa_install_button: "Install app",
    pwa_install_ios_button: "Add to Home Screen (iPhone / iPad)",
    pwa_install_toast_accepted: "App install started",
    pwa_install_toast_dismissed: "Install dismissed — you can try again anytime from here.",
    pwa_ios_modal_title: "Add StockPulse to your Home Screen",
    pwa_ios_modal_intro:
      "Safari doesn’t show a system install button. Follow these steps to add the app:",
    pwa_ios_step1_title: "Open the Share menu",
    pwa_ios_step1_desc: "Tap the Share icon at the bottom of Safari (square with arrow pointing up).",
    pwa_ios_step2_title: "Add to Home Screen",
    pwa_ios_step2_desc: 'Scroll and tap "Add to Home Screen", then confirm.',
    status_days: "days",
    status_day: "day",

    // Auth
    auth_back_home: "Back to Home",
    auth_account_confirmed: "Your account is confirmed — please log in.",
    auth_check_email: "Check your email",
    auth_check_email_desc: "We sent a confirmation link to",
    auth_activate: "Click the link to activate your account, then come back to log in.",
    auth_back_login: "Back to Login",
    auth_welcome: "Welcome back",
    auth_create_account: "Create your account",
    auth_first_name: "First Name",
    auth_last_name: "Last Name",
    auth_birth_date: "Birth Date",
    auth_remember_me: "Remember Me",
    auth_forgot_password: "Forgot Password?",
    auth_login: "Login",
    auth_register: "Register",
    auth_no_account: "Don't have an account? Sign up",
    auth_has_account: "Already have an account? Login",
    auth_processing: "Processing...",
    auth_generate_password: "Generate password",
    auth_agree_terms: "I agree to the",
    auth_and: "and",
    auth_disclaimer_notice: "By creating an account, you acknowledge that this platform does not provide financial advice and is intended for informational and educational purposes only.",
    auth_passwords_match: "Passwords match",
    auth_passwords_no_match: "Passwords do not match",
    auth_pwd_very_weak: "Very Weak",
    auth_pwd_weak: "Weak",
    auth_pwd_medium: "Medium",
    auth_pwd_strong: "Strong",
    auth_pwd_very_strong: "Very Strong",
    auth_pwd_req_length: "At least 8 characters",
    auth_pwd_req_upper: "At least 1 uppercase letter",
    auth_pwd_req_lower: "At least 1 lowercase letter",
    auth_pwd_req_number: "At least 1 number",
    auth_pwd_req_special: "At least 1 special character (!@#$%^&*)",

    // Hero
    hero_get_started: "Get Started Free",
    hero_ai_powered: "AI-Powered Analysis",

    // Landing nav
    lang_coming_soon: "Coming Soon",

    // Plans
    plans_no_plans: "No plans available at this time.",

    // Watchlist page
    watchlist_subtitle: "Track and manage your favorite assets",

    // Search inputs
    search_placeholder_short: "Search symbol or company...",
    search_placeholder_long: "Search symbol or company (e.g. AAPL, Tesla)",
    search_type_hint: "Type to search stocks, ETFs, crypto...",

    // Stock view
    stock_empty_search: "Search for a stock to view detailed analysis",
    stock_ai_subtitle: "AI-powered stock analysis and earnings insights",

    // Gecko Vision
    gecko_vision_coming_soon: "Chart analysis is coming soon",
    gecko_vision_desc: "Upload a chart screenshot to get instant pattern detection and signals",
    gecko_vision_upload: "Upload chart",
    gecko_vision_feat1: "Detect breakout and momentum patterns",
    gecko_vision_feat2: "Instant signal analysis from chart screenshots",
    gecko_vision_feat3: "Risk/reward and setup scoring",

    // Price chart
    price_chart: "Price Chart",

    // Confidence levels (AIOpportunityCard)
    confidence_very_high: "Very High",
    confidence_high: "High",
    confidence_moderate: "Moderate",
    confidence_low: "Low",

    // Key Metrics labels
    metric_volume: "Volume",
    metric_avg_volume: "Avg Volume",
    metric_rel_volume: "Relative Volume",
    metric_market_cap: "Market Cap",
    metric_float: "Float",
    metric_shares_outstanding: "Shares Outstanding",
    metric_volatility: "Volatility",
    metric_day_range: "Day Range",
    metric_52w_range: "52W Range",
    metric_pe_ratio: "P/E Ratio",
    metric_eps: "EPS (TTM)",
    metric_beta: "Beta",
    metric_div_yield: "Div Yield",
    metric_open: "Open",
    metric_fwd_pe: "Fwd P/E",
    metric_pb_ratio: "P/B Ratio",
    metric_revenue: "Revenue",
    metric_profit_margin: "Profit Margin",
    metric_op_margin: "Op. Margin",
    metric_quick_ratio: "Quick Ratio",
    metric_current_ratio: "Current Ratio",
    metric_unavailable: "Data unavailable",

    // Key Metrics tooltips
    tooltip_volume: "Number of shares traded so far in the current session",
    tooltip_avg_volume: "Average daily trading volume over the last 30 days",
    tooltip_market_cap: "Market capitalization is the total value of a company's shares.",
    tooltip_float: "Float represents the number of shares available for public trading.",
    tooltip_shares_outstanding: "Shares Outstanding represents the total number of a company's issued shares.",
    tooltip_pe: "Price-to-Earnings ratio based on the trailing twelve months",
    tooltip_eps: "Earnings per share over the trailing twelve months",
    tooltip_day_range: "Today's intraday price range: low to high",
    tooltip_52w: "52-week lowest and highest closing price",
    tooltip_beta: "Volatility relative to the S&P 500 — beta > 1 means more volatile",
    tooltip_div_yield: "Annual dividend as a percentage of the current share price",
    tooltip_open: "The price at which the stock opened at the start of today's session",
    tooltip_fwd_pe: "Forward P/E ratio based on next year's estimated earnings",
    tooltip_pb: "Price-to-Book ratio — share price relative to book value per share",
    tooltip_rvol: "Relative Volume compares current trading volume to the average volume. Higher values may indicate unusual market activity.",
    tooltip_volatility: "Shows how much the stock moved within the day relative to its current price.",
    tooltip_revenue: "Total revenue generated over the trailing twelve months",
    tooltip_profit_margin: "Net income as a percentage of total revenue (trailing twelve months)",
    tooltip_op_margin: "Operating income as a percentage of revenue (trailing twelve months)",
    tooltip_quick_ratio: "Ability to cover short-term liabilities with liquid assets (excl. inventory)",
    tooltip_current_ratio: "Ability to cover short-term liabilities with current assets",

    // RVOL status
    rvol_high_interest: "High Interest",
    rvol_unusual: "Unusual Activity",
    rvol_normal: "Normal",
    rvol_low: "Low Activity",

    // Volatility status
    vol_high: "High",
    vol_moderate: "Moderate",
    vol_low: "Low",

    // Wyckoff
    wyckoff_title: "Wyckoff Analysis",
    wyckoff_desc: "AI-powered Wyckoff phase detection with annotated chart",
    wyckoff_premium_note: "Premium feature · Upgrade to unlock",
    wyckoff_limit_reached: "Daily limit reached · Resets at midnight",
    wyckoff_analyze: "Analyze Chart",
    wyckoff_upgrade_unlock: "Upgrade to Unlock",
    wyckoff_upgrade_analyze: "Upgrade to Analyze",
    wyckoff_reanalyze: "Re-analyze",
    wyckoff_export_png: "Export PNG",
    wyckoff_bias: "Bias",
    wyckoff_invalidation: "Invalidation",
    wyckoff_trade_idea: "Trade Idea",
    wyckoff_interpretation: "Wyckoff Interpretation",
    wyckoff_failed: "Analysis failed",
    wyckoff_retry: "Retry",
    wyckoff_analyzing: "Analyzing",
    wyckoff_fetching_data: "Fetching price data and running Wyckoff analysis",

    // Notifications settings
    notif_push_title: "Push Notifications",
    notif_push_desc: "Real-time alerts delivered instantly to your device before key events.",
    notif_push_enable: "Enable push notifications",
    notif_push_enable_sub: "Receive alerts directly on this device",
    notif_timing_label: "Notification timing",
    notif_timing_15min_before: "15 min before",
    notif_timing_1hr_before: "1 hour before",
    notif_timing_at_event: "At event time",
    notif_earnings_title: "Earnings Alerts",
    notif_earnings_desc: "Stay ahead of earnings with pre-market and after-hours notifications.",
    notif_earnings_remind: "Earnings reminders",
    notif_earnings_remind_sub: "Push alerts before scheduled earnings reports",
    notif_afterhours: "After-hours reports",
    notif_afterhours_sub: "Get notified for earnings released after market close",
    notif_lead_time: "Lead time",
    notif_timing_15min: "15 min",
    notif_timing_1hr: "1 hour",
    notif_timing_1day: "1 day",
    notif_price_title: "Price Movement Alerts",
    notif_price_desc: "Detect unusual price action and volatility before the market reacts.",
    notif_price_unusual: "Unusual price moves",
    notif_price_unusual_sub: "Alert when a stock moves beyond your set threshold",
    notif_threshold: "Threshold",
    notif_custom: "Custom",
    notif_watchlist_title: "Watchlist Alerts",
    notif_watchlist_desc: "Track your selected symbols and get notified on key movements.",
    notif_watchlist_activity: "Watchlist activity",
    notif_watchlist_activity_sub: "Alerts for stocks across all your watchlists",
    notif_alert_scope: "Alert scope",
    notif_all_symbols: "All symbols",
    notif_starred_only: "Starred only",
    notif_custom_list: "Custom list",
    notif_news_title: "News & Market Updates",
    notif_news_desc: "Receive major company news and market-moving events in real time.",
    notif_breaking_news: "Breaking market news",
    notif_breaking_news_sub: "High-impact macro or sector news",
    notif_frequency: "Frequency",
    notif_realtime: "Real-time",
    notif_hourly_digest: "Hourly digest",
    notif_daily_digest: "Daily digest",
    notif_email_title: "Email Notifications",
    notif_email_desc: "Control which updates are also delivered to your inbox.",
    notif_email_weekly: "Weekly portfolio summary",
    notif_email_weekly_sub: "A digest of key moves and upcoming events",
    notif_email_earnings: "Earnings reports",
    notif_email_earnings_sub: "Email copy of earnings alerts for tracked stocks",
    notif_dev_note: "Notification features are in active development and will roll out progressively.",
  },
  he: {
    // Nav
    nav_login: "התחברות / הרשמה",
    nav_dashboard: "לוח בקרה",
    nav_earnings: "לוח דוחות",
    nav_watchlist: "רשימת מעקב",
    nav_alerts: "התראות",
    nav_stock_view: "הצג מניה",
    nav_settings: "הגדרות",
    nav_admin: "פאנל ניהול",
    nav_logout: "התנתקות",
    nav_plans: "צפה בתוכניות",
    
    // Hero
    hero_title: "סורק מניות מבוסס בינה מלאכותית",
    hero_subtitle: "לפני דוחות רווחים",
    hero_desc: "הבינה המלאכותית שלנו סורקת נתוני שוק, אופציות, ניתוח סנטימנט והתנהגות היסטורית לאיתור הזדמנויות מניות בהסתברות גבוהה לפני הכרזות רווחים.",
    hero_cta: "צפה בתוכניות",
    hero_cta_secondary: "למד עוד",
    
    // Stats
    stats_stocks_scanned: "מניות שנסרקו",
    stats_earnings_analyzed: "דוחות שנותחו",
    stats_ai_success: "אחוז הצלחה",
    stats_active_users: "משתמשים פעילים",
    
    // Features
    features_title: "יכולות הפלטפורמה",
    features_subtitle: "גלו מה הופך את מנוע ה-AI שלנו לשונה",
    feat_ai_score: "ציון אופציות",
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
    dash_avg_ai_score: "ציון  ממוצע",
    dash_weekly_estimate: "דוח שבועי",
    dash_categories: "קטגוריות במעקב",
    dash_activity: "פעילות אחרונה",
    dash_top_opportunities: "הזדמנויות מובילות",
    
    // Earnings
    earnings_title: "לוח דוחות רווחים",
    earnings_calendar_view: "לוח שנה",
    earnings_list_view: "רשימה",
    earnings_companies_reporting: "חברות מדווחות",
    earnings_risk: "סיכון ",
    
    // Watchlist
    watchlist_title: "רשימת מעקב",
    watchlist_ai_picks: "המלצות ",
    watchlist_my_lists: "הרשימות שלי",
    watchlist_create: "צור רשימה",
    watchlist_search: "חפש מניות...",
    watchlist_add: "הוסף לרשימה",
    watchlist_global: "מניות  מובילות",
    
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
    settings_payment: "עדכן אמצעי תשלום",
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

    // Suspension
    suspended_title: "החשבון מושעה",
    suspended_desc: "חשבונך הושעה. אנא פנה לתמיכה אם אתה סבור שמדובר בטעות.",
    suspended_sign_out: "התנתק",

    // Mobile nav
    mobile_home: "בית",
    mobile_stocks: "מניות",
    mobile_watchlist_short: "מעקב",
    mobile_earnings_short: "דוחות",

    // Dashboard
    dash_gecko_picks: "הבחירות המובילות של גאקו  ",
    dash_gecko_subtitle: "מגלים הזדמנויות לפני שהופכות לכותרות",
    dash_updated: "עודכן",
    dash_premium_feature: "תוכנית פרימיום",
    dash_upgrade_unlock: "שדרג לביטול נעילה",
    dash_geckovic_premium: "GeckoVision היא תכונת פרימיום",
    dash_geckovic_desc: "שדרג לביטול נעילת ניתוח תרשימי , זיהוי דפוסים ואותות בזמן אמת.",
    dash_upgrade_premium: "שדרג לפרימיום",

    // Greetings
    greeting_morning: "בוקר טוב",
    greeting_afternoon: "צהריים טובים",
    greeting_evening: "ערב טוב",
    greeting_night: "לילה טוב",
    markets_live: "סטטוס שוק",

    // Earnings page extra
    earnings_upcoming_reports: "דוחות קרובים",
    earnings_companies: "חברות",
    earnings_company: "חברה",
    earnings_click_gako: "לחץ על כרטיס לפתיחת Gako Insights",
    earnings_no_upcoming: "לא נמצאו דוחות קרובים",
    earnings_check_back: "בדוק שוב מאוחר יותר",
    earnings_symbol: "סימבול",
    earnings_dismiss: "סגור",
    earnings_free_showing: "מציג דוחות ל-",
    earnings_free_plan: "— תוכנית חינם",
    earnings_upgrade_full: "שדרג לצפייה בלוח המלא →",
    earnings_today_badge: "היום",
    earnings_trend: "מגמה",
    earnings_risk_label: "סיכון",
    earnings_confidence_score: "ציון ביטחון",
    earnings_market_exp: "ציפיות שוק",
    earnings_bull: "תרחיש שוורי",
    earnings_bear: "תרחיש דובי",
    earnings_summary: "סיכום",
    earnings_gako_insights: "התובנות של גאקו",
    earnings_open_stock: "הצג מניה",
    earnings_high_conf: "סיכון גבוה",
    earnings_med_conf: "סיכון בינוני",
    earnings_low_conf: "סיכון נמוך",

    // Calendar days
    day_sun: "א׳",
    day_mon: "ב׳",
    day_tue: "ג׳",
    day_wed: "ד׳",
    day_thu: "ה׳",
    day_fri: "ו׳",
    day_sat: "ש׳",

    // Watchlist sidebar
    watchlist_sidebar_title: "רשימת המעקב שלי",
    watchlist_no_stocks: "אין מניות עדיין",
    watchlist_no_stocks_desc: "שמור מניות מרשימת המעקב כדי לעקוב אחריהן כאן",
    watchlist_go: "לרשימת המעקב",
    watchlist_view_all: "הצג הכל",
    watchlist_stocks: "מניות",
    watchlist_stock: "מניה",
    watchlist_tracked: "במעקב",
    watchlist_price_col: "מחיר",

    // Earnings sidebar
    upcoming_earnings: "דוחות קרובים",
    no_upcoming_earnings: "אין דוחות קרובים",
    earnings_tomorrow: "מחר",
    earnings_in_days: "בעוד",

    // Notifications
    notifications_title: "התראות",
    notifications_unread: "לא נקראו",
    no_notifications: "אין התראות",

    // AI card
    gecko_score: "הציון של גאקו ",
    gecko_insight: " התובנות של גאקו",
    confidence_label: "סיכון",
    view_label: "הצג",

    // Settings extra
    settings_last_name: "שם משפחה",
    settings_member_since: "תאריך הצטרפות",
    settings_plan_label: "תוכנית",
    settings_status: "סטטוס",
    settings_renewal: "חידוש / תפוגה",
    settings_free_plan: "תוכנית חינם",
    settings_on_free: "אתה כרגע בתוכנית החינם",
    settings_upgrade_plan: "שדרג תוכנית",
    settings_saving: "שומר…",
    settings_change_password_title: "שינוי סיסמה",
    settings_current_password: "סיסמה נוכחית",
    settings_new_password: "סיסמה חדשה",
    settings_confirm_password: "אשר סיסמה חדשה",
    settings_generate: "צור",
    settings_updating: "מעדכן...",
    settings_logout_title: "התנתקות",
    settings_current_lang: "שפה נוכחית:",
    settings_notifications_tab: "התראות",
    settings_dark: "כהה",
    settings_light: "בהיר",
    settings_active: "פעיל",
    settings_expired: "פג תוקף",
    settings_expires_in: "פג תוקף בעוד",
    settings_days_remaining: "ימים נותרו",
    settings_active_days: "פעיל —",
    settings_your_name: "השם שלך",

    // PWA / Install app
    pwa_install_title: "התקנת StockPulse",
    pwa_install_desc:
      "התקינו את האפליקציה לגישה מהירה, תמיכה במצב לא מקוון וחוויית מסך מלא — כמו אפליקציה מקורית במכשיר.",
    pwa_install_button: "התקן אפליקציה",
    pwa_install_ios_button: "הוספה למסך הבית (iPhone / iPad)",
    pwa_install_toast_accepted: "ההתקנה התחילה",
    pwa_install_toast_dismissed: "ההתקנה בוטלה — אפשר לנסות שוב כאן בכל עת.",
    pwa_ios_modal_title: "הוספת StockPulse למסך הבית",
    pwa_ios_modal_intro:
      "ב־Safari אין כפתור התקנה מערכתי. בצעו את השלבים הבאים:",
    pwa_ios_step1_title: "פתחו את תפריט השיתוף",
    pwa_ios_step1_desc: "הקישו על סמל השיתוף בתחתית Safari (ריבוע עם חץ למעלה).",
    pwa_ios_step2_title: "הוספה למסך הבית",
    pwa_ios_step2_desc: 'גללו והקישו על "הוסף למסך הבית" ואשרו.',
    status_days: "ימים",
    status_day: "יום",

    // Auth
    auth_back_home: "חזרה לדף הבית",
    auth_account_confirmed: "חשבונך אושר — אנא התחבר.",
    auth_check_email: "בדוק את האימייל שלך",
    auth_check_email_desc: "שלחנו קישור אימות אל",
    auth_activate: "לחץ על הקישור לאימות חשבונך ואז חזור להתחברות.",
    auth_back_login: "חזרה להתחברות",
    auth_welcome: "ברוך שובך",
    auth_create_account: "צור את חשבונך",
    auth_first_name: "שם פרטי",
    auth_last_name: "שם משפחה",
    auth_birth_date: "תאריך לידה",
    auth_remember_me: "זכור אותי",
    auth_forgot_password: "שכחת סיסמה?",
    auth_login: "התחברות",
    auth_register: "הרשמה",
    auth_no_account: "אין חשבון? הירשם",
    auth_has_account: "יש כבר חשבון? התחבר",
    auth_processing: "מעבד...",
    auth_generate_password: "צור סיסמה",
    auth_agree_terms: "אני מסכים ל",
    auth_and: "ו",
    auth_disclaimer_notice: "בפתיחת חשבון, אתה מאשר כי פלטפורמה זו אינה מספקת ייעוץ פיננסי ומיועדת למטרות מידע וחינוך בלבד.",
    auth_passwords_match: "הסיסמאות תואמות",
    auth_passwords_no_match: "הסיסמאות אינן תואמות",
    auth_pwd_very_weak: "חלשה מאוד",
    auth_pwd_weak: "חלשה",
    auth_pwd_medium: "בינונית",
    auth_pwd_strong: "חזקה",
    auth_pwd_very_strong: "חזקה מאוד",
    auth_pwd_req_length: "לפחות 8 תווים",
    auth_pwd_req_upper: "לפחות אות גדולה אחת",
    auth_pwd_req_lower: "לפחות אות קטנה אחת",
    auth_pwd_req_number: "לפחות ספרה אחת",
    auth_pwd_req_special: "לפחות תו מיוחד אחד (!@#$%^&*)",

    // Hero
    hero_get_started: "התחל בחינם",
    hero_ai_powered: "ניתוח מבוסס בינה מלאכותית",

    // Landing nav
    lang_coming_soon: "בקרוב",

    // Plans
    plans_no_plans: "אין תוכניות זמינות כרגע.",

    // Watchlist page
    watchlist_subtitle: "עקוב אחר המניות המועדפות שלך",

    // Search inputs
    search_placeholder_short: "חפש מניה או חברה...",
    search_placeholder_long: "חפש מניה או חברה (למשל AAPL, Tesla)",
    search_type_hint: "הקלד כדי לחפש מניות, קרנות סל או קריפטו...",

    // Stock view
    stock_empty_search: "חפש מניה כדי לצפות בניתוח מפורט",
    stock_ai_subtitle: "ניתוח מניות ותובנות דוחות מבוססי בינה מלאכותית",

    // Gecko Vision
    gecko_vision_coming_soon: "ניתוח גרפים בקרוב",
    gecko_vision_desc: "העלה תמונת גרף לזיהוי מיידי של דפוסים ואותות",
    gecko_vision_upload: "העלה גרף",
    gecko_vision_feat1: "זיהוי דפוסי פריצה ומומנטום",
    gecko_vision_feat2: "ניתוח אותות מיידי מצילומי גרפים",
    gecko_vision_feat3: "ניקוד סיכון/תשואה ומצב הגדרה",

    // Price chart
    price_chart: "גרף מניה",

    // Confidence levels
    confidence_very_high: "גבוה מאוד",
    confidence_high: "גבוה",
    confidence_moderate: "בינוני",
    confidence_low: "נמוך",

    // Key Metrics labels
    metric_volume: "נפח מסחר",
    metric_avg_volume: "נפח ממוצע",
    metric_rel_volume: "נפח יחסי",
    metric_market_cap: "שווי שוק",
    metric_float: "מניות צפות",
    metric_shares_outstanding: "מניות בסחר",
    metric_volatility: "תנודתיות",
    metric_day_range: "טווח יומי",
    metric_52w_range: "טווח 52 שב'",
    metric_pe_ratio: "מכפיל רווח",
    metric_eps: "EPS (TTM)",
    metric_beta: "ביטא",
    metric_div_yield: "תשואת דיב'",
    metric_open: "פתיחה",
    metric_fwd_pe: "מכפיל עתידי",
    metric_pb_ratio: "מכפיל הון",
    metric_revenue: "הכנסות",
    metric_profit_margin: "שולי רווח",
    metric_op_margin: "שולי תפעול",
    metric_quick_ratio: "יחס מהיר",
    metric_current_ratio: "יחס שוטף",
    metric_unavailable: "נתון לא זמין",

    // Key Metrics tooltips
    tooltip_volume: "מספר מניות שנסחרו בסשן הנוכחי",
    tooltip_avg_volume: "נפח המסחר הממוצע ביום ב-30 הימים האחרונים",
    tooltip_market_cap: "שווי שוק הוא הערך הכולל של מניות החברה.",
    tooltip_float: "מניות צפות הן מספר המניות הזמינות לסחר ציבורי.",
    tooltip_shares_outstanding: "מניות בסחר הן המספר הכולל של מניות החברה שהונפקו.",
    tooltip_pe: "מכפיל רווח על בסיס שניים עשר החודשים האחרונים",
    tooltip_eps: "רווח למניה ב-12 החודשים האחרונים",
    tooltip_day_range: "טווח המחירים היומי: מינימום עד מקסימום",
    tooltip_52w: "מחיר הסגירה הנמוך והגבוה ב-52 השבועות האחרונים",
    tooltip_beta: "תנודתיות ביחס ל-S&P 500 — ביטא > 1 משמעו יותר תנודתי",
    tooltip_div_yield: "דיבידנד שנתי כאחוז ממחיר המניה הנוכחי",
    tooltip_open: "המחיר שבו המניה נפתחה בתחילת סשן המסחר היום",
    tooltip_fwd_pe: "מכפיל רווח עתידי המבוסס על רווחים משוערים לשנה הבאה",
    tooltip_pb: "יחס מחיר לספרים — מחיר המניה ביחס לערך הספרים למניה",
    tooltip_rvol: "נפח יחסי משווה את נפח המסחר הנוכחי לנפח הממוצע. ערכים גבוהים עשויים להצביע על פעילות חריגה בשוק.",
    tooltip_volatility: "מציג כמה המניה זזה במהלך היום ביחס למחירה הנוכחי.",
    tooltip_revenue: "סך ההכנסות ב-12 החודשים האחרונים",
    tooltip_profit_margin: "הכנסה נטו כאחוז מסך ההכנסות (12 חודשים אחרונים)",
    tooltip_op_margin: "הכנסה תפעולית כאחוז מהכנסות (12 חודשים אחרונים)",
    tooltip_quick_ratio: "יכולת כיסוי התחייבויות לטווח קצר עם נכסים נזילים (ללא מלאי)",
    tooltip_current_ratio: "יכולת כיסוי התחייבויות לטווח קצר עם נכסים שוטפים",

    // RVOL status
    rvol_high_interest: "עניין גבוה",
    rvol_unusual: "פעילות חריגה",
    rvol_normal: "רגיל",
    rvol_low: "פעילות נמוכה",

    // Volatility status
    vol_high: "גבוהה",
    vol_moderate: "בינונית",
    vol_low: "נמוכה",

    // Wyckoff
    wyckoff_title: "ניתוח וויקוף",
    wyckoff_desc: "ניתוח בינה מלאכותית מבוסס על שיטת וויקף",
    wyckoff_premium_note: "פיצ'ר פרמיום · שדרג לפתיחה",
    wyckoff_limit_reached: "הגעת למגבלה היומית · מתאפסת בחצות",
    wyckoff_analyze: "נתח גרף",
    wyckoff_upgrade_unlock: "שדרג לפתיחה",
    wyckoff_upgrade_analyze: "שדרג לניתוח",
    wyckoff_reanalyze: "נתח מחדש",
    wyckoff_export_png: "ייצוא PNG",
    wyckoff_bias: "הטיה",
    wyckoff_invalidation: "ביטול תרחיש",
    wyckoff_trade_idea: "רעיון מסחר",
    wyckoff_interpretation: "פרשנות וויקוף",
    wyckoff_failed: "הניתוח נכשל",
    wyckoff_retry: "נסה שוב",
    wyckoff_analyzing: "מנתח",
    wyckoff_fetching_data: "טוען נתוני מחיר ומריץ ניתוח וויקוף",

    // Notifications settings
    notif_push_title: "התראות פוש",
    notif_push_desc: "התראות בזמן אמת שנשלחות ישירות למכשיר שלך לפני אירועים מרכזיים.",
    notif_push_enable: "הפעל התראות פוש",
    notif_push_enable_sub: "קבל התראות ישירות במכשיר זה",
    notif_timing_label: "תזמון התראות",
    notif_timing_15min_before: "15 דק' לפני",
    notif_timing_1hr_before: "שעה לפני",
    notif_timing_at_event: "בזמן האירוע",
    notif_earnings_title: "התראות דוחות",
    notif_earnings_desc: "הישאר צעד לפני הדוחות עם התראות לפני שוק ואחרי שעות המסחר.",
    notif_earnings_remind: "תזכורות דוחות",
    notif_earnings_remind_sub: "התראות לפני דוחות רווחים מתוכננים",
    notif_afterhours: "דוחות אחרי שעות",
    notif_afterhours_sub: "קבל התראה לדוחות שפורסמו לאחר סגירת השוק",
    notif_lead_time: "זמן הקדמה",
    notif_timing_15min: "15 דק'",
    notif_timing_1hr: "שעה",
    notif_timing_1day: "יום",
    notif_price_title: "התראות תנועת מחיר",
    notif_price_desc: "זיהוי תנועות מחיר חריגות ותנודתיות לפני שהשוק מגיב.",
    notif_price_unusual: "תנועות מחיר חריגות",
    notif_price_unusual_sub: "התרע כאשר מניה עוברת את הסף שהגדרת",
    notif_threshold: "סף",
    notif_custom: "מותאם אישית",
    notif_watchlist_title: "התראות רשימת מעקב",
    notif_watchlist_desc: "עקוב אחר הסימולים שבחרת וקבל התראות על תנועות מרכזיות.",
    notif_watchlist_activity: "פעילות רשימת מעקב",
    notif_watchlist_activity_sub: "התראות על מניות בכל רשימות המעקב שלך",
    notif_alert_scope: "טווח ההתראה",
    notif_all_symbols: "כל הסימולים",
    notif_starred_only: "מסומנים בכוכב",
    notif_custom_list: "רשימה מותאמת",
    notif_news_title: "חדשות ועדכוני שוק",
    notif_news_desc: "קבל חדשות חברות ואירועים מניעי שוק בזמן אמת.",
    notif_breaking_news: "חדשות שוק מהבזק",
    notif_breaking_news_sub: "חדשות מאקרו או סקטוריאליות בעלות השפעה גבוהה",
    notif_frequency: "תדירות",
    notif_realtime: "בזמן אמת",
    notif_hourly_digest: "סיכום שעתי",
    notif_daily_digest: "סיכום יומי",
    notif_email_title: "התראות אימייל",
    notif_email_desc: "שלוט אילו עדכונים נשלחים גם לתיבת הדואר שלך.",
    notif_email_weekly: "סיכום תיק שבועי",
    notif_email_weekly_sub: "סיכום תנועות מרכזיות ואירועים קרובים",
    notif_email_earnings: "דוחות רווחים",
    notif_email_earnings_sub: "עותק אימייל של התראות דוחות עבור מניות במעקב",
    notif_dev_note: "פיצ'רי ההתראות נמצאים בפיתוח פעיל ויוצאו בהדרגה.",
  }
};

// Safe default so destructuring never throws if called outside the provider tree.
const _fallbackT = (key) => key;
const LanguageContext = createContext({
  lang:    'en',
  setLang: () => {},
  t:       _fallbackT,
  isRTL:   false,
});

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