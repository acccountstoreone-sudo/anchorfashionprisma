import { OrderRepository } from "@/repositories/order.repository";
import { CartService } from "./cart.service";
import { CheckoutService } from "./checkout.service";
import { InventoryService, InventoryError, ReservationItem } from "./inventory.service";
import { WarehouseService } from "./warehouse.service";
import { CouponService } from "./coupon.service";
import { FlashSaleService } from "@/lib/services/marketing/flash-sale.service";
import {
  Order,
  OrderAddress,
  OrderItem,
  PaymentPayload,
} from "@/types/checkout.types";
import { createAdminClient } from "@/lib/supabase/admin-client";

// 15-minute window before an unpaid reservation expires.
// The cron route at /api/cron/release-expired-reservations uses this.
const RESERVATION_TTL_MINUTES = 15;

export class OrderService {
  private orderRepository: OrderRepository;
  private cartService: CartService;
  private checkoutService: CheckoutService;
  private inventoryService: InventoryService;
  private warehouseService: WarehouseService;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.cartService = new CartService();
    this.checkoutService = new CheckoutService();
    this.inventoryService = new InventoryService();
    this.warehouseService = new WarehouseService();
  }

  /**
   * Generate an order number.
   */
  private generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `AF-${date}-${random}`;
  }

  /**
   * Place an order with atomic inventory reservation.
   *
   * Sequence:
   *   1. Validate session + cart
   *   2. Compute totals server-side (client prices are NOT trusted)
   *   3. Create order row (status = pending_payment, reservation_expires_at set)
   *   4. Call reserve_order_inventory RPC — atomic, all-or-nothing
   *      → If ANY item is out of stock: order is immediately cancelled, error returned
   *      → If ALL items reserved: return order to caller
   *   5. Clear cart + delete session
   *
   * Idempotency:
   *   idempotency_key = "order-<sessionId>" stored in the orders table with a
   *   UNIQUE constraint. A double-click or retry will hit the constraint and
   *   Supabase will return a conflict error, preventing duplicate orders.
   */
  async placeOrder(sessionId: string, userId?: string): Promise<Order> {
    const session = await this.checkoutService.getSession(sessionId);
    if (!session) throw new Error("Invalid session");
    if (
      !session.shipping_address_snapshot ||
      !session.billing_address_snapshot ||
      !session.payment_method
    ) {
      throw new Error("Incomplete checkout session");
    }

    const cart = await this.cartService.getCart(session.cart_id);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error("Cart is empty or not found");
    }

    // ── 1. Compute totals server-side ─────────────────────────────────────
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];
    const reservationItems: ReservationItem[] = [];
    const flashSalesToConsume: { id: string; quantity: number }[] = [];

    const defaultWarehouse = await this.warehouseService.getDefaultWarehouse();
    const fallbackWarehouseId =
      defaultWarehouse?.id || "85bf6ad1-be55-47b2-ab31-07b05c43bcfc";
    const supabase = createAdminClient();

    for (const item of cart.items) {
      if (!item.product) continue;

      // Server-side price resolution — client-provided prices are ignored.
      let price =
        item.variant?.sale_price ||
        item.variant?.price ||
        item.product.sale_price ||
        item.product.price ||
        0;

      const flashSale = await FlashSaleService.getFlashSaleForProduct(item.product_id);
      if (flashSale) {
        price = flashSale.flash_price;
        flashSalesToConsume.push({ id: flashSale.id, quantity: item.quantity });
      }

      const itemTotal = price * item.quantity;

      subtotal += itemTotal;

      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: price,
        line_total: itemTotal,
        product_name: (item.product as any)?.name || item.product?.title || "Product",
        sku: item.variant?.sku || item.product?.sku || "N/A",
      });

      // Build reservation payload for the RPC.
      // variant_id falls back to product_id for simple (non-variant) products.
      const variantId = item.variant_id || item.product_id;
      if (variantId) {
        let itemWarehouseId = fallbackWarehouseId;
        try {
          const { data: level } = await supabase
            .from("inventory_levels")
            .select("warehouse_id, quantity_available")
            .eq("variant_id", variantId)
            .gte("quantity_available", item.quantity)
            .order("quantity_available", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (level?.warehouse_id) {
            itemWarehouseId = level.warehouse_id;
          } else {
            const { data: anyLevel } = await supabase
              .from("inventory_levels")
              .select("warehouse_id, quantity_available")
              .eq("variant_id", variantId)
              .order("quantity_available", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (anyLevel?.warehouse_id) {
              itemWarehouseId = anyLevel.warehouse_id;
            }
          }
        } catch (_) {}

        reservationItems.push({
          variant_id: variantId,
          warehouse_id: itemWarehouseId,
          quantity: item.quantity,
        });
      }
    }

    if (reservationItems.length === 0) {
      throw new Error("No reservable items found in cart");
    }

    const shippingFee =
      session.shipping_method === "home_delivery_outside" ? 150 : 100;
      
    let discountAmount = 0;
    let couponId: string | null = null;

    if (session.coupon_code) {
      const validation = await CouponService.validateAndCalculateDiscount(
        session.coupon_code,
        subtotal,
        userId
      );
      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid coupon");
      }
      discountAmount = validation.discount;
      couponId = validation.coupon?.id || null;
    }

    const taxAmount = subtotal * 0.15;
    const totalAmount = Math.max(0, subtotal + shippingFee + taxAmount - discountAmount);

    const orderNumber = this.generateOrderNumber();
    const idempotencyKey = `order-${sessionId}`;

    const reservationExpiresAt = new Date(
      Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
    ).toISOString();

    const orderData: Partial<Order> = {
      user_id: userId,
      session_id: sessionId,
      order_number: orderNumber,
      status: "PENDING_PAYMENT",
      idempotency_key: idempotencyKey,
      subtotal,
      shipping_fee: shippingFee,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      coupon_id: couponId,
      payment_method: session.payment_method,
      risk_level: "LOW",
      reservation_expires_at: reservationExpiresAt,
    } as Partial<Order>;

    const shippingAddress: Partial<OrderAddress> = {
      ...session.shipping_address_snapshot,
      address_type: "SHIPPING",
    };

    const billingAddress: Partial<OrderAddress> = {
      ...session.billing_address_snapshot,
      address_type: "BILLING",
    };

    // ── 2. Create order row ────────────────────────────────────────────────
    // Order is created BEFORE reservation so we have an order_id to pass to
    // the RPC, and a safe cancellation target if reservation fails.
    const order = await this.orderRepository.createOrder(
      orderData,
      orderItems,
      shippingAddress,
      billingAddress
    );

    // ── 3. Atomic inventory reservation ───────────────────────────────────
    // Single PostgreSQL RPC call — uses SELECT FOR UPDATE + all-or-nothing
    // transaction. If this fails, NO stock is modified.
    try {
      await this.inventoryService.reserveOrderInventory(
        order.id,
        reservationItems
      );
    } catch (err) {
      // Reservation failed. Mark the order cancelled immediately so the DB
      // state is consistent. Stock was never modified (RPC rolled back).
      try {
        const supabase = createAdminClient();
        await supabase
          .from("orders")
          .update({ status: "CANCELLED" })
          .eq("id", order.id);
      } catch (cancelErr) {
        console.error(
          `[OrderService] Failed to cancel order ${order.id} after reservation failure:`,
          cancelErr
        );
      }

      if (err instanceof InventoryError) {
        throw err; // propagate typed error to the action layer
      }
      throw new InventoryError(
        "RESERVATION_FAILED",
        "Failed to reserve inventory. Items may have just sold out."
      );
    }

    // ── 3.5 Atomic Flash Sale Consumption ───────────────────────────────────
    const consumedFlashSales: { id: string; quantity: number }[] = [];
    for (const fs of flashSalesToConsume) {
      try {
        const result = await FlashSaleService.consumeFlashSaleStock(fs.id, fs.quantity);
        if (!result.success) throw new Error(result.error);
        consumedFlashSales.push(fs);
      } catch (err) {
        // Rollback already consumed flash sales
        for (const cfs of consumedFlashSales) {
          await FlashSaleService.releaseFlashSaleStock(cfs.id, cfs.quantity);
        }
        // Rollback inventory
        await this.inventoryService.releaseOrderInventory(order.id);
        // Mark order cancelled
        await this.orderRepository.updateOrderStatus(order.id, "CANCELLED");
        throw new Error(`Failed to consume flash sale stock: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // ── 4. Atomic Coupon Consumption ──────────────────────────────────────────
    if (session.coupon_code) {
      try {
        await CouponService.consumeCoupon(session.coupon_code, userId, order.id, discountAmount);
      } catch (err) {
        // Rollback flash sales
        for (const cfs of consumedFlashSales) {
          await FlashSaleService.releaseFlashSaleStock(cfs.id, cfs.quantity);
        }
        // Rollback inventory
        await this.inventoryService.releaseOrderInventory(order.id);
        // Mark order cancelled
        await this.orderRepository.updateOrderStatus(order.id, "CANCELLED");
        throw new Error(err instanceof Error ? err.message : "Failed to apply coupon");
      }
    }

    // ── 5. Cleanup ───────────────────────────────────────────────────────────
    await this.cartService.clearCart(cart.id);
    await this.checkoutService.deleteSession(sessionId);

    return order;
  }

  /**
   * Prepare Payment Payload
   */
  preparePaymentPayload(
    order: Order,
    successUrl: string,
    failUrl: string,
    cancelUrl: string
  ): PaymentPayload {
    const customerName = order.shipping_address
      ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}`
      : "Guest";

    const customerEmail =
      order.shipping_address?.email || "customer@example.com";
    const customerPhone = order.shipping_address?.phone || "01XXXXXXXXX";

    return {
      order_id: order.id,
      order_number: order.order_number,
      amount: order.total_amount,
      currency: "BDT",
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
    };
  }
}
