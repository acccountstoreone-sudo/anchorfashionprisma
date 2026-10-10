// ============================================================================
// Shipping Service — Core Business Logic
// ============================================================================

import { CourierGatewayService } from "@/services/courier/courier-gateway.service";
import { ShipmentRepository } from "@/repositories/shipment.repository";
import { DeliveryZoneRepository } from "@/repositories/delivery-zone.repository";
import {
  CreateShipmentInput,
  UpdateShipmentInput,
  Shipment,
  ShipmentWithDetails,
  CourierProviderCode,
  ShipmentStatus,
  NormalizedWebhookEvent,
  ShipmentFilters,
  PaginatedResult,
  ConsignmentRequest,
} from "@/types/shipping.types";

export class ShippingService {
  private shipmentRepo: ShipmentRepository;
  private zoneRepo: DeliveryZoneRepository;

  constructor() {
    this.shipmentRepo = new ShipmentRepository();
    this.zoneRepo = new DeliveryZoneRepository();
  }

  /**
   * Create a new shipment for an order.
   * Does NOT call the provider API — courier assignment is a separate step.
   */
  async createShipment(
    input: CreateShipmentInput,
    createdBy?: string
  ): Promise<Shipment> {
    // Resolve delivery zone
    let zoneId: string | undefined;
    let shippingCharge = 0;

    if (input.deliveryZoneCode) {
      const zone = await this.zoneRepo.getZoneByCode(input.deliveryZoneCode);
      if (zone) {
        zoneId = zone.id;
        const charge = await this.zoneRepo.calculateCharge(
          zone.id,
          input.weightKg ?? 0.5,
          0,
          input.isCOD
        );
        shippingCharge = charge;
      }
    }

    const shipment = await this.shipmentRepo.createShipment(
      {
        order_id: input.orderId,
        courier_provider_code: input.courierProviderCode ?? null,
        status: "created",
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: input.recipientAddress,
        recipient_city: input.recipientCity ?? null,
        recipient_district: input.recipientDistrict ?? null,
        delivery_zone_id: zoneId ?? null,
        is_cod: input.isCOD,
        cod_amount: input.codAmount,
        shipping_charge: shippingCharge,
        weight_kg: input.weightKg ?? null,
        special_instructions: input.specialInstructions ?? null,
        created_by: createdBy ?? null,
      },
      input.items
    );

    // Log creation event
    await this.shipmentRepo.addEvent(
      shipment.id,
      "shipment_created",
      {
        order_id: input.orderId,
        courier: input.courierProviderCode,
      },
      createdBy,
      "admin"
    );

    return shipment;
  }

  /**
   * Update shipment metadata (not status transitions — use assignCourier / cancel)
   */
  async updateShipment(
    id: string,
    input: UpdateShipmentInput,
    updatedBy?: string
  ): Promise<Shipment> {
    return this.shipmentRepo.updateShipment(id, {
      ...input,
      updated_by: updatedBy ?? null,
    });
  }

  /**
   * Update shipment status manually (e.g., from Admin dashboard)
   * Integrates with inventory for stock deduction.
   */
  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    updatedBy?: string
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepo.getShipmentWithDetails(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    if (shipment.status === status) return shipment;

    const updated = await this.shipmentRepo.updateShipment(shipmentId, {
      status,
      updated_by: updatedBy ?? null,
    });

    await this.shipmentRepo.addEvent(
      shipmentId,
      "status_updated",
      { old: shipment.status, new: status },
      updatedBy,
      "admin"
    );

    // Reduce stock when shipped
    if (status === "in_transit") {
      const { InventoryService } = require("@/services/inventory.service");
      const { WarehouseService } = require("@/services/warehouse.service");
      const inventoryService = new InventoryService();
      const warehouseService = new WarehouseService();

      const defaultWarehouse = await warehouseService.getDefaultWarehouse();
      const warehouseId =
        defaultWarehouse?.id || "00000000-0000-0000-0000-000000000001";

      for (const item of shipment.items || []) {
        try {
          await inventoryService.reduceStock(
            item.sku,
            warehouseId,
            item.quantity
          );
        } catch (err) {
          console.error(`Failed to reduce stock for variant ${item.sku}`, err);
        }
      }
    }

    return updated;
  }

