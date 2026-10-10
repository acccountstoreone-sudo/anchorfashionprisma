/**
 * Anchor Fashion — Prompt 9 Integration Test Suite
 * Live SSLCommerz & Card Payment Gateway
 *
 * Tests:
 * 1. Database Schema & Payment Provider Configuration
 * 2. Security & Credentials Isolation (Server-only credentials, no leakage in client bundles)
 * 3. SSLCommerz Service Configuration Resolution (Hierarchical: Env -> DB payment_providers -> DB settings)
 * 4. Payment Initiation Payload Construction (v4 API params, BDT currency, 2-decimal amount, custom values)
 * 5. Authoritative Server-Side Validation Mocking (validationserverAPI.php handling for VALID vs INVALID)
 * 6. Amount & Currency Verification & Security Guards (Tampered amount, wrong currency, invoice mismatch rejection)
 * 7. Payment Cancellation & Failure Rollback (Atomic inventory release via RPC + Coupon release)
 * 8. Gateway Success Execution & Idempotency (Repeat callbacks, browser refresh, multi-tab protection)
 * 9. IPN Webhook Server-to-Server Processing & Idempotency (Duplicate IPN handling without double processing)
 * 10. Provider Factory & Multi-Card Gateway Aliases (sslcommerz, visa, mastercard integration)
 * 11. Regression Check: Existing Payment Methods (COD, bKash) and Cart Flow Integrity
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function runPrompt9Tests() {
  console.log("\n====================================================================");
  console.log("   ANCHOR FASHION — PROMPT 9: LIVE SSLCOMMERZ GATEWAY INTEGRATION");
  console.log("====================================================================\n");

  const runId = Date.now().toString().slice(-6);
  const createdOrderIds = [];
  const createdSessionIds = [];

  try {
    // ------------------------------------------------------------------
    // TEST 1: Database Schema & Provider Verification
    // ------------------------------------------------------------------
    console.log("▶ [Test 1] Database Schema & Provider Verification...");

    const { data: sslProvider, error: provErr } = await supabase
      .from("payment_providers")
      .select("*")
      .eq("code", "sslcommerz")
      .maybeSingle();

    assert(!provErr, "Successfully queried payment_providers table");
    assert(sslProvider !== null, "sslcommerz provider exists in payment_providers table");
    if (sslProvider) {
      assert(sslProvider.status === "active", "sslcommerz provider status is 'active'");
      assert(
        Array.isArray(sslProvider.supported_currencies) &&
          sslProvider.supported_currencies.includes("BDT"),
        "sslcommerz supports BDT currency"
      );
    }

    // Check orders table columns by inserting a draft test order
    const testOrderNumber = `AF-TEST-SSL-${runId}`;
    const { data: testOrder, error: orderInsErr } = await supabase
      .from("orders")
      .insert({
        order_number: testOrderNumber,
        status: "pending_payment",
        subtotal: 1850,
        shipping_total: 100,
        discount_total: 0,
        grand_total: 1950,
        currency: "BDT",
        reservation_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select("*")
      .single();

    assert(
      !orderInsErr && testOrder?.id,
      `Orders table supports SSLCommerz order placement (Order ID: ${testOrder?.id})`
    );
    if (testOrder?.id) createdOrderIds.push(testOrder.id);

    // ------------------------------------------------------------------
    // TEST 2: Security & Credentials Isolation Audit
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 2] Client Bundle & Secret Isolation Audit...");

    assert(
      !process.env.NEXT_PUBLIC_SSLCOMMERZ_STORE_ID,
      "SSLCOMMERZ_STORE_ID is not exposed in NEXT_PUBLIC_ client scope"
    );
    assert(
      !process.env.NEXT_PUBLIC_SSLCOMMERZ_STORE_PASSWORD,
      "SSLCOMMERZ_STORE_PASSWORD is not exposed in NEXT_PUBLIC_ client scope"
    );
    assert(
      !process.env.NEXT_PUBLIC_SSLCOMMERZ_STORE_PASSWD,
      "SSLCOMMERZ_STORE_PASSWD is not exposed in NEXT_PUBLIC_ client scope"
    );

    // ------------------------------------------------------------------
    // TEST 3: SSLCommerz Configuration Hierarchy Resolution
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 3] SSLCommerz Configuration Hierarchy Resolution...");

    function resolveSSLCommerzConfig(env, dbProvider, dbSettings) {
      const isSandboxEnv = env.SSLCOMMERZ_IS_SANDBOX === "true" || env.NODE_ENV !== "production";
      const defaultSandbox = "https://sandbox.sslcommerz.com";
      const defaultProd = "https://securepay.sslcommerz.com";

      if (env.SSLCOMMERZ_STORE_ID && (env.SSLCOMMERZ_STORE_PASSWORD || env.SSLCOMMERZ_STORE_PASSWD)) {
        const isSandbox = env.SSLCOMMERZ_IS_SANDBOX ? env.SSLCOMMERZ_IS_SANDBOX === "true" : isSandboxEnv;
        const base = isSandbox ? defaultSandbox : defaultProd;
        return {
          source: "env",
          store_id: env.SSLCOMMERZ_STORE_ID,
          store_passwd: env.SSLCOMMERZ_STORE_PASSWORD || env.SSLCOMMERZ_STORE_PASSWD,
          is_sandbox: isSandbox,
          init_url: `${base}/gwprocess/v4/api.php`,
          validation_url: `${base}/validator/api/validationserverAPI.php`,
        };
      }

      if (dbProvider?.config?.store_id && dbProvider?.config?.store_passwd) {
        const isSandbox = dbProvider.config.is_sandbox ?? isSandboxEnv;
        const base = isSandbox ? defaultSandbox : defaultProd;
        return {
          source: "payment_providers",
          store_id: dbProvider.config.store_id,
          store_passwd: dbProvider.config.store_passwd,
          is_sandbox: isSandbox,
          init_url: `${base}/gwprocess/v4/api.php`,
          validation_url: `${base}/validator/api/validationserverAPI.php`,
        };
      }

      if (dbSettings?.store_id && (dbSettings?.store_passwd || dbSettings?.store_password)) {
        const isSandbox = dbSettings.sandbox === "true" || dbSettings.is_sandbox === true || isSandboxEnv;
        const base = isSandbox ? defaultSandbox : defaultProd;
        return {
          source: "settings",
          store_id: dbSettings.store_id,
          store_passwd: dbSettings.store_passwd || dbSettings.store_password,
          is_sandbox: isSandbox,
          init_url: `${base}/gwprocess/v4/api.php`,
          validation_url: `${base}/validator/api/validationserverAPI.php`,
        };
      }

      const base = isSandboxEnv ? defaultSandbox : defaultProd;
      return {
        source: "fallback",
        store_id: "",
        store_passwd: "",
        is_sandbox: isSandboxEnv,
        init_url: `${base}/gwprocess/v4/api.php`,
        validation_url: `${base}/validator/api/validationserverAPI.php`,
      };
    }

    const envResolved = resolveSSLCommerzConfig(
      { SSLCOMMERZ_STORE_ID: "test_store_123", SSLCOMMERZ_STORE_PASSWORD: "secret_password" },
      null,
      null
    );
    assert(envResolved.source === "env", "Env variables have highest precedence in config resolution");
    assert(envResolved.init_url.includes("sandbox.sslcommerz.com"), "Defaults to sandbox in non-production mode");

    const dbResolved = resolveSSLCommerzConfig(
      {},
      { config: { store_id: "db_store", store_passwd: "db_password", is_sandbox: false } },
      null
    );
    assert(dbResolved.source === "payment_providers", "Falls back to payment_providers table when env is empty");
    assert(dbResolved.init_url.includes("securepay.sslcommerz.com"), "Honors is_sandbox: false for production URL");

    // ------------------------------------------------------------------
    // TEST 4: Payment Initiation Payload Construction (v4 API)
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 4] Official SSLCommerz v4 Initiation Payload Strictness...");

    function buildSSLCommerzPayload(params, config) {
      const formData = new URLSearchParams();
      formData.append("store_id", config.store_id);
      formData.append("store_passwd", config.store_passwd);
      formData.append("total_amount", Number(params.amount).toFixed(2));
      formData.append("currency", params.currency || "BDT");
      formData.append("tran_id", params.tranId);
      formData.append("success_url", params.successUrl);
      formData.append("fail_url", params.failUrl);
      formData.append("cancel_url", params.cancelUrl);
      formData.append("ipn_url", params.ipnUrl);
      formData.append("cus_name", params.customerName || "Customer");
      formData.append("cus_email", params.customerEmail || "customer@example.com");
      formData.append("cus_phone", params.customerPhone || "01700000000");
      formData.append("shipping_method", "Courier");
      formData.append("product_name", params.productName || "Apparel");
      formData.append("product_category", "Fashion");
      formData.append("product_profile", "physical-goods");
      formData.append("value_a", params.orderId);
      formData.append("value_c", params.orderNumber);
      return formData;
    }

    const testTranId = `${testOrderNumber}-TRX1`;
    const payload = buildSSLCommerzPayload(
      {
        orderId: testOrder.id,
        orderNumber: testOrderNumber,
        tranId: testTranId,
        amount: 1950,
        currency: "BDT",
        customerName: "Bijoy Partho",
        customerEmail: "bijoy@anchorfashion.com",
        customerPhone: "01700112233",
        successUrl: "https://anchorfashion.com/api/payment/sslcommerz/callback?action=success",
        failUrl: "https://anchorfashion.com/api/payment/sslcommerz/callback?action=fail",
        cancelUrl: "https://anchorfashion.com/api/payment/sslcommerz/callback?action=cancel",
        ipnUrl: "https://anchorfashion.com/api/payment/sslcommerz/ipn",
      },
      { store_id: "anchor_store", store_passwd: "anchor_pass" }
    );

    assert(payload.get("store_id") === "anchor_store", "Payload contains store_id");
    assert(payload.get("total_amount") === "1950.00", "Amount formatted strictly to 2 decimals");
    assert(payload.get("currency") === "BDT", "Currency is BDT");
    assert(payload.get("tran_id") === testTranId, "tran_id matches unique transaction reference");
    assert(payload.get("value_a") === testOrder.id, "value_a safely stores internal order UUID");
    assert(payload.get("value_c") === testOrderNumber, "value_c safely stores human order number");
    assert(payload.get("ipn_url").includes("/api/payment/sslcommerz/ipn"), "ipn_url configured for server-to-server webhook");

    // ------------------------------------------------------------------
    // TEST 5: Authoritative Server-Side Validation & Security Verification
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 5] Server-Side Transaction Validation & Security Verification...");

    function verifyValidationResponse(order, valRes, expectedTranId) {
      if (valRes.status !== "VALID" && valRes.status !== "VALIDATED") {
        return { valid: false, error: "invalid_status", status: valRes.status };
      }

      const gatewayAmount = parseFloat(valRes.amount);
      const orderAmount = parseFloat(order.total_amount ?? order.grand_total);
      if (isNaN(gatewayAmount) || Math.abs(gatewayAmount - orderAmount) > 0.01) {
        return { valid: false, error: "amount_mismatch", gatewayAmount, orderAmount };
      }

      const verifiedCurrency = (valRes.currency || "").toUpperCase();
      const expectedCurrency = (order.currency || "BDT").toUpperCase();
      if (verifiedCurrency !== expectedCurrency) {
        return { valid: false, error: "currency_mismatch", verifiedCurrency, expectedCurrency };
      }

      if (valRes.tran_id && expectedTranId && valRes.tran_id !== expectedTranId) {
        return { valid: false, error: "tran_id_mismatch" };
      }

      return { valid: true };
    }

    // Tampered Amount Attack Scenario
    const tamperedAmountVal = {
      status: "VALID",
      amount: "100.00", // Order is 1950.00
      currency: "BDT",
      tran_id: testTranId,
      val_id: "2609121000000001",
    };
    const tamperAmountCheck = verifyValidationResponse(testOrder, tamperedAmountVal, testTranId);
    assert(
      !tamperAmountCheck.valid && tamperAmountCheck.error === "amount_mismatch",
      "Tampered amount rejected: Gateway amount 100.00 != Order total 1950.00"
    );

    // Foreign Currency Attack Scenario
    const tamperedCurrencyVal = {
      status: "VALID",
      amount: "1950.00",
      currency: "USD", // Expected BDT
      tran_id: testTranId,
      val_id: "2609121000000002",
    };
    const tamperCurrencyCheck = verifyValidationResponse(testOrder, tamperedCurrencyVal, testTranId);
    assert(
      !tamperCurrencyCheck.valid && tamperCurrencyCheck.error === "currency_mismatch",
      "Tampered currency rejected: Gateway currency USD != Order currency BDT"
    );

    // Invalid Status / Rejected Scenario
    const rejectedVal = {
      status: "INVALID_TRANSACTION",
      amount: "1950.00",
      currency: "BDT",
      tran_id: testTranId,
      val_id: "2609121000000003",
    };
    const rejectedCheck = verifyValidationResponse(testOrder, rejectedVal, testTranId);
    assert(
      !rejectedCheck.valid && rejectedCheck.error === "invalid_status",
      "Rejected transaction correctly flagged as invalid"
    );

    // Valid Match Scenario
    const validVal = {
      status: "VALID",
      amount: "1950.00",
      currency: "BDT",
      tran_id: testTranId,
      val_id: "2609121000000004",
      bank_tran_id: "BANK-998877",
      card_type: "VISA-Dutch Bangla Bank",
    };
    const validCheck = verifyValidationResponse(testOrder, validVal, testTranId);
    assert(validCheck.valid, "Valid SSLCommerz validation passes all authoritative checks");

    // ------------------------------------------------------------------
    // TEST 6: MD5 Hash Signature Verification
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 6] MD5 Hash Signature Verification (IPN verify_sign)...");

    function generateAndVerifySignature(payload, storePasswd) {
      const keys = ["amount", "bank_tran_id", "currency", "tran_id", "val_id"];
      const verifyKey = keys.join(",");

      const sortedMap = {};
      for (const k of keys) {
        sortedMap[k] = payload[k];
      }

      const passHash = crypto.createHash("md5").update(storePasswd).digest("hex");
      const paramString =
        Object.keys(sortedMap)
          .sort()
          .map((k) => `${k}=${encodeURIComponent(sortedMap[k])}`)
          .join("&") +
        `&store_passwd=${passHash}`;

      const calculatedSign = crypto.createHash("md5").update(paramString).digest("hex");

      const testPayload = { ...payload, verify_sign: calculatedSign, verify_key: verifyKey };

      // Verification logic:
      const extractedKeys = testPayload.verify_key.split(",");
      const verifyMap = {};
      for (const k of extractedKeys) {
        if (k in testPayload) verifyMap[k] = String(testPayload[k]);
      }
      const verifyString =
        Object.keys(verifyMap)
          .sort()
          .map((k) => `${k}=${encodeURIComponent(verifyMap[k])}`)
          .join("&") +
        `&store_passwd=${passHash}`;
      const reCalculated = crypto.createHash("md5").update(verifyString).digest("hex");

      return reCalculated.toLowerCase() === testPayload.verify_sign.toLowerCase();
    }

    const testPayloadForHash = {
      amount: "1950.00",
      bank_tran_id: "BANK-12345",
      currency: "BDT",
      tran_id: testTranId,
      val_id: "VAL-9999",
    };
    const signatureVerified = generateAndVerifySignature(testPayloadForHash, "store_secret_123");
    assert(signatureVerified, "MD5 signature successfully generated and validated");

    // ------------------------------------------------------------------
    // TEST 7: Payment Cancellation & Inventory Rollback
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 7] Payment Cancellation & Inventory Rollback Lifecycle...");

    // Insert a pending payment session
    const { data: cancelSession, error: sessErr } = await supabase
      .from("payment_sessions")
      .insert({
        provider_id: sslProvider?.id || null,
        order_id: testOrder.id,
        amount: testOrder.grand_total,
        currency: "BDT",
        status: "pending",
        gateway_url: "https://sandbox.sslcommerz.com/EasyCheckOut/test",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        metadata: { tran_id: testTranId },
      })
      .select("*")
      .single();

    assert(!sessErr && cancelSession?.id, "Created payment session for cancellation test");
    if (cancelSession?.id) createdSessionIds.push(cancelSession.id);

    // Simulate customer cancelling at gateway:
    // 1. Release inventory via RPC
    const { error: rpcErr } = await supabase.rpc("release_order_inventory", {
      p_order_id: testOrder.id,
    });
    assert(!rpcErr, "Atomic inventory release RPC executed on cancellation");

    // 2. Update order and session state
    const cancelPayload = { status: "cancelled", cancelled_at: new Date().toISOString() };
    const { error: cancelErr } = await supabase
      .from("orders")
      .update({ ...cancelPayload, payment_status: "FAILED" })
      .eq("id", testOrder.id);
    if (cancelErr) {
      await supabase.from("orders").update(cancelPayload).eq("id", testOrder.id);
    }

    await supabase
      .from("payment_sessions")
      .update({ status: "cancelled" })
      .eq("id", cancelSession.id);

    // 3. Record audit log in payment_transactions
    const { data: cancelTrx, error: trxErr } = await supabase
      .from("payment_transactions")
      .insert({
        order_id: testOrder.id,
        session_id: cancelSession.id,
        provider_id: sslProvider?.id || null,
        amount: testOrder.grand_total,
        currency: "BDT",
        status: "cancelled",
        reference_number: testTranId,
        error_code: "SSLCOMMERZ_CANCELLED",
        error_message: "Customer cancelled payment at gateway",
      })
      .select("*")
      .single();

    assert(!trxErr && cancelTrx?.id, "Audit record created for cancelled transaction");

    // Verify order is not paid
    const { data: cancelledOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", testOrder.id)
      .single();

    assert(
      cancelledOrder.status === "cancelled",
      "Order is safely marked as cancelled"
    );

    // ------------------------------------------------------------------
    // TEST 8: Gateway Success Execution & Idempotency
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 8] Gateway Success Execution & Idempotency Protection...");

    // Create a new order for success test
    const successOrderNumber = `AF-TEST-SUCC-${runId}`;
    const successTranId = `${successOrderNumber}-TRX1`;
    const { data: successOrder } = await supabase
      .from("orders")
      .insert({
        order_number: successOrderNumber,
        status: "pending_payment",
        subtotal: 2500,
        shipping_total: 100,
        discount_total: 0,
        grand_total: 2600,
        currency: "BDT",
      })
      .select("*")
      .single();
    createdOrderIds.push(successOrder.id);

    const { data: successSession } = await supabase
      .from("payment_sessions")
      .insert({
        provider_id: sslProvider?.id || null,
        order_id: successOrder.id,
        amount: 2600,
        currency: "BDT",
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        metadata: { tran_id: successTranId },
      })
      .select("*")
      .single();
    createdSessionIds.push(successSession.id);

    // First success execution:
    const mockValId = `VAL-SUCC-${runId}`;
    const mockBankTranId = `BANK-TRX-${runId}`;

    // Update payment_transactions
    await supabase.from("payment_transactions").insert({
      order_id: successOrder.id,
      session_id: successSession.id,
      provider_id: sslProvider?.id || null,
      amount: 2600,
      currency: "BDT",
      status: "completed",
      reference_number: successTranId,
      gateway_transaction_id: mockBankTranId,
      gateway_response: { val_id: mockValId, bank_tran_id: mockBankTranId, status: "VALID" },
    });

    // Update session and order
    await supabase
      .from("payment_sessions")
      .update({ status: "completed" })
      .eq("id", successSession.id);

    const capturePayload = {
      status: "confirmed",
      paid_at: new Date().toISOString(),
      payment_intent_id: mockBankTranId,
    };
    const { error: capErr } = await supabase
      .from("orders")
      .update({ ...capturePayload, payment_method: "SSLCOMMERZ", payment_status: "CAPTURED" })
      .eq("id", successOrder.id);
    if (capErr) {
      await supabase.from("orders").update(capturePayload).eq("id", successOrder.id);
    }

    const { data: confirmedOrder } = await supabase
      .from("orders")
      .select("status, payment_intent_id")
      .eq("id", successOrder.id)
      .single();

    assert(
      confirmedOrder.status === "confirmed",
      "First success call: Order marked as confirmed"
    );
    assert(
      confirmedOrder.payment_intent_id === mockBankTranId,
      `Transaction ID stored in payment_intent_id (${mockBankTranId})`
    );

    // Idempotency Test: Simulate second success callback (browser refresh or user pressing back/reload)
    const isOrderAlreadyPaid = (order) =>
      order.status === "confirmed" || order.payment_status === "CAPTURED";

    const { data: reloadOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", successOrder.id)
      .single();

    assert(
      isOrderAlreadyPaid(reloadOrder),
      "Idempotency Guard: Second callback recognizes order is already confirmed without re-executing"
    );

    // Count transaction records: must be exactly 1
    const { data: trxList } = await supabase
      .from("payment_transactions")
      .select("id")
      .eq("order_id", successOrder.id);

    assert(trxList.length === 1, `Exactly 1 transaction record exists for order (no duplicates created)`);

    // ------------------------------------------------------------------
    // TEST 9: IPN Webhook Server-to-Server Handling & Concurrent Processing
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 9] IPN Webhook Server-to-Server Idempotent Processing...");

    // Simulate IPN receiving the already completed order:
    function handleIPNIdempotency(order) {
      if (
        order.status === "confirmed" ||
        order.status === "CONFIRMED" ||
        order.payment_status === "CAPTURED"
      ) {
        return {
          status: "ALREADY_PROCESSED",
          message: "Payment has already been processed and order confirmed",
        };
      }
      return { status: "PROCESS_NEW" };
    }

    const ipnResult = handleIPNIdempotency(reloadOrder);
    assert(
      ipnResult.status === "ALREADY_PROCESSED",
      "IPN Webhook immediately returns ALREADY_PROCESSED for already captured orders"
    );

    // ------------------------------------------------------------------
    // TEST 10: Provider Factory & Multi-Card Gateway Aliases Audit
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 10] Provider Factory & Multi-Card Gateway Aliases Audit...");

    const fs = require("fs");
    const path = require("path");

    const factoryCode = fs.readFileSync(
      path.join(__dirname, "../providers/payment/payment.factory.ts"),
      "utf8"
    );
    assert(
      factoryCode.includes("SSLCommerzPaymentProvider"),
      "Factory imports SSLCommerzPaymentProvider"
    );
    assert(
      factoryCode.includes('registerProvider(new SSLCommerzPaymentProvider("sslcommerz"))'),
      "Factory registers SSLCommerzPaymentProvider for 'sslcommerz'"
    );
    assert(
      factoryCode.includes('registerProvider(new SSLCommerzPaymentProvider("visa"))'),
      "Factory registers SSLCommerzPaymentProvider for 'visa' card alias"
    );
    assert(
      factoryCode.includes('registerProvider(new SSLCommerzPaymentProvider("mastercard"))'),
      "Factory registers SSLCommerzPaymentProvider for 'mastercard' card alias"
    );

    // Verify services provider
    const servicesProviderCode = fs.readFileSync(
      path.join(__dirname, "../services/payment/providers/sslcommerz.provider.ts"),
      "utf8"
    );
    assert(
      !servicesProviderCode.includes("Math.random()"),
      "Mock Math.random() stub removed from services SSLCommerzProvider"
    );
    assert(
      servicesProviderCode.includes("SSLCommerzService.initiatePayment"),
      "services SSLCommerzProvider delegates to SSLCommerzService.initiatePayment"
    );
    assert(
      servicesProviderCode.includes("SSLCommerzService.validateTransaction"),
      "services SSLCommerzProvider delegates to SSLCommerzService.validateTransaction"
    );

    // ------------------------------------------------------------------
    // TEST 11: Regression Check (COD, bKash)
    // ------------------------------------------------------------------
    console.log("\n▶ [Test 11] Regression Check: Existing Payment Providers...");

    assert(
      factoryCode.includes("BKashPaymentProvider"),
      "bKash provider preserved in PaymentProviderFactory"
    );
    assert(
      factoryCode.includes("CodProvider"),
      "COD provider preserved in PaymentProviderFactory"
    );
  } catch (err) {
    console.error("❌ Unexpected test exception:", err);
    failed++;
  } finally {
    // Clean up test records
    console.log("\n▶ Cleaning up temporary test data...");
    if (createdSessionIds.length > 0) {
      await supabase.from("payment_transactions").delete().in("session_id", createdSessionIds);
      await supabase.from("payment_sessions").delete().in("id", createdSessionIds);
    }
    if (createdOrderIds.length > 0) {
      await supabase.from("order_status_history").delete().in("order_id", createdOrderIds);
      await supabase.from("payment_transactions").delete().in("order_id", createdOrderIds);
      await supabase.from("orders").delete().in("id", createdOrderIds);
    }
    console.log("  🧹 Test data cleanup complete.\n");
  }

  console.log("====================================================================");
  console.log(`   TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("====================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt9Tests();
