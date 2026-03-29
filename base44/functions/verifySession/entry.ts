import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return Response.json({ error: 'Session token required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find active session
    const sessions = await base44.asServiceRole.entities.UserSession.filter({ 
      session_token: sessionToken 
    });

    if (sessions.length === 0) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    const session = sessions[0];

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      await base44.asServiceRole.entities.UserSession.delete(session.id);
      return Response.json({ error: 'Session expired' }, { status: 401 });
    }

    // Get user data
    const users = await base44.asServiceRole.entities.AuthUser.filter({ 
      id: session.user_id 
    });

    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 401 });
    }

    const user = users[0];

    // Check if user is suspended
    if (user.is_suspended) {
      await base44.asServiceRole.entities.UserSession.delete(session.id);
      return Response.json({ 
        error: 'Your account has been suspended.',
        suspended: true
      }, { status: 403 });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        subscription_type: user.subscription_type,
        is_suspended: user.is_suspended
      }
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});