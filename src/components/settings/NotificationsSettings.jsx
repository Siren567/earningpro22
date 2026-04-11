/**
 * NotificationsSettings
 *
 * Premium "Coming Soon" preview for the Notifications tab inside Settings.
 * Cards are fully readable — no blur. Locked via a clean disabled overlay +
 * a prominent Coming Soon badge. Tier hierarchy controls opacity and border
 * weight only, giving depth without obscuring content.
 */

import React from 'react';
import { Lock, Bell, CalendarClock, TrendingUp, List, Newspaper, Mail } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/components/LanguageContext';

// ── Coming Soon badge ──────────────────────────────────────────────────────────
// Dominant, bright orange — the primary visual explanation for why it's locked.

function ComingSoonBadge({ label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0"
      style={{
        background:  'linear-gradient(135deg, rgba(251,146,60,0.28) 0%, rgba(234,88,12,0.22) 100%)',
        border:      '1px solid rgba(251,146,60,0.50)',
        color:       '#fb923c',
        boxShadow:   '0 0 0 1px rgba(251,146,60,0.12), 0 2px 8px rgba(251,146,60,0.22)',
        textShadow:  '0 0 12px rgba(251,146,60,0.4)',
      }}
    >
      <Lock className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ── Reusable preview controls ──────────────────────────────────────────────────

function PreviewRow({ label, sub, checked = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm dark:text-gray-300 text-gray-700 leading-tight">{label}</p>
        {sub && <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <Switch checked={checked} disabled aria-hidden="true" className="flex-shrink-0" />
    </div>
  );
}

function PreviewChips({ label, options, active }) {
  return (
    <div>
      <p className="text-[11px] dark:text-gray-500 text-gray-500 mb-2 font-medium uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {options.map(opt => (
          <span
            key={opt}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-none ${
              opt === active
                ? 'dark:bg-blue-500/15 bg-blue-50 dark:border-blue-500/25 border-blue-200 dark:text-blue-400 text-blue-600'
                : 'dark:bg-white/[0.04] bg-gray-100 dark:border-white/[0.08] border-gray-200 dark:text-gray-500 text-gray-500'
            }`}
          >
            {opt}
          </span>
        ))}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t dark:border-white/[0.06] border-gray-100 my-3.5" />;
}

// ── Card tiers ─────────────────────────────────────────────────────────────────
//
//  tier="primary"   → near-ready  : lighter overlay, higher inner opacity, stronger border
//  tier="secondary" → almost-there: medium overlay, moderate opacity
//  tier="distant"   → later        : slightly darker overlay, more muted
//
//  NO blur in any tier — content is always sharp and readable.
//
const TIER = {
  primary: {
    bg:           'dark:bg-white/[0.06] bg-white',
    border:       'dark:border-white/[0.10] border-gray-200',
    overlayBg:    'rgba(0,0,0,0.18)',
    inner:        0.82,
    hover:        'hover:-translate-y-0.5 hover:dark:border-white/[0.16] hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]',
  },
  secondary: {
    bg:           'dark:bg-white/[0.04] bg-white',
    border:       'dark:border-white/[0.07] border-gray-200',
    overlayBg:    'rgba(0,0,0,0.20)',
    inner:        0.76,
    hover:        'hover:-translate-y-0.5 hover:dark:border-white/[0.11] hover:shadow-[0_4px_16px_rgba(0,0,0,0.22)]',
  },
  distant: {
    bg:           'dark:bg-white/[0.03] bg-white',
    border:       'dark:border-white/[0.05] border-gray-100',
    overlayBg:    'rgba(0,0,0,0.22)',
    inner:        0.70,
    hover:        'hover:-translate-y-0.5 hover:dark:border-white/[0.09] hover:shadow-[0_2px_14px_rgba(0,0,0,0.20)]',
  },
};

function NotificationCard({
  icon: Icon,
  title,
  description,
  tier = 'distant',
  comingSoonLabel = 'Coming Soon',
  children,
}) {
  const tierSpec = TIER[tier];
  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-200 ${tierSpec.bg} ${tierSpec.border} ${tierSpec.hover}`}
    >
      {/* Lock overlay — no blur, just a very light tint to signal disabled state */}
      <div
        className="absolute inset-0 z-10 cursor-not-allowed rounded-2xl"
        style={{ background: tierSpec.overlayBg }}
        onClick={e => e.stopPropagation()}
      />

      {/* Header — always at full opacity so the title + badge read clearly */}
      <div className={`flex items-start justify-between gap-3 ${tier === 'primary' ? 'px-6 pt-5 pb-4' : 'px-5 pt-4 pb-3.5'} border-b dark:border-white/[0.05] border-gray-100`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-xl flex items-center justify-center flex-shrink-0 ${
            tier === 'primary'
              ? 'w-9 h-9 dark:bg-white/[0.08] bg-gray-100'
              : 'w-8 h-8 dark:bg-white/[0.05] bg-gray-100'
          }`}>
            <Icon className={`${tier === 'primary' ? 'w-[18px] h-[18px]' : 'w-4 h-4'} dark:text-gray-400 text-gray-500`} />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold dark:text-white text-gray-900 leading-tight ${tier === 'primary' ? 'text-[15px]' : 'text-sm'}`}>
              {title}
            </p>
            <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <ComingSoonBadge label={comingSoonLabel} />
      </div>

      {/* Preview controls — readable but subtly dimmed to reinforce locked state */}
      <div
        className={`${tier === 'primary' ? 'px-6 py-5' : 'px-5 py-4'} pointer-events-none select-none`}
        style={{ opacity: tierSpec.inner }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NotificationsSettings() {
  const lang = useLanguage();
  const t =
    typeof lang?.t === 'function'
      ? lang.t
      : (key) => (typeof key === 'string' ? key : '');

  return (
    <div className="space-y-4">

      {/* ── Push Notifications — PRIMARY ──────────────────────────────────── */}
      <NotificationCard
        icon={Bell}
        title={t('notif_push_title')}
        description={t('notif_push_desc')}
        tier="primary"
        comingSoonLabel={t('lang_coming_soon')}
      >
        <PreviewRow
          label={t('notif_push_enable')}
          sub={t('notif_push_enable_sub')}
          checked={false}
        />
        <Divider />
        <PreviewChips
          label={t('notif_timing_label')}
          options={[t('notif_timing_15min_before'), t('notif_timing_1hr_before'), t('notif_timing_at_event')]}
          active={t('notif_timing_1hr_before')}
        />
      </NotificationCard>

      {/* ── Earnings Alerts — SECONDARY ───────────────────────────────────── */}
      <NotificationCard
        icon={CalendarClock}
        title={t('notif_earnings_title')}
        description={t('notif_earnings_desc')}
        tier="secondary"
        comingSoonLabel={t('lang_coming_soon')}
      >
        <PreviewRow
          label={t('notif_earnings_remind')}
          sub={t('notif_earnings_remind_sub')}
          checked={true}
        />
        <Divider />
        <PreviewRow
          label={t('notif_afterhours')}
          sub={t('notif_afterhours_sub')}
          checked={true}
        />
        <Divider />
        <PreviewChips
          label={t('notif_lead_time')}
          options={[t('notif_timing_15min'), t('notif_timing_1hr'), t('notif_timing_1day')]}
          active={t('notif_timing_1hr')}
        />
      </NotificationCard>

      {/* ── Remaining cards — DISTANT ─────────────────────────────────────── */}
      <NotificationCard
        icon={TrendingUp}
        title={t('notif_price_title')}
        description={t('notif_price_desc')}
        tier="distant"
        comingSoonLabel={t('lang_coming_soon')}
      >
        <PreviewRow
          label={t('notif_price_unusual')}
          sub={t('notif_price_unusual_sub')}
          checked={true}
        />
        <Divider />
        <PreviewChips
          label={t('notif_threshold')}
          options={['2%', '5%', '10%', t('notif_custom')]}
          active="5%"
        />
      </NotificationCard>

      <NotificationCard
        icon={List}
        title={t('notif_watchlist_title')}
        description={t('notif_watchlist_desc')}
        tier="distant"
        comingSoonLabel={t('lang_coming_soon')}
      >
        <PreviewRow
          label={t('notif_watchlist_activity')}
          sub={t('notif_watchlist_activity_sub')}
          checked={true}
        />
        <Divider />
        <PreviewChips
          label={t('notif_alert_scope')}
          options={[t('notif_all_symbols'), t('notif_starred_only'), t('notif_custom_list')]}
          active={t('notif_all_symbols')}
        />
      </NotificationCard>

      <NotificationCard
        icon={Newspaper}
        title={t('notif_news_title')}
        description={t('notif_news_desc')}
        tier="distant"
        comingSoonLabel={t('lang_coming_soon')}
      >
        <PreviewRow
          label={t('notif_breaking_news')}
          sub={t('notif_breaking_news_sub')}
          checked={false}
        />
        <Divider />
        <PreviewChips
          label={t('notif_frequency')}
          options={[t('notif_realtime'), t('notif_hourly_digest'), t('notif_daily_digest')]}
          active={t('notif_daily_digest')}
        />
      </NotificationCard>

      <NotificationCard
        icon={Mail}
        title={t('notif_email_title')}
        description={t('notif_email_desc')}
        tier="distant"
        comingSoonLabel={t('lang_coming_soon')}
      >
        <PreviewRow
          label={t('notif_email_weekly')}
          sub={t('notif_email_weekly_sub')}
          checked={true}
        />
        <Divider />
        <PreviewRow
          label={t('notif_email_earnings')}
          sub={t('notif_email_earnings_sub')}
          checked={false}
        />
      </NotificationCard>

      <p className="text-[11px] dark:text-gray-600 text-gray-400 text-center pb-1 pt-1">
        {t('notif_dev_note')}
      </p>
    </div>
  );
}
