import { NextResponse } from "next/server";
import crypto from "crypto";
import { EmailProvider } from "@/lib/notifications/EmailProvider";
import { logServerError } from "@/lib/utils/error-handler";
import { OtpStore } from "@/lib/auth/otp-store";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const RATE_LIMIT_SECONDS = 60;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const ABUSE_WINDOW_MINUTES = 15;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();

    // 1. Validate email syntax & length
    if (!EMAIL_REGEX.test(email) || email.length > 255) {
      return NextResponse.json(
        { error: "Invalid email format. Please provide a valid email address." },
        { status: 400 }
      );
    }

    // 2. Abuse Prevention: Check rate limits for Email
    const rateCheck = await OtpStore.checkRateLimit(
      email,
      RATE_LIMIT_SECONDS,
      MAX_ATTEMPTS_PER_WINDOW,
      ABUSE_WINDOW_MINUTES
    );

    if (rateCheck.rateLimited) {
      return NextResponse.json(
        {
          error: `Please wait ${rateCheck.remainingSeconds} second(s) before requesting another code.`,
          retryAfter: rateCheck.remainingSeconds,
        },
        { status: 429 }
      );
    }

    if (rateCheck.abuseExceeded) {
      return NextResponse.json(
        {
          error: "Too many verification requests. Please wait a few minutes before trying again.",
        },
        { status: 429 }
      );
    }

    // 2b. Abuse Prevention: Check rate limits for IP Address
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown-ip";
    
    if (ip !== "unknown-ip") {
      const ipRateCheck = await OtpStore.checkRateLimit(
        `ip:${ip}`,
        RATE_LIMIT_SECONDS,
        MAX_ATTEMPTS_PER_WINDOW * 3, // slightly higher threshold for shared IPs (NAT)
        ABUSE_WINDOW_MINUTES
      );
      
      if (ipRateCheck.rateLimited || ipRateCheck.abuseExceeded) {
        return NextResponse.json(
          { error: "Too many requests from this IP address. Please try again later." },
          { status: 429 }
        );
      }
    }

    // 3. Generate Cryptographically Secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 4. Store OTP in database/store securely
    await OtpStore.saveOtp(email, otp, expiresAt);

    // 5. Send actual email via Resend EmailProvider
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Anchor Fashion Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <tr>
              <td style="padding: 32px 40px; background-color: #0f172a; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 2px;">ANCHOR FASHION</h1>
                <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;">Premium Apparel & Lifestyle</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 40px 32px 40px;">
                <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 600;">Verification Code</h2>
                <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 24px;">
                  Use the following single-use verification code to complete your verification with Anchor Fashion.
                </p>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">
                    ${otp}
                  </span>
                </div>
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; line-height: 20px;">
                  ⏱️ This code will expire in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
                </p>
                <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 13px; line-height: 20px;">
                  If you didn't request this verification code, someone may have entered your email by mistake. You can safely ignore this message.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                  &copy; ${new Date().getFullYear()} Anchor Fashion Ltd. Dhaka, Bangladesh. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResult = await EmailProvider.send({
      to: email,
      subject: `Your Anchor Fashion Verification Code: ${otp}`,
      html: htmlEmail,
      text: `Your Anchor Fashion verification code is: ${otp}. It will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
    });

    if (emailResult.error) {
      logServerError("AUTH_OTP_EMAIL_SEND", emailResult.error, { email });
      // If Resend API key is a dummy or test key in development, allow proceeding while logging
      if (process.env.NODE_ENV !== "production" || process.env.RESEND_API_KEY?.startsWith("re_dummy")) {
        console.warn(`[OTP DEV FALLBACK] Code for ${email} is ${otp}`);
        return NextResponse.json({
          success: true,
          message: "Verification code generated and dispatched.",
          note: "Development mode active",
        });
      }

      return NextResponse.json(
        { error: "Failed to deliver verification email. Please verify your address or try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully to your email.",
    });
  } catch (error: any) {
    logServerError("AUTH_OTP_SEND_FATAL", error);
    return NextResponse.json(
      { error: "Internal server error occurred while processing OTP request." },
      { status: 500 }
    );
  }
}
