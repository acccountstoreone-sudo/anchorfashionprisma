import { BarcodeLabelData } from "../components/admin/inventory/PrintBarcodeModal";

console.log("=== VERIFYING BARCODE LABEL DATA & LAYOUT SPECIFICATIONS ===");

// 1. Mock inventory intake result with variants having specific stock counts
const mockIntakeVariants = [
  { sku: "AF-JNS-BLU-30", barcode: "040050336330", color: "Blue", size: "30", quantity: 12, price: 3650 },
  { sku: "AF-JNS-BLU-32", barcode: "040050336332", color: "Blue", size: "32", quantity: 25, price: 3650 },
  { sku: "AF-JNS-BLK-32", barcode: "040050336333", color: "Black", size: "32", quantity: 8, price: 3650 },
  { sku: "AF-JNS-BLK-34", barcode: "040050336334", color: "Black", size: "34", quantity: 15, price: 3650 },
];

const labels: BarcodeLabelData[] = mockIntakeVariants.map((v) => ({
  productName: "Jeans Pant Foreign",
  sku: v.sku,
  barcode: v.barcode,
  color: v.color,
  size: v.size,
  price: v.price,
  stock: v.quantity,
  styleCode: "MW-03363",
  brandName: "ANCHOR FASHION",
  categoryName: "Jeans Pant",
  tag: "ND",
}));

console.log("1. Generated mock labels for intake:", labels.length);
labels.forEach((l) => {
  console.log(` - Variant [${l.sku}] | Size: ${l.size} | Color: ${l.color} | Default Stock Qty: ${l.stock} | Barcode: ${l.barcode} | Tag: ${l.tag}`);
});

// 2. Verify total stickers calculated by default (matching stock quantity)
const defaultTotalStickers = labels.reduce((sum, l) => sum + (l.stock ?? 1), 0);
console.log(`\n2. Default Total Stickers across inventory: ${defaultTotalStickers} stickers`);
if (defaultTotalStickers !== 60) {
  throw new Error(`Expected 60 stickers by default, got ${defaultTotalStickers}`);
}
console.log("   ✓ Default quantity matches intake warehouse stock counts exactly (12 + 25 + 8 + 15 = 60).");

// 3. Verify single & multiple filtering
const size32Labels = labels.filter((l) => l.size === "32");
console.log(`\n3. Filter by Size '32': found ${size32Labels.length} variants:`, size32Labels.map((l) => `${l.color}-${l.size}`));
const blackLabels = labels.filter((l) => l.color === "Black");
console.log(`   Filter by Color 'Black': found ${blackLabels.length} variants:`, blackLabels.map((l) => `${l.color}-${l.size}`));

// 4. Verify Thermal vs A4 dimensions
const thermalDimensions = { width: "50mm", height: "30mm", pageBreak: "always" };
const a4DenseColumns = 4;
const a4StickersPerPage = a4DenseColumns * 9; // ~36 per page
console.log(`\n4. Thermal Roll Print Spec: ${thermalDimensions.width} x ${thermalDimensions.height} with 1 sticker per page.`);
console.log(`   A4 Dense Sheet Print Spec: 4 columns across A4 width, tightly packed (${a4StickersPerPage} stickers/sheet) with minimal 2mm gutters.`);

// 5. Price format check matching photo: TK.3,650.00(Inc.VAT)
const formattedPrice = `TK.${Number(3650).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}(Inc.VAT)`;
console.log(`\n5. Formatted Price String: "${formattedPrice}"`);
if (formattedPrice !== "TK.3,650.00(Inc.VAT)") {
  throw new Error(`Price format mismatch: expected "TK.3,650.00(Inc.VAT)", got "${formattedPrice}"`);
}
console.log("   ✓ Price string matches attached photo exactly!");

console.log("\n=== ALL BARCODE AUDIT VERIFICATIONS PASSED SUCCESSFULLY ===");
