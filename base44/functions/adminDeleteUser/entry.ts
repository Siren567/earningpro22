import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userEmail } = await req.json();

    // Delete user's profile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ created_by: userEmail });
    for (const profile of profiles) {
      await base44.asServiceRole.entities.UserProfile.delete(profile.id);
    }

    // Delete user's watchlists
    const watchlists = await base44.asServiceRole.entities.Watchlist.filter({ created_by: userEmail });
    for (const wl of watchlists) {
      await base44.asServiceRole.entities.Watchlist.delete(wl.id);
    }

    // Delete user's alerts
    const alerts = await base44.asServiceRole.entities.Alert.filter({ created_by: userEmail });
    for (const alert of alerts) {
      await base44.asServiceRole.entities.Alert.delete(alert.id);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});