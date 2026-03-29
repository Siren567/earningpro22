import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return Response.json({ success: true });
    }

    const base44 = createClientFromRequest(req);

    // Delete session
    const sessions = await base44.asServiceRole.entities.UserSession.filter({ 
      session_token: sessionToken 
    });

    for (const session of sessions) {
      await base44.asServiceRole.entities.UserSession.delete(session.id);
    }

    console.log('Logout successful');

    return Response.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});