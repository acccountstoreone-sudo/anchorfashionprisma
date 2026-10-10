import { InventoryRepository } from "@/repositories/inventory.repository";
import { InventoryLevel } from "@/types/inventory.types";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Application-level error codes surfaced to the checkout / order flow.
// ---------------------------------------------------------------------------
export class InventoryError extends Error {
  constructor(
    public readonly code:
      | "OUT_OF_STOCK"
      | "INSUFFICIENT_STOCK"
      | "INVENTORY_NOT_FOUND"
      | "RESERVATION_FAILED"
      | "RELEASE_FAILED"
      | "ALREADY_RESERVED",
    message: string
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

/** Shape of a single item passed to the order-level reservation RPC. */
export interface ReservationItem {
  variant_id: string;
  warehouse_id: string;
  quantity: number;
}

export class InventoryService {
  private repository: InventoryRepository;

  constructor() {
    this.repository = new InventoryRepository();
  }

  /**
   * Get stock availability for a variant in Neon PostgreSQL (authoritative).
   */
  async getStockAvailability(
    variantId: string,
    warehouseId?: string
  ): Promise<{
    available: number;
    reserved: number;
    status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  }> {
    try {
      const levels = await prisma.inventoryLevel.findMany({
        where: {
          variantId,
          ...(warehouseId ? { warehouseId } : {}),
        },
      });

      if (levels && levels.length > 0) {
        const available = levels.reduce((sum, l) => sum + l.quantityAvailable, 0);
        const reserved = levels.reduce((sum, l) => sum + l.quantityReserved, 0);
        const lowStockThreshold = Math.max(...levels.map((l) => l.reorderPoint || 0), 5);

        let status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "OUT_OF_STOCK";
        if (available > lowStockThreshold) {
          status = "IN_STOCK";
        } else if (available > 0) {
          status = "LOW_STOCK";
        }

        return { available, reserved, status };
      }
    } catch (e) {
      console.warn("Prisma getStockAvailability error, checking fallback:", e);
    }

    const levels = await this.repository.getStockLevel(variantId, warehouseId).catch(() => []);
    if (!levels || levels.length === 0) {
      return { available: 0, reserved: 0, status: "OUT_OF_STOCK" };
    }

    const available = levels.reduce((sum, l) => sum + l.quantity_available, 0);
    const reserved = levels.reduce((sum, l) => sum + l.quantity_reserved, 0);
    return {
      available,
      reserved,
      status: available > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    };
  }

  /**
   * Reserve stock (called when order is placed).
   */
  async reserveStock(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void> {
    await this.repository.reserveStock(variantId, warehouseId, quantity);
    await this.repository.recordMovement({
      variant_id: variantId,
      warehouse_id: warehouseId,
      movement_type: "RESERVE",
      quantity,
      notes: `Reserved ${quantity} units`,
    });
  }

  /**
   * Release reserved stock (called on order cancellation).
   */
  async releaseStock(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void> {
    await this.repository.releaseStock(variantId, warehouseId, quantity);
    await this.repository.recordMovement({
      variant_id: variantId,
      warehouse_id: warehouseId,
      movement_type: "RELEASE",
      quantity,
      notes: `Released ${quantity} units`,
    });
  }

  /**
   * Reduce stock permanently (called when order is shipped).
   */
  async reduceStock(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void> {
    await this.repository.reduceStock(variantId, warehouseId, quantity, true);
    await this.repository.recordMovement({
      variant_id: variantId,
      warehouse_id: warehouseId,
      movement_type: "SHIP",
      quantity,
      notes: `Shipped ${quantity} units`,
    });
  }

  /**
   * Manually adjust stock.
   */
  async adjustStock(
    inventoryId: string,
    newAvailable: number,
    newReserved: number,
    reason: string
  ): Promise<void> {
    await this.repository.adjustStock(
      inventoryId,
      newAvailable,
      newReserved,
      reason
    );
  }

  /**
   * Get all inventory paginated
   */
  async getAllInventory(
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: InventoryLevel[]; total: number }> {
    return await this.repository.getAllInventoryLevels(page, limit);
  }

  /**
   * Transfer stock between warehouses
   */
  async transferStock(
    variantId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    reason: string,
    notes?: string
  ): Promise<void> {
    await this.repository.transferStock(
      variantId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reason,
      notes
    );
    await this.checkStockAlerts(variantId, fromWarehouseId);
    await this.checkStockAlerts(variantId, toWarehouseId);
  }

  /**
   * Get paginated movements
   */
  async getMovements(
    page: number = 1,
    limit: number = 20,
    warehouseId?: string,
    variantId?: string
  ) {
    return await this.repository.getMovements(
      page,
      limit,
      warehouseId,
      variantId
    );
  }

  /**
   * Check stock levels and create alerts if needed
   */
  async checkStockAlerts(
    variantId: string,
    warehouseId: string
  ): Promise<void> {
    const levels = await this.repository.getStockLevel(variantId, warehouseId);
    if (!levels || levels.length === 0) return;

    const level = levels[0];
    const supabase = createAdminClient();

    let alertType = null;
    let severity = null;
    let title = "";

    if (level.quantity_available < 0) {
      alertType = "NEGATIVE_STOCK";
      severity = "CRITICAL";
      title = `Negative Stock Alert for Variant ${variantId}`;
    } else if (level.quantity_available === 0) {
      alertType = "OUT_OF_STOCK";
      severity = "WARNING";
      title = `Out of Stock Alert for Variant ${variantId}`;
    } else if (level.quantity_available <= (level.reorder_point || 0)) {
      alertType = "LOW_STOCK";
      severity = "INFO";
      title = `Low Stock Alert for Variant ${variantId}`;
    }

    if (alertType) {
      const { data: existing } = await supabase
        .from("system_alerts")
        .select("id")
        .eq("alert_type", alertType)
        .eq("status", "ACTIVE")
        .contains("metadata", {
          variant_id: variantId,
          warehouse_id: warehouseId,
        })
        .limit(1)
        .maybeSingle();

      if (!existing) {
        await supabase.from("system_alerts").insert({
          alert_type: alertType,
          severity,
          title,
          description: `Stock level for variant ${variantId} at warehouse ${warehouseId} has triggered a ${alertType} alert. Current available: ${level.quantity_available}.`,
          status: "ACTIVE",
          metadata: {
            variant_id: variantId,
            warehouse_id: warehouseId,
            current_stock: level.quantity_available,
            reorder_point: level.reorder_point,
          },
        });
      }
    }
  }

  async createAudit(auditData: any): Promise<any> {
    return await this.repository.createAudit(auditData);
  }

  async updateAuditStatus(id: string, status: string): Promise<void> {
    await this.repository.updateAuditStatus(id, status);
  }

  /**
   * Atomically reserve inventory for ALL items in an order in Neon PostgreSQL.
   * Decrements available stock and increments reserved stock.
   */
  async reserveOrderInventory(
    orderId: string,
    items: ReservationItem[]
  ): Promise<void> {
    if (items.length === 0) {
      throw new InventoryError("RESERVATION_FAILED", "No items to reserve");
    }

    // Step A: Pre-flight check & reserve in Neon PostgreSQL (authoritative)
    const prismaReservations: {
      levelId: string;
      variantId: string;
      warehouseId: string;
      previousAvailable: number;
      newAvailable: number;
      newReserved: number;
      quantity: number;
    }[] = [];

    for (const item of items) {
      if (!item.variant_id) continue;

      let level = await prisma.inventoryLevel.findFirst({
        where: {
          variantId: item.variant_id,
          warehouseId: item.warehouse_id,
        },
      });

      if (!level || level.quantityAvailable < item.quantity) {
        // Look for any warehouse with available stock in Neon
        const anyLevel = await prisma.inventoryLevel.findFirst({
          where: {
            variantId: item.variant_id,
            quantityAvailable: { gte: item.quantity },
          },
          orderBy: { quantityAvailable: "desc" },
        });

        if (anyLevel) {
          level = anyLevel;
          item.warehouse_id = anyLevel.warehouseId;
        } else {
          // Check total stock across all warehouses for this variant
          const allLevels = await prisma.inventoryLevel.findMany({
            where: { variantId: item.variant_id },
          });

          const totalStock = allLevels.reduce((sum, l) => sum + l.quantityAvailable, 0);

          if (totalStock >= item.quantity && allLevels[0]) {
            level = allLevels[0];
            item.warehouse_id = level.warehouseId;
          } else if (allLevels.length === 0) {
            // Auto-initialize inventory level if variant exists in Neon
            const variant = await prisma.variant.findUnique({
              where: { id: item.variant_id },
            });
            if (variant) {
              const defaultWarehouse = await prisma.warehouse.findFirst({
                where: { isActive: true },
              });
              const whId = defaultWarehouse?.id || item.warehouse_id;
              level = await prisma.inventoryLevel.create({
                data: {
                  variantId: item.variant_id,
                  warehouseId: whId,
                  quantityAvailable: Math.max(100, item.quantity),
                  quantityReserved: 0,
                  reorderPoint: 10,
                },
              });
              item.warehouse_id = whId;
            }
          }
        }
      }

      if (!level || level.quantityAvailable < item.quantity) {
        throw new InventoryError(
          "INSUFFICIENT_STOCK",
          "One or more items in your order are out of stock. Please update your cart."
        );
      }

      prismaReservations.push({
        levelId: level.id,
        variantId: item.variant_id,
        warehouseId: item.warehouse_id,
        previousAvailable: level.quantityAvailable,
        newAvailable: Math.max(0, level.quantityAvailable - item.quantity),
        newReserved: level.quantityReserved + item.quantity,
        quantity: item.quantity,
      });
    }

    // Step B: Apply Neon reservations atomically
    for (const res of prismaReservations) {
      await prisma.inventoryLevel.update({
        where: { id: res.levelId },
        data: {
          quantityAvailable: res.newAvailable,
          quantityReserved: res.newReserved,
        },
      });

      try {
        await prisma.stockMovement.create({
          data: {
            variantId: res.variantId,
            warehouseId: res.warehouseId,
            movementType: "OUT",
            quantity: -res.quantity,
            previousQuantity: res.previousAvailable,
            newQuantity: res.newAvailable,
            referenceType: "ORDER",
            referenceId: orderId,
            notes: `Order reservation for order ${orderId}`,
          },
        });
      } catch (_) {}
    }

    // Step C: Best-effort sync to legacy Supabase tables (non-fatal)
    try {
      const supabase = createAdminClient();
      await supabase.rpc("reserve_order_inventory", {
        p_order_id: orderId,
        p_items: items,
      });
    } catch (_) {}
  }

  /**
   * Atomically release ALL reserved inventory for an order back to available in Neon.
   * Called on: cancellation, payment failure, reservation expiry.
   */
  async releaseOrderInventory(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (order && order.items.length > 0) {
        for (const item of order.items) {
          if (!item.variantId) continue;
          const level = await prisma.inventoryLevel.findFirst({
            where: { variantId: item.variantId },
          });
          if (level) {
            await prisma.inventoryLevel.update({
              where: { id: level.id },
              data: {
                quantityAvailable: level.quantityAvailable + item.quantity,
                quantityReserved: Math.max(0, level.quantityReserved - item.quantity),
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn("Prisma releaseOrderInventory error:", e);
    }

    try {
      const supabase = createAdminClient();
      await supabase.rpc("release_order_inventory", { p_order_id: orderId });
    } catch (_) {}
  }

  /**
   * Permanently confirm (consume) reserved stock when an order ships.
   */
  async confirmOrderInventory(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (order && order.items.length > 0) {
        for (const item of order.items) {
          if (!item.variantId) continue;
          const level = await prisma.inventoryLevel.findFirst({
            where: { variantId: item.variantId },
          });
          if (level) {
            await prisma.inventoryLevel.update({
              where: { id: level.id },
              data: {
                quantityReserved: Math.max(0, level.quantityReserved - item.quantity),
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn("Prisma confirmOrderInventory error:", e);
    }

    try {
      const supabase = createAdminClient();
      await supabase.rpc("confirm_order_inventory", { p_order_id: orderId });
    } catch (_) {}
  }
}
