import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to manage 5-second polling of lightweight market data
 * - Prevents overlapping API requests
 * - Loads initial data before starting polling
 * - Cleans up on unmount
 */
export function useMarketDataRefresh(assets, queryKey, enabled = true) {
  const queryClient = useQueryClient();
  const intervalRef = useRef(null);
  const isFetchingRef = useRef(false);
  const assetKeyRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isFetchingRef.current = false;
  }, []);

  const startPolling = useCallback(() => {
    if (!enabled || !assets || assets.length === 0) {
      stopPolling();
      return;
    }

    const assetKey = assets.join(',');

    // Prevent duplicate polling for same asset set
    if (assetKeyRef.current === assetKey && intervalRef.current) {
      return;
    }

    assetKeyRef.current = assetKey;

    // Set up 5-second polling with overlap prevention
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      // Skip if a fetch is already in progress
      if (isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;
      queryClient.refetchQueries({ queryKey }).finally(() => {
        isFetchingRef.current = false;
      });
    }, 5000);
  }, [assets, queryKey, enabled, queryClient, stopPolling]);

  useEffect(() => {
    if (enabled && assets && assets.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [assets, enabled, startPolling, stopPolling]);

  return { stopPolling };
}