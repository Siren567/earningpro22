import { useAuth } from '../auth/AuthContext';
import { getPlanLimits, hasPremiumAccess } from '../../lib/planConfig';

/**
 * Returns the current user's effective plan + limits.
 *
 * Owners and admins always receive premium access regardless of their stored
 * subscription_plan. All other access decisions still use the stored plan.
 *
 * Always safe to call — defaults to 'free' if profile is not yet loaded.
 */
export function useSubscription() {
  const { user, profile } = useAuth();
  const role    = profile?.role    ?? 'user';
  const rawPlan = profile?.subscription_plan ?? null;

  // Owners and admins bypass plan restrictions
  const premium      = hasPremiumAccess(role, rawPlan);
  const effectivePlan = premium ? 'premium' : 'free';
  const limits        = getPlanLimits(effectivePlan);

  return {
    plan:      effectivePlan,          // effective tier: 'free' | 'premium'
    limits,
    isPremium: premium,
    isFree:    !premium,
    role,                              // 'owner' | 'admin' | 'user'
    rawPlan:   rawPlan ?? 'free',      // stored plan, unchanged
    isLoaded:  !!user && profile !== undefined,
  };
}
