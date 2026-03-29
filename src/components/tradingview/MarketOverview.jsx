import React, { useEffect, useRef } from 'react';

export default function MarketOverview() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "colorTheme": "dark",
      "dateRange": "1D",
      "showChart": true,
      "locale": "en",
      "width": "100%",
      "height": "100%",
      "largeChartUrl": "",
      "isTransparent": true,
      "showSymbolLogo": true,
      "showFloatingTooltip": false,
      "plotLineColorGrowing": "rgba(16, 185, 129, 1)",
      "plotLineColorFalling": "rgba(239, 68, 68, 1)",
      "gridLineColor": "rgba(255, 255, 255, 0.06)",
      "scaleFontColor": "rgba(156, 163, 175, 1)",
      "belowLineFillColorGrowing": "rgba(16, 185, 129, 0.12)",
      "belowLineFillColorFalling": "rgba(239, 68, 68, 0.12)",
      "belowLineFillColorGrowingBottom": "rgba(16, 185, 129, 0)",
      "belowLineFillColorFallingBottom": "rgba(239, 68, 68, 0)",
      "symbolActiveColor": "rgba(16, 185, 129, 0.12)",
      "tabs": [
        {
          "title": "Indices",
          "symbols": [
            { "s": "FOREXCOM:SPXUSD", "d": "S&P 500" },
            { "s": "FOREXCOM:NSXUSD", "d": "US 100" },
            { "s": "FOREXCOM:DJI", "d": "Dow 30" },
            { "s": "INDEX:NKY", "d": "Nikkei 225" },
            { "s": "INDEX:DEU40", "d": "DAX Index" },
            { "s": "FOREXCOM:UKXGBP", "d": "UK 100" }
          ],
          "originalTitle": "Indices"
        },
        {
          "title": "Top Stocks",
          "symbols": [
            { "s": "NASDAQ:AAPL", "d": "Apple" },
            { "s": "NASDAQ:NVDA", "d": "Nvidia" },
            { "s": "NASDAQ:TSLA", "d": "Tesla" },
            { "s": "NASDAQ:MSFT", "d": "Microsoft" },
            { "s": "NASDAQ:GOOGL", "d": "Google" },
            { "s": "NASDAQ:META", "d": "Meta" }
          ],
          "originalTitle": "Top Stocks"
        },
        {
          "title": "Commodities",
          "symbols": [
            { "s": "OANDA:XAUUSD", "d": "Gold" },
            { "s": "TVC:USOIL", "d": "Oil" },
            { "s": "OANDA:XAGUSD", "d": "Silver" },
            { "s": "BITSTAMP:BTCUSD", "d": "Bitcoin" }
          ],
          "originalTitle": "Commodities"
        }
      ]
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height: '500px', width: '100%' }}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}