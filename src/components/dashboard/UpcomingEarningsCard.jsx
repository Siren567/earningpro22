/**
 * UpcomingEarningsCard
 *
 * Dashboard widget — shows today's / tomorrow's / next upcoming earnings reports.
 * Data is shared with Earnings.jsx via the ['earningsScreeners'] React Query cache.
 *
 * Features:
 *   - Groups events into "Today", "Tomorrow", and the next distinct upcoming date
 *   - BMO / AMC timing badges derived from the Yahoo timestamp
 *   - Live countdown label (e.g. "in 3h 20m", "tomorrow", "in 2 days")
 *   - Each row navigates to StockView on click
 *   - "View full earnings calendar" CTA at the bottom
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow } from 'date-fns';
import { CalendarDays, Clock, ChevronRight, Loader2, TrendingUp } from 'lucide-react';
import StockLogo from '../stock/StockLogo';
import { useEarningsData, getEarningsTiming, getCountdown } from '../hooks/useEarningsData';

// ── helpers ──────────────────────────────────────────────────────────────────

function groupLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  if (isToday(d))     return 'Today';
  if (isTomorrow(d))  return 'Tomorrow';
  return format(d, 'EEE, MMM d');
}

function TimingBadge({ timing }) {
  if (!timing) return null;
  const isBmo = timing === 'BMO';
  return (
    <span className={`
      inline-flex items-center text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded
      ${isBmo
        ? 'dark:bg-amber-500/15 bg-amber-50 dark:text-amber-400 text-amber-600 dark:border dark:border-amber-500/20 border border-amber-200'
        : 'dark:bg-purple-500/15 bg-purple-50 dark:text-purple-400 text-purple-600 dark:border dark:border-purple-500/20 border border-purple-200'
      }
    `}>
      {isBmo ? 'BMO' : 'AMC'}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UpcomingEarningsCard() {
  const navigate = useNavigate();
  const { data: earningsData = [], isLoading } = useEarningsData();

  // Collect up to 3 distinct upcoming date groups, show max 2 items per group
  const groups = useMemo(() => {
    if (!earningsData.length) return [];

    const byDate = earningsData.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});

    const sortedDates = Object.keys(byDate).sort();

    return sortedDates.slice(0, 3).map(date => ({
      date,
      label:  groupLabel(date),
      isToday: isToday(new Date(date + 'T12:00:00')),
      items:  byDate[date].slice(0, 3),
      total:  byDate[date].length,
    }));
  }, [earningsData]);

  const totalUpcoming = earningsData.length;

  return (
    <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl dark:bg-blue-500/15 bg-blue-50 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold dark:text-white text-gray-900 leading-tight">
              Upcoming Earnings
            </h3>
            {!isLoading && totalUpcoming > 0 && (
              <p className="text-[11px] dark:text-gray-500 text-gray-500 leading-tight">
                {totalUpcoming} companies reporting soon
              </p>
            )}
          </div>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-3 pb-2">

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin dark:text-gray-600 text-gray-300" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <TrendingUp className="w-8 h-8 dark:text-gray-700 text-gray-300 mb-2" />
            <p className="text-sm dark:text-gray-500 text-gray-500">No upcoming earnings found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.date}>

                {/* Date section header */}
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                    group.isToday
                      ? 'text-blue-500'
                      : 'dark:text-gray-500 text-gray-500'
                  }`}>
                    {group.label}
                  </span>
                  {group.total > 3 && (
                    <span className="text-[10px] dark:text-gray-600 text-gray-400">
                      +{group.total - 3} more
                    </span>
                  )}
                  <div className="flex-1 h-px dark:bg-white/5 bg-gray-100" />
                </div>

                {/* Rows */}
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const timing   = getEarningsTiming(item.earningsTimestamp);
                    const countdown = getCountdown(item.earningsTimestamp);

                    return (
                      <button
                        key={item.symbol}
                        onClick={() => navigate(`/StockView?symbol=${item.symbol}`)}
                        className="
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          dark:hover:bg-white/[0.05] hover:bg-gray-50
                          transition-colors group text-left
                        "
                      >
                        <StockLogo symbol={item.symbol} className="w-8 h-8 flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold dark:text-white text-gray-900 leading-tight">
                              {item.symbol}
                            </span>
                            <TimingBadge timing={timing} />
                            {item.isEstimate && (
                              <span className="text-[9px] dark:text-gray-600 text-gray-400 leading-none">est.</span>
                            )}
                          </div>
                          <p className="text-[11px] dark:text-gray-500 text-gray-400 truncate leading-tight mt-0.5">
                            {item.companyName}
                          </p>
                        </div>

                        {countdown && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3 dark:text-gray-600 text-gray-400" />
                            <span className="text-[11px] dark:text-gray-400 text-gray-500 tabular-nums whitespace-nowrap">
                              {countdown}
                            </span>
                          </div>
                        )}

                        <ChevronRight className="
                          w-3.5 h-3.5 flex-shrink-0
                          dark:text-gray-700 text-gray-300
                          dark:group-hover:text-gray-400 group-hover:text-gray-500
                          transition-colors
                        " />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer CTA ─────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-1 border-t dark:border-white/5 border-gray-100 mt-1">
        <button
          onClick={() => navigate('/Earnings')}
          className="
            w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
            text-xs font-semibold
            dark:text-blue-400 text-blue-600
            dark:hover:bg-blue-500/10 hover:bg-blue-50
            transition-colors
          "
        >
          View full earnings calendar
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
