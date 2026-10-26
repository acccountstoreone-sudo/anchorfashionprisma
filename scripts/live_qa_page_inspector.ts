
interface PageCheck {
  url: string;
  name: string;
  section: "Storefront" | "Auth" | "Customer Portal" | "Admin Back-Office" | "Manager Portal";
  expectedStatus: number[]; // e.g. [200] or [200, 307, 308]
  mustContain?: string[];
  mustNotContain?: string[];
}

const PAGES_TO_TEST: PageCheck[] = [
  // ── 1. Storefront Pages ──
  { url: "/", name: "Homepage", section: "Storefront", expectedStatus: [200], mustContain: ["Anchor Fashion", "<html"], mustNotContain: ["Something went wrong", "Application error"] },
  { url: "/products", name: "Products Catalog (PLP)", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong", "Internal Server Error"] },
  { url: "/cart", name: "Shopping Cart", section: "Storefront", expectedStatus: [200], mustContain: ["Cart", "<html"], mustNotContain: ["Something went wrong"] },
  { url: "/checkout", name: "Checkout Page", section: "Storefront", expectedStatus: [200, 307, 308], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/categories", name: "Categories Hub", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/collections", name: "Collections Directory", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/brands", name: "Brand Directory", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/flash-deals", name: "Flash Deals", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/blog", name: "Editorial Blog", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/contact", name: "Contact Us", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/support", name: "Customer Support Hub", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/track-order", name: "Live Order Tracking", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/privacy", name: "Privacy Policy", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/terms", name: "Terms of Service", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/cookies", name: "Cookie Policy", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/loyalty", name: "VIP Loyalty Program", section: "Storefront", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },

  // ── 2. Auth Pages ──
  { url: "/auth/login", name: "Customer & Staff Login", section: "Auth", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/auth/register", name: "User Registration", section: "Auth", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },
  { url: "/auth/forgot-password", name: "Password Recovery", section: "Auth", expectedStatus: [200], mustContain: ["<html"], mustNotContain: ["Something went wrong"] },

  // ── 3. Canonical Redirects ──
  { url: "/shop", name: "Redirect: /shop -> /products", section: "Storefront", expectedStatus: [301, 308, 200] },
  { url: "/orders", name: "Redirect: /orders -> /account/orders", section: "Customer Portal", expectedStatus: [301, 308, 307, 200] },
  { url: "/login", name: "Redirect: /login -> /auth/login", section: "Auth", expectedStatus: [301, 308, 200] },

  // ── 4. Protected Customer Portal (Expected 307/308 or 200 login redirect for unauthenticated) ──
  { url: "/account", name: "Account Dashboard", section: "Customer Portal", expectedStatus: [200, 302, 307, 308] },
  { url: "/account/orders", name: "Order History", section: "Customer Portal", expectedStatus: [200, 302, 307, 308] },
  { url: "/account/profile", name: "User Profile", section: "Customer Portal", expectedStatus: [200, 302, 307, 308] },
  { url: "/account/addresses", name: "Saved Addresses", section: "Customer Portal", expectedStatus: [200, 302, 307, 308] },
  { url: "/account/coupons", name: "My Coupons", section: "Customer Portal", expectedStatus: [200, 302, 307, 308] },

  // ── 5. Protected Admin Pages (Expected 307/308 or 200 auth challenge for unauthenticated) ──
  { url: "/admin", name: "Admin Dashboard Home", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/products", name: "Admin Products Catalog", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/products/new", name: "Admin Add New Product (Fixed Sticky Form)", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/inventory", name: "Admin Inventory Management", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/orders", name: "Admin Orders Management", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/finance", name: "Admin Finance & Ledger", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/marketing/coupons", name: "Admin Marketing Coupons", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/settings", name: "Admin Store Settings", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },
  { url: "/admin/support", name: "Admin Support System", section: "Admin Back-Office", expectedStatus: [200, 302, 307, 308] },

  // ── 6. System & SEO Endpoints ──
  { url: "/robots.txt", name: "Robots.txt", section: "Storefront", expectedStatus: [200], mustContain: ["User-Agent:"] },
  { url: "/sitemap.xml", name: "Sitemap.xml", section: "Storefront", expectedStatus: [200], mustContain: ["<?xml", "urlset"] },
  { url: "/api/health", name: "Health Check API", section: "Admin Back-Office", expectedStatus: [200] },
];

async function runLivePageAudit() {
  console.log("==================================================================");
  console.log("   ANCHOR FASHION - LIVE QA TESTER PAGE INSPECTION SUITE        ");
  console.log("   Target Server: http://localhost:3000                           ");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;
  const resultsBySection: Record<string, { total: number; passed: number; failed: number }> = {};

  for (const page of PAGES_TO_TEST) {
    if (!resultsBySection[page.section]) {
      resultsBySection[page.section] = { total: 0, passed: 0, failed: 0 };
    }
    resultsBySection[page.section].total++;

    const fullUrl = `http://localhost:3000${page.url}`;
    const start = Date.now();
    try {
      const res = await (fetch as any)(fullUrl, {
        redirect: "manual",
        headers: {
          "User-Agent": "AnchorFashion-QABot/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const duration = Date.now() - start;
      const status = res.status;
      const isStatusOk = page.expectedStatus.includes(status);

      let text = "";
      if (status === 200) {
        text = await res.text();
      }

      let contentOk = true;
      let errorReason = "";

      if (!isStatusOk) {
        contentOk = false;
        errorReason = `Expected HTTP [${page.expectedStatus.join(",")}] but got ${status}`;
      } else if (text) {
        if (page.mustContain) {
          for (const str of page.mustContain) {
            if (!text.includes(str)) {
              contentOk = false;
              errorReason = `Missing required content: "${str}"`;
              break;
            }
          }
        }
        if (contentOk && page.mustNotContain) {
          for (const str of page.mustNotContain) {
            if (text.includes(str)) {
              contentOk = false;
              errorReason = `Contains prohibited error text: "${str}"`;
              break;
            }
          }
        }
      }

      if (contentOk) {
        passed++;
        resultsBySection[page.section].passed++;
        const redirectLoc = res.headers.get("location");
        const redirectInfo = redirectLoc ? ` -> ${redirectLoc}` : "";
        console.log(`✅ [PASS] (${page.section}) ${page.name} [HTTP ${status} in ${duration}ms]${redirectInfo}`);
      } else {
        failed++;
        resultsBySection[page.section].failed++;
        console.log(`❌ [FAIL] (${page.section}) ${page.name} [HTTP ${status} in ${duration}ms]: ${errorReason}`);
      }
    } catch (err: any) {
      failed++;
      resultsBySection[page.section].failed++;
      console.log(`❌ [ERROR] (${page.section}) ${page.name}: ${err.message}`);
    }
  }

  console.log("\n==================================================================");
  console.log("                   QA AUDIT SUMMARY REPORT                       ");
  console.log("==================================================================");
  for (const [sec, stat] of Object.entries(resultsBySection)) {
    console.log(`  • ${sec.padEnd(20)}: ${stat.passed}/${stat.total} Passed (${Math.round((stat.passed / stat.total) * 100)}%)`);
  }
  console.log("------------------------------------------------------------------");
  console.log(`TOTAL: ${passed}/${PAGES_TO_TEST.length} Passed (${Math.round((passed / PAGES_TO_TEST.length) * 100)}%) | Failed: ${failed}`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLivePageAudit();
