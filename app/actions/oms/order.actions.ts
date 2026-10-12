"use server";

import { prisma } from "@/lib/prisma";
import { OrderService } from "@/lib/services/oms/order.service";
import { OrderRepository } from "@/lib/repositories/oms/order.repository";
import {
  CreateOrderInput,
  UpdateOrderStatusInput,
  updateOrderStatusSchema,
  createOrderSchema,
} from "@/lib/validations/oms";
import { revalidatePath } from "next/cache";
import { auth, getServerSession } from "@/lib/auth/server";
import { isStaffOrManager, getRoleForUser } from "@/lib/security/roles";
import { InventoryService } from "@/services/inventory.service";
import { PaymentService } from "@/services/payment/payment.service";

const orderService = new OrderService();
const orderRepo = new OrderRepository();

export async function createOrderAction(input: CreateOrderInput) {
  try {
    const validatedData = createOrderSchema.parse(input);
    const newOrder = await orderService.createOrder(validatedData);
    revalidatePath("/admin/orders");
    return { success: true, data: newOrder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatusAction(input: UpdateOrderStatusInput) {
  try {
    const validatedData = updateOrderStatusSchema.parse(input);
    const { user } = await getServerSession();

    if (!user) {
      return { success: false, error: "Unauthorized. Authentication required." };
    }

    const isStaff = await isStaffOrManager(user);
    if (!isStaff) {
      return { success: false, error: "Unauthorized. Staff privileges required." };
    }

    const role = await getRoleForUser(user);
    const userId = user?.id;

    const updatedOrder = await orderService.updateOrderStatus(
      validatedData.order_id,
      validatedData.new_status,
      userId,
      role
    );

    if (validatedData.reason) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminSupabase = await createAdminClient();
        await adminSupabase.from("order_notes").insert({
          order_id: validatedData.order_id,
          author_id: userId || null,
          note: `Status updated to ${validatedData.new_status}: ${validatedData.reason}`,
          is_customer_visible: false,
        });
      } catch (noteErr) {
        console.warn("[updateOrderStatusAction] Note recording skipped:", noteErr);
      }
    }

    // Send Order Confirmation Email
    if (validatedData.new_status === "confirmed") {
      try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminSupabase = await createAdminClient();
        const details = await orderService.getOrderDetails(validatedData.order_id, adminSupabase);
        
        const customerEmail = details?.customer?.email || (details as any)?.customer_email;
        if (details && customerEmail) {
          const { EmailProvider } = await import("@/lib/notifications/EmailProvider");
          const { EmailTemplates } = await import("@/lib/notifications/EmailTemplates");
          const storeUrl = process.env.NEXT_PUBLIC_APP_URL || "https://anchor.com.bd";
          
          await EmailProvider.send({
            to: customerEmail,
            subject: `Order Confirmed - #${details.order_number}`,
            html: EmailTemplates.orderConfirmed(details, storeUrl),
          });
        }
      } catch (emailErr) {
        console.warn("[updateOrderStatusAction] Failed to send order confirmation email:", emailErr);
      }
    }

    revalidatePath(`/admin/orders/${validatedData.order_id}`);
    revalidatePath("/admin/orders");
    return { success: true, data: updatedOrder };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrderDetailsAction(id: string) {
  try {
    const { user } = await getServerSession();
    const isStaff = await isStaffOrManager(user);

    const details = await orderService.getOrderDetails(id, null);
    if (!details) {
      return { success: false, error: "Order not found" };
    }

    // Authorization: If not staff/manager and order has a customer_id, ensure caller owns it
    if (!isStaff && details.customer_id && details.customer_id !== user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    return { success: true, data: details };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function fetchOrdersAction(params: {
  customerId?: string;
  status?: any;
  paymentMethod?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const { user } = await getServerSession();
    const isStaff = await isStaffOrManager(user);

    if (!isStaff && user) {
      params.customerId = user.id;
    }

    const orders = await orderRepo.getOrders(params, null);
    return { success: true, data: orders };
  } catch (error: any) {
    console.error("[fetchOrdersAction Error]:", error);
    return { success: false, error: error.message || "Failed to fetch orders" };
  }
}

export async function fetchOrderMetricsAction() {
  try {
    const metrics = await orderRepo.getOrderMetrics(null);
    return { success: true, data: metrics };
  } catch (error: any) {
    console.error("[fetchOrderMetricsAction Error]:", error);
    return { success: false, error: error.message || "Failed to fetch metrics" };
  }
}

export async function fetchOrdersForFulfillmentAction() {
  try {
    const orders = await orderRepo.getOrdersForFulfillment();
    return { success: true, data: orders };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelCustomerOrderAction(
  orderId: string,
  reason: string,
  note?: string
) {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch Order via Prisma to Ensure Ownership and State
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }
    
    // Check ownership if not admin (this is a customer action, so strict ownership)
    if (order.profileId !== user.id && (order as any).customerId !== user.id) {
       return { success: false, error: "Unauthorized access to order" };
    }

    // 2. State Validation
    const cancellableStatuses = ["PENDING", "PENDING_PAYMENT", "PAID", "CONFIRMED", "PROCESSING", "DRAFT"];
    const currentStatus = String(order.status).toUpperCase();
    if (!cancellableStatuses.includes(currentStatus)) {
      return {
        success: false,
        error: `Order cannot be cancelled in its current status (${order.status}).`,
      };
    }

    // 3. Fulfillment State Check (Idempotency against dispatch races)
    // Removed because shipment model does not exist in Prisma schema currently

    // 4. Update Order State
    let updatedOrder;
    try {
      updatedOrder = await prisma.order.update({
        where: { id: orderId, status: order.status },
        data: {
          status: "CANCELLED",
        }
      });
    } catch (updateError) {
      return {
        success: false,
        error: "Failed to cancel order. It may have been updated by another process.",
      };
    }

    // 5. Release Inventory (Idempotent RPC)
    try {
      const inventoryService = new InventoryService();
      await inventoryService.releaseOrderInventory(order.id);
    } catch (invError) {
      console.error(`[cancelCustomerOrderAction] Failed to release inventory for order ${order.id}`, invError);
    }

    // 6. Handle Payment/Refund State Safely & Idempotently
    let refundStatus = "none";
    try {
      // Ignore unpaid / COD checkouts that have no captured payment
      if ((order.paymentMethod || "").toUpperCase() !== "COD") {
        const transactions = await prisma.payment.findMany({
           where: { orderId: order.id, status: "COMPLETED" }
        });

        if (transactions && transactions.length > 0) {
          const capturedTxn = transactions[0];
          
          // No separate paymentRefund table in schema. We just process refund.
          const paymentService = new PaymentService();
          const refundResult = await paymentService.processRefund(user.id, {
            transactionId: capturedTxn.id,
            amount: Number(capturedTxn.amount),
            reason: `Customer cancelled order: ${reason}${note ? ` (${note})` : ""}`,
          });
          refundStatus = refundResult.status === "completed" ? "completed" : "pending";
        }
      }
    } catch (refundError) {
      console.error(`[cancelCustomerOrderAction] Failed to process refund for order ${order.id}`, refundError);
      refundStatus = "failed/pending";
    }

    // 6.5 Reverse Loyalty Points
    // try {
    //   if (order.profileId || (order as any).customerId) {
    //     const subtotal = Number(order.subtotal || 0);
    //     const pointsToReverse = Math.floor(subtotal / 100);
    //     if (pointsToReverse > 0) {
    //       const { LoyaltyService } = await import("@/services/loyalty.service");
    //       await LoyaltyService.reversePoints({
    //         userId: order.profileId || (order as any).customerId,
    //         referenceId: order.id,
    //         pointsToReverse,
    //         reason: "CANCELLED"
    //       });
    //     }
    //   }
    // } catch (loyaltyError) {
    //   console.error(`[cancelCustomerOrderAction] Failed to reverse loyalty for order ${order.id}`, loyaltyError);
    // }

    // 7. Write Order Status History (Audit Idempotency via single winner update)
    try {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: "CANCELLED",
          reason: note ? `${reason}: ${note}` : reason,
          changedBy: user.id,
        }
      });
    } catch (histErr) {
      console.error("[cancelCustomerOrderAction] Failed to write status history", histErr);
    }

    // 8. Customer Notification (Notification Idempotency via single winner update)
    try {
      await prisma.notification.create({
        data: {
          profileId: user.id,
          title: `Order ${order.orderNumber} Cancelled`,
          message: `Your order has been cancelled successfully.${
            refundStatus !== "none" ? ` Refund status: ${refundStatus}.` : ""
          }`,
          type: "ORDER",
          isRead: false,
        }
      });
    } catch (notifErr) {
      console.error("[cancelCustomerOrderAction] Failed to create notification", notifErr);
    }

    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${order.orderNumber}`);
    if (order.id) revalidatePath(`/account/orders/${order.id}`);

    return { success: true, data: updatedOrder };
  } catch (error: any) {
    console.error("[cancelCustomerOrderAction Error]:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

