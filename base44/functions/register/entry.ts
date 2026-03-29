import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const { first_name, last_name, birth_date, email, password } = await req.json();

    // Validate input
    if (!first_name || !last_name || !email || !password) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Check if email already exists
    const existingUsers = await base44.asServiceRole.entities.AuthUser.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Hash password using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const password_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check if this is the first user (admin)
    const allUsers = await base44.asServiceRole.entities.AuthUser.list();
    const role = allUsers.length === 0 ? 'admin' : 'user';

    console.log(`Creating ${role} user:`, email);

    // Create user
    const newUser = await base44.asServiceRole.entities.AuthUser.create({
      first_name,
      last_name,
      birth_date: birth_date || null,
      email,
      password_hash,
      role,
      subscription_type: 'free'
    });

    // Create session token
    const sessionToken = crypto.randomUUID();
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await base44.asServiceRole.entities.UserSession.create({
      user_id: newUser.id,
      email: newUser.email,
      session_token: sessionToken,
      expires_at: sessionExpiry.toISOString()
    });

    return Response.json({
      success: true,
      user: {
        id: newUser.id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        role: newUser.role,
        subscription_type: newUser.subscription_type
      },
      sessionToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});