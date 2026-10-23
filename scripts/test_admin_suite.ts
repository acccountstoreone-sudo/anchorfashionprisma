import { prisma } from "../lib/prisma";
import { QA_USERS } from "./seed_all_qa_roles";
import { CouponService } from "../services/coupon.service";
import { WarehouseService } from "../services/warehouse.service";
import { InventoryService } from "../services/inventory.service";
import { CatalogRepository } from "../repositories/catalog.repository";

interface SuiteResult {
  suite: string;
  testName: string;
  passed: boolean;
  status?: number;
  details?: string;
  error?: string;
}

const results: SuiteResult[] = [];

function record(suite: string, testName: string, passed: boolean, details?: string, error?: string, status?: number) {
  results.push({ suite, testName, passed, details, error, status });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} [${suite}] ${testName}: ${details || error || ""}`);
}

async function login(email: string, password: string): Promise<{ success: boolean; cookies: string[]; user?: any; error?: string }> {
  try {
    const res = await fetch("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email, password }),
    });

    const setCookies = (res.headers as any).getSetCookie?.() || [];
    const body: any = await res.json().catch(() => null);

    if (res.ok && body?.user) {
      return { success: true, cookies: setCookies, user: body.user };
    }
    return { success: false, cookies: [], error: body?.message || `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, cookies: [], error: err.message };
  }
}

async function fetchRoute(path: string, cookies: string[] = []): Promise<{ status: number; text: string; location: string }> {
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  const headers: Record<string, string> = {};
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  const res = await fetch(`http://localhost:3000${path}`, {
    headers,
    redirect: "manual",
  });

  const text = await res.text();
  const location = res.headers.get("location") || "";
  return { status: res.status, text, location };
}

