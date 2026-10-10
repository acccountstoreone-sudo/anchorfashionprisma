import { prisma } from "@/lib/prisma";

export class PurchaseOrderRepository {
  static async getPurchaseOrders() {
    try {
      const orders = await prisma.purchaseOrder.findMany({
        orderBy: { createdAt: "desc" },
        include: { supplier: true, warehouse: true }
      });
      return orders.map(o => ({
        ...o,
        total_amount: o.totalAmount,
        po_number: o.poNumber,
        supplier_id: o.supplierId,
        warehouse_id: o.warehouseId,
        expected_date: o.expectedDate?.toISOString(),
        created_by: o.createdBy,
        created_at: o.createdAt.toISOString(),
      }));
    } catch (err) {
      console.error("Unexpected error in getPurchaseOrders:", err);
      return [];
    }
  }
}
