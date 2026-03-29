import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userEmail, updates } = await req.json();

    // Update AuthUser entity for suspension status
    if (updates.is_suspended !== undefined) {
      const users = await base44.asServiceRole.entities.AuthUser.filter({ email: userEmail });
      if (users.length > 0) {
        await base44.asServiceRole.entities.AuthUser.update(users[0].id, { is_suspended: updates.is_suspended });
      }
    }

    // Find user's profile and update other fields
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: userEmail });
    
    if (profiles.length > 0) {
      // Update existing profile
      await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, updates);
    } else if (updates.subscription_plan) {
      // Create profile if updating subscription
      await base44.asServiceRole.entities.UserProfile.create({
        first_name: 'User',
        last_name: '',
        ...updates
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});