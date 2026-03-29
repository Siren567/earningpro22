import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, code } = body;

    // Validate inputs
    if (!email || !code) {
      return Response.json({ 
        success: false, 
        error: 'Email and code required' 
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
        error: 'Invalid verification code' 
      }, { status: 400 });
    }

    if (sessions.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid verification code' 
      }, { status: 400 });
    }

    const session = sessions[0];

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      try {
        await base44.asServiceRole.entities.PasswordResetSession.delete(session.id);
      } catch (deleteError) {
        console.error('[DEBUG] Error deleting expired session:', deleteError.message);
      }
      return Response.json({ 
        success: false, 
        error: 'Verification code has expired. Request a new one.' 
      }, { status: 400 });
    }

    // Check attempts
    const attempts = session.attempts || 0;
    if (attempts >= 5) {
      try {
        await base44.asServiceRole.entities.PasswordResetSession.delete(session.id);
      } catch (deleteError) {
        console.error('[DEBUG] Error deleting session after too many attempts:', deleteError.message);
      }
      return Response.json({ 
        success: false, 
        error: 'Too many failed attempts. Please request a new code.' 
      }, { status: 429 });
    }

    // Verify code matches
    if (session.code !== code.toString()) {
      try {
        await base44.asServiceRole.entities.PasswordResetSession.update(session.id, {
          attempts: attempts + 1
        });
        console.log('[DEBUG] Invalid code attempt', attempts + 1, 'for', email);
      } catch (updateError) {
        console.error('[DEBUG] Error updating attempt count:', updateError.message);
      }
      return Response.json({ 
        success: false, 
        error: 'Invalid verification code' 
      }, { status: 400 });
    }

    // Mark as verified
    try {
      await base44.asServiceRole.entities.PasswordResetSession.update(session.id, {
        verified: true
      });
      console.log('[DEBUG] Code verified for', email);
    } catch (updateError) {
      console.error('[DEBUG] Error marking session as verified:', updateError.message);
      return Response.json({ 
        success: false, 
        error: 'Failed to verify code. Please try again.' 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      message: 'Code verified successfully',
      sessionId: session.id
    });
  } catch (error) {
    console.error('[ERROR] Unhandled error in verifyPasswordResetCode:', error.message, error.stack);
    return Response.json({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
});