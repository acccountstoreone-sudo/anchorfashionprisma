import { OrderStatus, Order } from "@/types/oms";

// Define valid transitions as a state machine
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["payment_processing", "paid", "cancelled", "failed"],
  payment_processing: ["paid", "failed", "cancelled"],
  paid: ["confirmed", "cancelled", "refund_requested"],
  confirmed: ["preparing", "cancelled", "refund_requested"],
  preparing: ["picking", "cancelled"],
  picking: ["packing", "cancelled"],
  packing: ["ready_for_shipment"],
  ready_for_shipment: ["shipped"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered", "failed"],
  delivered: ["completed", "returned", "refund_requested"],
  completed: ["returned"],
  cancelled: [], // Terminal state
  refund_requested: ["refund_approved", "cancelled"], // Can cancel request
  refund_approved: ["refunded"],
  refunded: [], // Terminal
  returned: ["refund_requested"],
  failed: ["cancelled", "pending_payment"], // e.g. retry payment
};

export class OrderStatusService {
  /**
   * Validates if a transition from currentStatus to newStatus is allowed.
   */
  canTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    role?: string
  ): boolean {
    // Super Admin, Admin, and Manager can transition status from management panels
    const normalizedRole = (role || "").toLowerCase();
    if (
      normalizedRole === "super_admin" ||
      normalizedRole === "superadmin" ||
      normalizedRole === "admin" ||
      normalizedRole.includes("admin") ||
      normalizedRole === "manager"
    ) {
      return true;
    }

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed) return false;

    return allowed.includes(newStatus);
  }

  /**
   * Retrieves the allowed next states for a given status.
   */
  getAllowedNextStates(currentStatus: OrderStatus): OrderStatus[] {
    return VALID_TRANSITIONS[currentStatus] || [];
  }
}
