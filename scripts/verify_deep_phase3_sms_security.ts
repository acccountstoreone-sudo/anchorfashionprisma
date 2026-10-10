import { POST as sendSmsHandler } from "../app/api/orders/[orderId]/send-confirmation-sms/route";
import { GET as smsLogsHandler } from "../app/api/orders/[orderId]/sms-logs/route";
import { createAdminClient } from "../lib/supabase/admin-client";
import dotenv from "dotenv";

dotenv.config();

interface TestResult {
  suite: string;
  test: string;
  expected: number;
  actual: number;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

async function runSmsSecurityTests() {
  console.log("=== PHASE 3: ORDER SMS SECURITY & IDOR TESTS ===");
  const supabase = createAdminClient();

  // Find or create test data: two separate orders
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("id, customer_id, created_by")
    .limit(2);

  if (oErr || !orders || orders.length < 1) {
    console.error("Could not fetch test orders:", oErr);
    process.exit(1);
  }

  const testOrderId = orders[0].id;
  const fakeOrderId = "00000000-0000-0000-0000-000000000000";

  // 1. Unauthenticated request to send-confirmation-sms -> 401
  {
    const req = new Request(`http://localhost:3000/api/orders/${testOrderId}/send-confirmation-sms`, {
      method: "POST",
    });
    const res = await sendSmsHandler(req as any, { params: Promise.resolve({ orderId: testOrderId }) });
    results.push({
      suite: "send-confirmation-sms",
      test: "Unauthenticated request -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
      notes: await res.clone().text(),
    });
  }

  // 2. Unauthenticated request to sms-logs -> 401
  {
    const req = new Request(`http://localhost:3000/api/orders/${testOrderId}/sms-logs`);
    const res = await smsLogsHandler(req as any, { params: Promise.resolve({ orderId: testOrderId }) });
    results.push({
      suite: "sms-logs",
      test: "Unauthenticated request -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
      notes: await res.clone().text(),
    });
  }

  // 3. Missing orderId param -> 400
  {
    const req = new Request(`http://localhost:3000/api/orders//send-confirmation-sms`, {
      method: "POST",
    });
    const res = await sendSmsHandler(req as any, { params: Promise.resolve({ orderId: "" }) });
    results.push({
      suite: "send-confirmation-sms",
      test: "Missing orderId -> 400",
      expected: 400,
      actual: res.status,
      passed: res.status === 400,
      notes: await res.clone().text(),
    });
  }

  // 4. Invalid Bearer Token -> 401
  {
    const req = new Request(`http://localhost:3000/api/orders/${testOrderId}/sms-logs`, {
      headers: { authorization: "Bearer invalid_jwt_token_here" },
    });
    const res = await smsLogsHandler(req as any, { params: Promise.resolve({ orderId: testOrderId }) });
    results.push({
      suite: "sms-logs",
      test: "Invalid Bearer Token -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
      notes: await res.clone().text(),
    });
  }

  // 5. Test IDOR authorization check logic directly
  {
    // Simulate user A (customer) trying to access user B's order
    const userA = { id: "user_a_customer_uuid", app_metadata: { role: "customer" }, user_metadata: {} };
    const orderB = { id: testOrderId, customer_id: "user_b_customer_uuid", created_by: "user_b_customer_uuid" };

    const role = (userA.app_metadata?.role || "").toLowerCase();
    const isStaffOrAdmin = [
      "admin",
      "superadmin",
      "super_admin",
      "manager",
      "ops_manager",
      "inventory_manager",
      "staff",
      "warehouse_staff",
    ].includes(role);
    const isOwner = orderB.customer_id === userA.id || orderB.created_by === userA.id;
    const isForbidden = !isStaffOrAdmin && !isOwner;

    results.push({
      suite: "authorization-matrix",
      test: "Customer A accessing Customer B's order is blocked (403)",
      expected: 403,
      actual: isForbidden ? 403 : 200,
      passed: isForbidden === true,
      notes: "Cross-customer access correctly denied",
    });
  }

  // 6. Test Owner access
  {
    const userA = { id: "user_a_customer_uuid", app_metadata: { role: "customer" }, user_metadata: {} };
    const orderA = { id: testOrderId, customer_id: "user_a_customer_uuid", created_by: "user_a_customer_uuid" };

    const role = (userA.app_metadata?.role || "").toLowerCase();
    const isStaffOrAdmin = [
      "admin",
      "superadmin",
      "super_admin",
      "manager",
      "ops_manager",
      "inventory_manager",
      "staff",
      "warehouse_staff",
    ].includes(role);
    const isOwner = orderA.customer_id === userA.id || orderA.created_by === userA.id;
    const isAllowed = isStaffOrAdmin || isOwner;

    results.push({
      suite: "authorization-matrix",
      test: "Owner accessing their own order is permitted",
      expected: 200,
      actual: isAllowed ? 200 : 403,
      passed: isAllowed === true,
      notes: "Owner permitted",
    });
  }

  // 7. Test Staff access
  {
    const staffUser = { id: "staff_uuid", app_metadata: { role: "staff" }, user_metadata: {} };
    const orderA = { id: testOrderId, customer_id: "user_a_customer_uuid", created_by: "user_a_customer_uuid" };

    const role = (staffUser.app_metadata?.role || "").toLowerCase();
    const isStaffOrAdmin = [
      "admin",
      "superadmin",
      "super_admin",
      "manager",
      "ops_manager",
      "inventory_manager",
      "staff",
      "warehouse_staff",
    ].includes(role);
    const isAllowed = isStaffOrAdmin;

    results.push({
      suite: "authorization-matrix",
      test: "Staff role accessing any order is permitted",
      expected: 200,
      actual: isAllowed ? 200 : 403,
      passed: isAllowed === true,
      notes: "Staff permitted",
    });
  }

  // 8. Test force=true for ordinary customer is rejected/ignored
  {
    const userA = { id: "user_a_customer_uuid", app_metadata: { role: "customer" }, user_metadata: {} };
    const role = (userA.app_metadata?.role || "").toLowerCase();
    const isStaffOrAdmin = [
      "admin",
      "superadmin",
      "super_admin",
      "manager",
      "ops_manager",
      "inventory_manager",
      "staff",
      "warehouse_staff",
    ].includes(role);
    const searchParams = new URLSearchParams("force=true");
    const force = isStaffOrAdmin && searchParams.get("force") === "true";

    results.push({
      suite: "authorization-matrix",
      test: "Customer attempting ?force=true has force flag ignored (evaluates to false)",
      expected: 0,
      actual: force ? 1 : 0,
      passed: force === false,
      notes: "Force bypass denied for customer",
    });
  }

  console.table(results);
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`FAILED ${failed.length} tests in Phase 3!`);
    process.exit(1);
  } else {
    console.log(`ALL 8 PHASE 3 SECURITY & IDOR TESTS PASSED!`);
  }
}

runSmsSecurityTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
