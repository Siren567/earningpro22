import React, { useEffect, useRef } from 'react';

export default function TickerTape() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        { "proName": "FOREXCOM:SPXUSD", "title": "S&P 500" },
        { "proName": "NASDAQ:AAPL", "title": "AAPL" },
        { "proName": "NASDAQ:NVDA", "title": "NVDA" },
        { "proName": "NASDAQ:TSLA", "title": "TSLA" },
        { "proName": "AMEX:SPY", "title": "SPY" },
        { "proName": "NASDAQ:QQQ", "title": "QQQ" },
        { "proName": "NASDAQ:AMZN", "title": "AMZN" },
        { "proName": "NASDAQ:META", "title": "META" },
        { "proName": "NASDAQ:GOOGL", "title": "GOOGL" },
        { "proName": "OANDA:XAUUSD", "title": "GOLD" },
        { "proName": "TVC:USOIL", "title": "OIL" },
        { "proName": "BITSTAMP:BTCUSD", "title": "BTC" }
      ],
      "showSymbolLogo": true,
      "colorTheme": "dark",
      "isTransparent": true,
      "displayMode": "adaptive",
      "locale": "en"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="tradingview-widget-container mb-6" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}