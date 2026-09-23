/**
 * @file email-service.ts
 * @module @ryvix/web/utils
 * 
 * High-Reliability Transactional Email Dispatcher for Ryvix Authentication.
 * Dispatches genuine cryptographically random 6-digit OTP codes directly
 * via Gmail SMTP (or Resend API fallback) directly to ANY recipient email.
 */

import nodemailer from "nodemailer";

export interface SendOtpEmailParams {
  to: string;
  otp: string;
  type: "signup" | "login" | "reset";
  fullName?: string;
}

export async function sendOtpEmail(params: SendOtpEmailParams): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const { to, otp, type, fullName } = params;

  const smtpUser = process.env.SMTP_USER || "chaitanyareddykarri2006@gmail.com";
  const smtpPass = process.env.SMTP_PASSWORD || "psqhyadenvhrjmuk";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
  const fromEmail = process.env.EMAIL_FROM || `"Ryvix Auth" <${smtpUser}>`;

  let title = "Your Ryvix Verification Code";
  let description = "Use the 6-digit verification code below to complete your authentication. This code will expire in 10 minutes.";

  if (type === "signup") {
    title = "Confirm Your Ryvix Account";
    description = fullName 
      ? `Welcome to Ryvix, ${fullName}! Please enter the 6-digit code below to activate your account.`
      : "Welcome to Ryvix! Please enter the 6-digit verification code below to activate your account.";
  } else if (type === "reset") {
    title = "Reset Your Ryvix Password";
    description = "We received a request to reset your password. Use the 6-digit code below to proceed.";
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #050814; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <div style="max-width: 520px; margin: 0 auto; background: linear-gradient(180deg, #0e1726 0%, #070d19 100%); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 16px; padding: 40px 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
    
    <!-- Header Logo -->
    <div style="text-align: center; margin-bottom: 28px;">
      <span style="font-size: 32px; font-weight: 900; letter-spacing: 3px; color: #6366f1;">
        RY<span style="color: #38bdf8;">VIX</span>
      </span>
      <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase;">
        Autonomous Cloud &amp; AI Infrastructure
      </p>
    </div>

    <!-- Main Card Body -->
    <h2 style="font-size: 22px; font-weight: 700; text-align: center; margin: 0 0 16px 0; color: #ffffff;">
      ${title}
    </h2>
    <p style="font-size: 14px; line-height: 22px; color: #cbd5e1; text-align: center; margin: 0 0 28px 0;">
      ${description}
    </p>

    <!-- Glowing Cyber OTP Box -->
    <div style="background: rgba(15, 23, 42, 0.9); border: 2px dashed rgba(99, 102, 241, 0.6); border-radius: 12px; padding: 22px 12px; text-align: center; margin-bottom: 28px;">
      <span style="font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #38bdf8; display: inline-block; padding-left: 12px;">
        ${otp}
      </span>
    </div>

    <p style="font-size: 13px; line-height: 20px; color: #94a3b8; text-align: center; margin: 0 0 28px 0;">
      This code is valid for <strong>10 minutes</strong>. Never share this code with anyone. Ryvix support will never ask for your verification code.
    </p>

    <!-- Footer -->
    <hr style="border: none; border-top: 1px solid rgba(148, 163, 184, 0.15); margin: 0 0 20px 0;">
    <p style="font-size: 11px; line-height: 16px; color: #64748b; text-align: center; margin: 0;">
      This is an automated system notification from Ryvix Security. If you did not initiate this request, you can safely disregard this email.
    </p>
  </div>
</body>
</html>
`;

  // 1. Primary: Direct Gmail SMTP Dispatch (Delivers directly to ANY email in the world)
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: to,
        subject: `${otp} is your Ryvix verification code`,
        text: `Your Ryvix verification code is: ${otp}. It expires in 10 minutes.`,
        html: htmlContent,
      });

      console.log(`[Email Service] Dispatched OTP directly to ${to} via Gmail SMTP. MessageID: ${info.messageId}`);
      return { success: true, id: info.messageId };
    } catch (smtpErr: any) {
      console.error("[Email Service] Gmail SMTP dispatch error:", smtpErr.message);
    }
  }

  // 2. Fallback: Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: [to],
          subject: `${otp} is your Ryvix verification code`,
          html: htmlContent,
        }),
      });

      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`[Email Service] Dispatched OTP to ${to} via Resend API. ID: ${data.id}`);
        return { success: true, id: data.id };
      }
    } catch (resendErr: any) {
      console.error("[Email Service] Resend fallback error:", resendErr.message);
    }
  }

  return { success: false, error: "Failed to dispatch email verification." };
}
