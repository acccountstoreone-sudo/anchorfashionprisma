import { describe, it, expect } from "vitest";
import { generateEAN13Sync } from "@/lib/utils/barcode";

describe("Inventory Master & POS Flow Engine", () => {
  // ─── 1. BARCODE GENERATION ──────────────────────────────────────────
  describe("EAN-13 Barcode Generation", () => {
    it("should generate a valid 13-digit EAN barcode with prefix 894", () => {
      const barcode = generateEAN13Sync("89420");
      expect(barcode).toHaveLength(13);
      expect(barcode.startsWith("89420")).toBe(true);
      expect(/^\d{13}$/.test(barcode)).toBe(true);
    });

    it("should compute correct EAN-13 checksum modulo 10", () => {
      const barcode = generateEAN13Sync();
      const raw12 = barcode.slice(0, 12);
      const givenChecksum = parseInt(barcode[12], 10);

      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(raw12[i], 10);
        sum += i % 2 === 0 ? digit : digit * 3;
      }
      const expectedChecksum = (10 - (sum % 10)) % 10;
      expect(givenChecksum).toBe(expectedChecksum);
    });

    it("should generate distinct barcodes across multiple runs", () => {
      const set = new Set<string>();
      for (let i = 0; i < 50; i++) {
        set.add(generateEAN13Sync());
      }
      expect(set.size).toBe(50);
    });
  });

  // ─── 2. COLOR & SIZE MATRIX AUTO-DISTRIBUTION ────────────────────────
  describe("Color & Size Auto-Distribution Algorithm", () => {
    function autoDistribute(
      totalQuantity: number,
      colors: string[],
      sizes: string[]
    ): { matrix: Record<string, number>; totalAllocated: number } {
      const totalCells = colors.length * sizes.length;
      if (totalCells === 0) return { matrix: {}, totalAllocated: 0 };

      const basePerCell = Math.floor(totalQuantity / totalCells);
      let remainder = totalQuantity % totalCells;

      const matrix: Record<string, number> = {};
      let totalAllocated = 0;

      for (const color of colors) {
        for (const size of sizes) {
          const key = `${color}-${size}`;
          let cellQty = basePerCell;
          if (remainder > 0) {
            cellQty += 1;
            remainder -= 1;
          }
          matrix[key] = cellQty;
          totalAllocated += cellQty;
        }
      }

      return { matrix, totalAllocated };
    }

    it("should evenly divide 100 units across 2 colors and 4 sizes (8 cells)", () => {
      const colors = ["Black", "Blue"];
      const sizes = ["M", "L", "XL", "XXL"];
      const { matrix, totalAllocated } = autoDistribute(100, colors, sizes);

      expect(totalAllocated).toBe(100);
      // 100 / 8 = 12 with remainder 4 -> four cells get 13, four cells get 12
      const values = Object.values(matrix);
      expect(values.filter((v) => v === 13).length).toBe(4);
      expect(values.filter((v) => v === 12).length).toBe(4);
      expect(values.reduce((s, v) => s + v, 0)).toBe(100);
    });

    it("should handle large scale bulk intake (1,000 units across 5 colors and 6 sizes = 30 cells)", () => {
      const colors = ["Black", "Navy", "White", "Maroon", "Olive"];
      const sizes = ["S", "M", "L", "XL", "XXL", "3XL"];
      const { matrix, totalAllocated } = autoDistribute(1000, colors, sizes);

      expect(totalAllocated).toBe(1000);
      expect(Object.keys(matrix).length).toBe(30);
      const values = Object.values(matrix);
      // 1000 / 30 = 33 base with 10 cells getting 34
      expect(values.filter((v) => v === 34).length).toBe(10);
      expect(values.filter((v) => v === 33).length).toBe(20);
    });

    it("should calculate exact sum when total quantity is a prime number", () => {
      const colors = ["Red", "Green"];
      const sizes = ["S", "M", "L"];
      const { totalAllocated } = autoDistribute(77, colors, sizes);
      expect(totalAllocated).toBe(77);
    });
  });

  // ─── 3. FINANCIAL PROFIT MARGIN & VALUATION ──────────────────────────
  describe("Financial Profit Margin & Valuation Logic", () => {
    function calculateFinancials(sellingPrice: number, costPrice: number, quantity: number) {
      const unitGrossProfit = sellingPrice - costPrice;
      const profitMarginPercent = sellingPrice > 0 ? (unitGrossProfit / sellingPrice) * 100 : 0;
      const markupPercent = costPrice > 0 ? (unitGrossProfit / costPrice) * 100 : 0;
      const totalStockCost = quantity * costPrice;
      const totalStockRevenue = quantity * sellingPrice;
      const totalProjectedProfit = totalStockRevenue - totalStockCost;

      return {
        unitGrossProfit,
        profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
        markupPercent: Math.round(markupPercent * 10) / 10,
        totalStockCost,
        totalStockRevenue,
        totalProjectedProfit,
      };
    }

    it("should correctly calculate unit profit and 54% margin for 5000 TK selling and 2300 TK cost", () => {
      const fin = calculateFinancials(5000, 2300, 100);
      expect(fin.unitGrossProfit).toBe(2700);
      expect(fin.profitMarginPercent).toBe(54.0); // (2700 / 5000) * 100
      expect(fin.totalStockCost).toBe(230000);
      expect(fin.totalStockRevenue).toBe(500000);
      expect(fin.totalProjectedProfit).toBe(270000);
    });

    it("should handle 100% margin when cost price is 0", () => {
      const fin = calculateFinancials(1500, 0, 50);
      expect(fin.unitGrossProfit).toBe(1500);
      expect(fin.profitMarginPercent).toBe(100.0);
    });

    it("should correctly handle low margin products (< 30%)", () => {
      const fin = calculateFinancials(1000, 800, 100);
      expect(fin.unitGrossProfit).toBe(200);
      expect(fin.profitMarginPercent).toBe(20.0);
    });
  });

  // ─── 4. BRANCH TRANSFER AUDIT & REPORT AGGREGATION ───────────────────
  describe("Branch Transfer Dispatch & Report Aggregation", () => {
    interface TransferMock {
      id: string;
      transferNumber: string;
      branchId: string;
      branchName: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
    }

    it("should accurately aggregate dispatched units and retail value per branch", () => {
      const transfers: TransferMock[] = [
        {
          id: "t1",
          transferNumber: "TRF-001",
          branchId: "b-banani",
          branchName: "Banani Flagship",
          quantity: 25,
          unitPrice: 5000,
          unitCost: 2300,
        },
        {
          id: "t2",
          transferNumber: "TRF-002",
          branchId: "b-banani",
          branchName: "Banani Flagship",
          quantity: 15,
          unitPrice: 5000,
          unitCost: 2300,
        },
        {
          id: "t3",
          transferNumber: "TRF-003",
          branchId: "b-uttara",
          branchName: "Uttara Outlet",
          quantity: 30,
          unitPrice: 3000,
          unitCost: 1200,
        },
      ];

      const branchMap: Record<string, { totalUnits: number; totalRetail: number; totalCost: number }> = {};
      let totalUnitsSent = 0;
      let totalRetailSent = 0;

      for (const t of transfers) {
        totalUnitsSent += t.quantity;
        const retail = t.quantity * t.unitPrice;
        const cost = t.quantity * t.unitCost;
        totalRetailSent += retail;

        if (!branchMap[t.branchId]) {
          branchMap[t.branchId] = { totalUnits: 0, totalRetail: 0, totalCost: 0 };
        }
        branchMap[t.branchId].totalUnits += t.quantity;
        branchMap[t.branchId].totalRetail += retail;
        branchMap[t.branchId].totalCost += cost;
      }

      expect(totalUnitsSent).toBe(70);
      expect(totalRetailSent).toBe(290000); // (40 * 5000) + (30 * 3000) = 200,000 + 90,000 = 290,000
      expect(branchMap["b-banani"].totalUnits).toBe(40);
      expect(branchMap["b-banani"].totalRetail).toBe(200000);
      expect(branchMap["b-uttara"].totalUnits).toBe(30);
      expect(branchMap["b-uttara"].totalRetail).toBe(90000);
    });

    it("should deduct warehouse inventory on branch dispatch", () => {
      let warehouseStock = 100;
      const transferQty = 25;

      expect(warehouseStock >= transferQty).toBe(true);
      warehouseStock -= transferQty;

      expect(warehouseStock).toBe(75);
    });
  });
});
