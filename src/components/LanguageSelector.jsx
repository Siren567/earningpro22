import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸', enabled: true },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱', enabled: true },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', enabled: false },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', enabled: false },
];

export default function LanguageSelector({ onLanguageChange = null }) {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLanguage = languages.find(l => l.code === lang);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageSelect = (code) => {
    if (code !== lang) {
      setLang(code);
      if (onLanguageChange) {
        onLanguageChange(code);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border border-gray-200 dark:text-white text-gray-900 hover:dark:bg-white/10 hover:bg-gray-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentLanguage?.flag}</span>
          <span className="text-sm font-medium">{currentLanguage?.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl dark:bg-[#1a1a2e] bg-white border dark:border-white/10 border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="p-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => language.enabled && handleLanguageSelect(language.code)}
                disabled={!language.enabled}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  language.enabled
                    ? lang === language.code
                      ? 'dark:bg-blue-500/20 bg-blue-50 dark:text-cyan-400 text-blue-600'
                      : 'dark:text-gray-300 text-gray-700 dark:hover:bg-white/5 hover:bg-gray-50'
                    : 'dark:text-gray-600 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{language.flag}</span>
                  <div className="text-left">
                    <div>{language.name}</div>
                    {!language.enabled && (
                      <div className="text-xs dark:text-gray-500 text-gray-500">Coming Soon</div>
                    )}
                  </div>
                </div>
                {lang === language.code && language.enabled && (
                  <Check className="w-4 h-4 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}