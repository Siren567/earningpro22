import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "en" | "he";

type DictValue = string;

type Dict = Record<string, DictValue>;

const en: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.earnings": "Earnings Calendar",
  "nav.watchlist": "Watchlist",
  "nav.stockView": "Stock View",
  "nav.settings": "Settings",
  "nav.logout": "Logout",

  "dashboard.greeting.morning": "Good morning",
  "dashboard.greeting.afternoon": "Good afternoon",
  "dashboard.greeting.evening": "Good evening",
  "dashboard.greeting.night": "Good night",

  "dashboard.topGeckoPicks": "Top Gecko Picks",
  "dashboard.topGeckoPicks.sub": "Surfacing opportunities before they become headlines",
  "dashboard.watchlist": "My Watchlist",
  "dashboard.upcomingEarnings": "Upcoming Earnings",
  "dashboard.marketsLive": "Markets live",

  "stock.searchPlaceholder": "Search symbol or company (e.g. AAPL, Tesla)",
  "stock.add": "Add",
  "stock.priceChart": "Price Chart",
  "stock.keyMetrics": "Key Metrics",
  "stock.currency": "Currency",
  "stock.updated": "Updated",
  "stock.previousClose": "Previous Close",

  "wyckoff.title": "Wyckoff Analysis",
  "wyckoff.sub": "AI-powered Wyckoff phase detection with annotated chart",
  "wyckoff.button": "Analyze Chart",
  "wyckoff.premium": "Premium feature",
  "wyckoff.upgrade": "Upgrade to use",

  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.profile": "Profile",
  "settings.security": "Security",
  "settings.preferences": "Preferences",
  "settings.notifications": "Notifications",
  "settings.save": "Save",

  "plans.free": "Free",
  "plans.premium": "Premium",
  "plans.select": "Select Plan",
  "plans.upgrade": "Upgrade to Premium",
  "plans.mostPopular": "Most Popular",

  "common.today": "Today",
  "common.tomorrow": "Tomorrow",
  "common.loading": "Loading...",
  "common.soon": "Soon",
};

const he: Dict = {
  "nav.dashboard": "דשבורד",
  "nav.earnings": "יומן דוחות",
  "nav.watchlist": "רשימת מעקב",
  "nav.stockView": "תצוגת מניה",
  "nav.settings": "הגדרות",
  "nav.logout": "התנתקות",

  "dashboard.greeting.morning": "בוקר טוב",
  "dashboard.greeting.afternoon": "צהריים טובים",
  "dashboard.greeting.evening": "ערב טוב",
  "dashboard.greeting.night": "לילה טוב",

  "dashboard.topGeckoPicks": "בחירות Gecko המובילות",
  "dashboard.topGeckoPicks.sub": "הזדמנויות לפני שהן הופכות לכותרות",
  "dashboard.watchlist": "רשימת המעקב שלי",
  "dashboard.upcomingEarnings": "דוחות קרובים",
  "dashboard.marketsLive": "השווקים פעילים",

  "stock.searchPlaceholder": "חפש סימול או חברה (למשל AAPL, Tesla)",
  "stock.add": "הוסף",
  "stock.priceChart": "גרף מחיר",
  "stock.keyMetrics": "מדדים מרכזיים",
  "stock.currency": "מטבע",
  "stock.updated": "עודכן",
  "stock.previousClose": "סגירה קודמת",

  "wyckoff.title": "ניתוח וויקוף",
  "wyckoff.sub": "זיהוי שלבי וויקוף בעזרת AI עם סימונים על הגרף",
  "wyckoff.button": "נתח גרף",
  "wyckoff.premium": "פיצ'ר פרימיום",
  "wyckoff.upgrade": "שדרג כדי להשתמש",

  "settings.language": "שפה",
  "settings.theme": "ערכת נושא",
  "settings.profile": "פרופיל",
  "settings.security": "אבטחה",
  "settings.preferences": "העדפות",
  "settings.notifications": "התראות",
  "settings.save": "שמור",

  "plans.free": "חינם",
  "plans.premium": "פרימיום",
  "plans.select": "בחר תוכנית",
  "plans.upgrade": "שדרג לפרימיום",
  "plans.mostPopular": "הכי פופולרי",

  "common.today": "היום",
  "common.tomorrow": "מחר",
  "common.loading": "טוען...",
  "common.soon": "בקרוב",
};

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
  dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "stockpulse_lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "he" || saved === "en" ? saved : "en";
  });

  const isRTL = lang === "he";
  const dir = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.body.dir = dir;
    document.body.classList.toggle("rtl", isRTL);
    document.body.classList.toggle("ltr", !isRTL);
  }, [lang, dir, isRTL]);

  const value = useMemo<I18nContextValue>(() => {
    const dict = lang === "he" ? he : en;

    return {
      lang,
      setLang: setLangState,
      isRTL,
      dir,
      t: (key: string, fallback?: string) => dict[key] ?? fallback ?? key,
    };
  }, [lang, isRTL, dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "he" ? "en" : "he")}
      style={{
        border: "1px solid rgba(148,163,184,0.25)",
        borderRadius: 12,
        padding: "8px 12px",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {lang === "he" ? "English" : "עברית"}
    </button>
  );
}

/**
 * Use for numbers/prices/tickers inside RTL layout
 */
export function LTR({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" className={className} style={{ unicodeBidi: "isolate" }}>
      {children}
    </span>
  );
}

/**
 * Helper for greeting by local hour
 */
export function getGreetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "dashboard.greeting.morning";
  if (hour >= 12 && hour < 17) return "dashboard.greeting.afternoon";
  if (hour >= 17 && hour < 22) return "dashboard.greeting.evening";
  return "dashboard.greeting.night";
}