const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const { Resend } = require("resend");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testOtpEmailDispatch() {
  console.log("==================================================================");
  console.log("   ANCHOR FASHION — LIVE RESEND OTP EMAIL DISPATCH VERIFICATION   ");
  console.log("==================================================================");

  const resend = new Resend(process.env.RESEND_API_KEY);
  const otp = crypto.randomInt(100000, 1000000).toString();
  const fromEmail = process.env.EMAIL_FROM || "Anchor Fashion <noreply@accountstoreone.com>";
  const toEmail = "delivered@resend.dev";

  console.log(`Generated OTP: ${otp}`);
  console.log(`From: ${fromEmail}`);
  console.log(`To: ${toEmail}`);

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
              <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px;">Premium Apparel &amp; Lifestyle</p>
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
                ⏱️ This code will expire in <strong>10 minutes</strong>.
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

  const response = await resend.emails.send({
    from: fromEmail,
    to: [toEmail],
    subject: `Your Anchor Fashion Verification Code: ${otp}`,
    html: htmlEmail,
    text: `Your Anchor Fashion verification code is: ${otp}. It will expire in 10 minutes.`,
  });

  if (response.error) {
    console.error("❌ Resend dispatch failed:", response.error);
    process.exit(1);
  }

  console.log("\n✅ SUCCESS: Full branded OTP email dispatched via Resend!");
  console.log(`   Message ID: ${response.data.id}`);
}

testOtpEmailDispatch().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
