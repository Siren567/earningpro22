import { useEffect, useRef, useState, useCallback } from 'react';

const FINNHUB_WS_URL = 'wss://ws.finnhub.io';

/**
 * Connects to Finnhub WebSocket for real-time trade ticks.
 * Returns { wsPrice, wsConnected, wsError }
 * wsPrice is null until first tick arrives.
 */
export function useFinnhubWebSocket(symbol, apiKey) {
  const [wsPrice, setWsPrice] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState(false);
  const wsRef = useRef(null);
  const lastPriceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!symbol || !apiKey || !mountedRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(`${FINNHUB_WS_URL}?token=${apiKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('[FinnhubWS] Connected, subscribing to', symbol);
        ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        setWsConnected(true);
        setWsError(false);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'trade' && Array.isArray(msg.data) && msg.data.length > 0) {
            // Take the last trade price (most recent tick)
            const latestTrade = msg.data[msg.data.length - 1];
            const newPrice = latestTrade.p;
            if (
              newPrice &&
              Number.isFinite(newPrice) &&
              newPrice > 0 &&
              newPrice !== lastPriceRef.current
            ) {
              lastPriceRef.current = newPrice;
              setWsPrice(newPrice);
            }
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        console.warn('[FinnhubWS] Error');
        setWsConnected(false);
        setWsError(true);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setWsConnected(false);
        // Reconnect after 5s
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 5000);
      };
    } catch (e) {
      console.warn('[FinnhubWS] Failed to connect:', e.message);
      setWsError(true);
    }
  }, [symbol, apiKey]);

  useEffect(() => {
    mountedRef.current = true;
    // Reset state on symbol change
    setWsPrice(null);
    setWsConnected(false);
    setWsError(false);
    lastPriceRef.current = null;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, apiKey, connect]);

  return { wsPrice, wsConnected, wsError };
}