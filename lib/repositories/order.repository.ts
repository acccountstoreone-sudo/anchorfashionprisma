import { prisma } from "@/lib/prisma";
import { Order, OrderAddress, OrderItem, OrderStatus } from "@/types/checkout.types";

function mapPrismaOrderToCheckoutOrder(record: any): Order {
  const shippingAddr = record.shippingAddress as Record<string, any> | null;
  const billingAddr = record.billingAddress as Record<string, any> | null;

  return {
    id: record.id,
    user_id: record.profileId || record.customerId,
    order_number: record.orderNumber,
    status: (record.status || "confirmed") as OrderStatus,
    subtotal: Number(record.subtotal || 0),
    shipping_fee: Number(record.shippingFee || 0),
    discount_amount: Number(record.discount || 0),
    total_amount: Number(record.totalAmount || 0),
    grand_total: Number(record.totalAmount || 0),
    shipping_total: Number(record.shippingFee || 0),
    discount_total: Number(record.discount || 0),
    currency: "BDT",
    payment_method: record.paymentMethod || "COD",
    payment_status: record.paymentStatus || "UNPAID",
    notes: record.notes,
    risk_level: "LOW",
    created_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
    updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
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
      created_at: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    })),
    shipping_address: shippingAddr ? (shippingAddr as any) : undefined,
    billing_address: billingAddr ? (billingAddr as any) : undefined,
  };
}

export class OrderRepository {
  /**
   * Create an order with items and addresses authoritative in Neon PostgreSQL via Prisma.
   */
  static async createOrder(
    orderData: Partial<Order>,
    items: Partial<OrderItem>[],
    shippingAddress: Partial<OrderAddress>,
    billingAddress?: Partial<OrderAddress>
  ): Promise<Order> {
    const customerId = orderData.user_id ?? (orderData as any).customer_id ?? null;
    const customerNote = orderData.notes;
    const orderNumber = orderData.order_number || `AF-${Date.now()}`;
    const statusNote = customerNote
      ? `Order placed. Customer Note: ${customerNote.trim()}`
      : "Order placed successfully";

    // 0. Resolve valid profileId in Neon PostgreSQL to satisfy orders_profile_id_fkey
    let validProfileId: string | null = null;
    const candidateEmail =
      (shippingAddress as any)?.email ||
      (orderData as any)?.guest_email ||
      (orderData as any)?.email ||
      null;

    if (customerId) {
      try {
        const existingProfile = await prisma.profile.findUnique({
          where: { id: customerId },
          select: { id: true },
        });

        if (existingProfile) {
          validProfileId = existingProfile.id;
        } else if (candidateEmail) {
          const profileByEmail = await prisma.profile.findUnique({
            where: { email: candidateEmail },
            select: { id: true },
          });

          if (profileByEmail) {
            validProfileId = profileByEmail.id;
          } else {
            // Auto-create customer profile in Neon
            const newProfile = await prisma.profile.create({
              data: {
                id: customerId,
                email: candidateEmail,
                firstName:
                  (shippingAddress as any)?.first_name ||
                  (shippingAddress as any)?.firstName ||
                  null,
                lastName:
                  (shippingAddress as any)?.last_name ||
                  (shippingAddress as any)?.lastName ||
                  null,
                phone: (shippingAddress as any)?.phone || null,
              },
              select: { id: true },
            });
            validProfileId = newProfile.id;
          }
        }
      } catch (profileErr) {
        console.warn("Could not link/create profile for customerId in Neon, setting null:", profileErr);
        validProfileId = null;
      }
    } else if (candidateEmail) {
      try {
        const profileByEmail = await prisma.profile.findUnique({
          where: { email: candidateEmail },
          select: { id: true },
        });
        if (profileByEmail) {
          validProfileId = profileByEmail.id;
        }
      } catch {
        validProfileId = null;
      }
    }

    // 0.1 Validate foreign key IDs for Products and Variants in Neon
    const productIds = items.map((i) => i.product_id).filter(Boolean) as string[];
    const variantIds = items.map((i) => i.variant_id).filter(Boolean) as string[];

    const [existingProducts, existingVariants] = await Promise.all([
      productIds.length > 0
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true },
          })
        : [],
      variantIds.length > 0
        ? prisma.variant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true },
          })
        : [],
    ]);

    const validProductIds = new Set(existingProducts.map((p) => p.id));
    const validVariantIds = new Set(existingVariants.map((v) => v.id));

    // 1. Authoritative Create in Neon PostgreSQL via Prisma
    const createdPrismaOrder = await prisma.order.create({
      data: {
        orderNumber,
        profileId: validProfileId,
        status: (orderData.status || "confirmed").toUpperCase(),
        paymentStatus: orderData.payment_method === "COD" ? "UNPAID" : "PAID",
        paymentMethod: orderData.payment_method || "COD",
        subtotal: orderData.subtotal ?? 0,
        discount: orderData.discount_amount ?? 0,
        shippingFee: orderData.shipping_fee ?? 0,
        totalAmount: orderData.total_amount ?? 0,
        notes: customerNote || null,
        shippingAddress: shippingAddress as any,
        billingAddress: billingAddress ? (billingAddress as any) : undefined,
        items: {
          create: items.map((item) => ({
            productId: item.product_id && validProductIds.has(item.product_id) ? item.product_id : null,
            variantId: item.variant_id && validVariantIds.has(item.variant_id) ? item.variant_id : null,
            productName: item.product_name || "Product",
            variantName: item.variant_name || null,
            sku: item.sku || "N/A",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unit_price) || 0,
            totalPrice: Number(item.line_total || item.total_price || 0),
          })),
        },
        statusHistory: {
          create: {
            status: (orderData.status || "confirmed").toUpperCase(),
            notes: statusNote,
            changedBy: validProfileId,
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    });

    return mapPrismaOrderToCheckoutOrder(createdPrismaOrder);
  }

  /**
   * Get an order by ID
   */
  static async getOrderById(orderId: string): Promise<Order | null> {
    const prismaRecord = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, statusHistory: true },
    });

    if (prismaRecord) {
      return mapPrismaOrderToCheckoutOrder(prismaRecord);
    }
    return null;
  }

  /**
   * Get an order by Order Number
   */
  static async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    const prismaRecord = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true, statusHistory: true },
    });

    if (prismaRecord) {
      return mapPrismaOrderToCheckoutOrder(prismaRecord);
    }
    return null;
  }

  /**
   * Get all orders by User/Customer ID
   */
  static async getOrdersByUserId(userId: string): Promise<Order[]> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const records = await prisma.order.findMany({
      where: {
        OR: [
          ...(isUuid ? [{ profileId: userId }, { customerId: userId }] : [{ customerId: userId }]),
        ],
      },
      include: { items: true, statusHistory: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map(mapPrismaOrderToCheckoutOrder);
  }

  // Instance method compatibility
  async getOrderById(id: string): Promise<Order | null> {
    return OrderRepository.getOrderById(id);
  }
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    return OrderRepository.getOrderByNumber(orderNumber);
  }
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return OrderRepository.getOrdersByUserId(userId);
  }
  async createOrder(
    orderData: Partial<Order>,
    items: Partial<OrderItem>[],
    shippingAddress: Partial<OrderAddress>,
    billingAddress?: Partial<OrderAddress>
  ): Promise<Order> {
    return OrderRepository.createOrder(orderData, items, shippingAddress, billingAddress);
  }
  async updateOrderStatus(id: string, status: string, notes?: string): Promise<void> {
    return OrderRepository.updateOrderStatus(id, status, notes);
  }
}
