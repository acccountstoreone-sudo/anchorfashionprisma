import { OrderRepository } from "@/lib/repositories/oms/order.repository";
import { OrderItemsRepository } from "@/lib/repositories/oms/order-items.repository";
import { OrderStatusService } from "./order-status.service";
import { Order, OrderStatus, OrderItem } from "@/types/oms";
import { CreateOrderInput } from "@/lib/validations/oms";

export class OrderService {
  private orderRepo = new OrderRepository();
  private orderItemsRepo = new OrderItemsRepository();
  private statusService = new OrderStatusService();

  async createOrder(data: CreateOrderInput): Promise<Order> {
    // Generate a secure, sequential order number in a real app,
    // for now using a timestamp-based mock
    const orderNumber = `ORD-${Date.now()}`;

    const orderData: Partial<Order> = {
      order_number: orderNumber,
      customer_id: data.customer_id || null,
      status: "draft", // Initial state
      subtotal: data.subtotal,
      tax_total: data.tax_total,
      shipping_total: data.shipping_total,
      discount_total: data.discount_total,
      grand_total: data.grand_total,
      currency: data.currency,
      shipping_address_id: data.shipping_address_id || null,
      billing_address_id: data.billing_address_id || null,
      payment_intent_id: data.payment_intent_id || null,
    };

    const newOrder = await this.orderRepo.createOrder(orderData as any);

    const itemsToInsert = data.items.map((item) => ({
      order_id: newOrder.id,
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      sku: item.sku,
      product_name: item.product_name,
      variant_name: item.variant_name || null,
      unit_price: item.unit_price,
      quantity: item.quantity,
      discount: item.discount,
      tax: item.tax,
      line_total: item.line_total,
      inventory_reserved: false,
      allocated_warehouse_id: null,
    }));

    await this.orderItemsRepo.createOrderItems(itemsToInsert);
    return newOrder;
  }

