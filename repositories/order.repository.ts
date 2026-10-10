import { createClient } from "@/lib/supabase/server-client";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  Order,
  OrderAddress,
  OrderItem,
  OrderStatusHistory,
} from "@/types/checkout.types";

export class OrderRepository {
  /**
   * Get order by ID
   */
  async getOrderById(id: string): Promise<Order | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        items:order_items(*),
        status_history:order_status_history(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("Error fetching order:", error);
      throw new Error("Failed to fetch order");
    }

    if (data) {
      const { data: addresses } = await supabase
        .from("order_addresses")
        .select("*")
        .eq("order_id", id);

      data.addresses = addresses || [];
      data.shipping_address = addresses?.find(
        (a: any) => a.address_type === "SHIPPING"
      );
      data.billing_address = addresses?.find(
        (a: any) => a.address_type === "BILLING"
      );
    }

    return data as Order;
  }

  /**
   * Get orders by User ID
   */
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user orders:", error);
      throw new Error("Failed to fetch user orders");
    }

    return data as Order[];
  }

  /**
   * Create order and associated data
   * We do this sequentially as Supabase JS doesn't support generic transactions yet without an RPC
   */
  async createOrder(
    orderData: Partial<Order>,
    items: Partial<OrderItem>[],
    shippingAddress?: Partial<OrderAddress>,
    billingAddress?: Partial<OrderAddress>
  ): Promise<Order> {
    const supabase = createAdminClient();

    const customerId = orderData.user_id ?? (orderData as any).customer_id ?? null;
    const customerNote = orderData.notes;

    const payload: any = {
      ...orderData,
      customer_id: customerId,
      grand_total: orderData.total_amount ?? orderData.grand_total ?? 0,
      shipping_total: orderData.shipping_fee ?? orderData.shipping_total ?? 0,
      discount_total: orderData.discount_amount ?? orderData.discount_total ?? 0,
    };
    delete payload.user_id;
    delete payload.session_id;
    delete payload.notes;
    delete payload.total_amount;
    delete payload.shipping_fee;
    delete payload.discount_amount;
    delete payload.items;
    delete payload.shipping_address;
    delete payload.billing_address;

    // 1. Create Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(payload)
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    if (customerNote && customerNote.trim() && order?.id) {
      try {
        await supabase.from("order_notes").insert({
          order_id: order.id,
          author_id: customerId,
          note: customerNote.trim(),
          is_customer_visible: true,
        });
      } catch (err) {
        console.error("Error saving order note:", err);
      }
    }

    // 2. Create Order Items
    const itemsWithOrderId = items.map((item: any) => {
      const lineTotal = Number(
        item.line_total ??
          item.total_price ??
          Number(item.quantity || 1) * Number(item.unit_price || 0)
      );

      const sanitized: Record<string, any> = {
        order_id: order.id,
        product_id: item.product_id || null,
        variant_id: item.variant_id || null,
        sku: item.sku || "N/A",
        product_name: item.product_name || "Product",
        variant_name: item.variant_name || null,
        unit_price: Number(item.unit_price) || 0,
        quantity: Number(item.quantity) || 1,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        line_total: lineTotal,
        inventory_reserved: Boolean(item.inventory_reserved ?? false),
      };

      if (item.allocated_warehouse_id) {
        sanitized.allocated_warehouse_id = item.allocated_warehouse_id;
      }

      return sanitized;
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      throw new Error(`Failed to create order items: ${itemsError.message}`);
    }

    // 3. Create Addresses
    if (shippingAddress) {
      const { error: shipErr } = await supabase
        .from("order_addresses")
        .insert({
          ...shippingAddress,
          order_id: order.id,
          address_type: "SHIPPING",
        });
      if (shipErr) {
        console.error("Error creating shipping address:", shipErr);
      }
    }

    if (billingAddress) {
      const { error: billErr } = await supabase
        .from("order_addresses")
        .insert({
          ...billingAddress,
          order_id: order.id,
          address_type: "BILLING",
        });
      if (billErr) {
        console.error("Error creating billing address:", billErr);
      }
    }

    // 4. Create Initial Status History
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: order.status,
      notes: "Order placed",
      created_by: order.user_id || null,
    });

    return this.getOrderById(order.id) as Promise<Order>;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    id: string,
    status: string,
    notes?: string,
    adminId?: string
  ): Promise<void> {
    let supabase = await createClient();

    let { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (
      error &&
      (error.code === "42501" ||
        error.message?.includes("permission denied") ||
        error.message?.includes("users"))
    ) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminClient = await createAdminClient();
        const retry = await adminClient
          .from("orders")
          .update({ status })
          .eq("id", id);
        if (!retry.error) {
          error = null;
          supabase = adminClient;
        }
      } catch (retryErr) {
        console.warn("[updateOrderStatus] Admin client fallback error:", retryErr);
      }
    }

    if (error) {
      console.error("Error updating order status:", error);
      throw new Error("Failed to update order status");
    }

    // Add history record
    try {
      await supabase.from("order_status_history").insert({
        order_id: id,
        status,
        notes: notes || null,
        created_by: adminId || null,
      });
    } catch (histErr) {
      console.warn("[updateOrderStatus] History insert skipped:", histErr);
    }
  }

  /**
   * Track Coupon Usage
   */
  async recordCouponUsage(
    couponId: string,
    orderId: string,
    discountApplied: number,
    userId?: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("coupon_usages").insert({
      coupon_id: couponId,
      order_id: orderId,
      discount_applied: discountApplied,
      user_id: userId || null,
    });

    if (error) {
      console.error("Error recording coupon usage:", error);
      // Non-critical, won't throw
    }
  }

  /**
   * Get orders for fulfillment board
   */
  async getOrdersForFulfillment(): Promise<Order[]> {
    const { createAdminClient } = await import("@/lib/supabase/admin-client");
    const supabase = createAdminClient();
    
    // We fetch orders that are paid or preparing or picking or packing or ready_for_shipment
    const validStatuses = ["paid", "preparing", "picking", "packing", "ready_for_shipment"];
    
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        items:order_items(*)
      `)
      .in("status", validStatuses)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching orders for fulfillment:", error);
      throw new Error("Failed to fetch orders for fulfillment");
    }

    if (data && data.length > 0) {
      const orderIds = data.map((o: any) => o.id);
      const { data: addresses } = await supabase
        .from("order_addresses")
        .select("*")
        .in("order_id", orderIds);

      for (const order of data) {
        order.addresses = addresses?.filter((a: any) => a.order_id === order.id) || [];
      }
    }

    return data as Order[];
  }
}
