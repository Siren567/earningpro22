// ─── Daily AI analysis usage tracker ─────────────────────────────────────────
// Persists to localStorage keyed by userId + UTC date so it auto-resets daily.
// Not server-authoritative — sufficient for MVP; replace with DB counter later.

import { getPlanLimits } from './planConfig';

function buildKey(userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `ai_usage_${userId}_${today}`;
}

export function getAiUsageToday(userId) {
  if (!userId) return 0;
  const raw = localStorage.getItem(buildKey(userId));
  return raw ? parseInt(raw, 10) : 0;
}

export function incrementAiUsage(userId) {
  if (!userId) return;
  const key     = buildKey(userId);
  const current = getAiUsageToday(userId);
  localStorage.setItem(key, String(current + 1));
}

export function canRunAiToday(userId, plan) {
  const { aiDailyLimit } = getPlanLimits(plan);
  if (aiDailyLimit === Infinity) return true;
  return getAiUsageToday(userId) < aiDailyLimit;
}

export function getAiUsageRemaining(userId, plan) {
  const { aiDailyLimit } = getPlanLimits(plan);
  if (aiDailyLimit === Infinity) return Infinity;
  return Math.max(0, aiDailyLimit - getAiUsageToday(userId));
}
