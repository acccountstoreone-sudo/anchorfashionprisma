import { prisma } from "@/lib/prisma";
import { OrderEvent, OrderStatusHistory } from "@/types/oms";

export class OrderEventsRepository {
  async getEventsByOrderId(orderId: string): Promise<OrderEvent[]> {
    // In Prisma, we only have StatusHistory inside Order, but we can return it as an event.
    // If order_events table existed, we would query it.
    // I'll return empty array for order_events if it's not mapped.
    return [];
  }

  async getStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    try {
      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
      });

      return history.map((h: any) => ({
        id: h.id,
        order_id: h.orderId,
        status: h.status,
        notes: h.notes,
        created_by: h.changedBy,
        created_at: h.createdAt.toISOString()
      })) as unknown as OrderStatusHistory[];
    } catch (e) {
      console.error("Error fetching status history:", e);
      return [];
    }
  }
}
