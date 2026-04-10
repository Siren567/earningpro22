import { useAuth } from '../auth/AuthContext';
import { getEffectivePlan, getPlanLimits } from '../../lib/planConfig';

/**
 * Returns the current user's effective plan + limits.
 * Always safe to call — defaults to 'free' if profile is not yet loaded.
 */
export function useSubscription() {
  const { user, profile } = useAuth();
  const plan   = getEffectivePlan(profile?.subscription_plan);
  const limits = getPlanLimits(plan);

  return {
    plan,
    limits,
    isPremium: plan === 'premium',
    isFree:    plan === 'free',
    rawPlan:   profile?.subscription_plan ?? 'free',
    isLoaded:  !!user && profile !== undefined,
  };
}
