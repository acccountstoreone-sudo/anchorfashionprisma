// ============================================================================
// Tracking Service
// ============================================================================

import { ShipmentRepository } from "@/repositories/shipment.repository";
import { CourierGatewayService } from "@/services/courier/courier-gateway.service";
import {
  TrackingTimeline,
  TrackingTimelineEvent,
  ShipmentStatus,
  Shipment,
  ShipmentTrackingEvent,
} from "@/types/shipping.types";

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  created: "Order Dispatched",
  pickup_requested: "Pickup Requested",
  pickup_confirmed: "Pickup Confirmed",
  picked_up: "Parcel Picked Up",
  in_transit: "In Transit",
  hub_received: "Arrived at Hub",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery Failed",
  returned_to_origin: "Returned to Origin",
  cancelled: "Cancelled",
};

const ORDERED_LIFECYCLE: ShipmentStatus[] = [
  "created",
  "pickup_requested",
  "pickup_confirmed",
  "picked_up",
  "in_transit",
  "hub_received",
  "out_for_delivery",
  "delivered",
];

export class TrackingService {
  private shipmentRepo: ShipmentRepository;

  constructor() {
    this.shipmentRepo = new ShipmentRepository();
  }

  /**
   * Get a complete tracking timeline for a shipment.
   */
  async getTrackingTimeline(
    identifier: string,
    identifierType: "shipment_id" | "tracking_number" = "tracking_number"
  ): Promise<TrackingTimeline | null> {
    let shipment: Shipment | null = null;

    if (identifierType === "tracking_number") {
      shipment =
        await this.shipmentRepo.getShipmentByTrackingNumber(identifier);
    } else {
      shipment = await this.shipmentRepo.getShipmentById(identifier);
    }

    if (!shipment) return null;

    const providerEvents = await this.shipmentRepo.getTrackingEvents(
      shipment.id
    );
    const timeline = this.buildTimeline(shipment, providerEvents);

    return timeline;
  }

  /**
   * Refresh tracking from provider, persist events, and return updated timeline.
   */
  async refreshTracking(shipmentId: string): Promise<TrackingTimeline | null> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (
      !shipment ||
      !shipment.courier_provider_code ||
      !shipment.tracking_number
    ) {
      return null;
    }

    const result = await CourierGatewayService.trackShipment(
      shipment.courier_provider_code,
      shipment.tracking_number
    );

    if (result.success && result.data) {
      // Upsert tracking events
      for (const update of result.data.updates) {
        await this.shipmentRepo.upsertTrackingEvent(shipment.id, {
          tracking_number: shipment.tracking_number,
          status: update.status,
          status_description: update.statusDescription,
          location: update.location,
          event_time: update.timestamp,
          provider_raw: update.raw ?? {},
        });
      }

      // Update provider status
      await this.shipmentRepo.updateShipment(shipment.id, {
        provider_status: result.data.status,
        estimated_delivery_date: result.data.estimatedDelivery ?? undefined,
      });
    }

    return this.getTrackingTimeline(shipmentId, "shipment_id");
  }

  /**
   * Get estimated delivery date for a shipment.
   */
  async getEstimatedDelivery(shipmentId: string): Promise<string | null> {
    const shipment = await this.shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) return null;

    return shipment.estimated_delivery_date;
  }

  /**
   * Build a structured tracking timeline from shipment + events.
   */
  private buildTimeline(
    shipment: Shipment,
    providerEvents: ShipmentTrackingEvent[]
  ): TrackingTimeline {
    const currentStatusIndex = ORDERED_LIFECYCLE.indexOf(shipment.status);
    const isTerminal = [
      "cancelled",
      "returned_to_origin",
      "delivery_failed",
    ].includes(shipment.status);

    // Build ordered lifecycle steps
    const lifecycleSteps: TrackingTimelineEvent[] = ORDERED_LIFECYCLE.map(
      (status, index) => {
        const matchingEvent = providerEvents.find(
          (e) =>
            e.status === status ||
            e.status.toLowerCase().includes(status.replace("_", " "))
        );

        const isCompleted = !isTerminal && index <= currentStatusIndex;
        const isCurrent = index === currentStatusIndex && !isTerminal;

        return {
          id: `lifecycle-${status}`,
          status,
          statusLabel: STATUS_LABELS[status],
          description: matchingEvent?.status_description ?? null,
          location: matchingEvent?.location ?? null,
          timestamp:
            matchingEvent?.event_time ??
            (isCurrent || isCompleted
              ? this.inferTimestamp(shipment, status)
              : ""),
          isCompleted,
          isCurrent,
        };
      }
    );

    // Append terminal states if applicable
    if (isTerminal && !ORDERED_LIFECYCLE.includes(shipment.status)) {
      lifecycleSteps.push({
        id: `terminal-${shipment.status}`,
        status: shipment.status,
        statusLabel: STATUS_LABELS[shipment.status],
        description: shipment.failure_reason ?? null,
        location: null,
        timestamp: this.inferTimestamp(shipment, shipment.status),
        isCompleted: true,
        isCurrent: true,
      });
    }

    return {
      shipmentNumber: shipment.shipment_number,
      trackingNumber: shipment.tracking_number,
      courierName: shipment.courier_provider_code ?? "Unknown",
      currentStatus: shipment.status,
      estimatedDelivery: shipment.estimated_delivery_date,
      events: lifecycleSteps,
    };
  }

  private inferTimestamp(shipment: Shipment, status: ShipmentStatus): string {
    const map: Partial<Record<ShipmentStatus, string | null>> = {
      created: shipment.created_at,
      pickup_requested: shipment.pickup_requested_at,
      pickup_confirmed: shipment.pickup_confirmed_at,
      picked_up: shipment.picked_up_at,
      in_transit: shipment.in_transit_at,
      out_for_delivery: shipment.out_for_delivery_at,
      delivered: shipment.delivered_at,
      delivery_failed: shipment.delivery_failed_at,
      returned_to_origin: shipment.returned_at,
      cancelled: shipment.cancelled_at,
    };
    return map[status] ?? "";
  }
}
