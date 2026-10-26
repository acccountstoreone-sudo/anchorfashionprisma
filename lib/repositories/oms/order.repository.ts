import { prisma } from "@/lib/prisma";
import { Order, OrderStatus } from "@/types/oms";

export class OrderRepository {
  async getOrderById(id: string, _?: any): Promise<Order | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let order;

    if (isUuid) {
      order = await prisma.order.findUnique({
        where: { id },
        include: { items: true, statusHistory: true },
      });
    } else {
      order = await prisma.order.findUnique({
        where: { orderNumber: id },
        include: { items: true, statusHistory: true },
      });
    }

    if (!order) return null;
    return mapPrismaOrderToOms(order);
  }

  async getOrderByNumber(orderNumber: string, _?: any): Promise<Order | null> {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, statusHistory: true },
    });
    if (!order) return null;
    return mapPrismaOrderToOms(order);
  }

  async getOrders(options?: {
    customerId?: string;
    status?: OrderStatus | string;
    paymentMethod?: string;
    paymentStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }, _?: any) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.customerId) {
      const isCustUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.customerId);
      if (isCustUuid) {
        where.profileId = options.customerId;
      }
    }
    
    if (options?.status && options.status !== "all") {
      const s = String(options.status).toLowerCase().trim();
      if (s === "pending") {
        where.status = { in: ["PENDING_PAYMENT", "PAID", "DRAFT"] };
      } else if (s === "processing") {
        where.status = { in: ["CONFIRMED", "PREPARING", "PICKING", "PACKING", "READY_FOR_SHIPMENT", "SHIPPED"] };
      } else if (s === "completed") {
        where.status = { in: ["COMPLETED", "DELIVERED"] };
      } else if (s === "cancelled") {
        where.status = { in: ["CANCELLED", "REFUNDED", "RETURNED", "FAILED"] };
      } else {
        where.status = s.toUpperCase();
      }
    }

    if (options?.paymentMethod && options.paymentMethod !== "all") {
      where.paymentMethod = options.paymentMethod;
    }

    if (options?.paymentStatus && options.paymentStatus !== "all") {
      where.paymentStatus = options.paymentStatus;
    }

    if (options?.search) {
      where.OR = [
        { orderNumber: { contains: options.search, mode: "insensitive" } },
        {
          shippingAddress: {
            path: ["firstName"],
            string_contains: options.search,
          }
        },
        {
          shippingAddress: {
            path: ["phone"],
            string_contains: options.search,
          }
        }
      ];
    }

    const [orders, count] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);

    const enrichedOrders = orders.map((o: any) => {
      const mapped = mapPrismaOrderToOms(o);
      const shippingAddr = mapped.shipping_address as any;
      let customerName = "Guest Customer";
      
      if (shippingAddr?.first_name || shippingAddr?.last_name || shippingAddr?.firstName) {
        customerName = `${shippingAddr.firstName || shippingAddr.first_name || ""} ${shippingAddr.lastName || shippingAddr.last_name || ""}`.trim();
      }

      return {
        ...mapped,
        customer_name: customerName,
        customer_phone: shippingAddr?.phone || null,
        customer_city: shippingAddr?.city || null,
        items_count: o.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 1), 0),
        items_preview: o.items.map((i: any) => i.productName).filter(Boolean).slice(0, 3).join(", "),
      } as Order;
    });

    return {
      data: enrichedOrders,
      count,
    };
  }

  async getOrderMetrics(_?: any) {
    const allOrders = await prisma.order.findMany({
      select: { status: true, totalAmount: true },
    });

    let totalOrders = 0;
    let totalRevenue = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    for (const o of allOrders) {
      totalOrders++;
      const s = o.status.toLowerCase();
      
      if (s !== "cancelled" && s !== "failed") {
        totalRevenue += Number(o.totalAmount || 0);
      }

      if (["pending", "pending_payment", "draft"].includes(s)) {
        pendingOrders++;
      } else if (["confirmed", "preparing", "processing", "picking", "packing", "ready_for_shipment", "shipped"].includes(s)) {
        processingOrders++;
      } else if (["completed", "delivered"].includes(s)) {
        completedOrders++;
      } else if (["cancelled", "refunded", "returned", "failed"].includes(s)) {
        cancelledOrders++;
      }
    }

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
    };
  }

  async createOrder(
    orderData: any
  ): Promise<Order> {
    const isProfileUuid =
      orderData.user_id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderData.user_id
      );

    const created = await prisma.order.create({
      data: {
        orderNumber: orderData.order_number,
        profileId: isProfileUuid ? orderData.user_id : undefined,
        customerId: orderData.customer_id || undefined,
        status: (orderData.status || "CONFIRMED").toUpperCase(),
        subtotal: orderData.subtotal || 0,
        shippingFee: orderData.shipping_fee || orderData.shipping_total || 0,
        discount: orderData.discount_amount || orderData.discount_total || 0,
        totalAmount: orderData.total_amount || orderData.grand_total || 0,
        paymentMethod: orderData.payment_method || "COD",
        paymentStatus: orderData.payment_status || "UNPAID",
        shippingAddress: (orderData.shipping_address as any) || {},
        billingAddress: (orderData.billing_address as any) || undefined,
        notes: orderData.notes,
        statusHistory: {
          create: {
            status: (orderData.status || "CONFIRMED").toUpperCase(),
            notes: "Order created via OMS",
          },
        },
      },
      include: { items: true, statusHistory: true },
    });

    return mapPrismaOrderToOms(created);
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    updatedBy?: string,
    _?: any
  ): Promise<Order> {
    const isUserUuid =
      updatedBy &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        updatedBy
      );

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: status.toUpperCase(),
        statusHistory: {
          create: {
            status: status.toUpperCase(),
            notes: updatedBy
              ? `Order status updated to ${status} (by ${updatedBy})`
              : `Order status updated to ${status}`,
            changedBy: isUserUuid ? updatedBy : null,
          }
        }
      },
      include: { items: true, statusHistory: true },
    });

    return mapPrismaOrderToOms(updated);
  }

  async getOrdersForFulfillment(): Promise<Order[]> {
    const validStatuses = ["PAID", "PREPARING", "PICKING", "PACKING", "READY_FOR_SHIPMENT"];
    
    const orders = await prisma.order.findMany({
      where: { status: { in: validStatuses } },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });

    return orders.map(mapPrismaOrderToOms);
  }
}

