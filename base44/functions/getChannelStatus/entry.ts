import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    return Response.json({
      discord: !!Deno.env.get('DISCORD_WEBHOOK_URL'),
      telegram: !!(Deno.env.get('TELEGRAM_BOT_TOKEN') && Deno.env.get('TELEGRAM_CHAT_ID')),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});