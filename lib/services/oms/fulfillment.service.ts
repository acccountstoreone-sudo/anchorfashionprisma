import { createClient } from "@/lib/supabase/server";
import { OrderService } from "./order.service";
import { InventoryService } from "@/services/inventory.service";
import { FulfillShipmentInput } from "@/lib/validations/oms";

export class FulfillmentService {
  private orderService = new OrderService();
  private inventoryService = new InventoryService();

  /**
   * Confirm inventory when an order is ready to ship.
   *
   * This permanently converts reserved stock into shipped stock by calling
   * confirm_order_inventory — which decrements quantity_reserved without
   * returning it to quantity_available (the goods have left the warehouse).
   *
   * Previously this was a stub that only set order_items.inventory_reserved = true
   * without touching the actual inventory_levels table. That was incorrect.
   */
  async confirmInventoryForShipment(orderId: string): Promise<boolean> {
    try {
      await this.inventoryService.confirmOrderInventory(orderId);
      return true;
    } catch (err) {
      console.error(
        `[FulfillmentService] Failed to confirm inventory for order ${orderId}:`,
        err
      );
      return false;
    }
  }

  async assignShipmentTracking(data: FulfillShipmentInput): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from("order_shipments").insert({
      order_id: data.order_id,
      tracking_number: data.tracking_number,
      courier: data.courier,
      status: "pending",
    });

    if (error) {
      throw new Error(`Failed to assign tracking: ${error.message}`);
    }

    // Confirm inventory (stock physically shipped).
    await this.confirmInventoryForShipment(data.order_id);

    // Advance order state.
    await this.orderService.updateOrderStatus(
      data.order_id,
      "ready_for_shipment",
      undefined,
      "system"
    );
    return true;
  }
}
