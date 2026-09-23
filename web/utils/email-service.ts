/**
 * @file email-service.ts
 * @module @ryvix/web/utils
 * 
 * High-Reliability Transactional Email Dispatcher for Ryvix Authentication.
 * Dispatches genuine cryptographically random 6-digit OTP codes directly
 * via Resend API.
 */

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
  sandboxNotice?: string;
}> {
  const { to, otp, type, fullName } = params;

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

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

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: `${otp} is your Ryvix verification code`,
          html: htmlContent,
        }),
      });

      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`[Email Service] Dispatched OTP code to ${to} via Resend. ID: ${data.id}`);
        return { success: true, id: data.id };
      }

      console.warn("[Email Service] Resend primary dispatch notice:", data);

      // Free tier sandbox fallback:
      // Resend free tier only allows sending to the account owner's email address.
      // If we receive a validation_error restricting to the owner, route to the owner for seamless local testing.
      if (
        data.statusCode === 403 &&
        typeof data.message === "string" &&
        data.message.includes("You can only send testing emails to your own email address")
      ) {
        const ownerMatch = data.message.match(/\(([^)]+)\)/);
        const ownerEmail = ownerMatch ? ownerMatch[1] : "chaitanyareddykarri2006@gmail.com";
        console.log(`[Email Service] Resend sandbox restriction active. Forwarding code for ${to} to verified inbox ${ownerEmail}`);

        const fallbackResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [ownerEmail],
            subject: `[Test Verification for ${to}] ${otp} is your Ryvix code`,
            html: htmlContent.replace(
              "<!-- Main Card Body -->",
              `<!-- Main Card Body --><div style="background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #fef08a; text-align: center;"><strong>Resend Sandbox Mode:</strong> Code for <code>${to}</code> delivered to registered developer inbox (<code>${ownerEmail}</code>).</div>`
            ),
          }),
        });

        const fallbackData = await fallbackResponse.json();
        if (fallbackResponse.ok && fallbackData.id) {
          console.log(`[Email Service] Delivered via sandbox owner ${ownerEmail}. ID: ${fallbackData.id}`);
          return {
            success: true,
            id: fallbackData.id,
            sandboxNotice: `Delivered to developer inbox (${ownerEmail}) due to Resend free sandbox policy.`
          };
        }
      }

      return { success: false, error: data.message || "Failed to deliver email." };
    } catch (err: unknown) {
      console.error("[Email Service] Resend API error:", err);
      return { success: false, error: "Network error delivering email." };
    }
  }

  return { success: false, error: "Email provider API key is not configured." };
}