  async updateOrderStatus(
    id: string,
    newStatus: OrderStatus,
    updatedBy?: string,
    role?: string
  ): Promise<Order> {
    const order = await this.orderRepo.getOrderById(id);
    if (!order) {
      throw new Error("Order not found");
    }

    if (!this.statusService.canTransition(order.status, newStatus, role)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${newStatus}`
      );
    }

    const updated = await this.orderRepo.updateOrderStatus(id, newStatus, updatedBy);

    // Check for referral qualification and loyalty points
    const lowerStatus = newStatus.toLowerCase();
    if (lowerStatus === "delivered" || lowerStatus === "completed") {
      try {
        const { ReferralService } = await import("@/services/referral.service");
        await ReferralService.qualifyReferral(id);

        // Earn loyalty points
        if (order.customer_id) {
          const subtotal = Number(order.subtotal || 0);
          if (subtotal >= 1000) {
            const pointsToEarn = Math.floor(subtotal / 100);
            const { LoyaltyService } = await import("@/services/loyalty.service");
            await LoyaltyService.earnPoints({
              userId: order.customer_id,
              points: pointsToEarn,
              referenceId: order.id,
              referenceType: "ORDER",
              description: `Earned from Order ${order.order_number}`
            });
          }
        }
      } catch (err) {
        console.error(`[OrderService] Failed to qualify referral or earn loyalty for order ${id}:`, err);
      }
    } else if (lowerStatus === "cancelled" || lowerStatus === "refunded" || lowerStatus === "returned") {
      try {
        // Reverse loyalty points
        if (order.customer_id) {
          const subtotal = Number(order.subtotal || 0);
          const pointsToReverse = Math.floor(subtotal / 100);
          if (pointsToReverse > 0) {
            const { LoyaltyService } = await import("@/services/loyalty.service");
            await LoyaltyService.reversePoints({
              userId: order.customer_id,
              referenceId: order.id,
              pointsToReverse,
              reason: `Order ${newStatus.toUpperCase()}`
            });
          }
        }
      } catch (err) {
        console.error(`[OrderService] Failed to reverse loyalty for order ${id}:`, err);
      }
    } else if (lowerStatus === "confirmed") {
      try {
        const { AlphaSmsService } = await import("@/lib/services/sms/alpha-sms.service");
        AlphaSmsService.triggerOrderConfirmationSmsAsync(id);
      } catch (smsErr) {
        console.error(`[OrderService] Failed to trigger SMS for order ${id}:`, smsErr);
      }
    }

    return updated;
  }

  async getOrderDetails(id: string, supabaseClient?: any) {
    const order = await this.orderRepo.getOrderById(id, supabaseClient);
    if (!order) return null;

    const items = await this.orderItemsRepo.getOrderItems(order.id, supabaseClient);

    // Fetch customer profile details if customer_id exists
    let customer = null;
    if (order.customer_id) {
      try {
        const supabase = supabaseClient || (await import("@/lib/supabase/server").then(m => m.createClient()));
        
        // 1. Fetch from customer_profiles (contains id, first_name, last_name, email, phone)
        const { data: cProfile } = await supabase
          .from("customer_profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("id", order.customer_id)
          .maybeSingle();

        // 2. Fetch from profiles (fallback)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, phone, avatar_url")
          .eq("id", order.customer_id)
          .maybeSingle();

        // 3. Fetch tier from crm_customer_profiles
        const { data: crmProfile } = await supabase
          .from("crm_customer_profiles")
          .select("customer_tier")
          .eq("profile_id", order.customer_id)
          .maybeSingle();

        // 4. If email is still missing, try auth admin client
        let customerEmail = cProfile?.email || null;
        if (!customerEmail) {
          try {
            const { createAdminClient } = await import("@/lib/supabase/server");
            const adminSupabase = await createAdminClient();
            const { data: authUser } = await adminSupabase.auth.admin.getUserById(order.customer_id);
            if (authUser?.user?.email) {
              customerEmail = authUser.user.email;
            }
          } catch {
            // Admin auth not accessible in this context
          }
        }

        const firstName = cProfile?.first_name || profile?.first_name || null;
        const lastName = cProfile?.last_name || profile?.last_name || null;
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || (customerEmail ? customerEmail.split("@")[0] : "Registered Customer");
        const phone = cProfile?.phone || profile?.phone || null;

        if (cProfile || profile || customerEmail) {
          customer = {
            id: order.customer_id,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            phone: phone,
            email: customerEmail,
            tier: crmProfile?.customer_tier || "Standard",
          };
        }
      } catch (err) {
        console.error("Error fetching order customer profile:", err);
      }
    }

    // Fetch shipping & billing addresses
    let shippingAddress = null;
    let billingAddress = null;
    try {
      const supabase = supabaseClient || (await import("@/lib/supabase/server").then(m => m.createClient()));
      
      // 1. Try order_addresses
      const { data: orderAddrs } = await supabase
        .from("order_addresses")
        .select("*")
        .eq("order_id", id);

      if (orderAddrs && orderAddrs.length > 0) {
        shippingAddress = orderAddrs.find((a: any) => a.address_type === "SHIPPING") || orderAddrs[0];
        billingAddress = orderAddrs.find((a: any) => a.address_type === "BILLING") || shippingAddress;
      }

      // 2. Fallback to addresses table
      if (!shippingAddress && order.shipping_address_id) {
        const { data: addr } = await supabase
          .from("addresses")
          .select("*")
          .eq("id", order.shipping_address_id)
          .maybeSingle();
        if (addr) shippingAddress = addr;
      }

      if (!billingAddress && order.billing_address_id) {
        const { data: addr } = await supabase
          .from("addresses")
          .select("*")
          .eq("id", order.billing_address_id)
          .maybeSingle();
        if (addr) billingAddress = addr;
      }
    } catch (err) {
      console.error("Error fetching order addresses:", err);
    }

    // Fetch manual payment transaction if available
    let manualPayment = null;
    try {
      const supabase = supabaseClient || (await import("@/lib/supabase/server").then(m => m.createClient()));
      const { data: tx } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      manualPayment = tx;
    } catch (err) {
      console.error("Error fetching manual payment transaction:", err);
    }

    return {
      ...order,
      items,
      customer,
      shippingAddress,
      billingAddress,
      manualPayment,
    };
  }
}
