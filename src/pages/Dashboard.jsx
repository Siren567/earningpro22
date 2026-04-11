import React, { useState, useEffect, useCallback, Component } from 'react';

// ── ErrorBoundary — catches render errors in children so the rest of
//    the Dashboard keeps working even if one widget throws ──────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('[ErrorBoundary]', err); }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, RefreshCw, Crown, Lock } from 'lucide-react';
import GeckoIcon from '../components/icons/GeckoIcon';
import { useNavigate, Link } from 'react-router-dom';
import { useSubscription } from '../components/hooks/useSubscription';
import { useLanguage } from '../components/LanguageContext';

import DisclaimerModal    from '../components/app/DisclaimerModal';
import DashboardHeader    from '../components/dashboard/DashboardHeader';
import AIOpportunityCard  from '../components/dashboard/AIOpportunityCard';
import WatchlistSidebar   from '../components/dashboard/WatchlistSidebar';
import EarningsSidebarCard from '../components/dashboard/EarningsSidebarCard';
import GeckoVision        from '../components/dashboard/GeckoVision';

// ── Gecko Picks pool ──────────────────────────────────────────────────────────
// 12 candidates across 8 sectors — 3 shown at a time.
// Refresh picks non-overlapping stocks and maximises sector variety.
const GECKO_PICKS_POOL = [
  {
    ticker: 'MSFT', sector: 'cloud',
    company: 'Microsoft Corporation', geckoScore: 88,
    timeframe: 'Earnings Play', confidence: 'High',
    reason: 'Azure cloud billing running ahead of Q3 consensus estimates.',
    reasons: [
      'Azure cloud billings in channel checks running 4–6% ahead of sell-side estimates for the quarter.',
      '11 institutional 13F filings added MSFT last week with zero sell-side downgrades in the period.',
      'RSI reset from overbought; price reaccumulated cleanly at the 50-day EMA — textbook re-entry.',
      'Options market showing IV at 45-day high pre-earnings — asymmetric reward visible in the skew.',
      'Beat-and-raise pattern in 7 of last 8 quarters with an average next-day gain of +4.2%.',
    ],
  },
  {
    ticker: 'AXON', sector: 'defense',
    company: 'Axon Enterprise', geckoScore: 91,
    timeframe: 'Swing', confidence: 'Very High',
    reason: 'SaaS ARR at inflection point; institutions accumulating before coverage widens.',
    reasons: [
      'TASER 10 + Axon Body 4 upgrade cycle accelerating across US agencies — 23 new county contracts in Q4.',
      'SaaS ARR crossed $700M with net revenue retention above 120% — enterprise stickiness at all-time high.',
      '35%+ revenue growth alongside positive operating cash flow for 6 consecutive quarters — rare combination.',
      'Short interest at 2-year low (3.8%) — institutions unwilling to fade this one into earnings.',
      'CEO Richard Smith purchased $8.2M at market price last month — not an option exercise.',
    ],
  },
  {
    ticker: 'TMDX', sector: 'healthcare',
    company: 'TransMedics Group', geckoScore: 85,
    timeframe: 'Swing', confidence: 'High',
    reason: 'Revenue tripling with near-zero analyst coverage and regulatory moat.',
    reasons: [
      'Proprietary Organ Care System + dedicated aviation fleet creates a regulatory moat nearly impossible to replicate.',
      'Q3 revenue grew 127% YoY — nearly tripled — with no deceleration visible in referral pipeline data.',
      'Covered by only 4 analysts globally; institutional discovery phase appears to be just beginning.',
      'Gross margin expanding: 38% → 51% over 12 months as fleet utilization compounds at scale.',
      'CEO and CFO collectively purchased $3.1M in open-market shares in the last 60 days.',
    ],
  },
  {
    ticker: 'NVDA', sector: 'chips',
    company: 'NVIDIA Corporation', geckoScore: 90,
    timeframe: 'Swing', confidence: 'Very High',
    reason: 'Blackwell ramp ahead of schedule; data-center backlog extends into 2026.',
    reasons: [
      'Blackwell GPU shipments tracking 15% ahead of internal guidance per supply-chain checks.',
      'Hyperscaler capex commitments up 40% YoY — NVDA is the primary beneficiary of every dollar spent.',
      'NIM software stack gaining traction as an enterprise moat on top of the hardware cycle.',
      'Short interest at multi-year lows despite the run; no credible bearish thesis on the supply side.',
      'Gross margin guidance revised upward for the third consecutive quarter — rare in a ramp cycle.',
    ],
  },
  {
    ticker: 'CELH', sector: 'consumer',
    company: 'Celsius Holdings', geckoScore: 83,
    timeframe: 'Swing', confidence: 'High',
    reason: 'Post-inventory correction shelf-space gains accelerating at Walmart and Target.',
    reasons: [
      'Walmart reset added 1.2 linear feet of Celsius shelf space in 3,200 stores — effective Q1.',
      'International revenues (UK, Australia, France) now tracking at 22% of total — underfollowed by analysts.',
      'Pepsi distribution leverage means zero incremental capex to scale; margins should inflect sharply.',
      'Insider buying resumed after the correction; CFO added $420K in open-market purchases.',
      'Energy drink category growing 11% YoY while incumbents lose share — Celsius gaining 3 points.',
    ],
  },
  {
    ticker: 'RKLB', sector: 'space',
    company: 'Rocket Lab USA', geckoScore: 86,
    timeframe: 'Discovery', confidence: 'High',
    reason: 'Neutron development ahead of schedule; only credible alternative to SpaceX for medium lift.',
    reasons: [
      'Electron launches at 100% mission success rate over the last 9 missions — reliability moat widening.',
      'Space Systems segment (satellites + components) growing 80% YoY with near-100% gross margins.',
      'Neutron medium-lift rocket on track for 2026 debut — addresses a $10B+ addressable market.',
      'US DoD signed a $515M launch services agreement; national security contracts provide revenue floor.',
      'Covered by only 6 analysts despite being the #2 global launch provider — discovery phase intact.',
    ],
  },
  {
    ticker: 'PLTR', sector: 'data',
    company: 'Palantir Technologies', geckoScore: 87,
    timeframe: 'Swing', confidence: 'High',
    reason: 'AIP enterprise deployments accelerating; US commercial revenue inflecting sharply.',
    reasons: [
      'US commercial revenue grew 55% YoY — AIP bootcamps converting to multi-year enterprise contracts.',
      'Rule of 40 score above 60 for the first time; profitability expanding faster than revenue.',
      'Government contract pipeline visible through 2026 — NATO and allied nation deals now public.',
      'Short interest declining quarter-over-quarter as institutional ownership expands.',
      'CEO Alex Karp accumulated shares consistently in the last 3 fiscal quarters.',
    ],
  },
  {
    ticker: 'LLY', sector: 'pharma',
    company: 'Eli Lilly', geckoScore: 89,
    timeframe: 'Earnings Play', confidence: 'Very High',
    reason: 'GLP-1 production scaling ahead of analyst expectations; obesity market still underpenetrated.',
    reasons: [
      'Mounjaro + Zepbound prescriptions accelerating — weekly run-rate now tracking above Q4 consensus.',
      'Manufacturing capacity addition (three new sites) removes the prior supply constraint narrative.',
      'Pipeline optionality: orforglipron (oral GLP-1) Phase 3 data expected in H2 — massive optionality.',
      'P/E premium justified: 28% revenue CAGR projected through 2027 by 14 of 18 covering analysts.',
      'Recent pullback to 200-day MA provides entry point with historically strong recovery pattern.',
    ],
  },
  {
    ticker: 'SMCI', sector: 'chips',
    company: 'Super Micro Computer', geckoScore: 82,
    timeframe: 'Swing', confidence: 'High',
    reason: 'AI server buildout driving backlog; direct-liquid-cooling moat underappreciated.',
    reasons: [
      'DLC (direct liquid cooling) tech already shipped to 6 of the top 10 hyperscalers — 18-month head start.',
      'Backlog at record high with lead times extending — pricing power increasing alongside volume.',
      'Q2 revenue guidance raised by $400M at the midpoint, beating consensus for the 4th straight quarter.',
      'Share count stable — no dilution despite aggressive capacity expansion.',
      'Audit committee resolved; auditor engagement strengthens institutional re-entry thesis.',
    ],
  },
  {
    ticker: 'TSLA', sector: 'consumer',
    company: 'Tesla', geckoScore: 81,
    timeframe: 'Discovery', confidence: 'High',
    reason: 'FSD v12 real-world miles accelerating; robotaxi launch timeline firming.',
    reasons: [
      'FSD v12 supervised-to-unsupervised transition progressing; cumulative fleet miles doubling quarterly.',
      'Energy storage segment (Megapack) growing 150% YoY — now approaching 30% of gross profit.',
      'Cybertruck production ramp completing; margin structure improving toward Model Y levels.',
      'Optimus robot production target of 5,000 units by year-end — institutional investors now pricing in optionality.',
      'Price cuts stabilized; ASP decline slowing as software/energy revenue offsets hardware margin pressure.',
    ],
  },
  {
    ticker: 'MSTR', sector: 'data',
    company: 'MicroStrategy', geckoScore: 80,
    timeframe: 'Swing', confidence: 'High',
    reason: 'Bitcoin treasury strategy with institutional-grade leverage and growing ETF parallel.',
    reasons: [
      'BTC holdings now exceed 200,000 coins — largest corporate Bitcoin treasury globally.',
      'Equity ATM (at-the-market) offering enables continuous BTC accumulation with minimal dilution pressure.',
      'Institutional demand for MSTR as a Bitcoin proxy within traditional equity mandates is growing.',
      'Software segment cash flow generation provides fundamental floor independent of BTC price.',
      'Index inclusion in NASDAQ-100 confirmed — passive fund buying provides structural bid.',
    ],
  },
  {
    ticker: 'ISRG', sector: 'healthcare',
    company: 'Intuitive Surgical', geckoScore: 88,
    timeframe: 'Earnings Play', confidence: 'Very High',
    reason: 'da Vinci 5 installed base ramp driving system ASP and recurring instrument revenue.',
    reasons: [
      'da Vinci 5 launch ahead of expectations — 70% of Q4 placements were new da Vinci 5 systems.',
      'Recurring revenue (instruments + accessories) now 75% of total — highly visible, high-margin stream.',
      'International expansion: Japan procedure volumes up 31% YoY; China pipeline recovering.',
      'Gross margin guidance raised to 68–69% — instrument efficiency improvements flowing through P&L.',
      'Only 3–4 competitors have attempted this market; none have achieved meaningful share in 25 years.',
    ],
  },
];

