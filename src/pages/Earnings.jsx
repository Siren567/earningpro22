import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Loader2, TrendingUp,
  TrendingDown, Minus, ChevronDown, ChevronUp, ExternalLink, Bell, BellOff,
} from 'lucide-react';
import GakoIcon from '@/assets/GakoIcon';
import { Button } from '@/components/ui/button';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, addMonths, subMonths,
} from 'date-fns';
import StockLogo from '../components/stock/StockLogo';
import { useAlerts } from '../components/hooks/useAlerts';
import { useEarningsData } from '../components/hooks/useEarningsData';

// ─── Mock AI analysis generator ───────────────────────────────────────────────
function generateMockAnalysis(symbol, companyName) {
  const hash = [...symbol].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const pick  = (arr) => arr[hash % arr.length];
  const pick2 = (arr) => arr[(hash >> 4) % arr.length];

  const trend      = pick(['Bullish', 'Bearish', 'Neutral']);
  const risk       = pick2(['Low', 'Medium', 'High']);
  const confidence = 48 + (hash % 40);

  const expectations = {
    Bullish: `Analysts expect ${companyName} to beat consensus EPS estimates, driven by strong sector momentum and recent guidance upgrades.`,
    Bearish: `Market expects pressure on margins for ${companyName} amid macro headwinds and cautious forward guidance.`,
    Neutral: `Estimates for ${companyName} are in line with the prior quarter; no significant surprise expected by the street.`,
  }[trend];

  const bulls = {
    Bullish: 'Upside beat triggers re-rating; price target upgrades likely from 2–3 major banks.',
    Bearish: 'If macro conditions stabilize, a modest beat could spark a short-covering rally.',
    Neutral: 'Solid execution and raised guidance could push shares to 52-week highs.',
  }[trend];

  const bears = {
    Bullish: 'Disappointment on revenue growth or margins could trigger a sharp post-earnings selloff.',
    Bearish: 'Miss on earnings with weak guidance may accelerate institutional selling pressure.',
    Neutral: 'In-line results with flat guidance could see profit-taking from momentum traders.',
  }[trend];

  const summary = {
    Bullish: `${companyName} shows favorable risk/reward ahead of earnings. Momentum and technicals align with a potential upside surprise.`,
    Bearish: `Caution warranted for ${companyName}. Elevated valuations and softening demand signals increase downside risk.`,
    Neutral: `Mixed signals for ${companyName}. Watch for management commentary on full-year outlook as the key catalyst.`,
  }[trend];

  return { trend, risk, confidence, expectations, bulls, bears, summary };
}

