import { prisma } from "@/lib/prisma";

export class StockMovementRepository {
  static async getMovements() {
    try {
      const movements = await prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          variant: {
            select: { sku: true, attributes: true, product: { select: { name: true } } }
          },
          warehouse: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      return movements.map(m => {
        const pName = m.variant?.product?.name || "Product";
        const sku = m.variant?.sku || "";
        
        let attrStr = "";
        if (m.variant?.attributes && typeof m.variant.attributes === "object") {
          attrStr = Object.values(m.variant.attributes as Record<string, any>).filter(Boolean).join(" / ");
        }

        const friendlyName = attrStr
          ? `${pName} (${sku} - ${attrStr})`
          : sku
          ? `${pName} (${sku})`
          : pName;

        return {
          id: m.id,
          variant_id: m.variantId,
          warehouse_id: m.warehouseId,
          quantity: m.quantity,
          previous_quantity: m.previousQuantity,
          new_quantity: m.newQuantity,
          reference_type: m.referenceType,
          reference_id: m.referenceId,
          movement_type: m.movementType,
          notes: m.notes,
          created_by: m.createdBy,
          created_at: m.createdAt.toISOString(),
          variants: {
            sku: m.variant?.sku,
            attributes: m.variant?.attributes,
            name: friendlyName,
            product: m.variant?.product,
          },
          warehouses: m.warehouse,
        };
      });
    } catch (err) {
      console.error("Unexpected error in getMovements:", err);
      return [];
    }
  }
}
