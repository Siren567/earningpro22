import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const DISCORD_WEBHOOK = Deno.env.get('DISCORD_WEBHOOK_URL');
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

async function sendDiscord(message) {
  if (!DISCORD_WEBHOOK) return { ok: false, reason: 'DISCORD_WEBHOOK_URL not configured' };
  const res = await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
  return { ok: res.ok, status: res.status };
}

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured' };
  }
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
    }
  );
  return { ok: res.ok, status: res.status };
}

function formatConditionLabel(conditionType, targetValue) {
  switch (conditionType) {
    case 'price_above': return `crossed above $${Number(targetValue).toFixed(2)}`;
    case 'price_below': return `dropped below $${Number(targetValue).toFixed(2)}`;
    case 'percent_above': return `% change exceeded +${Number(targetValue).toFixed(2)}%`;
    case 'percent_below': return `% change dropped below ${Number(targetValue).toFixed(2)}%`;
    default: return `triggered`;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { alertId, symbol, assetName, conditionType, targetValue, currentPrice, changePercent, channels } = await req.json();

    const condLabel = formatConditionLabel(conditionType, targetValue);
    const priceStr = currentPrice != null ? ` — Current price: $${Number(currentPrice).toFixed(2)}` : '';
    const changeStr = changePercent != null ? ` (${changePercent >= 0 ? '+' : ''}${Number(changePercent).toFixed(2)}%)` : '';

    const plainMessage = `[ALERT] ${symbol} ${condLabel}${priceStr}${changeStr}`;
    const htmlMessage = `<b>[ALERT]</b> <b>${symbol}</b> ${condLabel}${priceStr}${changeStr}`;

    const results = {};

    if (channels.includes('discord')) {
      results.discord = await sendDiscord(plainMessage);
    }
    if (channels.includes('telegram')) {
      results.telegram = await sendTelegram(htmlMessage);
    }

    // Log to NotificationHistory
    await base44.asServiceRole.entities.NotificationHistory.create({
      user_email: user.email,
      alert_id: alertId || '',
      stock_symbol: symbol,
      message: plainMessage,
      notification_type: 'price_alert',
      triggered_at: new Date().toISOString(),
    });

    // Update trigger count + last_triggered_at
    if (alertId) {
      const existing = await base44.asServiceRole.entities.Alert.filter({ id: alertId });
      const prev = existing[0];
      await base44.asServiceRole.entities.Alert.update(alertId, {
        trigger_count: (prev?.trigger_count || 0) + 1,
        last_triggered_at: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true, results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});