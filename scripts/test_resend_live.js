const dotenv = require("dotenv");
const path = require("path");
const { Resend } = require("resend");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function testResendLive() {
  console.log("=================================================");
  console.log("   TESTING LIVE RESEND EMAIL INTEGRATION        ");
  console.log("=================================================");

  const apiKey = process.env.RESEND_API_KEY;
  console.log("API Key configured:", apiKey ? `${apiKey.substring(0, 10)}...` : "MISSING");
  console.log("Sender configured:", process.env.EMAIL_FROM);

  const resend = new Resend(apiKey);

  // 1. Verify Domains
  const domains = await resend.domains.list();
  console.log("\nVerified Domains on account:");
  domains.data?.data?.forEach((d) => {
    console.log(` - ${d.name} (Status: ${d.status}, Region: ${d.region})`);
  });

  // 2. Test email send from verified domain
  console.log("\nAttempting test dispatch via Resend API...");
  const fromEmail = process.env.EMAIL_FROM || "Anchor Fashion <noreply@accountstoreone.com>";
  const testRecipient = "delivered@resend.dev"; // Resend's official deliverability test sink

  const sendResult = await resend.emails.send({
    from: fromEmail,
    to: [testRecipient],
    subject: "Anchor Fashion — Live Resend Integration Verified",
    html: `
      <div style="font-family: sans-serif; padding: 24px; background: #f8fafc; border-radius: 8px;">
        <h2 style="color: #0f172a;">Anchor Fashion Production System</h2>
        <p style="color: #334155;">This confirms that Resend email delivery is fully operational with verified domain: <strong>accountstoreone.com</strong>.</p>
        <div style="margin: 20px 0; padding: 16px; background: #e2e8f0; border-radius: 6px; font-weight: bold;">
          Status: ACTIVE &amp; OPERATIONAL
        </div>
        <p style="color: #64748b; font-size: 12px;">Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  if (sendResult.error) {
    console.error("\n❌ Send failed:", sendResult.error);
    process.exit(1);
  } else {
    console.log("\n✅ Email successfully dispatched via Resend!");
    console.log("   Message ID:", sendResult.data?.id);
  }
}

testResendLive().catch((err) => {
  console.error("Fatal error during Resend test:", err);
  process.exit(1);
});
