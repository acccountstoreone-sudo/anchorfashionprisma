import { paymentRepository } from "@/repositories/payment.repository";
import { paymentFactory } from "@/providers/payment/payment.factory";

export class PaymentWebhookService {
  async processWebhook(
    providerCode: string,
    payload: Record<string, any>,
    headers: Record<string, any>
  ) {
    const providerEntity =
      await paymentRepository.getProviderByCode(providerCode);
    if (!providerEntity) {
      throw new Error(`Provider not found for code: ${providerCode}`);
    }

    // 1. Log incoming webhook immediately
    const webhook = await paymentRepository.createWebhookEvent({
      provider_id: providerEntity.id,
      event_type: payload.event_type || payload.type || "unknown",
      payload,
      headers,
      status: "pending",
    });

    try {
      const provider = paymentFactory.getProvider(providerCode);

      // 2. Delegate processing to the provider
      const result = await provider.processWebhook(payload, headers);

      // 3. Update Webhook Status
      await paymentRepository.updateWebhookEvent(webhook.id, {
        status: "completed",
        processed_at: new Date().toISOString(),
      });

      // 4. Update Order and Inventory
      if (result && result.orderId) {
        const { OrderRepository } = require("@/repositories/order.repository");
        const { InventoryService } = require("./inventory.service");
        const orderRepo = new OrderRepository();

        if (result.status === "completed" || result.status === "success") {
          await orderRepo.updateOrderStatus(
            result.orderId,
            "PROCESSING",
            "Payment successful via webhook"
          );
        } else if (
          result.status === "failed" ||
          result.status === "cancelled"
        ) {
          await orderRepo.updateOrderStatus(
            result.orderId,
            "CANCELLED",
            "Payment failed or cancelled via webhook"
          );

          // Release stock
          const order = await orderRepo.getOrderById(result.orderId);
          if (order && order.items) {
            const inventoryService = new InventoryService();
            const { WarehouseService } = require("./warehouse.service");
            const warehouseService = new WarehouseService();
            const defaultWarehouse =
              await warehouseService.getDefaultWarehouse();
            const warehouseId =
              defaultWarehouse?.id || "00000000-0000-0000-0000-000000000001";

            for (const item of order.items) {
              try {
                await inventoryService.releaseStock(
                  item.variant_id,
                  warehouseId,
                  item.quantity
                );
              } catch (err) {
                console.error(
                  `Failed to release stock for variant ${item.variant_id}`,
                  err
                );
              }
            }
          }
        }
      }

      return result;
    } catch (error: any) {
      // 4. Handle failure and retry logic if needed
      await paymentRepository.updateWebhookEvent(webhook.id, {
        status: "failed",
        last_error: error.message,
        retry_count: webhook.retry_count + 1,
      });
      throw error;
    }
  }
}

export const paymentWebhookService = new PaymentWebhookService();