// ── Gecko Signal badge ────────────────────────────────────────────────────────
function GeckoSignalBadge() {
  return (
    <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full dark:bg-white/[0.04] bg-gray-100 dark:text-gray-600 text-gray-400 uppercase tracking-widest flex-shrink-0">
      <GeckoIcon className="w-3 h-3" />
      Gecko Signal
    </div>
  );
}

// ── Gecko Picks refresh helpers ───────────────────────────────────────────────
const REFRESH_KEY        = 'gecko_picks_last_refresh';
const SELECTION_KEY      = 'gecko_picks_selection';
const REFRESH_INTERVAL   = 24 * 60 * 60 * 1000;

function formatRefreshTime(ts) {
  if (!ts) return null;
  const d   = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate()    === now.getDate()    &&
    d.getMonth()   === now.getMonth()   &&
    d.getFullYear() === now.getFullYear();
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const { isPremium, limits } = useSubscription();
  const geckoPicksSlots = isPremium ? 3 : limits.geckoPicksSlots;

  // ── Gecko Picks refresh state ───────────────────────────────────────────────
  const [picksRefreshing, setPicksRefreshing] = useState(false);
  const [picksLastRefresh, setPicksLastRefresh] = useState(() => {
    const stored = localStorage.getItem(REFRESH_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [picksSelection, setPicksSelection] = useState(() => {
    try {
      const stored = localStorage.getItem(SELECTION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 3) return parsed;
      }
    } catch {}
    return [0, 1, 2];
  });

  const handlePicksRefresh = useCallback(async () => {
    if (picksRefreshing) return;
    setPicksRefreshing(true);
    await new Promise(r => setTimeout(r, 500));

    const poolSize = GECKO_PICKS_POOL.length;
    const prev     = picksSelection;

    // Candidates: exclude previous picks to ensure fresh stocks
    let candidates = Array.from({ length: poolSize }, (_, i) => i).filter(i => !prev.includes(i));

    // Fisher-Yates shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // Pick 3 maximising sector variety: first pass picks from unique sectors
    const next        = [];
    const usedSectors = new Set();
    for (const idx of candidates) {
      if (next.length >= 3) break;
      const sector = GECKO_PICKS_POOL[idx].sector;
      if (!usedSectors.has(sector)) {
        next.push(idx);
        usedSectors.add(sector);
      }
    }
    // Second pass: fill remaining slots from any unused candidate
    for (const idx of candidates) {
      if (next.length >= 3) break;
      if (!next.includes(idx)) next.push(idx);
    }
    // Fallback: allow overlap if pool is too small
    if (next.length < 3) {
      const rest = Array.from({ length: poolSize }, (_, i) => i).filter(i => !next.includes(i));
      while (next.length < 3 && rest.length) next.push(rest.shift());
    }

    const now = Date.now();
    localStorage.setItem(REFRESH_KEY,   String(now));
    localStorage.setItem(SELECTION_KEY, JSON.stringify(next));
    setPicksLastRefresh(now);
    setPicksSelection(next);
    setPicksRefreshing(false);
  }, [picksRefreshing, picksSelection]);

  // Auto-refresh on mount if never refreshed or >24 h ago
  useEffect(() => {
    if (!picksLastRefresh || Date.now() - picksLastRefresh > REFRESH_INTERVAL) {
      handlePicksRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['userProfileDash'],
    queryFn: async () => {
      try {
        const me = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ created_by: me.email });
        if (profiles.length === 0) {
          const nameParts = (me.full_name || '').split(' ');
          return await base44.entities.UserProfile.create({
            first_name:   nameParts[0] || 'User',
            last_name:    nameParts.slice(1).join(' ') || '',
            disclaimer_accepted: false,
            subscription_plan:   'free',
            language: 'en',
            theme:    'dark',
          });
        }
        return profiles[0];
      } catch {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (profile && !profile.disclaimer_accepted) setShowDisclaimer(true);
  }, [profile]);

  const handleAcceptDisclaimer = async () => {
    if (profile) {
      try {
        await base44.entities.UserProfile.update(profile.id, {
          disclaimer_accepted:    true,
          disclaimer_accepted_at: new Date().toISOString(),
        });
      } catch {}
      setShowDisclaimer(false);
      refetchProfile();
    } else {
      setShowDisclaimer(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <DisclaimerModal open={showDisclaimer} onAccept={handleAcceptDisclaimer} />

      {/* Greeting + market overview */}
      <DashboardHeader />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-6 xl:gap-8 items-start">

        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="space-y-6 min-w-0">

          {/* Gecko Picks */}
          <section>
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold dark:text-white text-gray-900 tracking-tight">
                  {t('dash_gecko_picks')}
                </h2>
                <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">
                  {t('dash_gecko_subtitle')}
                </p>
              </div>

              {/* Refresh control */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {picksLastRefresh && (
                  <span className="text-[10px] dark:text-gray-600 text-gray-400 tabular-nums">
                    {t('dash_updated')} {formatRefreshTime(picksLastRefresh)}
                  </span>
                )}
                <button
                  onClick={handlePicksRefresh}
                  disabled={picksRefreshing}
                  className="w-6 h-6 rounded-md dark:bg-white/[0.05] bg-gray-100 flex items-center justify-center dark:hover:bg-white/10 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  aria-label="Refresh Gecko Picks"
                >
                  <RefreshCw
                    className={`w-3 h-3 dark:text-gray-400 text-gray-500 ${picksRefreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity duration-300 ${picksRefreshing ? 'opacity-50' : 'opacity-100'}`}>
              {picksSelection.map((idx, position) => {
                const isLocked = position >= geckoPicksSlots;
                return (
                  <div key={GECKO_PICKS_POOL[idx].ticker} className="relative">
                    <div className={isLocked ? 'blur-sm pointer-events-none select-none' : ''}>
                      <AIOpportunityCard {...GECKO_PICKS_POOL[idx]} />
                    </div>
                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl dark:bg-black/40 bg-white/60 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-2 text-center px-4">
                          <div className="w-9 h-9 rounded-full dark:bg-amber-400/10 bg-amber-50 flex items-center justify-center">
                            <Crown className="w-4 h-4 text-amber-400" />
                          </div>
                          <p className="text-xs font-semibold dark:text-white text-gray-900">{t('dash_premium_feature')}</p>
                          <Link
                            to="/Plans"
                            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                          >
                            {t('dash_upgrade_unlock')}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Gecko Vision */}
          <section className="relative">
            <div className={!isPremium ? 'blur-sm pointer-events-none select-none' : ''}>
              <GeckoVision />
            </div>
            {!isPremium && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl dark:bg-black/50 bg-white/70">
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-full dark:bg-amber-400/10 bg-amber-50 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white text-gray-900">{t('dash_geckovic_premium')}</p>
                    <p className="text-xs dark:text-gray-400 text-gray-500 mt-1">
                      {t('dash_geckovic_desc')}
                    </p>
                  </div>
                  <Link
                    to="/Plans"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold transition-colors"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {t('dash_upgrade_premium')}
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-4 space-y-4">
          <ErrorBoundary>
            <WatchlistSidebar />
          </ErrorBoundary>
          <ErrorBoundary>
            <EarningsSidebarCard />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
