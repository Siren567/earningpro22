import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth is optional — mobile sessions may not pass tokens reliably
    try { await base44.auth.me(); } catch (_) { /* allow unauthenticated */ }

    const token = Deno.env.get('FINNHUB_API_KEY');
    if (!token) return Response.json({ error: 'Not configured' }, { status: 500 });

    return Response.json({ token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});