  /**
   * Assign a courier provider and submit the consignment to the provider API.
   */
  async assignCourier(
    shipmentId: string,
    courierCode: CourierProviderCode,
    updatedBy?: string,
    autoSubmit = true
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    if (
      ["delivered", "cancelled", "returned_to_origin"].includes(shipment.status)
    ) {
      throw new Error(
        `Cannot assign courier: shipment is in terminal state '${shipment.status}'`
      );
    }

    // Update courier assignment
    const updated = await this.shipmentRepo.updateShipment(shipmentId, {
      courier_provider_code: courierCode,
      updated_by: updatedBy ?? null,
    });

    await this.shipmentRepo.addEvent(
      shipmentId,
      "courier_assigned",
      { courier_code: courierCode },
      updatedBy,
      "admin"
    );

    if (!autoSubmit) return updated;

    // Submit to provider API
    return this.submitToProvider(updated, updatedBy);
  }

  /**
   * Reassign to a different courier (cancel with old, submit to new)
   */
  async reassignCourier(
    shipmentId: string,
    newCourierCode: CourierProviderCode,
    updatedBy?: string
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    // Cancel with previous provider if possible
    if (shipment.courier_provider_code && shipment.consignment_id) {
      try {
        await CourierGatewayService.cancelConsignment(
          shipment.courier_provider_code,
          shipment.consignment_id
        );
      } catch (err) {
        console.warn(
          `[ShippingService] Could not cancel with previous provider: ${err}`
        );
      }
    }

    // Clear old consignment data & assign new
    await this.shipmentRepo.updateShipment(shipmentId, {
      courier_provider_code: newCourierCode,
      consignment_id: null,
      tracking_number: null,
      status: "created",
      updated_by: updatedBy ?? null,
    });

    await this.shipmentRepo.addEvent(
      shipmentId,
      "courier_reassigned",
      {
        previous_courier: shipment.courier_provider_code,
        new_courier: newCourierCode,
      },
      updatedBy,
      "admin"
    );

    const freshShipment = await this.shipmentRepo.getShipmentById(shipmentId);
    return this.submitToProvider(freshShipment!, updatedBy);
  }

  /**
   * Submit shipment to provider API (creates consignment)
   */
  private async submitToProvider(
    shipment: Shipment,
    submittedBy?: string
  ): Promise<Shipment> {
    if (!shipment.courier_provider_code) {
      throw new Error("No courier provider assigned");
    }

    const request: ConsignmentRequest = {
      orderId: shipment.order_id,
      invoiceNumber: shipment.shipment_number,
      recipientName: shipment.recipient_name,
      recipientPhone: shipment.recipient_phone,
      recipientAddress: shipment.recipient_address,
      recipientCity: shipment.recipient_city ?? undefined,
      recipientDistrict: shipment.recipient_district ?? undefined,
      codAmount: shipment.cod_amount,
      weight: shipment.weight_kg ?? undefined,
      instructions: shipment.special_instructions ?? undefined,
      isCOD: shipment.is_cod,
    };

    const result = await CourierGatewayService.createConsignment(
      shipment.courier_provider_code,
      request
    );

    if (result.success && result.data) {
      return this.shipmentRepo.updateShipment(shipment.id, {
        consignment_id: result.data.consignmentId,
        tracking_number: result.data.trackingCode,
        label_url: result.data.labelUrl ?? null,
        status: "pickup_requested",
        updated_by: submittedBy ?? null,
      });
    }

    // Log provider failure but don't throw — shipment remains in 'created'
    console.error(`[ShippingService] Provider submit failed:`, result.error);
    return shipment;
  }

  /**
   * Cancel a shipment
   */
  async cancelShipment(
    shipmentId: string,
    reason?: string,
    cancelledBy?: string
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    if (["delivered", "cancelled"].includes(shipment.status)) {
      throw new Error(`Shipment already in state '${shipment.status}'`);
    }

    // Cancel with provider
    if (shipment.courier_provider_code && shipment.consignment_id) {
      try {
        await CourierGatewayService.cancelConsignment(
          shipment.courier_provider_code,
          shipment.consignment_id
        );
      } catch (err) {
        console.warn("[ShippingService] Provider cancel failed:", err);
      }
    }

    const updated = await this.shipmentRepo.updateShipment(shipmentId, {
      status: "cancelled",
      failure_reason: reason ?? null,
      updated_by: cancelledBy ?? null,
    });

    await this.shipmentRepo.addEvent(
      shipmentId,
      "cancelled",
      { reason },
      cancelledBy,
      "admin"
    );
    return updated;
  }

  /**
   * Pull latest tracking from provider and persist events
   */
  async syncTrackingStatus(shipmentId: string): Promise<Shipment> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    if (!shipment.courier_provider_code || !shipment.tracking_number) {
      return shipment;
    }

