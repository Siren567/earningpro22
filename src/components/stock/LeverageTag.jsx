import React from 'react';
import { Info } from 'lucide-react';

// Known leveraged/inverse ETF symbols mapped to their underlying
const LEVERAGED_ETF_MAP = {
  // Direxion
  'TQQQ': { underlying: 'NASDAQ-100', leverage: '3x', direction: 'Bull' },
  'SQQQ': { underlying: 'NASDAQ-100', leverage: '3x', direction: 'Bear' },
  'SPXL': { underlying: 'S&P 500', leverage: '3x', direction: 'Bull' },
  'SPXS': { underlying: 'S&P 500', leverage: '3x', direction: 'Bear' },
  'UPRO': { underlying: 'S&P 500', leverage: '3x', direction: 'Bull' },
  'SPXU': { underlying: 'S&P 500', leverage: '3x', direction: 'Bear' },
  'FNGU': { underlying: 'NYSE FANG+', leverage: '3x', direction: 'Bull' },
  'FNGD': { underlying: 'NYSE FANG+', leverage: '3x', direction: 'Bear' },
  'TECL': { underlying: 'Technology', leverage: '3x', direction: 'Bull' },
  'TECS': { underlying: 'Technology', leverage: '3x', direction: 'Bear' },
  'SOXL': { underlying: 'Semiconductors', leverage: '3x', direction: 'Bull' },
  'SOXS': { underlying: 'Semiconductors', leverage: '3x', direction: 'Bear' },
  'LABU': { underlying: 'Biotech', leverage: '3x', direction: 'Bull' },
  'LABD': { underlying: 'Biotech', leverage: '3x', direction: 'Bear' },
  'NUGT': { underlying: 'Gold Miners', leverage: '2x', direction: 'Bull' },
  'DUST': { underlying: 'Gold Miners', leverage: '2x', direction: 'Bear' },
  'JNUG': { underlying: 'Junior Gold Miners', leverage: '2x', direction: 'Bull' },
  'JDST': { underlying: 'Junior Gold Miners', leverage: '2x', direction: 'Bear' },
  'TNA': { underlying: 'Russell 2000', leverage: '3x', direction: 'Bull' },
  'TZA': { underlying: 'Russell 2000', leverage: '3x', direction: 'Bear' },
  'FAS': { underlying: 'Financials', leverage: '3x', direction: 'Bull' },
  'FAZ': { underlying: 'Financials', leverage: '3x', direction: 'Bear' },
  'ERX': { underlying: 'Energy', leverage: '2x', direction: 'Bull' },
  'ERY': { underlying: 'Energy', leverage: '2x', direction: 'Bear' },
  // ProShares
  'QLD': { underlying: 'NASDAQ-100', leverage: '2x', direction: 'Bull' },
  'QID': { underlying: 'NASDAQ-100', leverage: '2x', direction: 'Bear' },
  'SSO': { underlying: 'S&P 500', leverage: '2x', direction: 'Bull' },
  'SDS': { underlying: 'S&P 500', leverage: '2x', direction: 'Bear' },
  'UDOW': { underlying: 'Dow Jones', leverage: '3x', direction: 'Bull' },
  'SDOW': { underlying: 'Dow Jones', leverage: '3x', direction: 'Bear' },
  'DDM': { underlying: 'Dow Jones', leverage: '2x', direction: 'Bull' },
  'DXD': { underlying: 'Dow Jones', leverage: '2x', direction: 'Bear' },
  'UVXY': { underlying: 'VIX', leverage: '1.5x', direction: 'Bull' },
  'SVXY': { underlying: 'VIX', leverage: '-0.5x', direction: 'Bear' },
  // GraniteShares / Single-stock
  'NVDL': { underlying: 'NVDA', leverage: '2x', direction: 'Bull' },
  'NVDS': { underlying: 'NVDA', leverage: '-1x', direction: 'Bear' },
  'TSLL': { underlying: 'TSLA', leverage: '2x', direction: 'Bull' },
  'TSLS': { underlying: 'TSLA', leverage: '-1x', direction: 'Bear' },
  'AAPB': { underlying: 'AAPL', leverage: '2x', direction: 'Bull' },
  'AAPS': { underlying: 'AAPL', leverage: '-1x', direction: 'Bear' },
  'MSFU': { underlying: 'MSFT', leverage: '2x', direction: 'Bull' },
  'MSFD': { underlying: 'MSFT', leverage: '-1x', direction: 'Bear' },
  'AMZU': { underlying: 'AMZN', leverage: '2x', direction: 'Bull' },
  'AMZD': { underlying: 'AMZN', leverage: '-1x', direction: 'Bear' },
  'GOGU': { underlying: 'GOOGL', leverage: '2x', direction: 'Bull' },
  'METL': { underlying: 'META', leverage: '2x', direction: 'Bull' },
  // Bmn
  'BMNU': { underlying: 'Bitcoin', leverage: '2x', direction: 'Bull' },
  'BMNZ': { underlying: 'Bitcoin', leverage: '-1x', direction: 'Bear' },
};

// Detect leveraged ETF from company name patterns or symbol
export function detectLeverage(companyName, stockData) {
  const symbol = stockData?.symbol?.toUpperCase() || '';

  // 1. Direct symbol lookup
  if (LEVERAGED_ETF_MAP[symbol]) {
    const info = LEVERAGED_ETF_MAP[symbol];
    return { isLeveraged: true, ...info, type: 'ETF' };
  }

  // 2. Name-based detection
  if (!companyName) return { isLeveraged: false };
  const name = companyName.toLowerCase();

  const leveragePatterns = [
    /\b(2x|3x|1\.5x|-1x|-2x|-3x)\b/,
    /\b(ultra|ultra pro|ultrashort|ultra short)\b/,
    /\b(bull|bear|inverse|leveraged|direxion|proshares|granites hares|granite shares)\b/,
    /\bdaily\s+(2x|3x)\b/,
  ];

  const isLeveraged = leveragePatterns.some(p => p.test(name));
  if (!isLeveraged) return { isLeveraged: false };

  // Try to extract leverage multiplier
  const leverageMatch = name.match(/\b(3x|2x|1\.5x|-1x|-2x|-3x|1x)\b/);
  const leverage = leverageMatch ? leverageMatch[1] : null;
  const direction = /bear|short|inverse|-[123]x/.test(name) ? 'Bear' : 'Bull';

  return { isLeveraged: true, leverage, direction, underlying: null, type: 'ETF' };
}

export default function LeverageTag({ companyName, stockData }) {
  const info = detectLeverage(companyName, stockData);
  if (!info.isLeveraged) return null;

  const isBull = info.direction === 'Bull';
  const textColor = isBull ? 'text-blue-600 dark:text-blue-500/70' : 'text-red-500 dark:text-red-400/70';
  const directionLabel = isBull ? 'Long' : 'Short';
  const tooltip = isBull
    ? 'This asset amplifies the movement of its underlying in the same direction.'
    : 'This asset moves opposite to its underlying. When the underlying goes down, this asset goes up.';

  return (
    <span className="inline-flex items-center gap-1.5 ml-3 align-middle">
      <span className="text-sm dark:text-gray-500 text-gray-400 font-normal">·</span>
      <span className={`text-[13px] font-medium tracking-wide ${textColor}`}>
        {info.leverage && <>{info.leverage} </>}{directionLabel}
      </span>
      <div className="group relative inline-flex">
        <Info className={`w-3.5 h-3.5 cursor-help opacity-50 ${textColor}`} />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 w-64 border border-gray-700 shadow-xl">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>
    </span>
  );
}