import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, code, newPassword, confirmPassword } = body;

    // Validate inputs
    if (!email || !code || !newPassword || !confirmPassword) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return Response.json({ 
        success: false, 
        error: 'Passwords do not match' 
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find reset session
    let sessions = [];
    try {
      sessions = await base44.asServiceRole.entities.PasswordResetSession.filter({ email });
    } catch (dbError) {
      console.error('[DEBUG] PasswordResetSession.filter error:', dbError.message);
      return Response.json({ 
        success: false, 
        error: 'Invalid or expired reset session' 
      }, { status: 400 });
    }

    if (sessions.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid or expired reset session' 
      }, { status: 400 });
    }

    const session = sessions[0];

    // Verify code matches
    if (session.code !== code.toString()) {
      return Response.json({ 
        success: false, 
        error: 'Invalid verification code' 
      }, { status: 400 });
    }

    // Check if verified
    if (!session.verified) {
      return Response.json({ 
        success: false, 
        error: 'Code has not been verified' 
      }, { status: 400 });
    }

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      try {
        await base44.asServiceRole.entities.PasswordResetSession.delete(session.id);
      } catch (deleteError) {
        console.error('[DEBUG] Error deleting expired session:', deleteError.message);
      }
      return Response.json({ 
        success: false, 
        error: 'Reset session has expired' 
      }, { status: 400 });
    }

    // Find user
    let users = [];
    try {
      users = await base44.asServiceRole.entities.AuthUser.filter({ email });
    } catch (dbError) {
      console.error('[DEBUG] AuthUser.filter error:', dbError.message);
      return Response.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    if (users.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Hash and update password
    let hashedPassword;
    try {
      hashedPassword = await hashPassword(newPassword);
      console.log('[DEBUG] Password hashed for', email);
    } catch (hashError) {
      console.error('[DEBUG] Password hashing error:', hashError.message);
      return Response.json({ 
        success: false, 
        error: 'Failed to process password. Please try again.' 
      }, { status: 500 });
    }

    try {
      await base44.asServiceRole.entities.AuthUser.update(users[0].id, {
        password_hash: hashedPassword
      });
      console.log('[DEBUG] Password updated for', email);
    } catch (updateError) {
      console.error('[DEBUG] AuthUser.update error:', updateError.message);
      return Response.json({ 
        success: false, 
        error: 'Failed to update password. Please try again.' 
      }, { status: 500 });
    }

    // Delete reset session
    try {
      await base44.asServiceRole.entities.PasswordResetSession.delete(session.id);
      console.log('[DEBUG] Reset session deleted for', email);
    } catch (deleteError) {
      console.error('[DEBUG] Error deleting reset session:', deleteError.message);
      // Don't fail here, password is already updated
    }

    return Response.json({ 
      success: true, 
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('[ERROR] Unhandled error in resetPasswordWithCode:', error.message, error.stack);
    return Response.json({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
});