import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY');
const DISCORD_WEBHOOK = Deno.env.get('DISCORD_WEBHOOK_URL');
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

const COOLDOWN_MINUTES = 30; // minimum minutes between re-triggers for same alert

async function getQuote(symbol) {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
  const data = await res.json();
  if (!data || data.c == null) return null;
  return { current: data.c, change: data.d, percentChange: data.dp, previousClose: data.pc };
}

async function sendDiscord(message) {
  if (!DISCORD_WEBHOOK) return;
  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  });
}

async function sendTelegram(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
  });
}

function conditionMet(alert, quote) {
  const { condition_type, target_value } = alert;
  const { current, percentChange } = quote;

  switch (condition_type) {
    case 'price_above':    return current != null && current >= target_value;
    case 'price_below':    return current != null && current <= target_value;
    case 'percent_above':  return percentChange != null && percentChange >= target_value;
    case 'percent_below':  return percentChange != null && percentChange <= target_value;
    default: return false;
  }
}

function formatMessage(alert, quote) {
  const symbol = alert.stock_symbol;
  const { condition_type, target_value } = alert;
  const { current, percentChange } = quote;

  let condStr = '';
  switch (condition_type) {
    case 'price_above':   condStr = `crossed above $${Number(target_value).toFixed(2)}`; break;
    case 'price_below':   condStr = `dropped below $${Number(target_value).toFixed(2)}`; break;
    case 'percent_above': condStr = `% change exceeded +${Number(target_value).toFixed(2)}%`; break;
    case 'percent_below': condStr = `% change dropped to ${Number(target_value).toFixed(2)}%`; break;
    default: condStr = 'condition triggered';
  }

  const priceStr = current != null ? ` | Price: $${Number(current).toFixed(2)}` : '';
  const changeStr = percentChange != null ? ` (${percentChange >= 0 ? '+' : ''}${Number(percentChange).toFixed(2)}%)` : '';

  return `[ALERT] ${symbol} ${condStr}${priceStr}${changeStr}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function can be called by a scheduler (no user auth needed in that case)
    // but we still try to use service role for all DB operations
    const alerts = await base44.asServiceRole.entities.Alert.filter({ is_active: true });

    const now = new Date();
    let checkedCount = 0;
    let triggeredCount = 0;

    for (const alert of alerts) {
      // Only process custom price/percent alerts (not default system alerts)
      if (!alert.stock_symbol || !alert.condition_type || alert.target_value == null) continue;

      // Cooldown check — skip if triggered within the cooldown window
      if (alert.last_triggered_at) {
        const lastFired = new Date(alert.last_triggered_at);
        const minutesSince = (now - lastFired) / 60000;
        if (minutesSince < COOLDOWN_MINUTES) continue;
      }

      const quote = await getQuote(alert.stock_symbol);
      if (!quote) continue;

      checkedCount++;

      if (!conditionMet(alert, quote)) continue;

      // Alert triggered
      triggeredCount++;
      const message = formatMessage(alert, quote);
      const htmlMsg = message.replace('[ALERT]', '<b>[ALERT]</b>');

      const channels = alert.channels || [];

      if (channels.includes('discord')) await sendDiscord(message);
      if (channels.includes('telegram')) await sendTelegram(htmlMsg);

      // Update trigger metadata
      await base44.asServiceRole.entities.Alert.update(alert.id, {
        trigger_count: (alert.trigger_count || 0) + 1,
        last_triggered_at: now.toISOString(),
      });

      // Log notification
      await base44.asServiceRole.entities.NotificationHistory.create({
        user_email: alert.created_by,
        alert_id: alert.id,
        stock_symbol: alert.stock_symbol,
        message,
        notification_type: 'price_alert',
        triggered_at: now.toISOString(),
      });
    }

    return Response.json({ checked: checkedCount, triggered: triggeredCount });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});