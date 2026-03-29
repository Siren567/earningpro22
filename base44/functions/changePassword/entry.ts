import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } = await req.json();

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Response.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return Response.json({ error: 'New passwords do not match' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Get user from AuthUser entity
    const users = await base44.asServiceRole.entities.AuthUser.filter({ email: user.email });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const authUser = users[0];

    // Verify current password by hashing and comparing
    const currentPasswordHash = await hashPassword(currentPassword);
    if (currentPasswordHash !== authUser.password_hash) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in database
    await base44.asServiceRole.entities.AuthUser.update(authUser.id, {
      password_hash: newPasswordHash
    });

    return Response.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}