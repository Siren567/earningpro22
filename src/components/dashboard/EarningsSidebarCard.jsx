import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';
import { CalendarDays, ChevronRight, Loader2 } from 'lucide-react';
import { useEarningsData, getEarningsTiming } from '../hooks/useEarningsData';
import { useLanguage } from '../LanguageContext';

// ── Timing badge ──────────────────────────────────────────────────────────────
function TimingPill({ timing }) {
  if (!timing) return null;
  return (
    <span className={`
      text-[9px] font-bold uppercase tracking-wide px-1 py-px rounded
      ${timing === 'BMO'
        ? 'dark:text-amber-400 text-amber-600 dark:bg-amber-500/10 bg-amber-50'
        : 'dark:text-violet-400 text-violet-600 dark:bg-violet-500/10 bg-violet-50'}
    `}>
      {timing}
    </span>
  );
}

// ── Time label ────────────────────────────────────────────────────────────────
function timeLabel(dateStr, t) {
  const d = new Date(dateStr + 'T12:00:00');
  if (isToday(d))    return t('earnings_today_badge');
  if (isTomorrow(d)) return t('earnings_tomorrow');
  const diff = differenceInCalendarDays(d, new Date());
  return `${t('earnings_in_days')} ${diff}d`;
}

function isUrgent(dateStr) {
  return isToday(new Date(dateStr + 'T12:00:00'));
}

// ── Date section label ────────────────────────────────────────────────────────
function sectionLabel(dateStr, t, lang) {
  const d = new Date(dateStr + 'T12:00:00');
  if (isToday(d))    return t('earnings_today_badge');
  if (isTomorrow(d)) return t('earnings_tomorrow');
  return format(d, 'EEE, MMM d');
}

// ── Single earnings row ───────────────────────────────────────────────────────
function EarningsRow({ item }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const timing   = getEarningsTiming(item.earningsTimestamp);
  const urgent   = isUrgent(item.date);
  const label    = timeLabel(item.date, t);

  return (
    <button
      onClick={() => navigate(`/StockView?symbol=${item.symbol}`)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg dark:hover:bg-white/[0.04] hover:bg-gray-50 transition-colors duration-150 text-left group"
    >
      {/* Ticker */}
      <span className={`
        text-xs font-bold w-11 flex-shrink-0 leading-none
        ${urgent ? 'dark:text-blue-400 text-blue-600' : 'dark:text-white text-gray-900'}
      `}>
        {item.symbol}
      </span>

      {/* Company name */}
      <span className="text-[11px] dark:text-gray-500 text-gray-400 truncate flex-1 leading-none">
        {item.companyName}
      </span>

      {/* Time + timing */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`
          text-[10px] font-medium tabular-nums leading-none
          ${urgent
            ? 'dark:text-blue-400 text-blue-600 font-semibold'
            : 'dark:text-gray-500 text-gray-400'}
        `}>
          {label}
        </span>
        <TimingPill timing={timing} />
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EarningsSidebarCard() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { data: earningsData = [], isLoading } = useEarningsData();

  // Group by date, max 3 dates, 3 per date
  const groups = useMemo(() => {
    if (!earningsData.length) return [];

    const byDate = earningsData.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});

    return Object.keys(byDate)
      .sort()
      .slice(0, 4)
      .map(date => ({
        date,
        label: sectionLabel(date, t, lang),
        items: byDate[date].slice(0, 3),
        extra: Math.max(0, byDate[date].length - 3),
      }));
  }, [earningsData, t, lang]);

  return (
    <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-100 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b dark:border-white/5 border-gray-100">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 dark:text-gray-500 text-gray-400" />
          <h2 className="text-sm font-semibold dark:text-white text-gray-900">
            {t('upcoming_earnings')}
          </h2>
        </div>
        <button
          onClick={() => navigate('/Earnings')}
          className="flex items-center gap-0.5 text-[11px] font-medium dark:text-gray-600 text-gray-400 dark:hover:text-gray-400 hover:text-gray-600 transition-colors"
        >
          {t('earnings_calendar_view')} <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin dark:text-gray-600 text-gray-300" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs dark:text-gray-600 text-gray-400 text-center py-6">
            {t('no_upcoming_earnings')}
          </p>
        ) : (
          <div>
            {groups.map((group, gi) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className={`px-3 pt-${gi === 0 ? '1' : '2'} pb-1`}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest dark:text-gray-600 text-gray-400">
                    {group.label}
                  </span>
                </div>

                {/* Rows */}
                {group.items.map(item => (
                  <EarningsRow key={item.symbol} item={item} />
                ))}

                {/* Overflow indicator */}
                {group.extra > 0 && (
                  <p className="text-[10px] dark:text-gray-600 text-gray-400 px-3 pb-1">
                    +{group.extra} more
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
