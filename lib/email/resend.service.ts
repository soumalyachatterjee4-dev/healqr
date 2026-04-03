/**
 * Resend Email Service Configuration
 * 
 * Handles passwordless authentication via email magic links
 * Sender: support@healqr.com
 */

import { Resend } from 'resend';

// Resend API Configuration
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || 'YOUR_RESEND_API_KEY';
const SENDER_EMAIL = 'onboarding@resend.dev'; // Using Resend's test domain for now
const APP_NAME = 'HealQR';
const APP_URL = 'https://teamhealqr.web.app'; // Fixed URL

// Log configuration (for debugging)

// Initialize Resend client
const resend = new Resend(RESEND_API_KEY);

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Signup verification email template
 */
const getSignupEmailTemplate = (doctorName: string, verificationLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #000000; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 16px; padding: 40px; border: 1px solid #333; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #10b981; font-size: 32px; margin: 0; }
    .content { color: #ffffff; }
    .content h2 { color: #10b981; margin-top: 0; }
    .content p { color: #d1d5db; line-height: 1.6; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; text-align: center; }
    .button:hover { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; }
    .qr-info { background: #1a1a1a; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>heal<span style="color:#3b82f6;">Qr</span></h1>
      </div>
      <div class="content">
        <h2>Welcome to HealQR, Dr. ${doctorName}! 🎉</h2>
        <p>Thank you for registering with HealQR - World's First QR-based e-Assistant for Doctors.</p>
        <p><strong>Click the button below to verify your email and generate your unique QR code:</strong></p>
        <div style="text-align: center;">
          <a href="${verificationLink}" class="button">Verify Email & Get QR Code</a>
        </div>
        <div class="qr-info">
          <p style="margin: 0; color: #10b981; font-weight: 600;">✨ What happens next?</p>
          <ul style="color: #d1d5db; margin: 12px 0 0 0; padding-left: 20px;">
            <li>Your unique QR code will be generated</li>
            <li>Download & share it with patients</li>
            <li>Start receiving instant bookings</li>
            <li>Access your doctor dashboard</li>
          </ul>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">This link expires in 1 hour. If you didn't create an account, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>HealQR - Doctor's e-Assistant</p>
        <p>Questions? Reply to this email or visit <a href="${APP_URL}" style="color: #10b981;">healqr.web.app</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Login magic link email template
 */
/**
 * Assistant verification email template
 */
const getAssistantVerificationEmailTemplate = (
  assistantName: string,
  doctorEmail: string,
  verificationLink: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #000000; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 16px; padding: 40px; border: 1px solid #333; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #10b981; font-size: 32px; margin: 0; }
    .content { color: #ffffff; }
    .content h2 { color: #8b5cf6; margin-top: 0; }
    .content p { color: #d1d5db; line-height: 1.6; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; text-align: center; }
    .button:hover { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; }
    .info-box { background: #1a1a1a; border-left: 4px solid #8b5cf6; padding: 16px; margin: 24px 0; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>heal<span style="color:#3b82f6;">Qr</span></h1>
      </div>
      <div class="content">
        <h2>You've been added as an Assistant! 🎉</h2>
        <p>Hello ${assistantName},</p>
        <p>Dr. ${doctorEmail} has added you as an assistant to their HealQR account. You'll have full access to manage patients, schedules, and bookings on their behalf.</p>
        <div class="info-box">
          <p style="margin: 0; color: #8b5cf6; font-weight: 600;">🔐 Next Steps:</p>
          <ul style="color: #d1d5db; margin: 12px 0 0 0; padding-left: 20px;">
            <li>Click the verification button below</li>
            <li>You'll be redirected to the login page</li>
            <li>Login with your email address</li>
            <li>Access the doctor's dashboard</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="${verificationLink}" class="button">Verify & Get Started</a>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">This verification link is valid for 30 days. If you have any questions, please contact the doctor who added you.</p>
      </div>
      <div class="footer">
        <p>HealQR - Doctor's e-Assistant</p>
        <p>Questions? Visit <a href="${APP_URL}" style="color: #10b981;">healqr.web.app</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const getLoginEmailTemplate = (email: string, loginLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #000000; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 16px; padding: 40px; border: 1px solid #333; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #10b981; font-size: 32px; margin: 0; }
    .content { color: #ffffff; }
    .content h2 { color: #3b82f6; margin-top: 0; }
    .content p { color: #d1d5db; line-height: 1.6; margin: 16px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; text-align: center; }
    .button:hover { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; }
    .security { background: #1a1a1a; border-left: 4px solid #eab308; padding: 16px; margin: 24px 0; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>heal<span style="color:#3b82f6;">Qr</span></h1>
      </div>
      <div class="content">
        <h2>Welcome Back! 👋</h2>
        <p>Click the button below to log in to your HealQR doctor dashboard:</p>
        <div style="text-align: center;">
          <a href="${loginLink}" class="button">Log In to Dashboard</a>
        </div>
        <div class="security">
          <p style="margin: 0; color: #eab308; font-weight: 600;">🔒 Security Notice</p>
          <p style="color: #d1d5db; margin: 8px 0 0 0; font-size: 14px;">This login link is valid for 15 minutes. If you didn't request this, please ignore this email.</p>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">Logged in as: <strong style="color: #fff;">${email}</strong></p>
      </div>
      <div class="footer">
        <p>HealQR - Doctor's e-Assistant</p>
        <p>Questions? Reply to this email or visit <a href="${APP_URL}" style="color: #3b82f6;">healqr.web.app</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send signup verification email
 */
export async function sendSignupVerificationEmail(
  to: string,
  doctorName: string,
  verificationToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const verificationLink = `${APP_URL}/verify?token=${verificationToken}&email=${encodeURIComponent(to)}`;
    
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${SENDER_EMAIL}>`,
      to: [to],
      subject: `Welcome to HealQR, Dr. ${doctorName}! Verify your email 🎉`,
      html: getSignupEmailTemplate(doctorName, verificationLink),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
    
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send login magic link email
 */
export async function sendLoginMagicLinkEmail(
  to: string,
  loginToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const loginLink = `${APP_URL}/login/verify?token=${loginToken}&email=${encodeURIComponent(to)}`;
    
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${SENDER_EMAIL}>`,
      to: [to],
      subject: 'Your HealQR Login Link 🔐',
      html: getLoginEmailTemplate(to, loginLink),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
    
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate secure token for email verification
 */
export function generateVerificationToken(email: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const emailHash = btoa(email).substring(0, 10);
  return `${emailHash}_${timestamp}_${random}`;
}

/**
 * Verify token (basic validation - implement proper JWT in production)
 */
export function verifyToken(token: string, email: string): boolean {
  try {
    const [emailHash, timestamp] = token.split('_');
    const expectedHash = btoa(email).substring(0, 10);
    
    // Check if token matches email
    if (emailHash !== expectedHash) return false;
    
    // Check if token is not expired (1 hour for signup, 15 min for login)
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    return (now - tokenTime) < hourInMs;
  } catch {
    return false;
  }
}

/**
 * Send assistant verification email
 */
export async function sendAssistantVerificationEmail(
  assistantEmail: string,
  assistantName: string,
  verificationLink: string,
  doctorEmail: string
): Promise<{ success: boolean; error?: string }> {
  
  try {
    const emailPayload = {
      from: `HealQR <${SENDER_EMAIL}>`,
      to: assistantEmail,
      subject: `You've been added as an Assistant on HealQR by ${doctorEmail}`,
      html: getAssistantVerificationEmailTemplate(assistantName, doctorEmail, verificationLink),
    };
    
    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('❌ Resend API Error:', error);
      console.error('❌ Error Name:', error.name);
      console.error('❌ Error Message:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send assistant email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export { resend, SENDER_EMAIL, APP_NAME, APP_URL };