function mapPrismaOrderToOms(record: any): Order {
  const shippingAddr = record.shippingAddress as Record<string, any> | null;
  const billingAddr = record.billingAddress as Record<string, any> | null;

  return {
    id: record.id,
    customer_id: record.customerId || record.profileId || null,
    user_id: record.profileId,
    order_number: record.orderNumber,
    status: (record.status || "confirmed").toLowerCase() as OrderStatus,
    subtotal: Number(record.subtotal || 0),
    tax_total: 0,
    shipping_total: Number(record.shippingFee || 0),
    discount_total: Number(record.discount || 0),
    grand_total: Number(record.totalAmount || 0),
    currency: "BDT",
    shipping_address_id: null,
    billing_address_id: null,
    payment_intent_id: null,
    shipping_fee: Number(record.shippingFee || 0),
    discount_amount: Number(record.discount || 0),
    total_amount: Number(record.totalAmount || 0),
    payment_method: record.paymentMethod || "COD",
    payment_status: record.paymentStatus || "UNPAID",
    notes: record.notes,
    risk_level: "LOW",
    created_at: record.createdAt?.toISOString(),
    updated_at: record.updatedAt?.toISOString(),
    placed_at: record.createdAt?.toISOString() || null,
    paid_at: record.paidAt?.toISOString() || null,
    shipped_at: record.shippedAt?.toISOString() || null,
    delivered_at: record.deliveredAt?.toISOString() || null,
    cancelled_at: record.cancelledAt?.toISOString() || null,
    updated_by: null,
    items: (record.items || []).map((item: any) => ({
      id: item.id,
      order_id: item.orderId,
      product_id: item.productId,
      variant_id: item.variantId,
      sku: item.sku,
      product_name: item.productName,
      variant_name: item.variantName,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice || 0),
      line_total: Number(item.totalPrice || 0),
      total_price: Number(item.totalPrice || 0),
      created_at: item.createdAt?.toISOString(),
    })),
    shipping_address: shippingAddr ? (shippingAddr as any) : undefined,
    billing_address: billingAddr ? (billingAddr as any) : undefined,
  } as Order;
}