    const result = await CourierGatewayService.trackShipment(
      shipment.courier_provider_code,
      shipment.tracking_number
    );

    if (!result.success || !result.data) return shipment;

    const { status, estimatedDelivery, updates } = result.data;

    // Persist tracking events
    for (const update of updates) {
      await this.shipmentRepo.addTrackingEvent(shipmentId, {
        tracking_number: shipment.tracking_number,
        status: update.status,
        status_description: update.statusDescription,
        location: update.location,
        event_time: update.timestamp,
        provider_raw: update.raw ?? {},
      });
    }

    // Update shipment status if provider status maps to a different state
    const updates_payload: Record<string, any> = { provider_status: status };
    if (estimatedDelivery)
      updates_payload.estimated_delivery_date = estimatedDelivery;

    return this.shipmentRepo.updateShipment(shipmentId, updates_payload);
  }

  /**
   * Process a normalized webhook event from the gateway
   */
  async processWebhookEvent(
    event: NormalizedWebhookEvent,
    source: string
  ): Promise<void> {
    // Find shipment by tracking number
    const shipment = await this.shipmentRepo.getShipmentByTrackingNumber(
      event.trackingNumber
    );
    if (!shipment) {
      console.warn(
        `[ShippingService] No shipment found for tracking: ${event.trackingNumber}`
      );
      return;
    }

    // Persist tracking event
    await this.shipmentRepo.addTrackingEvent(shipment.id, {
      tracking_number: event.trackingNumber,
      status: event.status,
      status_description: event.statusDescription,
      location: event.location ?? null,
      event_time: event.eventTime,
      provider_raw: event.raw,
    });

    // Update shipment status
    await this.shipmentRepo.updateShipment(shipment.id, {
      status: event.status as ShipmentStatus,
      provider_status: event.status,
    });

    // Log webhook event
    await this.shipmentRepo.addEvent(
      shipment.id,
      "webhook_received",
      {
        provider: source,
        status: event.status,
        tracking: event.trackingNumber,
      },
      undefined,
      "webhook"
    );

    // Sync to OMS for critical lifecycle events
    try {
      const { OrderService } = require("@/lib/services/oms/order.service");
      const orderService = new OrderService();
      
      if (event.status === "delivered") {
        await orderService.updateOrderStatus(shipment.order_id, "delivered", undefined, "webhook");
      } else if (event.status === "returned_to_origin") {
        await orderService.updateOrderStatus(shipment.order_id, "returned", undefined, "webhook");
      } else if (event.status === "picked_up" || event.status === "in_transit") {
        // If the OMS is still in ready_for_shipment, advance it. 
        // updateOrderStatus safely catches invalid transitions
        await orderService.updateOrderStatus(shipment.order_id, "shipped", undefined, "webhook").catch(() => {});
      }
    } catch (omsErr) {
      console.error(`[ShippingService] Failed to sync webhook event to OMS for order ${shipment.order_id}:`, omsErr);
    }
  }

  /**
   * Generate label for shipment
   */
  async generateLabel(
    shipmentId: string,
    generatedBy?: string
  ): Promise<string | null> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (
      !shipment ||
      !shipment.courier_provider_code ||
      !shipment.consignment_id
    )
      return null;

    const result = await CourierGatewayService.generateLabel(
      shipment.courier_provider_code,
      shipment.consignment_id
    );

    if (!result.success || !result.data) return null;

    // Save label record
    await this.shipmentRepo.saveLabel(shipmentId, {
      label_type: "pdf",
      label_url: result.data.labelUrl,
      label_data: result.data.labelData ?? null,
    });

    // Update shipment label_url
    await this.shipmentRepo.updateShipment(shipmentId, {
      label_url: result.data.labelUrl,
      label_generated_at: new Date().toISOString(),
    });

    await this.shipmentRepo.addEvent(
      shipmentId,
      "label_generated",
      { label_url: result.data.labelUrl },
      generatedBy,
      "admin"
    );

    return result.data.labelUrl;
  }

  /**
   * List shipments with filters & pagination
   */
  async listShipments(
    filters: ShipmentFilters
  ): Promise<PaginatedResult<Shipment>> {
    return this.shipmentRepo.listShipments(filters);
  }

  /**
   * Get full shipment details
   */
  async getShipmentWithDetails(
    shipmentId: string
  ): Promise<ShipmentWithDetails | null> {
    return this.shipmentRepo.getShipmentWithDetails(shipmentId);
  }
}