// ─── AI Analysis Panel ────────────────────────────────────────────────────────
function AIPanel({ item, onNavigate }) {
  const { trend, risk, confidence, expectations, bulls, bears, summary } =
    useMemo(() => generateMockAnalysis(item.symbol, item.companyName), [item.symbol]);

  const trendColor = trend === 'Bullish' ? 'text-green-400'
    : trend === 'Bearish' ? 'text-red-400'
    : 'dark:text-gray-300 text-gray-600';
  const trendBg = trend === 'Bullish'
    ? 'dark:bg-green-500/10 bg-green-50 dark:border-green-500/20 border-green-200'
    : trend === 'Bearish'
    ? 'dark:bg-red-500/10 bg-red-50 dark:border-red-500/20 border-red-200'
    : 'dark:bg-gray-500/10 bg-gray-50 dark:border-gray-500/20 border-gray-200';
  const TrendIcon = trend === 'Bullish' ? TrendingUp : trend === 'Bearish' ? TrendingDown : Minus;
  const riskColor = risk === 'Low'
    ? 'dark:bg-green-500/10 bg-green-50 text-green-400'
    : risk === 'High'
    ? 'dark:bg-red-500/10 bg-red-50 text-red-400'
    : 'dark:bg-amber-500/10 bg-amber-50 text-amber-400';
  const confColor = confidence >= 70 ? 'bg-green-500' : confidence >= 40 ? 'bg-blue-500' : 'bg-amber-500';
  const confLabel = confidence >= 70 ? 'High confidence' : confidence >= 40 ? 'Medium confidence' : 'Low confidence';

  return (
    <div className="px-4 py-4 dark:bg-white/[0.02] bg-gray-50/60 border-b dark:border-white/5 border-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <GakoIcon size={22} className="flex-shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-widest dark:text-gray-400 text-gray-500">Gako Insights</span>
        <span className="text-[9px] dark:text-gray-700 text-gray-300 opacity-50 select-none">V1</span>
        <button
          onClick={() => onNavigate(item.symbol)}
          className="ml-auto flex items-center gap-1 text-[11px] dark:text-cyan-400 text-blue-600 dark:hover:text-blue-300 hover:text-blue-800 transition-colors"
        >
          Open Stock View <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className={`rounded-lg border px-3 py-2.5 ${trendBg}`}>
          <p className="text-[10px] uppercase tracking-wide dark:text-gray-500 text-gray-500 mb-1">Trend</p>
          <div className={`flex items-center gap-1 font-semibold text-sm ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trend}
          </div>
        </div>
        <div className="rounded-lg dark:bg-white/5 bg-white border dark:border-white/5 border-gray-200 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide dark:text-gray-500 text-gray-500 mb-1">Risk</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColor}`}>{risk}</span>
        </div>
        <div className="rounded-lg dark:bg-white/5 bg-white border dark:border-white/5 border-gray-200 px-3 py-2.5 col-span-2">
          <p className="text-[10px] uppercase tracking-wide dark:text-gray-500 text-gray-500 mb-1.5">Confidence Score</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 rounded-full dark:bg-white/5 bg-gray-200 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${confColor}`} style={{ width: `${confidence}%` }} />
            </div>
            <span className="text-sm font-bold dark:text-white text-gray-900 tabular-nums w-6 text-right">{confidence}</span>
          </div>
          <p className="text-[10px] dark:text-gray-600 text-gray-400">{confLabel}</p>
        </div>
      </div>

      {/* Text sections */}
      <div className="space-y-2">
        <div className="rounded-lg dark:bg-white/5 bg-white border dark:border-white/5 border-gray-200 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide dark:text-gray-500 text-gray-500 mb-1">Market Expectations</p>
          <p className="text-xs dark:text-gray-300 text-gray-700 leading-relaxed">{expectations}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-lg dark:bg-green-500/5 bg-green-50/60 border dark:border-green-500/15 border-green-200 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-green-500 mb-1">Bull Scenario</p>
            <p className="text-xs dark:text-gray-300 text-gray-700 leading-relaxed">{bulls}</p>
          </div>
          <div className="rounded-lg dark:bg-red-500/5 bg-red-50/60 border dark:border-red-500/15 border-red-200 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-red-400 mb-1">Bear Scenario</p>
            <p className="text-xs dark:text-gray-300 text-gray-700 leading-relaxed">{bears}</p>
          </div>
        </div>
        <div className="rounded-lg dark:bg-blue-500/5 bg-blue-50/60 border dark:border-blue-500/10 border-blue-100 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-blue-400 mb-1">Summary</p>
          <p className="text-xs dark:text-gray-300 text-gray-700 leading-relaxed">{summary}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Earnings() {
  const navigate = useNavigate();
  const [view, setView] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const { alertedSymbols, toggleSymbolAlert } = useAlerts();

  const toggleExpand = (symbol) =>
    setExpandedSymbol(prev => prev === symbol ? null : symbol);

  const selectCalendarDay = (dateStr) => {
    if (calendarSelectedDate === dateStr) {
      setCalendarSelectedDate(null);
      setExpandedSymbol(null);
    } else {
      setCalendarSelectedDate(dateStr);
      setExpandedSymbol(null);
    }
  };

  const { data: earningsData = [], isLoading } = useEarningsData();

  const earningsByDate = useMemo(() =>
    earningsData.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {}),
  [earningsData]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay   = monthStart.getDay();

  // The earnings items for the selected calendar day
  const selectedDayItems = calendarSelectedDate ? (earningsByDate[calendarSelectedDate] || []) : [];
  // The expanded item object (for AIPanel)
  const expandedItem = expandedSymbol
    ? (view === 'calendar'
        ? selectedDayItems.find(i => i.symbol === expandedSymbol)
        : earningsData.find(i => i.symbol === expandedSymbol))
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">Earnings Calendar</h1>
          <p className="text-sm dark:text-gray-500 text-gray-500 mt-0.5">
            Upcoming earnings reports · {earningsData.length} companies
          </p>
        </div>
        <div className="flex items-center gap-1 dark:bg-white/5 bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
          <Button
            variant="ghost" size="sm"
            onClick={() => { setView('list'); setExpandedSymbol(null); }}
            className={`rounded-lg gap-1.5 h-8 text-xs px-3 ${view === 'list' ? 'dark:bg-white/10 bg-white shadow-sm dark:text-white text-gray-900' : 'dark:text-gray-400 text-gray-600'}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => { setView('calendar'); setExpandedSymbol(null); }}
            className={`rounded-lg gap-1.5 h-8 text-xs px-3 ${view === 'calendar' ? 'dark:bg-white/10 bg-white shadow-sm dark:text-white text-gray-900' : 'dark:text-gray-400 text-gray-600'}`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Calendar
          </Button>
        </div>
      </div>

      {/* ── List View ──────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.3)] overflow-hidden">
          {earningsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <TrendingUp className="w-12 h-12 dark:text-gray-700 text-gray-300 mb-3" />
              <h3 className="text-base font-semibold dark:text-white text-gray-900 mb-1">No upcoming earnings found</h3>
              <p className="text-sm dark:text-gray-500 text-gray-500">Check back later</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-white/5 border-gray-200">
                      <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500">Symbol</th>
                      <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500 hidden sm:table-cell">Company</th>
                      <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-500">Date</th>
                      <th className="w-8" />
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {earningsData.map(item => {
                      const d = new Date(item.date + 'T12:00:00');
                      const today = isToday(d);
                      const isExpanded = expandedSymbol === item.symbol;
                      return (
                        <React.Fragment key={item.symbol}>
                          <tr
                            onClick={() => toggleExpand(item.symbol)}
                            className={`border-b dark:border-white/5 border-gray-100 transition-colors cursor-pointer ${
                              isExpanded
                                ? 'dark:bg-white/[0.04] bg-blue-50/40'
                                : 'dark:hover:bg-white/[0.03] hover:bg-gray-50'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <StockLogo symbol={item.symbol} className="w-8 h-8" />
                                <span className="font-bold dark:text-white text-gray-900 text-sm">{item.symbol}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 dark:text-gray-400 text-gray-600 text-sm hidden sm:table-cell truncate max-w-[200px]">
                              {item.companyName}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm dark:text-white text-gray-900">{format(d, 'MMM d, yyyy')}</span>
                                {today && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">Today</span>}
                                {item.isEstimate && <span className="text-[10px] dark:text-gray-600 text-gray-400">est.</span>}
                              </div>
                            </td>
                            {/* Bell alert toggle */}
                            <td className="py-3.5 px-1" onClick={e => e.stopPropagation()}>
                              {(() => {
                                const alerted = alertedSymbols.has(item.symbol.toUpperCase());
                                return (
                                  <button
                                    onClick={() => toggleSymbolAlert(item.symbol)}
                                    title={alerted ? 'Remove earnings alert' : 'Add earnings alert'}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      alerted
                                        ? 'text-blue-400 dark:hover:bg-blue-500/10 hover:bg-blue-50'
                                        : 'dark:text-gray-600 text-gray-300 dark:hover:text-gray-400 hover:text-gray-500'
                                    }`}
                                  >
                                    {alerted
                                      ? <Bell className="w-3.5 h-3.5 fill-blue-400" />
                                      : <Bell className="w-3.5 h-3.5" />
                                    }
                                  </button>
                                );
                              })()}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              {isExpanded
                                ? <ChevronUp className="w-3.5 h-3.5 dark:text-gray-400 text-gray-500 ml-auto" />
                                : <ChevronDown className="w-3.5 h-3.5 dark:text-gray-600 text-gray-300 ml-auto" />
                              }
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={4} className="p-0">
                                <AIPanel item={item} onNavigate={(sym) => navigate(`/StockView?symbol=${sym}`)} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t dark:border-white/5 border-gray-100 text-center">
                <p className="text-[11px] dark:text-gray-600 text-gray-400">{earningsData.length} upcoming reports</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Calendar View ──────────────────────────────────────────────────── */}
      {view === 'calendar' && (
        <div className="rounded-xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setCalendarSelectedDate(null); setExpandedSymbol(null); }}
                className="p-2 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 dark:text-gray-400 text-gray-600" />
              </button>
              <h2 className="text-sm font-semibold dark:text-white text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button
                onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setCalendarSelectedDate(null); setExpandedSymbol(null); }}
                className="p-2 rounded-lg dark:hover:bg-white/5 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 dark:text-gray-400 text-gray-600" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-[11px] font-medium dark:text-gray-600 text-gray-400 pb-2">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map(day => {
                const ds = format(day, 'yyyy-MM-dd');
                const items = earningsByDate[ds] || [];
                const has = items.length > 0;
                const isSelected = calendarSelectedDate === ds;
                const todayDay = isToday(day);

                return (
                  <button
                    key={ds}
                    onClick={() => has && selectCalendarDay(ds)}
                    className={`relative p-2 min-h-[72px] rounded-xl text-left transition-all ${
                      todayDay ? 'ring-1 ring-blue-500/60' : ''
                    } ${
                      isSelected
                        ? 'dark:bg-blue-500/20 bg-blue-100 dark:ring-1 dark:ring-blue-500/40 ring-1 ring-blue-300'
                        : has
                        ? 'dark:bg-white/[0.04] bg-blue-50/70 dark:hover:bg-blue-500/15 hover:bg-blue-100/80 cursor-pointer'
                        : 'dark:hover:bg-white/[0.02] hover:bg-gray-50/80 cursor-default'
                    }`}
                  >
                    {/* Date number */}
                    <span className={`text-sm font-semibold leading-none ${
                      todayDay ? 'text-blue-500' : 'dark:text-gray-300 text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </span>

                    {has && (
                      <div className="mt-1.5 space-y-1">
                        {/* Company count badge */}
                        <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'dark:bg-blue-500/30 bg-blue-200 dark:text-blue-300 text-blue-700'
                            : 'dark:bg-blue-500/15 bg-blue-100 dark:text-blue-400 text-blue-600'
                        }`}>
                          {items.length} {items.length === 1 ? 'co.' : 'cos.'}
                        </span>
                        {/* Symbol chips */}
                        <div className="space-y-px">
                          {items.slice(0, 2).map(e => (
                            <span key={e.symbol} className="text-[10px] dark:text-gray-400 text-gray-600 font-medium block truncate leading-tight">
                              {e.symbol}
                            </span>
                          ))}
                          {items.length > 2 && (
                            <span className="text-[9px] dark:text-gray-600 text-gray-400 block">+{items.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Selected day detail ──────────────────────────────────────────── */}
          {calendarSelectedDate && selectedDayItems.length > 0 && (
            <div className="border-t dark:border-white/5 border-gray-100">
              {/* Date heading */}
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold dark:text-white text-gray-900">
                    {format(new Date(calendarSelectedDate + 'T12:00:00'), 'EEEE, MMMM d')}
                  </p>
                  <p className="text-[11px] dark:text-gray-500 text-gray-500 mt-0.5">
                    {selectedDayItems.length} {selectedDayItems.length === 1 ? 'company' : 'companies'} reporting · click a card to open Gako Insights
                  </p>
                </div>
                <button
                  onClick={() => { setCalendarSelectedDate(null); setExpandedSymbol(null); }}
                  className="text-[11px] dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>

              {/* Stock cards */}
              <div className="px-5 pb-4 flex flex-wrap gap-2">
                {selectedDayItems.map(item => {
                  const isActive = expandedSymbol === item.symbol;
                  const alerted = alertedSymbols.has(item.symbol.toUpperCase());
                  return (
                    <div key={item.symbol} className="relative">
                      <button
                        onClick={() => toggleExpand(item.symbol)}
                        className={`flex items-center gap-2.5 pl-3 pr-8 py-2.5 rounded-xl border transition-all ${
                          isActive
                            ? 'dark:bg-blue-500/15 bg-blue-50 dark:border-blue-500/30 border-blue-300 dark:text-white text-gray-900'
                            : 'dark:bg-white/[0.04] bg-gray-50 dark:border-white/5 border-gray-200 dark:hover:bg-white/[0.08] hover:bg-gray-100'
                        }`}
                      >
                        <StockLogo symbol={item.symbol} className="w-7 h-7 flex-shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-bold leading-tight dark:text-white text-gray-900">
                            {item.symbol}
                          </p>
                          <p className="text-[10px] dark:text-gray-500 text-gray-500 truncate max-w-[90px] leading-tight">
                            {item.companyName}
                          </p>
                        </div>
                        {isActive
                          ? <ChevronUp className="w-3 h-3 dark:text-blue-400 text-blue-600 flex-shrink-0" />
                          : <ChevronDown className="w-3 h-3 dark:text-gray-500 text-gray-400 flex-shrink-0" />
                        }
                      </button>
                      {/* Bell overlay — top-right of card */}
                      <button
                        onClick={() => toggleSymbolAlert(item.symbol)}
                        title={alerted ? 'Remove alert' : 'Add earnings alert'}
                        className={`absolute top-1.5 right-1.5 p-1 rounded-md transition-colors ${
                          alerted
                            ? 'text-blue-400'
                            : 'dark:text-gray-600 text-gray-300 dark:hover:text-gray-400 hover:text-gray-500'
                        }`}
                      >
                        <Bell className={`w-3 h-3 ${alerted ? 'fill-blue-400' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Inline Gako Insights panel */}
              {expandedItem && (
                <AIPanel
                  item={expandedItem}
                  onNavigate={(sym) => navigate(`/StockView?symbol=${sym}`)}
                />
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
