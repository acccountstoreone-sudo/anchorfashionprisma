import { describe, it, expect, beforeEach } from "vitest";
import { OrderStatusService } from "@/lib/services/oms/order-status.service";
import { createOrderSchema, orderItemSchema } from "@/lib/validations/oms";
import { OrderStatus } from "@/types/oms";

describe("Order Management System (OMS)", () => {
  let statusService: OrderStatusService;

  beforeEach(() => {
    statusService = new OrderStatusService();
  });

  describe("OrderStatusService - State Machine Transitions", () => {
    it("should allow valid normal lifecycle transitions", () => {
      // Draft -> Pending Payment
      expect(statusService.canTransition("draft", "pending_payment")).toBe(true);

      // Pending Payment -> Paid
      expect(statusService.canTransition("pending_payment", "paid")).toBe(true);

      // Paid -> Confirmed
      expect(statusService.canTransition("paid", "confirmed")).toBe(true);

      // Confirmed -> Preparing
      expect(statusService.canTransition("confirmed", "preparing")).toBe(true);

      // Preparing -> Picking -> Packing -> Ready for Shipment -> Shipped
      expect(statusService.canTransition("preparing", "picking")).toBe(true);
      expect(statusService.canTransition("picking", "packing")).toBe(true);
      expect(statusService.canTransition("packing", "ready_for_shipment")).toBe(true);
      expect(statusService.canTransition("ready_for_shipment", "shipped")).toBe(true);

      // Shipped -> Delivered -> Completed
      expect(statusService.canTransition("shipped", "delivered")).toBe(true);
      expect(statusService.canTransition("delivered", "completed")).toBe(true);
    });

    it("should allow valid cancellation transitions from early stages", () => {
      expect(statusService.canTransition("draft", "cancelled")).toBe(true);
      expect(statusService.canTransition("pending_payment", "cancelled")).toBe(true);
      expect(statusService.canTransition("paid", "cancelled")).toBe(true);
      expect(statusService.canTransition("confirmed", "cancelled")).toBe(true);
      expect(statusService.canTransition("preparing", "cancelled")).toBe(true);
      expect(statusService.canTransition("picking", "cancelled")).toBe(true);
    });

    it("should reject invalid status transitions for regular users", () => {
      // Cannot skip directly from draft to shipped
      expect(statusService.canTransition("draft", "shipped")).toBe(false);

      // Cannot jump backwards from delivered to draft
      expect(statusService.canTransition("delivered", "draft")).toBe(false);

      // Cannot jump from shipped to draft
      expect(statusService.canTransition("shipped", "draft")).toBe(false);

      // Cannot cancel from ready_for_shipment without warehouse intervention
      expect(statusService.canTransition("ready_for_shipment", "cancelled")).toBe(false);
    });

    it("should treat cancelled and refunded as terminal states for regular users", () => {
      const allStatuses: OrderStatus[] = [
        "draft", "pending_payment", "paid", "confirmed", "preparing",
        "picking", "packing", "ready_for_shipment", "shipped", "delivered",
        "completed", "cancelled", "refunded"
      ];

      for (const s of allStatuses) {
        expect(statusService.canTransition("cancelled", s)).toBe(false);
        expect(statusService.canTransition("refunded", s)).toBe(false);
      }
    });

    it("should allow Admin and Manager roles to perform privileged transitions", () => {
      // Even normally disallowed transitions are permitted for administrative roles
      expect(statusService.canTransition("draft", "shipped", "admin")).toBe(true);
      expect(statusService.canTransition("draft", "shipped", "superadmin")).toBe(true);
      expect(statusService.canTransition("draft", "shipped", "manager")).toBe(true);
    });

    it("should return the exact list of allowed next states", () => {
      const allowedFromPaid = statusService.getAllowedNextStates("paid");
      expect(allowedFromPaid).toEqual(["confirmed", "cancelled", "refund_requested"]);

      const allowedFromDelivered = statusService.getAllowedNextStates("delivered");
      expect(allowedFromDelivered).toEqual(["completed", "returned", "refund_requested"]);

      const allowedFromCancelled = statusService.getAllowedNextStates("cancelled");
      expect(allowedFromCancelled).toEqual([]);
    });

    it("should handle return and refund flows", () => {
      // Delivered -> Returned -> Refund Requested -> Refund Approved -> Refunded
      expect(statusService.canTransition("delivered", "returned")).toBe(true);
      expect(statusService.canTransition("returned", "refund_requested")).toBe(true);
      expect(statusService.canTransition("refund_requested", "refund_approved")).toBe(true);
      expect(statusService.canTransition("refund_approved", "refunded")).toBe(true);
    });
  });

  describe("Order Validation Schemas", () => {
    it("should validate a correctly formatted order item", () => {
      const validItem = {
        product_id: "00000000-0000-0000-0000-000000000001",
        variant_id: "00000000-0000-0000-0000-000000000002",
        sku: "PANJABI-001-L",
        product_name: "Luxury Silk Panjabi",
        unit_price: 3500,
        quantity: 2,
        discount: 0,
        tax: 525,
        line_total: 7525,
      };

      const result = orderItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it("should reject order item with zero or negative quantity", () => {
      const invalidItem = {
        product_id: "00000000-0000-0000-0000-000000000001",
        sku: "PANJABI-001-L",
        product_name: "Luxury Silk Panjabi",
        unit_price: 3500,
        quantity: 0,
        line_total: 0,
      };

      const result = orderItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it("should require at least one item when creating an order", () => {
      const orderWithoutItems = {
        subtotal: 1000,
        tax_total: 150,
        shipping_total: 100,
        discount_total: 0,
        grand_total: 1250,
        currency: "BDT",
        items: [],
      };

      const result = createOrderSchema.safeParse(orderWithoutItems);
      expect(result.success).toBe(false);
    });

    it("should validate a complete order payload", () => {
      const completeOrder = {
        customer_id: "00000000-0000-0000-0000-000000000001",
        subtotal: 7000,
        tax_total: 1050,
        shipping_total: 100,
        discount_total: 500,
        grand_total: 7650,
        currency: "BDT",
        items: [
          {
            product_id: "00000000-0000-0000-0000-000000000001",
            sku: "SKU-001",
            product_name: "Festive Panjabi",
            unit_price: 3500,
            quantity: 2,
            discount: 500,
            tax: 1050,
            line_total: 7550,
          },
        ],
      };

      const result = createOrderSchema.safeParse(completeOrder);
      expect(result.success).toBe(true);
    });
  });
});
