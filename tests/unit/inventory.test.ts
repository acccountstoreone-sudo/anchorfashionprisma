import { describe, it, expect } from "vitest";

describe("Inventory Management & Stock Tracking", () => {
  interface InventoryLevelMock {
    id: string;
    variant_id: string;
    warehouse_id: string;
    quantity_available: number;
    quantity_reserved: number;
    reorder_point: number;
  }

  function resolveStockStatus(
    available: number,
    reorderPoint: number = 5
  ): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" {
    if (available > reorderPoint) {
      return "IN_STOCK";
    } else if (available > 0) {
      return "LOW_STOCK";
    }
    return "OUT_OF_STOCK";
  }

  describe("Stock Level Availability Status", () => {
    it("should report IN_STOCK when available quantity exceeds reorder point", () => {
      expect(resolveStockStatus(50, 10)).toBe("IN_STOCK");
      expect(resolveStockStatus(11, 10)).toBe("IN_STOCK");
    });

    it("should report LOW_STOCK when available quantity is positive but <= reorder point", () => {
      expect(resolveStockStatus(10, 10)).toBe("LOW_STOCK");
      expect(resolveStockStatus(3, 5)).toBe("LOW_STOCK");
      expect(resolveStockStatus(1, 5)).toBe("LOW_STOCK");
    });

    it("should report OUT_OF_STOCK when available quantity is zero or negative", () => {
      expect(resolveStockStatus(0, 5)).toBe("OUT_OF_STOCK");
      expect(resolveStockStatus(-1, 5)).toBe("OUT_OF_STOCK");
    });

    it("should aggregate available stock across multiple warehouses for a variant", () => {
      const warehouses: InventoryLevelMock[] = [
        {
          id: "inv-1",
          variant_id: "var-001",
          warehouse_id: "wh-dhaka",
          quantity_available: 35,
          quantity_reserved: 5,
          reorder_point: 5,
        },
        {
          id: "inv-2",
          variant_id: "var-001",
          warehouse_id: "wh-chittagong",
          quantity_available: 20,
          quantity_reserved: 0,
          reorder_point: 5,
        },
      ];

      const totalAvailable = warehouses.reduce((sum, w) => sum + w.quantity_available, 0);
      const totalReserved = warehouses.reduce((sum, w) => sum + w.quantity_reserved, 0);

      expect(totalAvailable).toBe(55);
      expect(totalReserved).toBe(5);
    });
  });

  describe("Atomic Stock Reservation Logic", () => {
    function reserveStock(
      level: InventoryLevelMock,
      requestedQuantity: number
    ): {
      success: boolean;
      error?: string;
      updatedLevel?: InventoryLevelMock;
    } {
      if (requestedQuantity <= 0) {
        return { success: false, error: "Quantity must be greater than zero" };
      }

      if (level.quantity_available < requestedQuantity) {
        return {
          success: false,
          error: "INSUFFICIENT_STOCK",
        };
      }

      const updatedLevel: InventoryLevelMock = {
        ...level,
        quantity_available: level.quantity_available - requestedQuantity,
        quantity_reserved: level.quantity_reserved + requestedQuantity,
      };

      return {
        success: true,
        updatedLevel,
      };
    }

    function releaseStock(
      level: InventoryLevelMock,
      releasedQuantity: number
    ): InventoryLevelMock {
      const actualRelease = Math.min(level.quantity_reserved, releasedQuantity);
      return {
        ...level,
        quantity_available: level.quantity_available + actualRelease,
        quantity_reserved: Math.max(0, level.quantity_reserved - actualRelease),
      };
    }

    function shipStock(
      level: InventoryLevelMock,
      shippedQuantity: number
    ): InventoryLevelMock {
      return {
        ...level,
        quantity_reserved: Math.max(0, level.quantity_reserved - shippedQuantity),
      };
    }

    it("should successfully reserve stock when available stock is sufficient", () => {
      const initialLevel: InventoryLevelMock = {
        id: "inv-1",
        variant_id: "var-silk-panjabi-m",
        warehouse_id: "wh-central",
        quantity_available: 25,
        quantity_reserved: 0,
        reorder_point: 5,
      };

      const result = reserveStock(initialLevel, 3);
      expect(result.success).toBe(true);
      expect(result.updatedLevel?.quantity_available).toBe(22);
      expect(result.updatedLevel?.quantity_reserved).toBe(3);
    });

    it("should prevent stock reservation when stock is insufficient", () => {
      const initialLevel: InventoryLevelMock = {
        id: "inv-1",
        variant_id: "var-silk-panjabi-m",
        warehouse_id: "wh-central",
        quantity_available: 2, // only 2 left
        quantity_reserved: 0,
        reorder_point: 5,
      };

      const result = reserveStock(initialLevel, 5); // requested 5
      expect(result.success).toBe(false);
      expect(result.error).toBe("INSUFFICIENT_STOCK");
    });

    it("should release reserved stock back to available on order cancellation", () => {
      const reservedLevel: InventoryLevelMock = {
        id: "inv-1",
        variant_id: "var-silk-panjabi-m",
        warehouse_id: "wh-central",
        quantity_available: 22,
        quantity_reserved: 3,
        reorder_point: 5,
      };

      const restored = releaseStock(reservedLevel, 3);
      expect(restored.quantity_available).toBe(25);
      expect(restored.quantity_reserved).toBe(0);
    });

    it("should permanently deduct reserved stock when order is shipped/fulfilled", () => {
      const reservedLevel: InventoryLevelMock = {
        id: "inv-1",
        variant_id: "var-silk-panjabi-m",
        warehouse_id: "wh-central",
        quantity_available: 22,
        quantity_reserved: 3,
        reorder_point: 5,
      };

      const shipped = shipStock(reservedLevel, 3);
      expect(shipped.quantity_available).toBe(22);
      expect(shipped.quantity_reserved).toBe(0);
    });
  });

  describe("Inter-Warehouse Transfers & Conservation of Inventory", () => {
    it("should conserve total inventory units during inter-warehouse stock transfer", () => {
      const sourceWarehouse: InventoryLevelMock = {
        id: "inv-source",
        variant_id: "var-blazer-40",
        warehouse_id: "wh-dhaka",
        quantity_available: 40,
        quantity_reserved: 0,
        reorder_point: 5,
      };

      const destWarehouse: InventoryLevelMock = {
        id: "inv-dest",
        variant_id: "var-blazer-40",
        warehouse_id: "wh-chittagong",
        quantity_available: 10,
        quantity_reserved: 0,
        reorder_point: 5,
      };

      const transferQuantity = 15;
      const initialTotal = sourceWarehouse.quantity_available + destWarehouse.quantity_available;

      // Transfer execution
      const updatedSource: InventoryLevelMock = {
        ...sourceWarehouse,
        quantity_available: sourceWarehouse.quantity_available - transferQuantity,
      };

      const updatedDest: InventoryLevelMock = {
        ...destWarehouse,
        quantity_available: destWarehouse.quantity_available + transferQuantity,
      };

      const finalTotal = updatedSource.quantity_available + updatedDest.quantity_available;

      expect(updatedSource.quantity_available).toBe(25);
      expect(updatedDest.quantity_available).toBe(25);
      expect(finalTotal).toBe(initialTotal);
    });
  });

  describe("Stock Movement Audit Invariant Verification", () => {
    it("should maintain immutable movement invariant: new_quantity = previous_quantity + quantity", () => {
      interface StockMovement {
        movement_type: "RECEIVE" | "SHIP" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT";
        previous_quantity: number;
        quantity: number; // positive for IN, negative for OUT
        new_quantity: number;
      }

      const movements: StockMovement[] = [
        { movement_type: "RECEIVE", previous_quantity: 0, quantity: 50, new_quantity: 50 },
        { movement_type: "SHIP", previous_quantity: 50, quantity: -10, new_quantity: 40 },
        { movement_type: "ADJUSTMENT", previous_quantity: 40, quantity: -2, new_quantity: 38 },
        { movement_type: "TRANSFER_OUT", previous_quantity: 38, quantity: -8, new_quantity: 30 },
      ];

      for (const m of movements) {
        expect(m.previous_quantity + m.quantity).toBe(m.new_quantity);
      }
    });
  });
});
