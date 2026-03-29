import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchTerm } = await req.json().catch(() => ({}));

    // Get all users from both tables
    const builtInUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const authUsers = await base44.asServiceRole.entities.AuthUser.list('-created_date', 500);
    const authUserMap = authUsers.reduce((acc, u) => ({ ...acc, [u.email]: u }), {});
    
    // Get profiles
    const profiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 500);
    const profileMap = profiles.reduce((acc, p) => ({ ...acc, [p.created_by]: p }), {});

    // Merge user and profile data
    let users = builtInUsers.map(u => ({
      ...u,
      profile: profileMap[u.email] || null,
      subscription_plan: profileMap[u.email]?.subscription_plan || 'free',
      is_suspended: authUserMap[u.email]?.is_suspended || false
    }));

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(u => 
        u.email?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        u.profile?.first_name?.toLowerCase().includes(term) ||
        u.profile?.last_name?.toLowerCase().includes(term)
      );
    }

    return Response.json(users);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});