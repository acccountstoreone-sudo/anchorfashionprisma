"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CourierProviderCode } from "@/types/shipping.types";
import { ShippingService } from "@/services/shipping/shipping.service";
import { OrderService } from "@/lib/services/oms/order.service";
import { revalidatePath } from "next/cache";
import { ADMIN_ROLES, MANAGER_ROLES, STAFF_ROLES } from "@/lib/constants/auth";

export async function dispatchOrderAction(
  orderId: string,
  courierCode: CourierProviderCode
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const role = String(
      user.user_metadata?.role || user.app_metadata?.role || ""
    ).toUpperCase();
    
    // Verify Staff / Manager / Admin
    const isStaffOrManager = 
      (ADMIN_ROLES as readonly string[]).includes(role) ||
      (MANAGER_ROLES as readonly string[]).includes(role) ||
      (STAFF_ROLES as readonly string[]).includes(role);

    if (!isStaffOrManager) {
      return { success: false, error: "Unauthorized. Insufficient permissions." };
    }

    const adminSupabase = await createAdminClient();
    const orderService = new OrderService();
    const shippingService = new ShippingService();

    // 1. Fetch Authoritative Order
    const orderDetails = await orderService.getOrderDetails(orderId, adminSupabase);
    if (!orderDetails) {
      return { success: false, error: "Order not found" };
    }

    // 2. Validate Order Eligibility
    const ineligibleStatuses = ["cancelled", "refunded", "returned", "failed"];
    if (ineligibleStatuses.includes(orderDetails.status.toLowerCase())) {
      return {
        success: false,
        error: `Order cannot be dispatched because its status is ${orderDetails.status}.`,
      };
    }

    // If COD, ensure it hasn't been flagged by COD fraud shield (Prompt 10)
    // The fraud check blocks order confirmation, so if status is 'draft' or 'pending', we shouldn't dispatch yet.
    if (["draft", "pending", "pending_payment"].includes(orderDetails.status.toLowerCase())) {
      if (orderDetails.payment_method === "COD") {
        return {
          success: false,
          error: "COD order has not been confirmed yet.",
        };
      } else {
         return {
          success: false,
          error: "Pre-paid order has not completed payment.",
        };
      }
    }

    // 3. Address Validation
    const shippingAddress = orderDetails.shippingAddress;
    if (!shippingAddress || !shippingAddress.address_line1 || !shippingAddress.phone || !shippingAddress.first_name) {
      return { success: false, error: "Order is missing complete shipping address, phone, or recipient name." };
    }

    // 4. Idempotency Check (Does an active shipment already exist?)
    const { data: existingShipments } = await adminSupabase
      .from("shipments")
      .select("id, status")
      .eq("order_id", orderId)
      .neq("status", "cancelled");

    if (existingShipments && existingShipments.length > 0) {
      return {
        success: false,
        error: "An active shipment already exists for this order.",
      };
    }

    // 5. COD Amount Integrity
    let codAmount = 0;
    let isCOD = false;
    
    // We strictly use the authoritative order state
    if (orderDetails.payment_method === "COD" && orderDetails.payment_status !== "paid") {
       isCOD = true;
       // The amount left to pay
       // Note: total_due might not exist on orderDetails depending on schema, so we fallback to grand_total - paid_amount if possible
       // We'll use grand_total assuming COD means full amount is due on delivery.
       codAmount = Number(orderDetails.grand_total || 0);
    }

    // 6. Create Shipment
    const recipientName = `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim();
    
    const shipmentInput = {
      orderId: orderId,
      courierProviderCode: courierCode,
      recipientName: recipientName,
      recipientPhone: shippingAddress.phone,
      recipientAddress: shippingAddress.address_line1 + (shippingAddress.address_line2 ? `, ${shippingAddress.address_line2}` : ""),
      recipientCity: shippingAddress.city || undefined,
      recipientDistrict: shippingAddress.state || undefined,
      isCOD: isCOD,
      codAmount: codAmount,
      items: (orderDetails.items || []).map((item: any) => ({
        orderItemId: item.id,
        sku: item.sku,
        productName: item.product_name,
        variantName: item.variant_name || undefined,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
      })),
    };

    const newShipment = await shippingService.createShipment(shipmentInput, user.id);

    // 7. Assign Courier & Trigger API
    const assignedShipment = await shippingService.assignCourier(newShipment.id, courierCode, user.id, true);

    // 8. Update Order Fulfillment State
    await orderService.updateOrderStatus(orderId, "ready_for_shipment", user.id, role);

    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: assignedShipment };

  } catch (error: any) {
    console.error("[dispatchOrderAction Error]:", error);
    return { success: false, error: error.message || "Failed to dispatch order" };
  }
}
