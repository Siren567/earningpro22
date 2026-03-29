import React from 'react';

// Format large numbers for display
const formatNumber = (num) => {
  if (num === null || num === undefined) return null;
  if (num === 0) return '$0.00';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1e12) {
    return `$${(num / 1e12).toFixed(2)}T`;
  } else if (absNum >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  } else if (absNum >= 1e6) {
    return `$${(num / 1e6).toFixed(1)}M`;
  } else if (absNum >= 1e3) {
    return `$${(num / 1e3).toFixed(1)}K`;
  }
  return `$${num.toFixed(2)}`;
};

const formatVolume = (num) => {
  if (num === null || num === undefined) return null;
  if (num === 0) return '0';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toFixed(0);
};

export default function StockMetrics({ profile, earnings }) {
  console.log('[StockMetrics] Rendering with finalStock:', profile);

  return (
    <div className="p-8">
      <h3 className="text-sm font-semibold dark:text-white text-gray-900 mb-4 uppercase tracking-wider">Key Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Trailing EPS */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Trailing EPS</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.eps !== null && profile?.eps !== undefined ? `$${profile.eps.toFixed(2)}` : 'Not available'}
          </p>
        </div>

        {/* Forward EPS */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Forward EPS</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.forwardEps !== null && profile?.forwardEps !== undefined ? `$${profile.forwardEps.toFixed(2)}` : 'Not available'}
          </p>
        </div>

        {/* Market Cap */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Market Cap</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {formatNumber(profile?.marketCap) || 'Not available'}
          </p>
        </div>

        {/* Volume */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Volume</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {formatVolume(profile?.volume) || 'Not available'}
          </p>
        </div>

        {/* Average Volume */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Avg Volume</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {formatVolume(profile?.avgVolume) || 'Not available'}
          </p>
        </div>

        {/* 52W High */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">52W High</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.fiftyTwoWeekHigh !== null && profile?.fiftyTwoWeekHigh !== undefined ? `$${profile.fiftyTwoWeekHigh.toFixed(2)}` : 'Not available'}
          </p>
        </div>

        {/* 52W Low */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">52W Low</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.fiftyTwoWeekLow !== null && profile?.fiftyTwoWeekLow !== undefined ? `$${profile.fiftyTwoWeekLow.toFixed(2)}` : 'Not available'}
          </p>
        </div>

        {/* Beta */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Beta</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.beta !== null && profile?.beta !== undefined ? profile.beta.toFixed(2) : 'Not available'}
          </p>
        </div>

        {/* Target Price */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Target Price</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.targetPrice !== null && profile?.targetPrice !== undefined ? `$${profile.targetPrice.toFixed(2)}` : 'Not available'}
          </p>
        </div>

        {/* Recommendation */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Analyst Rating</p>
          <p className="text-sm font-bold dark:text-white text-gray-900 capitalize">
            {profile?.recommendation || 'Not available'}
          </p>
        </div>

        {/* Revenue Growth */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Revenue Growth</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.revenueGrowth !== null && profile?.revenueGrowth !== undefined ? `${(profile.revenueGrowth * 100).toFixed(1)}%` : 'Not available'}
          </p>
        </div>

        {/* Volatility */}
        <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
          <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Volatility</p>
          <p className="text-sm font-bold dark:text-white text-gray-900">
            {profile?.volatility !== null && profile?.volatility !== undefined ? `${profile.volatility.toFixed(1)}%` : 'Not available'}
          </p>
        </div>
      </div>
    </div>
  );
}