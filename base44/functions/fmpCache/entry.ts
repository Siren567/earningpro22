// In-memory cache with TTL support for FMP API responses
const cache = new Map();

const CACHE_DURATION = {
  key_metrics: 24 * 60 * 60 * 1000,      // 24 hours
  company_profile: 7 * 24 * 60 * 60 * 1000, // 7 days
  stock_quote: 60 * 1000,                 // 60 seconds
  watchlist_data: 60 * 1000               // 60 seconds
};

function getCacheKey(type, identifier) {
  return `${type}:${identifier}`;
}

function getCachedData(type, identifier) {
  const key = getCacheKey(type, identifier);
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  const now = Date.now();
  const age = now - entry.timestamp;
  const duration = CACHE_DURATION[type] || 60000;
  
  if (age > duration) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData(type, identifier, data) {
  const key = getCacheKey(type, identifier);
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function clearCache(type, identifier) {
  const key = getCacheKey(type, identifier);
  cache.delete(key);
}

export { getCachedData, setCachedData, clearCache };