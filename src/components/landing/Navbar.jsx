import React, { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useTheme } from '../ThemeContext';
import { Sun, Moon, Globe, LogIn, Check, ChevronDown } from 'lucide-react';
import AppLogo from '../app/AppLogo';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { lang, setLang, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸', enabled: true },
    { code: 'he', name: 'Hebrew', flag: '🇮🇱', enabled: true },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', enabled: false },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', enabled: false },
  ];

  const currentLanguage = languages.find(l => l.code === lang);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setShowLangMenu(false);
      }
    };

    if (showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLangMenu]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#4CBFF5]/10 backdrop-blur-xl dark:bg-[#0B1220]/80 bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <AppLogo size="w-8 h-8 sm:w-9 sm:h-9" />
            <span className="text-base sm:text-lg font-bold dark:text-white text-gray-900 whitespace-nowrap">
              StockPulse<span className="dark:text-[#4CBFF5] text-[#576CA8]">AI</span>
            </span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Language */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="w-9 h-9 flex items-center justify-center rounded-lg dark:text-gray-300 text-gray-600 hover:bg-white/10 transition-colors"
                title="Change language"
              >
                <Globe className="w-4 h-4" />
              </button>

              {showLangMenu && (
                <div className="absolute top-full right-0 mt-2 rounded-xl dark:bg-[#1a1a2e] bg-white border dark:border-white/10 border-gray-200 shadow-xl z-50 overflow-hidden min-w-[160px]">
                  <div className="p-1">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => {
                          if (language.enabled) {
                            setLang(language.code);
                            setShowLangMenu(false);
                          }
                        }}
                        disabled={!language.enabled}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          language.enabled
                            ? lang === language.code
                              ? 'dark:bg-[#4CBFF5]/10 bg-blue-50 dark:text-[#4CBFF5] text-blue-600'
                              : 'dark:text-gray-300 text-gray-700 dark:hover:bg-white/5 hover:bg-gray-50'
                            : 'dark:text-gray-600 text-gray-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{language.flag}</span>
                          <div className="text-left">
                            <div>{language.name}</div>
                            {!language.enabled && (
                              <div className="text-xs dark:text-gray-500 text-gray-500">{t('lang_coming_soon')}</div>
                            )}
                          </div>
                        </div>
                        {lang === language.code && language.enabled && (
                          <Check className="w-4 h-4 text-[#4CBFF5]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg dark:text-gray-300 text-gray-600 hover:bg-white/10 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Plans — hidden on very small screens */}
            <Link to="/Plans" className="hidden sm:block">
              <Button variant="ghost" className="dark:text-gray-300 text-gray-600 text-sm px-3 h-9">
                {t('nav_plans')}
              </Button>
            </Link>

            {/* Login */}
            <Button
              onClick={() => navigate('/Auth')}
              className="gradient-primary gradient-primary-hover text-white text-sm px-3 sm:px-4 h-9 gap-1.5 flex-shrink-0 border-0"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{t('nav_login')}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}