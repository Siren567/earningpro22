import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  fetchAlerts,
  addAlert as svcAdd,
  toggleAlert as svcToggle,
  removeAlert as svcRemove,
} from '@/lib/alerts';
import { getPlanLimits, getEffectivePlan } from '../../lib/planConfig';

const QUERY_KEY = 'userAlerts';

export function useAlerts() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const plan        = getEffectivePlan(profile?.subscription_plan);
  const alertsLimit = getPlanLimits(plan).alertsLimit;

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: () => fetchAlerts(user.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Set of alerted symbols (upper-cased) for O(1) lookup in list views
  const alertedSymbols = new Set(
    alerts.filter(a => a.is_enabled).map(a => a.symbol.toUpperCase())
  );

  // Map symbol → alert row for quick access
  const alertsBySymbol = Object.fromEntries(
    alerts.map(a => [a.symbol.toUpperCase(), a])
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });

  const addAlertMutation = useMutation({
    mutationFn: ({ symbol, alertType = 'earnings' }) =>
      svcAdd(user.id, symbol, alertType),
    onSuccess: invalidate,
  });

  const toggleAlertMutation = useMutation({
    mutationFn: ({ id, isEnabled }) => svcToggle(id, isEnabled),
    // Optimistic update
    onMutate: async ({ id, isEnabled }) => {
      await qc.cancelQueries({ queryKey: [QUERY_KEY, user?.id] });
      const prev = qc.getQueryData([QUERY_KEY, user?.id]);
      qc.setQueryData([QUERY_KEY, user?.id], old =>
        (old ?? []).map(a => a.id === id ? { ...a, is_enabled: isEnabled } : a)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) =>
      qc.setQueryData([QUERY_KEY, user?.id], ctx.prev),
    onSettled: invalidate,
  });

  const removeAlertMutation = useMutation({
    mutationFn: ({ id }) => svcRemove(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: [QUERY_KEY, user?.id] });
      const prev = qc.getQueryData([QUERY_KEY, user?.id]);
      qc.setQueryData([QUERY_KEY, user?.id], old =>
        (old ?? []).filter(a => a.id !== id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) =>
      qc.setQueryData([QUERY_KEY, user?.id], ctx.prev),
    onSettled: invalidate,
  });

  const isAtAlertsLimit = alerts.length >= alertsLimit;

  /**
   * Toggle convenience: if alert exists → toggle is_enabled,
   * if not → create it (gated by plan limit).
   * Returns 'LIMIT_REACHED' when the free cap is hit.
   */
  const toggleSymbolAlert = (symbol) => {
    if (!user) return;
    const existing = alertsBySymbol[symbol.toUpperCase()];
    if (existing) {
      toggleAlertMutation.mutate({ id: existing.id, isEnabled: !existing.is_enabled });
    } else {
      if (alerts.length >= alertsLimit) return 'LIMIT_REACHED';
      addAlertMutation.mutate({ symbol });
    }
  };

  const addAlert = (symbol) => {
    if (alerts.length >= alertsLimit) return 'LIMIT_REACHED';
    addAlertMutation.mutate({ symbol });
  };

  return {
    alerts,
    alertedSymbols,
    alertsBySymbol,
    isLoading,
    alertsLimit,
    isAtAlertsLimit,
    plan,
    addAlert,
    toggleAlert: (id, isEnabled) => toggleAlertMutation.mutate({ id, isEnabled }),
    removeAlert: (id) => removeAlertMutation.mutate({ id }),
    toggleSymbolAlert,
  };
}
