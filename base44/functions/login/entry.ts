import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const { email, password, rememberMe } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find user by email
    const users = await base44.asServiceRole.entities.AuthUser.filter({ email });
    
    if (users.length === 0) {
      return Response.json({ 
        error: 'This account does not exist. Please register first.',
        errorType: 'EMAIL_NOT_FOUND'
      }, { status: 401 });
    }

    const user = users[0];

    // Check if user is suspended
    if (user.is_suspended) {
      return Response.json({ 
        error: 'Your account has been suspended.',
        errorType: 'ACCOUNT_SUSPENDED',
        suspended: true
      }, { status: 403 });
    }

    // Verify password using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const password_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (password_hash !== user.password_hash) {
      return Response.json({ 
        error: 'Incorrect password. Please try again.',
        errorType: 'WRONG_PASSWORD'
      }, { status: 401 });
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    // 30 days for Remember Me, 1 day for regular session
    const expirationDays = rememberMe ? 30 : 1;
    const sessionExpiry = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    await base44.asServiceRole.entities.UserSession.create({
      user_id: user.id,
      email: user.email,
      session_token: sessionToken,
      expires_at: sessionExpiry.toISOString(),
      remember_me: rememberMe || false
    });

    console.log('Login successful:', email);

    return Response.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        subscription_type: user.subscription_type
      },
      sessionToken
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});