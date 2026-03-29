import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const generateCode = () => Math.random().toString().slice(2, 8);

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email } = body;

    // Validate email format
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid email address' 
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Check if user exists
    let users = [];
    try {
      users = await base44.asServiceRole.entities.AuthUser.filter({ email });
    } catch (dbError) {
      console.error('[DEBUG] AuthUser.filter error:', dbError.message);
      return Response.json({ 
        success: false, 
        error: 'This email is not registered in our system.' 
      }, { status: 404 });
    }

    if (users.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'This email is not registered in our system.' 
      }, { status: 404 });
    }

    console.log('[DEBUG] User found:', email);

    // Generate code and expiration
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    console.log('[DEBUG] Generated code for', email, 'expires:', expiresAt);

    // Delete existing session if present
    try {
      const existingSessions = await base44.asServiceRole.entities.PasswordResetSession.filter({ email });
      if (existingSessions.length > 0) {
        await base44.asServiceRole.entities.PasswordResetSession.delete(existingSessions[0].id);
        console.log('[DEBUG] Deleted existing session for', email);
      }
    } catch (deleteError) {
      console.error('[DEBUG] Error deleting existing session:', deleteError.message);
      // Don't crash, continue with new session creation
    }

    // Create new reset session
    let sessionCreated = false;
    try {
      await base44.asServiceRole.entities.PasswordResetSession.create({
        email,
        code,
        expiresAt,
        verified: false,
        attempts: 0
      });
      console.log('[DEBUG] Created reset session for', email);
      sessionCreated = true;
    } catch (createError) {
      console.error('[DEBUG] PasswordResetSession.create error:', createError.message);
      console.warn('[DEBUG] Reset session table may be missing or not accessible');
      // Continue anyway - we'll proceed with email send and let user try code verification
      // If table is missing, verification step will also fail safely
    }

    // Get API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('[DEBUG] RESEND_API_KEY status:', resendApiKey ? 'present' : 'missing');
    
    if (!resendApiKey) {
      console.error('[DEBUG] RESEND_API_KEY not configured');
      return Response.json({ 
        success: false, 
        error: 'Email service is not configured. Please contact support.' 
      }, { status: 500 });
    }

    // Send email via Resend
    let emailResponse;
    try {
      console.log('[DEBUG] Sending email to:', email);
      console.log('[DEBUG] Using from address: onboarding@resend.dev');
      
      emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Password Reset Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h1 style="color: #333; margin-bottom: 20px;">Password Reset Request</h1>
                
                <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                  You requested to reset your password. Use the verification code below:
                </p>
                
                <div style="background-color: #fff; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
                  <p style="color: #10b981; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 0;">
                    ${code}
                  </p>
                </div>
                
                <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
                  This code will expire in 10 minutes.
                </p>
                
                <p style="color: #999; font-size: 14px;">
                  If you did not request a password reset, you can ignore this email.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  StockPulse AI - Password Reset
                </p>
              </div>
            </div>
          `
        })
      });
      console.log('[DEBUG] Resend API response status:', emailResponse.status);
    } catch (fetchError) {
      console.error('[DEBUG] Fetch error calling Resend API:', fetchError.message);
      return Response.json({ 
        success: false, 
        error: 'We couldn\'t send the verification email right now. Please try again.' 
      }, { status: 500 });
    }

    if (!emailResponse.ok) {
      try {
        const errorData = await emailResponse.json().catch(() => ({}));
        console.error('[DEBUG] Resend API error:', JSON.stringify(errorData));
        
        // Check if it's an API key issue
        if (errorData.message && errorData.message.includes('key')) {
          console.error('[DEBUG] API key validation error - RESEND_API_KEY may be invalid or expired');
        }
      } catch (parseError) {
        console.error('[DEBUG] Error parsing Resend error response:', parseError.message);
      }
      
      // Development fallback: allow testing the rest of the flow
      const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production';
      if (isDevelopment) {
        console.warn('[FALLBACK] Email sending failed - using development fallback mode');
        console.warn('[FALLBACK] Code generated:', code, 'for email:', email);
        
        return Response.json({ 
          success: true,
          isDevelopmentFallback: true,
          fallbackCode: code,
          message: `Development fallback mode: email sending failed, use code: ${code}`
        });
      }
      
      // Production: return safe error message
      return Response.json({ 
        success: false, 
        error: 'We couldn\'t send the verification email right now. Please try again.' 
      }, { status: 500 });
    }

    console.log('[DEBUG] Email sent successfully to', email);

    return Response.json({ 
      success: true, 
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('[ERROR] Unhandled error in sendPasswordResetCode:', error.message, error.stack);
    return Response.json({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
});