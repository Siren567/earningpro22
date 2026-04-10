import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import { useTheme } from '../ThemeContext';
import { useLogout } from '../auth/useLogout';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Calendar, List, Bell, LineChart,
  Settings, Shield, LogOut, ChevronLeft, Menu,
  Sun, Moon, Globe, User, X, Ban
} from 'lucide-react';
import AppLogo from './AppLogo';
import { Badge } from '@/components/ui/badge';
import NotificationPanel from './NotificationPanel';
import UserDropdown from './UserDropdown';

export default function AppLayout() {
  const { t, lang, setLang, isRTL } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, profile, isAdminProfile } = useAuth();
  const performLogout = useLogout();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Suspension: sourced from profile already loaded in AuthContext — no extra fetch needed.
  const isSuspended = profile?.is_suspended ?? false;

  const unreadAlerts = 0;

  const navItems = [
    { path: '/Dashboard', icon: LayoutDashboard, label: t('nav_dashboard') },
    { path: '/Earnings', icon: Calendar, label: t('nav_earnings') },
    { path: '/Watchlist', icon: List, label: t('nav_watchlist') },
    // Alerts moved to Settings → Preferences (Coming Soon)
    // { path: '/Alerts', icon: Bell, label: t('nav_alerts') },
    { path: '/StockView', icon: LineChart, label: t('nav_stock_view') },
    { path: '/Settings', icon: Settings, label: t('nav_settings') },
  ];

  // Suspended users see a block screen
  if (isSuspended) {
    return (
      <div className="min-h-screen dark:bg-[#0B1220] bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
            <Ban className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold dark:text-white text-gray-900 mb-2">{t('suspended_title')}</h1>
          <p className="text-sm dark:text-gray-400 text-gray-600 mb-6 leading-relaxed">
            {t('suspended_desc')}
          </p>
          <button
            onClick={performLogout}
            className="px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
          >
            {t('suspended_sign_out')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen dark:bg-[#0B1220] bg-[#F8FAFC] flex ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'} dark:bg-[#0D1628] bg-white border-r dark:border-[#4CBFF5]/10 border-[#DDE4F0] shadow-[1px_0_0_0_#DDE4F0] dark:shadow-none transition-all duration-300 fixed top-0 bottom-0 ${isRTL ? 'right-0 border-l dark:border-l-[#4CBFF5]/10 border-l-[#DDE4F0] border-r-0' : 'left-0'} z-40`}>
        <div className="p-4 flex items-center justify-between border-b dark:border-[#4CBFF5]/10 border-[#DDE4F0]">
          {sidebarOpen && (
            <Link to="/Dashboard" className="flex items-center gap-2">
              <AppLogo size="w-8 h-8" />
              <span className="font-bold dark:text-white text-gray-900 text-sm">StockPulse<span className="dark:text-[#4CBFF5] text-[#576CA8]">AI</span></span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg dark:text-gray-400 dark:hover:bg-white/5 text-gray-500 hover:bg-[#274690]/5"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${!sidebarOpen ? 'rotate-180' : ''} ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-[#4CBFF5]/10 text-[#4CBFF5] border-l-2 border-[#4CBFF5]'
                      : 'bg-[#274690]/10 text-[#274690] border-l-2 border-[#274690]'
                    : 'dark:text-gray-400 text-gray-600 dark:hover:bg-[#4CBFF5]/5 hover:bg-[#274690]/5'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
          {isAdminProfile && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                location.pathname === '/admin' || location.pathname === '/Admin'
                  ? isDark
                    ? 'bg-[#4CBFF5]/10 text-[#4CBFF5] border-l-2 border-[#4CBFF5]'
                    : 'bg-[#274690]/10 text-[#274690] border-l-2 border-[#274690]'
                  : 'dark:text-gray-400 text-gray-600 dark:hover:bg-[#4CBFF5]/5 hover:bg-[#274690]/5'
              }`}
            >
              <Shield className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{t('nav_admin')}</span>}
            </Link>
          )}
        </nav>

        <div className="p-3 border-t dark:border-[#4CBFF5]/10 border-[#DDE4F0] space-y-1">
          <button
            onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-[#274690]/5 w-full"
          >
            <Globe className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{lang === 'en' ? 'עברית' : 'English'}</span>}
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-[#274690]/5 w-full"
          >
            {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            {sidebarOpen && <span>{t('settings_theme')}</span>}
          </button>
          <button
            onClick={() => {
              setMobileOpen(false);
              performLogout();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 dark:hover:bg-red-500/10 hover:bg-red-50 w-full"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>{t('nav_logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className={`absolute top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-64 dark:bg-[#0D1628] bg-white shadow-xl p-4`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AppLogo size="w-8 h-8" />
                <span className="font-bold dark:text-white text-gray-900 text-sm">StockPulse<span className="dark:text-[#4CBFF5] text-[#576CA8]">AI</span></span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 dark:text-gray-400 text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? isDark ? 'bg-[#4CBFF5]/10 text-[#4CBFF5]' : 'bg-[#274690]/10 text-[#274690]'
                        : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-[#274690]/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {isAdminProfile && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    location.pathname === '/admin' || location.pathname === '/Admin'
                      ? isDark ? 'bg-[#4CBFF5]/10 text-[#4CBFF5]' : 'bg-[#274690]/10 text-[#274690]'
                      : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-[#274690]/5'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span>{t('nav_admin')}</span>
                </Link>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} ${isRTL ? (sidebarOpen ? 'lg:mr-64 lg:ml-0' : 'lg:mr-20 lg:ml-0') : ''} transition-all duration-300`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 sm:h-16 dark:bg-[#0B1220]/90 bg-white/90 backdrop-blur-xl border-b dark:border-[#4CBFF5]/10 border-[#DDE4F0] shadow-[0_1px_0_0_#DDE4F0] dark:shadow-none flex items-center justify-between px-4 lg:px-6">
          {/* Mobile: hamburger + logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 dark:text-gray-400 text-gray-600 rounded-lg dark:hover:bg-white/5 hover:bg-[#274690]/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/Dashboard" className="flex items-center gap-2">
              <AppLogo size="w-7 h-7" />
              <span className="text-sm font-bold dark:text-white text-gray-900">StockPulse<span className="dark:text-[#4CBFF5] text-[#576CA8]">AI</span></span>
            </Link>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <NotificationPanel alertCount={unreadAlerts} alerts={[]} />
            <UserDropdown profile={profile} />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 dark:bg-[#0D1628] bg-white border-t dark:border-[#4CBFF5]/10 border-[#DDE4F0] shadow-[0_-1px_0_0_#DDE4F0] dark:shadow-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="flex items-stretch justify-around px-1 pt-1 pb-1">
          {[
            { path: '/Dashboard', icon: LayoutDashboard, label: t('mobile_home') },
            { path: '/Watchlist', icon: List, label: t('mobile_watchlist_short') },
            { path: '/StockView', icon: LineChart, label: t('mobile_stocks') },
            { path: '/Earnings', icon: Calendar, label: t('mobile_earnings_short') },
            { path: '/Settings', icon: Settings, label: t('nav_settings') },
          ].map(item => {
            const isActive = location.pathname === item.path;
            const activeColor = isDark ? '#4CBFF5' : '#274690';
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[52px] relative transition-colors"
              >
                {/* Active pill background */}
                {isActive && (
                  <div className={`absolute inset-x-2 inset-y-1 rounded-xl ${isDark ? 'bg-[#4CBFF5]/10' : 'bg-[#274690]/8'}`} />
                )}

                <div className="relative z-10">
                  <item.icon
                    className="w-[22px] h-[22px] transition-colors"
                    style={{ color: isActive ? activeColor : '' }}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold leading-none z-10 transition-colors ${isActive ? '' : 'dark:text-gray-500 text-gray-400'}`}
                  style={{ color: isActive ? activeColor : '' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}