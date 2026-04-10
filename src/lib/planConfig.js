// ─── Central subscription plan configuration ──────────────────────────────────
// Single source of truth for all feature limits and gates.
// Import this everywhere — never hardcode limits in components.

export const PLAN_LIMITS = {
  free: {
    maxWatchlists:      1,        // 1 = Favorites only, no custom lists
    watchlistLimit:     5,        // max stocks across Favorites
    alertsLimit:        3,
    aiDailyLimit:       3,
    earningsWindowDays: 7,
    geckoPicksSlots:    1,        // free users see only the first pick
    geckoVisionAccess:  false,
    wyckoffAccess:      false,    // Wyckoff Analysis is premium-only
  },
  premium: {
    maxWatchlists:      Infinity,
    watchlistLimit:     Infinity,
    alertsLimit:        Infinity,
    aiDailyLimit:       Infinity,
    earningsWindowDays: Infinity,
    geckoPicksSlots:    Infinity,
    geckoVisionAccess:  true,
    wyckoffAccess:      true,
  },
};

/**
 * Map any raw subscription_plan value to the two active tiers.
 * 'pro', 'basic', 'enterprise' all map to 'premium' for now.
 */
export function getEffectivePlan(rawPlan) {
  if (!rawPlan || rawPlan === 'free') return 'free';
  return 'premium';
}

export function getPlanLimits(planOrRaw) {
  return PLAN_LIMITS[getEffectivePlan(planOrRaw)] ?? PLAN_LIMITS.free;
}
