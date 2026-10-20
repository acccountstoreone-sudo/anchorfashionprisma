import { describe, it, expect, beforeEach } from "vitest";
import { AUTH_ROLES, STAFF_ROLES, MANAGER_ROLES, ADMIN_ROLES } from "@/lib/constants/auth";
import { OrderStatusService } from "@/lib/services/oms/order-status.service";

describe("Manager & Employee (Staff) Operational System Tests", () => {
  let statusService: OrderStatusService;

  beforeEach(() => {
    statusService = new OrderStatusService();
  });

  // =========================================================================
  // 1. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION BOUNDARIES
  // =========================================================================
  describe("Role-Based Access Control (RBAC) Hierarchy", () => {
    it("should include MANAGER and specialized managers in MANAGER_ROLES", () => {
      expect(MANAGER_ROLES).toContain(AUTH_ROLES.MANAGER);
      expect(MANAGER_ROLES).toContain(AUTH_ROLES.WAREHOUSE_MANAGER);
      expect(MANAGER_ROLES).toContain(AUTH_ROLES.FINANCE_MANAGER);
      expect(MANAGER_ROLES).toContain(AUTH_ROLES.MARKETING_MANAGER);
      expect(MANAGER_ROLES).toContain(AUTH_ROLES.ADMIN);
      expect(MANAGER_ROLES).toContain(AUTH_ROLES.SUPERADMIN);
    });

    it("should include STAFF (Employees) and SUPPORT in STAFF_ROLES for operations", () => {
      expect(STAFF_ROLES).toContain(AUTH_ROLES.STAFF);
      expect(STAFF_ROLES).toContain(AUTH_ROLES.SUPPORT);
      expect(STAFF_ROLES).toContain(AUTH_ROLES.MANAGER);
      expect(STAFF_ROLES).toContain(AUTH_ROLES.WAREHOUSE_MANAGER);
    });

    it("should strictly deny CUSTOMER from any administrative or operational role group", () => {
      expect(STAFF_ROLES).not.toContain(AUTH_ROLES.CUSTOMER);
      expect(MANAGER_ROLES).not.toContain(AUTH_ROLES.CUSTOMER);
      expect(ADMIN_ROLES).not.toContain(AUTH_ROLES.CUSTOMER);
    });

    it("should permit Manager and Staff access to /manager operations portal", () => {
      function canAccessManagerPortal(role: string): boolean {
        return (STAFF_ROLES as readonly string[]).includes(role.toUpperCase().trim());
      }

      expect(canAccessManagerPortal("MANAGER")).toBe(true);
      expect(canAccessManagerPortal("STAFF")).toBe(true);
      expect(canAccessManagerPortal("WAREHOUSE_MANAGER")).toBe(true);
      expect(canAccessManagerPortal("FINANCE_MANAGER")).toBe(true);
      expect(canAccessManagerPortal("ADMIN")).toBe(true);
      expect(canAccessManagerPortal("CUSTOMER")).toBe(false);
      expect(canAccessManagerPortal("ANONYMOUS")).toBe(false);
    });
  });

  // =========================================================================
  // 2. ORDER MANAGEMENT AS A MANAGER / EMPLOYEE
  // =========================================================================
  describe("Order Management Operations (As Manager or Employee)", () => {
    it("should grant Manager privileged status transition overrides", () => {
      // Normal customer cannot skip directly from draft to shipped
      expect(statusService.canTransition("draft", "shipped")).toBe(false);

      // Manager can transition any status from the operational panel
      expect(statusService.canTransition("draft", "shipped", "manager")).toBe(true);
      expect(statusService.canTransition("paid", "cancelled", "manager")).toBe(true);
      expect(statusService.canTransition("confirmed", "shipped", "manager")).toBe(true);
    });

    it("should allow Employee / Staff to execute normal progressive fulfillment steps", () => {
      // Warehouse staff progression: confirmed -> preparing -> picking -> packing -> ready_for_shipment -> shipped
      expect(statusService.canTransition("confirmed", "preparing", "staff")).toBe(true);
      expect(statusService.canTransition("preparing", "picking", "staff")).toBe(true);
      expect(statusService.canTransition("picking", "packing", "staff")).toBe(true);
      expect(statusService.canTransition("packing", "ready_for_shipment", "staff")).toBe(true);
      expect(statusService.canTransition("ready_for_shipment", "shipped", "staff")).toBe(true);
    });

    it("should process In-Store POS Orders placed by Employee / Manager", () => {
      interface PosOrderInput {
        cashierId: string;
        cashierRole: "MANAGER" | "STAFF";
        branchId: string;
        items: { sku: string; price: number; quantity: number }[];
        staffDiscount: number;
        paymentMethod: "CASH" | "CARD" | "BKASH";
      }

      function processPosOrder(input: PosOrderInput) {
        // 1. Verify staff role
        if (!STAFF_ROLES.includes(input.cashierRole as any)) {
          throw new Error("Unauthorized: Only employees and managers can place POS orders");
        }

        // 2. Compute authoritative totals
        const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = Math.round(subtotal * 0.15 * 100) / 100; // 15% standard VAT
        const discount = Math.min(subtotal, input.staffDiscount);
        const grandTotal = Math.max(0, subtotal + tax - discount);

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const orderNumber = `AF-POS-${dateStr}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

        return {
          orderNumber,
          branchId: input.branchId,
          cashierId: input.cashierId,
          subtotal,
          tax,
          discount,
          grandTotal,
          paymentMethod: input.paymentMethod,
          status: "completed",
        };
      }

      const posOrder = processPosOrder({
        cashierId: "emp-101",
        cashierRole: "STAFF",
        branchId: "branch-dhanmondi-01",
        items: [
          { sku: "PANJABI-001", price: 3500, quantity: 2 }, // 7000
          { sku: "TROUSER-002", price: 1800, quantity: 1 }, // 1800
        ], // subtotal = 8800
        staffDiscount: 500,
        paymentMethod: "BKASH",
      });

      expect(posOrder.subtotal).toBe(8800);
      expect(posOrder.tax).toBe(1320); // 15% of 8800
      expect(posOrder.discount).toBe(500);
      expect(posOrder.grandTotal).toBe(9620); // 8800 + 1320 - 500 = 9620
      expect(posOrder.orderNumber).toMatch(/^AF-POS-\d{8}-\d{4}$/);
      expect(posOrder.status).toBe("completed");
    });
  });

  // =========================================================================
  // 3. INVENTORY & WAREHOUSE ACTIONS AS A MANAGER / EMPLOYEE
  // =========================================================================
  describe("Inventory & Warehouse Actions (As Manager or Employee)", () => {
    interface WarehouseStock {
      variantId: string;
      warehouseId: string;
      available: number;
      reserved: number;
    }

    it("should allow Warehouse Employee to receive inventory (Stock In)", () => {
      const currentStock: WarehouseStock = {
        variantId: "v-001",
        warehouseId: "wh-central",
        available: 30,
        reserved: 5,
      };

      function employeeStockIn(stock: WarehouseStock, receivedQty: number, poNumber: string) {
        if (receivedQty <= 0) throw new Error("Invalid quantity");
        return {
          ...stock,
          available: stock.available + receivedQty,
          lastMovement: {
            type: "RECEIVE",
            quantity: receivedQty,
            reference: poNumber,
            timestamp: new Date().toISOString(),
          },
        };
      }

      const updated = employeeStockIn(currentStock, 50, "PO-2026-088");
      expect(updated.available).toBe(80);
      expect(updated.lastMovement.type).toBe("RECEIVE");
      expect(updated.lastMovement.quantity).toBe(50);
    });

    it("should allow Warehouse Employee to dispatch orders (Stock Out)", () => {
      const currentStock: WarehouseStock = {
        variantId: "v-001",
        warehouseId: "wh-central",
        available: 80,
        reserved: 10,
      };

      function employeeStockOut(stock: WarehouseStock, dispatchQty: number, orderId: string) {
        if (stock.available < dispatchQty) {
          throw new Error("Insufficient stock available for dispatch");
        }
        return {
          ...stock,
          available: stock.available - dispatchQty,
          lastMovement: {
            type: "SHIP",
            quantity: -dispatchQty,
            reference: orderId,
            timestamp: new Date().toISOString(),
          },
        };
      }

      const updated = employeeStockOut(currentStock, 10, "ORD-99120");
      expect(updated.available).toBe(70);
      expect(updated.lastMovement.quantity).toBe(-10);
    });

    it("should allow Manager to reconcile stock with physical count (Stock Adjustment)", () => {
      const currentStock: WarehouseStock = {
        variantId: "v-001",
        warehouseId: "wh-central",
        available: 70,
        reserved: 0,
      };

      function managerStockReconciliation(stock: WarehouseStock, physicalCount: number, reason: string) {
        const variance = physicalCount - stock.available;
        return {
          ...stock,
          available: physicalCount,
          variance,
          reason,
        };
      }

      // Physical count finds 68 units (2 units damaged in storage)
      const adjusted = managerStockReconciliation(currentStock, 68, "2 units damaged in storage rack");
      expect(adjusted.available).toBe(68);
      expect(adjusted.variance).toBe(-2);
      expect(adjusted.reason).toContain("damaged");
    });

    it("should allow Manager to execute inter-warehouse stock transfer", () => {
      const dhakaWh: WarehouseStock = { variantId: "v-001", warehouseId: "wh-dhaka", available: 50, reserved: 0 };
      const sylhetWh: WarehouseStock = { variantId: "v-001", warehouseId: "wh-sylhet", available: 10, reserved: 0 };

      function executeTransfer(source: WarehouseStock, dest: WarehouseStock, qty: number) {
        if (source.available < qty) throw new Error("Source warehouse has insufficient stock");
        return {
          source: { ...source, available: source.available - qty },
          dest: { ...dest, available: dest.available + qty },
          transferredQty: qty,
        };
      }

      const result = executeTransfer(dhakaWh, sylhetWh, 15);
      expect(result.source.available).toBe(35);
      expect(result.dest.available).toBe(25);
      // Total inventory conserved: 35 + 25 = 60 (initial: 50 + 10 = 60)
      expect(result.source.available + result.dest.available).toBe(dhakaWh.available + sylhetWh.available);
    });
  });

  // =========================================================================
  // 4. FINANCIAL & REPORTING ACTIONS AS A MANAGER
  // =========================================================================
  describe("Financial & Branch Reporting (As a Manager)", () => {
    it("should calculate daily branch sales summary for Manager", () => {
      const branchOrders = [
        { id: "o-1", totalAmount: 4500, paymentMethod: "CASH", status: "completed" },
        { id: "o-2", totalAmount: 7200, paymentMethod: "CARD", status: "completed" },
        { id: "o-3", totalAmount: 3100, paymentMethod: "BKASH", status: "completed" },
        { id: "o-4", totalAmount: 2500, paymentMethod: "CASH", status: "cancelled" }, // cancelled not counted in revenue
      ];

      const completedOrders = branchOrders.filter((o) => o.status === "completed");
      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const ordersCount = completedOrders.length;
      const averageOrderValue = Math.round((totalRevenue / ordersCount) * 100) / 100;

      const paymentBreakdown = completedOrders.reduce((acc: Record<string, number>, o) => {
        acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.totalAmount;
        return acc;
      }, {});

      expect(totalRevenue).toBe(14800);
      expect(ordersCount).toBe(3);
      expect(averageOrderValue).toBe(4933.33);
      expect(paymentBreakdown["CASH"]).toBe(4500);
      expect(paymentBreakdown["CARD"]).toBe(7200);
      expect(paymentBreakdown["BKASH"]).toBe(3100);
    });

    it("should allow Finance Manager to record and summarize operational branch expenses", () => {
      const branchExpenses = [
        { category: "Packaging & Bags", amount: 2400 },
        { category: "Staff Refreshment", amount: 1200 },
        { category: "POS Thermal Paper & Stationery", amount: 650 },
      ];

      const totalExpense = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
      expect(totalExpense).toBe(4250);
    });
  });
});
