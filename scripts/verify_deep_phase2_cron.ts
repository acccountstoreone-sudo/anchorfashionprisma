import { GET as getProcessQueue } from "../app/api/cron/process-queue/route";
import { GET as getReleaseExpired } from "../app/api/cron/release-expired-reservations/route";
import { GET as getCampaigns } from "../app/api/cron/campaigns/route";
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

async function runCronTests() {
  console.log("=== PHASE 2: CRON SECURITY TESTS ===");
  const originalSecret = process.env.CRON_SECRET;
  const testSecret = "test_cron_secret_12345_secure";

  const endpoints = [
    { name: "process-queue", handler: getProcessQueue },
    { name: "release-expired-reservations", handler: getReleaseExpired },
    { name: "campaigns", handler: getCampaigns },
  ];

  for (const ep of endpoints) {
    // 1. Missing header
    process.env.CRON_SECRET = testSecret;
    let req = new Request("http://localhost:3000/api/cron/" + ep.name);
    let res = await ep.handler(req);
    results.push({
      suite: ep.name,
      test: "Missing Authorization header -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
    });

    // 2. Empty Bearer token
    req = new Request("http://localhost:3000/api/cron/" + ep.name, {
      headers: { authorization: "Bearer " },
    });
    res = await ep.handler(req);
    results.push({
      suite: ep.name,
      test: "Empty Bearer token -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
    });

    // 3. 'Bearer undefined' attack
    req = new Request("http://localhost:3000/api/cron/" + ep.name, {
      headers: { authorization: "Bearer undefined" },
    });
    res = await ep.handler(req);
    results.push({
      suite: ep.name,
      test: "Bearer undefined attack -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
    });

    // 4. Incorrect token
    req = new Request("http://localhost:3000/api/cron/" + ep.name, {
      headers: { authorization: "Bearer incorrect_random_token" },
    });
    res = await ep.handler(req);
    results.push({
      suite: ep.name,
      test: "Incorrect Bearer token -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
    });

    // 5. CRON_SECRET unset in environment
    delete process.env.CRON_SECRET;
    req = new Request("http://localhost:3000/api/cron/" + ep.name, {
      headers: { authorization: `Bearer ${testSecret}` },
    });
    res = await ep.handler(req);
    results.push({
      suite: ep.name,
      test: "CRON_SECRET undefined in env -> 401",
      expected: 401,
      actual: res.status,
      passed: res.status === 401,
    });

    // 6. Valid Secret -> Authenticates (not 401)
    process.env.CRON_SECRET = testSecret;
    req = new Request("http://localhost:3000/api/cron/" + ep.name, {
      headers: { authorization: `Bearer ${testSecret}` },
    });
    res = await ep.handler(req);
    const passed = res.status !== 401; // Can be 200 or return json
    results.push({
      suite: ep.name,
      test: "Valid Secret -> Authenticated (status != 401)",
      expected: 200,
      actual: res.status,
      passed,
      notes: `Status: ${res.status}`,
    });
  }

  // Restore env
  if (originalSecret) {
    process.env.CRON_SECRET = originalSecret;
  } else {
    delete process.env.CRON_SECRET;
  }

  console.table(results);
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`FAILED ${failed.length} tests in Phase 2!`);
    process.exit(1);
  } else {
    console.log(`ALL ${results.length} CRON SECURITY TESTS PASSED!`);
  }
}

runCronTests().catch((e) => {
  console.error("Test execution error:", e);
  process.exit(1);
});
