// Static metadata for Crypto and Resources categories.
// Prices come from getStockQuote API — NOT from here.

export const CRYPTO_MOCK = [
  {
    symbol: 'BTC-USD',
    displaySymbol: 'BTC',
    name: 'Bitcoin',
    exchange: 'Crypto',
    logoUrl: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    color: '#F7931A',
    initials: 'BTC',
  },
  {
    symbol: 'ETH-USD',
    displaySymbol: 'ETH',
    name: 'Ethereum',
    exchange: 'Crypto',
    logoUrl: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    color: '#627EEA',
    initials: 'ETH',
  },
  {
    symbol: 'SOL-USD',
    displaySymbol: 'SOL',
    name: 'Solana',
    exchange: 'Crypto',
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    color: '#9945FF',
    initials: 'SOL',
  },
  {
    symbol: 'XRP-USD',
    displaySymbol: 'XRP',
    name: 'XRP',
    exchange: 'Crypto',
    logoUrl: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    color: '#346AA9',
    initials: 'XRP',
  },
  {
    symbol: 'BNB-USD',
    displaySymbol: 'BNB',
    name: 'BNB',
    exchange: 'Crypto',
    logoUrl: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    color: '#F3BA2F',
    initials: 'BNB',
  },
  {
    symbol: 'ADA-USD',
    displaySymbol: 'ADA',
    name: 'Cardano',
    exchange: 'Crypto',
    logoUrl: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    color: '#0D1E30',
    initials: 'ADA',
  },
  {
    symbol: 'DOGE-USD',
    displaySymbol: 'DOGE',
    name: 'Dogecoin',
    exchange: 'Crypto',
    logoUrl: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    color: '#C2A633',
    initials: 'DOGE',
  },
];

export const RESOURCES_MOCK = [
  {
    symbol: 'GC=F',
    displaySymbol: 'GOLD',
    name: 'Gold',
    exchange: 'COMEX',
    color: '#D4A843',
    initials: 'AU',
  },
  {
    symbol: 'SI=F',
    displaySymbol: 'SILVER',
    name: 'Silver',
    exchange: 'COMEX',
    color: '#9E9E9E',
    initials: 'AG',
  },
  {
    symbol: 'CL=F',
    displaySymbol: 'OIL',
    name: 'Crude Oil',
    exchange: 'NYMEX',
    color: '#5A5A5A',
    initials: 'OIL',
  },
  {
    symbol: 'NG=F',
    displaySymbol: 'GAS',
    name: 'Natural Gas',
    exchange: 'NYMEX',
    color: '#E07B39',
    initials: 'GAS',
  },
  {
    symbol: 'HG=F',
    displaySymbol: 'COPPER',
    name: 'Copper',
    exchange: 'COMEX',
    color: '#B87333',
    initials: 'CU',
  },
  {
    symbol: 'PL=F',
    displaySymbol: 'PLAT',
    name: 'Platinum',
    exchange: 'NYMEX',
    color: '#AAAAAA',
    initials: 'PT',
  },
];

// Lookup maps for quick access
export const CRYPTO_MAP = Object.fromEntries(CRYPTO_MOCK.map(c => [c.symbol, c]));
export const RESOURCES_MAP = Object.fromEntries(RESOURCES_MOCK.map(r => [r.symbol, r]));

export function getMockAsset(symbol) {
  return CRYPTO_MAP[symbol] || RESOURCES_MAP[symbol] || null;
}

export function isMockAsset(symbol) {
  return !!(CRYPTO_MAP[symbol] || RESOURCES_MAP[symbol]);
}