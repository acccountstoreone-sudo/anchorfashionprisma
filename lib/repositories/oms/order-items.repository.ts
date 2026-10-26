import { prisma } from "@/lib/prisma";
import { OrderItem } from "@/types/oms";

export class OrderItemsRepository {
  async getOrderItems(orderId: string, _?: any): Promise<OrderItem[]> {
    try {
      const items = await prisma.orderItem.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
      });

      return items.map((item) => ({
        id: item.id,
        order_id: item.orderId,
        product_id: item.productId,
        variant_id: item.variantId,
        sku: item.sku,
        product_name: item.productName,
        variant_name: item.variantName,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        line_total: Number(item.totalPrice),
        total_price: Number(item.totalPrice),
        created_at: item.createdAt.toISOString(),
      })) as unknown as OrderItem[];
    } catch (e) {
      console.error("Error fetching order items:", e);
      return [];
    }
  }

  async createOrderItems(
    items: Omit<OrderItem, "id" | "created_at">[]
  ): Promise<OrderItem[]> {
    const createdItems = await Promise.all(
      items.map(async (item) => {
        return prisma.orderItem.create({
          data: {
            orderId: item.order_id,
            productId: item.product_id,
            variantId: item.variant_id,
            sku: item.sku,
            productName: item.product_name,
            variantName: item.variant_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.line_total || (item as any).total_price || 0,
          },
        });
      })
    );

    return createdItems.map((item) => ({
      id: item.id,
      order_id: item.orderId,
      product_id: item.productId,
      variant_id: item.variantId,
      sku: item.sku,
      product_name: item.productName,
      variant_name: item.variantName,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      line_total: Number(item.totalPrice),
      total_price: Number(item.totalPrice),
      created_at: item.createdAt.toISOString(),
    })) as unknown as OrderItem[];
  }
}
