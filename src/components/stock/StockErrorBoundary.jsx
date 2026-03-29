import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class StockErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[StockErrorBoundary] Caught error:', error?.message);
    console.error('[StockErrorBoundary] Component stack:', info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { symbol, price, companyName } = this.props.fallbackProps || {};

    return (
      <div className="rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 overflow-hidden shadow-lg p-6 md:p-8 space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl dark:bg-red-500/10 bg-red-50 border dark:border-red-500/20 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold dark:text-red-400 text-red-700">Unable to load full stock details</p>
            <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5">
              Some data for this asset could not be displayed. Basic information is shown below.
            </p>
          </div>
        </div>

        {(symbol || price || companyName) && (
          <div className="grid grid-cols-2 gap-3">
            {symbol && (
              <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
                <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Symbol</p>
                <p className="text-sm font-bold dark:text-white text-gray-900">{symbol}</p>
              </div>
            )}
            {companyName && (
              <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
                <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Company</p>
                <p className="text-sm font-bold dark:text-white text-gray-900">{companyName}</p>
              </div>
            )}
            {price != null && (
              <div className="p-4 rounded-xl dark:bg-white/5 bg-gray-50 border dark:border-white/5 border-gray-200">
                <p className="text-xs dark:text-gray-500 text-gray-500 mb-1">Last Price</p>
                <p className="text-sm font-bold dark:text-white text-gray-900">${Number(price).toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}