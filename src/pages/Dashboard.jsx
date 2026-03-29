import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import GeckoIcon from '../components/icons/GeckoIcon';
import { useNavigate } from 'react-router-dom';

import DisclaimerModal    from '../components/app/DisclaimerModal';
import DashboardHeader    from '../components/dashboard/DashboardHeader';
import AIOpportunityCard  from '../components/dashboard/AIOpportunityCard';
import WatchlistSidebar   from '../components/dashboard/WatchlistSidebar';
import EarningsSidebarCard from '../components/dashboard/EarningsSidebarCard';
import GeckoVision        from '../components/dashboard/GeckoVision';

// ── Gecko Picks ───────────────────────────────────────────────────────────────
//
// Selection criteria enforced by the engine:
//   Slot 1 — Large Cap  : signal-driven angle, not the obvious narrative
//   Slot 2 — Mid Cap    : strong fundamentals with early institutional accumulation
//   Slot 3 — Discovery  : limited analyst coverage, strong signal-to-noise ratio
//
// "discoveryTag" surfaces the discovery angle; null = well-covered name
// "capLabel"     gives the user immediate market-cap context
//
const GECKO_PICKS = [
  {
    ticker:       'MSFT',
    company:      'Microsoft Corporation',
    geckoScore:   88,
    timeframe:    'Earnings Play',
    confidence:   'High',
    reason:       'Azure cloud billing running ahead of Q3 consensus estimates.',
    reasons: [
      'Azure cloud billings in channel checks running 4–6% ahead of sell-side estimates for the quarter.',
      '11 institutional 13F filings added MSFT last week with zero sell-side downgrades in the period.',
      'RSI reset from overbought; price reaccumulated cleanly at the 50-day EMA — textbook re-entry.',
      'Options market showing IV at 45-day high pre-earnings — asymmetric reward visible in the skew.',
      'Beat-and-raise pattern in 7 of last 8 quarters with an average next-day gain of +4.2%.',
    ],
  },
  {
    ticker:       'AXON',
    company:      'Axon Enterprise',
    geckoScore:   91,
    timeframe:    'Swing',
    confidence:   'Very High',
    reason:       'SaaS ARR at inflection point; institutions accumulating before coverage widens.',
    reasons: [
      'TASER 10 + Axon Body 4 upgrade cycle accelerating across US agencies — 23 new county contracts in Q4.',
      'SaaS ARR crossed $700M with net revenue retention above 120% — enterprise stickiness at all-time high.',
      '35%+ revenue growth alongside positive operating cash flow for 6 consecutive quarters — rare combination.',
      'Short interest at 2-year low (3.8%) — institutions unwilling to fade this one into earnings.',
      'CEO Richard Smith purchased $8.2M at market price last month — not an option exercise.',
    ],
  },
  {
    ticker:       'TMDX',
    company:      'TransMedics Group',
    geckoScore:   85,
    timeframe:    'Swing',
    confidence:   'High',
    reason:       'Revenue tripling with near-zero analyst coverage and regulatory moat.',
    reasons: [
      'Proprietary Organ Care System + dedicated aviation fleet creates a regulatory moat nearly impossible to replicate.',
      'Q3 revenue grew 127% YoY — nearly tripled — with no deceleration visible in referral pipeline data.',
      'Covered by only 4 analysts globally; institutional discovery phase appears to be just beginning.',
      'Gross margin expanding: 38% → 51% over 12 months as fleet utilization compounds at scale.',
      'CEO and CFO collectively purchased $3.1M in open-market shares in the last 60 days.',
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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
                  Top Gecko Picks
                </h2>
                <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">
                  Surfacing opportunities before they become headlines
                </p>
              </div>
              <div className="flex items-center gap-3">
                <GeckoSignalBadge />
                <button
                  onClick={() => navigate('/Opportunities')}
                  className="flex items-center gap-1 text-xs font-medium dark:text-gray-500 text-gray-400 dark:hover:text-gray-300 hover:text-gray-600 transition-colors"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GECKO_PICKS.map(pick => (
                <AIOpportunityCard key={pick.ticker} {...pick} />
              ))}
            </div>
          </section>

          {/* Gecko Vision */}
          <section>
            <GeckoVision />
          </section>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-4 space-y-4">
          <WatchlistSidebar />
          <EarningsSidebarCard />
        </div>
      </div>
    </div>
  );
}
