const { execSync } = require("child_process");

function runTest(name, testFn) {
  process.stdout.write(`Testing: ${name} ... `);
  try {
    const result = testFn();
    if (result) {
      console.log("\x1b[32mPASSED\x1b[0m");
      return true;
    } else {
      console.log("\x1b[31mFAILED\x1b[0m");
      return false;
    }
  } catch (err) {
    console.log("\x1b[31mFAILED\x1b[0m");
    console.error(err);
    return false;
  }
}

let passed = 0;
let failed = 0;

console.log("=== STARTING DOCUMENT PRINT INTEGRATION TESTS ===\n");

// Typescript compilation ensures all imports from react-barcode/qrcode.react are correct
const tsResult = runTest("Typescript Compiler Check", () => {
  try {
    execSync("npx tsc --noEmit", { stdio: "pipe" });
    return true;
  } catch (err) {
    return false;
  }
});
if (tsResult) passed++; else failed++;

// Validate barcode dependencies
const depResult = runTest("Dependencies Verified (react-barcode, qrcode.react)", () => {
  const pkg = require("../package.json");
  return !!pkg.dependencies["react-barcode"] && !!pkg.dependencies["qrcode.react"];
});
if (depResult) passed++; else failed++;

// Verify Invoice Layout structure
const invoiceLayoutResult = runTest("Thermal Invoice Architecture", () => {
  const fs = require("fs");
  const path = require("path");
  const page = fs.readFileSync(path.join(__dirname, "../app/(print)/admin/orders/[id]/invoice/page.tsx"), "utf8");
  return page.includes("window.print()") && page.includes("INV-") && page.includes("QRCodeSVG");
});
if (invoiceLayoutResult) passed++; else failed++;

// Verify Packing Slip Layout structure
const packingSlipResult = runTest("Packing Slip Architecture", () => {
  const fs = require("fs");
  const path = require("path");
  const page = fs.readFileSync(path.join(__dirname, "../app/(print)/admin/orders/[id]/packing-slip/page.tsx"), "utf8");
  return page.includes("window.print()") && page.includes("Barcode") && page.includes("Warehouse Hub");
});
if (packingSlipResult) passed++; else failed++;

// Verify Shipping Label structure
const shippingLabelResult = runTest("Shipping Label Architecture", () => {
  const fs = require("fs");
  const path = require("path");
  const page = fs.readFileSync(path.join(__dirname, "../app/(print)/admin/orders/[id]/shipping-label/page.tsx"), "utf8");
  return page.includes("window.print()") && page.includes("w-[100mm] h-[150mm]") && page.includes("shipments");
});
if (shippingLabelResult) passed++; else failed++;

// Validate Customer Authorization
const authResult = runTest("Customer Invoice Access Security", () => {
  const fs = require("fs");
  const path = require("path");
  const page = fs.readFileSync(path.join(__dirname, "../app/(print)/account/orders/[id]/invoice/page.tsx"), "utf8");
  return page.includes("order.customer_id !== user.id");
});
if (authResult) passed++; else failed++;


console.log(`\n=== TEST RESULTS ===`);
console.log(`Total Passed: ${passed}`);
console.log(`Total Failed: ${failed}\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("Document/print components verified.");
  process.exit(0);
}
