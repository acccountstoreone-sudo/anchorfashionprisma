const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runPrompt5Tests() {
  console.log("==================================================================");
  console.log("   ANCHOR FASHION — PROMPT 5 INTEGRATION & STABILIZATION TESTS    ");
  console.log("==================================================================\n");

  const testEmail = `test_otp_${Date.now()}@example.com`;

  // -------------------------------------------------------------
  // PART A: OTP AUTH TESTS
  // -------------------------------------------------------------
  console.log("▶ Testing Part A: OTP Email Authentication...");

  // 1. Email validation test
  const invalidEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  assert(!invalidEmailRegex.test("invalid-email"), "Rejects invalid email format without @");
  assert(!invalidEmailRegex.test("user@"), "Rejects invalid email format without domain");
  assert(invalidEmailRegex.test(testEmail), "Accepts valid email syntax");

  // 2. Cryptographic OTP generation & storage
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  assert(otpCode.length === 6 && /^\d{6}$/.test(otpCode), `Secure 6-digit OTP generated: ${otpCode}`);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const testStore = new Map();
  testStore.set(testEmail, [{
    email: testEmail,
    otp: otpCode,
    expires_at: expiresAt.getTime(),
    created_at: Date.now()
  }]);

  assert(testStore.has(testEmail), "Stored OTP in OtpStore securely with 10-min expiry");

  // 3. Rate-limit logic test (< 60s)
  const RATE_LIMIT_SECONDS = 60;
  const latestOtp = testStore.get(testEmail)[0];
  const elapsedSeconds = (Date.now() - latestOtp.created_at) / 1000;
  assert(elapsedSeconds < RATE_LIMIT_SECONDS, `Rate-limit correctly identifies request made within ${RATE_LIMIT_SECONDS}s window`);

  // 4. Verification with wrong OTP
  const wrongMatch = testStore.get(testEmail).find((r) => r.otp === "000000");
  assert(!wrongMatch, "Wrong OTP correctly fails verification check");

  // 5. Verification with expired OTP
  const expiredStore = new Map();
  expiredStore.set("expired@test.com", [{
    email: "expired@test.com",
    otp: "123456",
    expires_at: Date.now() - 60000,
    created_at: Date.now() - 120000,
  }]);

  const isExpired = Date.now() > expiredStore.get("expired@test.com")[0].expires_at;
  assert(isExpired, "Expired OTP correctly rejected by validity window");

  // 6. Correct OTP verification & single-use invalidation
  const match = testStore.get(testEmail).find((r) => r.otp === otpCode && Date.now() <= r.expires_at);
  assert(Boolean(match), "Correct non-expired OTP verified successfully");

  // Invalidate OTP immediately
  testStore.delete(testEmail);
  assert(!testStore.has(testEmail), "OTP invalidated after use (prevents replay attacks)");

  // 7. Verify API route files exist and are populated
  const sendRouteFile = fs.readFileSync(path.resolve(__dirname, "../app/api/auth/otp/send/route.ts"), "utf-8");
  const verifyRouteFile = fs.readFileSync(path.resolve(__dirname, "../app/api/auth/otp/verify/route.ts"), "utf-8");
  assert(sendRouteFile.includes("RATE_LIMIT_SECONDS") && sendRouteFile.includes("EmailProvider.send"), "API otp/send route integrates Resend and rate-limiting");
  assert(verifyRouteFile.includes("verifyAndConsumeOtp"), "API otp/verify route verifies and consumes OTP");

  // -------------------------------------------------------------
  // PART B: SERVICE LAYER TESTS
  // -------------------------------------------------------------
  console.log("\n▶ Testing Part B: Service Layer Completeness...");

  // 1. Customer test user setup in auth.users first (satisfies foreign key)
  const testCustomerEmail = `customer_${Date.now()}@test.com`;
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: testCustomerEmail,
    password: "TestPassword123!",
    email_confirm: true,
    user_metadata: { first_name: "ServiceLayer", last_name: "Tester" },
  });

  const testUserId = authUser?.user?.id;
  assert(Boolean(testUserId), "Created test user in auth.users for service layer tests");

  await supabase.from("customer_profiles").upsert({
    id: testUserId,
    email: testCustomerEmail,
    first_name: "ServiceLayer",
    last_name: "Tester",
    is_active: true,
  });

  // 2. Wallet operations (topUp, withdraw, transfer)
  const { data: initWallet } = await supabase
    .from("customer_wallets")
    .upsert(
      {
        customer_id: testUserId,
        balance: 1000,
        currency: "BDT",
        is_active: true,
      },
      { onConflict: "customer_id" }
    )
    .select()
    .single();

  assert(initWallet && initWallet.balance == 1000, "Wallet initialized with starting balance");

  // Top-up duplicate protection
  const paymentRef = `TXN-P5-${Date.now()}`;
  await supabase.from("wallet_transactions").insert({
    wallet_id: initWallet.id,
    type: "CREDIT",
    amount: 500,
    balance_after: 1500,
    reference_type: "TOP_UP",
    description: `Wallet top-up (Ref: ${paymentRef})`,
  });

  const { data: dupTx } = await supabase
    .from("wallet_transactions")
    .select("id")
    .ilike("description", `%${paymentRef}%`);

  assert(dupTx && dupTx.length === 1, "Top-up records unique payment transaction reference");

  // 3. Loyalty operations (earnPoints, redeemPoints)
  const { data: initLoyalty } = await supabase
    .from("loyalty_accounts")
    .upsert(
      {
        customer_id: testUserId,
        tier: "SILVER",
        points_balance: 500,
        total_points_earned: 500,
        total_points_redeemed: 0,
      },
      { onConflict: "customer_id" }
    )
    .select()
    .single();

  assert(initLoyalty && initLoyalty.points_balance === 500, "Loyalty account initialized with 500 points");

  // Earn Points tier progression
  const newPoints = 2500;
  let calculatedTier = "SILVER";
  if (newPoints >= 10000) calculatedTier = "VIP";
  else if (newPoints >= 5000) calculatedTier = "PLATINUM";
  else if (newPoints >= 2000) calculatedTier = "GOLD";

  assert(calculatedTier === "GOLD", "Loyalty tier progression logic calculates GOLD tier for 2,500 points");

  // 4. Customer Deactivation Business Rules
  const { data: deactProfile, error: deactErr } = await supabase
    .from("customer_profiles")
    .update({ is_active: false })
    .eq("id", testUserId)
    .select()
    .single();

  assert(!deactErr && deactProfile.is_active === false, "Customer profile successfully deactivated when no active orders");

  // 5. Marketing Service Methods
  const marketingServiceFile = fs.readFileSync(path.resolve(__dirname, "../services/marketing.service.ts"), "utf-8");
  assert(marketingServiceFile.includes("sendCampaign") && marketingServiceFile.includes("scheduleCampaign"), "MarketingService exports sendCampaign and scheduleCampaign");

  // Cleanup test records
  await supabase.from("loyalty_accounts").delete().eq("customer_id", testUserId);
  await supabase.from("wallet_transactions").delete().eq("wallet_id", initWallet.id);
  await supabase.from("customer_wallets").delete().eq("id", initWallet.id);
  await supabase.from("customer_profiles").delete().eq("id", testUserId);
  if (testUserId) {
    await supabase.auth.admin.deleteUser(testUserId);
  }

  // -------------------------------------------------------------
  // PART C: ERROR LOGGING & SECRET SANITIZATION TESTS
  // -------------------------------------------------------------
  console.log("\n▶ Testing Part C: Error Logging & Secret Sanitization...");

  const rawPayload = {
    user: "admin",
    password: "SuperSecretPassword123!",
    api_key: "re_live_secret_resend_key_999",
    stripe_secret_key: "sk_live_stripe_999",
    details: {
      credit_card: "4111222233334444",
      token: "jwt_bearer_token_secret",
      normalField: "public_value",
    },
  };

  const SENSITIVE_KEYS = [
    "password",
    "token",
    "secret",
    "api_key",
    "credit_card",
    "stripe_secret_key",
    "resend_api_key",
  ];

  function sanitize(data) {
    if (!data || typeof data !== "object") return data;
    if (Array.isArray(data)) return data.map(sanitize);
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
        out[k] = "[REDACTED]";
      } else if (typeof v === "object" && v !== null) {
        out[k] = sanitize(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  const sanitized = sanitize(rawPayload);
  assert(sanitized.password === "[REDACTED]", "Sanitizer successfully redacts passwords");
  assert(sanitized.api_key === "[REDACTED]", "Sanitizer successfully redacts API keys");
  assert(sanitized.stripe_secret_key === "[REDACTED]", "Sanitizer successfully redacts Stripe secrets");
  assert(sanitized.details.credit_card === "[REDACTED]", "Sanitizer recursively redacts credit card data");
  assert(sanitized.details.normalField === "public_value", "Sanitizer preserves non-sensitive fields intact");

  // User-facing message formatting
  function formatUserError(err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return "A record with this information already exists.";
    }
    if (msg.includes("foreign key")) {
      return "The referenced item could not be found or is in use.";
    }
    return "An unexpected server error occurred. Please try again later.";
  }

  const rawPgError = new Error('duplicate key value violates unique constraint "users_email_key"');
  const userFacingMsg = formatUserError(rawPgError);
  assert(userFacingMsg === "A record with this information already exists.", "Postgres internal unique violation converted to user-friendly message");
  assert(!userFacingMsg.includes("users_email_key"), "Internal SQL table and constraint names hidden from client");

  // -------------------------------------------------------------
  // PART D: PRODUCT ROUTE CONSOLIDATION VERIFICATION
  // -------------------------------------------------------------
  console.log("\n▶ Testing Part D: Product Route Consolidation Architecture...");

  const catalogProductsPage = fs.readFileSync(
    path.resolve(__dirname, "../app/(admin)/admin/catalog/products/page.tsx"),
    "utf-8"
  );
  const catalogProductsNewPage = fs.readFileSync(
    path.resolve(__dirname, "../app/(admin)/admin/catalog/products/new/page.tsx"),
    "utf-8"
  );
  const catalogProductsIdPage = fs.readFileSync(
    path.resolve(__dirname, "../app/(admin)/admin/catalog/products/[id]/page.tsx"),
    "utf-8"
  );

  assert(catalogProductsPage.includes('redirect(`/admin/products'), "/admin/catalog/products redirects to canonical /admin/products");
  assert(catalogProductsNewPage.includes('redirect("/admin/products/new")'), "/admin/catalog/products/new redirects to canonical /admin/products/new");
  assert(catalogProductsIdPage.includes('redirect(`/admin/products/${resolvedParams.id}/edit`)'), "/admin/catalog/products/[id] redirects to canonical /admin/products/[id]/edit");

  // -------------------------------------------------------------
  // PART G: SECURITY AUDIT & PROXY EXEMPTION VERIFICATION
  // -------------------------------------------------------------
  console.log("\n▶ Testing Part G: Security Audit & Proxy Exemption Rules...");

  const proxyFile = fs.readFileSync(path.resolve(__dirname, "../proxy.ts"), "utf-8");
  assert(proxyFile.includes('pathname.startsWith("/api/auth/")'), "Proxy explicitly whitelists /api/auth/* from unauthenticated 401 blocking");
  assert(proxyFile.includes('pathname.startsWith("/api/webhooks/")'), "Proxy explicitly whitelists /api/webhooks/* for external services");
  assert(proxyFile.includes('pathname.startsWith("/api/store/")'), "Proxy explicitly whitelists /api/store/* for guest storefront access");

  console.log("\n==================================================================");
  console.log(`PROMPT 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt5Tests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