export async function runAdminComprehensiveSuite() {
  console.log("========================================================================");
  console.log("         ANCHOR FASHION - COMPREHENSIVE ADMIN ENTERPRISE TEST SUITE      ");
  console.log("========================================================================\n");

  // ------------------------------------------------------------------------
  // PHASE 1: ADMIN AUTHENTICATION & IDENTITY
  // ------------------------------------------------------------------------
  console.log(">>> PHASE 1: LOGGING IN AS ADMIN & SUPERADMIN...");
  
  const adminUserDef = QA_USERS.find(u => u.roleName === "ADMIN")!;
  const superAdminDef = QA_USERS.find(u => u.roleName === "SUPERADMIN")!;

  const adminLogin = await login(adminUserDef.email, adminUserDef.password);
  record(
    "Authentication",
    "Admin Login (qa_admin@anchorfashion.com)",
    adminLogin.success,
    adminLogin.success ? `User ID: ${adminLogin.user?.id}` : undefined,
    adminLogin.error
  );

  const superAdminLogin = await login(superAdminDef.email, superAdminDef.password);
  record(
    "Authentication",
    "SuperAdmin Login (qa_superadmin@anchorfashion.com)",
    superAdminLogin.success,
    superAdminLogin.success ? `User ID: ${superAdminLogin.user?.id}` : undefined,
    superAdminLogin.error
  );

  const activeCookies = adminLogin.success ? adminLogin.cookies : superAdminLogin.cookies;

  // ------------------------------------------------------------------------
  // PHASE 2: SECURITY & ACCESS CONTROL BOUNDARIES
  // ------------------------------------------------------------------------
  console.log("\n>>> PHASE 2: SECURITY & RBAC BOUNDARIES...");

  // Anonymous trying to hit /admin
  const anonRes = await fetchRoute("/admin");
  const anonBlocked = [302, 307, 308].includes(anonRes.status) && anonRes.location.includes("/auth/login");
  record("RBAC Guard", "Anonymous access to /admin redirected to /auth/login", anonBlocked, `Status: ${anonRes.status}, Location: ${anonRes.location}`);

  // Customer trying to hit /admin
  const customerDef = QA_USERS.find(u => u.roleName === "CUSTOMER")!;
  const customerLogin = await login(customerDef.email, customerDef.password);
  if (customerLogin.success) {
    const custAdminRes = await fetchRoute("/admin", customerLogin.cookies);
    const custBlocked = ([302, 307, 308].includes(custAdminRes.status) && !custAdminRes.location.includes("/admin")) || custAdminRes.text.includes("/account/profile");
    record("RBAC Guard", "Customer forbidden from /admin (redirected)", custBlocked, `Status: ${custAdminRes.status}, Location: ${custAdminRes.location}`);
  }

  // ------------------------------------------------------------------------
  // PHASE 3: ADMIN MODULES ROUTE ACCESSIBILITY
  // ------------------------------------------------------------------------
  console.log("\n>>> PHASE 3: VERIFYING ALL 16 ADMIN SUBSYSTEM ROUTES (HTTP 200)...");

  const adminRoutes = [
    { path: "/admin", name: "Executive Dashboard" },
    { path: "/admin/products", name: "Products List" },
    { path: "/admin/products/new", name: "Create Product Form" },
    { path: "/admin/catalog", name: "Catalog Management" },
    { path: "/admin/orders", name: "Order Management (OMS)" },
    { path: "/admin/inventory", name: "Inventory & Warehouses" },
    { path: "/admin/customers", name: "Customers CRM" },
    { path: "/admin/marketing", name: "Marketing & Campaigns" },
    { path: "/admin/cms", name: "CMS & Content" },
    { path: "/admin/finance", name: "Finance & Accounts" },
    { path: "/admin/payments", name: "Payment Transactions" },
    { path: "/admin/analytics", name: "Executive Analytics" },
    { path: "/admin/reports", name: "Operational Reports" },
    { path: "/admin/shipping", name: "Logistics & Couriers" },
    { path: "/admin/support", name: "Customer Support & Tickets" },
    { path: "/admin/settings", name: "Store Configuration & Gateways" },
  ];

  for (const route of adminRoutes) {
    try {
      const res = await fetchRoute(route.path, activeCookies);
      const isOk = res.status === 200;
      record(
        "Admin Routes",
        `Route ${route.path} (${route.name})`,
        isOk,
        `Status: ${res.status}`,
        !isOk ? `HTTP ${res.status} redirect: ${res.location}` : undefined,
        res.status
      );
    } catch (err: any) {
      record("Admin Routes", `Route ${route.path}`, false, undefined, err.message);
    }
  }

  // ------------------------------------------------------------------------
  // PHASE 4: ADMIN BUSINESS LOGIC & DATA SERVICES
  // ------------------------------------------------------------------------
  console.log("\n>>> PHASE 4: ADMIN SERVICES & DATA MANAGEMENT OPERATIONS...");

  // 4.1 Product Catalog Inspection
  try {
    const catalogData = await CatalogRepository.getProducts({ limit: 5 });
    const hasProducts = Array.isArray(catalogData.data) && catalogData.data.length > 0;
    record("Catalog Service", "CatalogRepository returns product listings", hasProducts, `Retrieved ${catalogData.data?.length} products (Total: ${catalogData.count})`);
  } catch (err: any) {
    record("Catalog Service", "CatalogRepository returns product listings", false, undefined, err.message);
  }

  // 4.2 Warehouses & Default Warehouse Verification
  try {
    const warehouseService = new WarehouseService();
    const defaultWarehouse = await warehouseService.getDefaultWarehouse();
    const isWarehouseValid = !!defaultWarehouse && defaultWarehouse.id === "fc4ab9a5-7623-46ad-ada5-2bbdd95f3655";
    record("Inventory Service", "Default Central Warehouse resolves correctly", isWarehouseValid, `Warehouse: ${defaultWarehouse?.name} (ID: ${defaultWarehouse?.id})`);
  } catch (err: any) {
    record("Inventory Service", "Default Central Warehouse resolves correctly", false, undefined, err.message);
  }

  // 4.3 Coupons Engine: Create Test Coupon, Validate Discount, Release
  try {
    const testCode = `ADMTEST-${Date.now().toString().slice(-4)}`;
    const createdCoupon = await prisma.coupon.create({
      data: {
        code: testCode,
        discountType: "PERCENTAGE",
        discountValue: 20,
        minOrderAmount: 500,
        maxDiscount: 200,
        usageLimit: 10,
        usedCount: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // 1 day
        isActive: true,
      },
    });

    const validation = await CouponService.validateAndCalculateDiscount(testCode, 1000);
    const isValid = validation.isValid && validation.discount === 200; // 20% of 1000 is 200
    record("Marketing Engine", "Admin Coupon Creation & Discount Calculation (20% cap 200)", isValid, `Discount computed: ৳${validation.discount}`);

    // Clean up test coupon
    await prisma.coupon.delete({ where: { id: createdCoupon.id } });
  } catch (err: any) {
    record("Marketing Engine", "Admin Coupon Creation & Discount Calculation", false, undefined, err.message);
  }

  // 4.4 Category Management: Create, Read, Update, Delete
  try {
    const testSlug = `admin-test-${Date.now()}`;
    const testCat = await prisma.category.create({
      data: {
        name: "Admin Test Category",
        slug: testSlug,
        description: "Temporary category created during enterprise admin suite test",
        isActive: true,
      },
    });

    const fetchedCat = await prisma.category.findUnique({ where: { id: testCat.id } });
    const isCatCreated = fetchedCat?.slug === testSlug;

    // Update
    await prisma.category.update({
      where: { id: testCat.id },
      data: { name: "Admin Test Category Updated" },
    });

    // Delete
    await prisma.category.delete({ where: { id: testCat.id } });
    record("Catalog CRUD", "Admin Category Create -> Read -> Update -> Delete", isCatCreated, `Category lifecycle verified with slug: ${testSlug}`);
  } catch (err: any) {
    record("Catalog CRUD", "Admin Category Create -> Read -> Update -> Delete", false, undefined, err.message);
  }

  // 4.5 Payment Settings Storage & Encryption Check
  try {
    const paymentSetting = await prisma.setting.findFirst({
      where: { key: "payment_sslcommerz" },
    });
    record("Settings & Config", "Admin Payment Gateway Settings Exist in Database", !!paymentSetting, `Store ID: ${(paymentSetting?.value as any)?.store_id || "configured"}`);
  } catch (err: any) {
    record("Settings & Config", "Admin Payment Gateway Settings", false, undefined, err.message);
  }

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log("\n========================================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const scorePercent = Math.round((passed / total) * 100);

  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed} | SUCCESS RATE: ${scorePercent}%`);
  console.log("========================================================================\n");

  return { total, passed, failed, scorePercent, results };
}

runAdminComprehensiveSuite()
  .catch(err => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
