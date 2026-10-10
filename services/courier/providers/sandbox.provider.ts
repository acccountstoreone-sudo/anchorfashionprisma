// ============================================================================
// Sandbox / Mock Courier Provider
// For development, staging, and unit testing
// ============================================================================

import {
  ICourierProvider,
  ConsignmentRequest,
  ConsignmentResponse,
  TrackingResult,
  TrackingUpdate,
  ProviderResponse,
  NormalizedWebhookEvent,
  ShipmentStatus,
} from "@/types/shipping.types";

const LIFECYCLE: ShipmentStatus[] = [
  "created",
  "pickup_requested",
  "pickup_confirmed",
  "picked_up",
  "in_transit",
  "hub_received",
  "out_for_delivery",
  "delivered",
];

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  created: "Shipment Created",
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

export class SandboxProvider implements ICourierProvider {
  readonly id = "sandbox" as const;
  readonly name = "Sandbox Courier (Testing)";
  readonly isSandbox = true;

  private readonly shouldFail: boolean;
  private readonly simulateDelay: boolean;

  // In-memory tracking store (per process lifecycle — ephemeral by design)
  private static trackingStore: Map<
    string,
    { consignmentId: string; statusIndex: number; events: TrackingUpdate[] }
  > = new Map();

  constructor(config: Record<string, any> = {}, _isSandbox = true) {
    this.shouldFail = config.simulateFailure === true;
    this.simulateDelay = config.simulateDelay === true;
  }

  private generateTrackingCode(): string {
    return `SBOX-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;
  }

  private delay(ms: number): Promise<void> {
    return this.simulateDelay
      ? new Promise((resolve) => setTimeout(resolve, ms))
      : Promise.resolve();
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    await this.delay(100);

    if (this.shouldFail) {
      return this.errorResponse(
        "SANDBOX_FAILURE",
        "Simulated failure in sandbox mode"
      );
    }

    const trackingCode = this.generateTrackingCode();
    const consignmentId = `CSID-${trackingCode}`;

    SandboxProvider.trackingStore.set(trackingCode, {
      consignmentId,
      statusIndex: 0,
      events: [
        {
          status: "created",
          statusDescription: "Shipment Created",
          location: "Anchor Fashion Warehouse",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      data: {
        trackingCode,
        consignmentId,
        status: "created",
      },
    };
  }

  async cancelConsignment(
    consignmentId: string
  ): Promise<ProviderResponse<void>> {
    await this.delay(50);
    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
    };
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    await this.delay(50);

    const entry = SandboxProvider.trackingStore.get(trackingCode);

    if (!entry) {
      // Auto-create a simulated entry with delivered status
      const events: TrackingUpdate[] = LIFECYCLE.slice(0, 4).map(
        (status, i) => ({
          status,
          statusDescription: STATUS_LABELS[status],
          location: "Sandbox Location",
          timestamp: new Date(Date.now() - (3 - i) * 3600_000).toISOString(),
        })
      );

      return {
        success: true,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        data: {
          status: "in_transit",
          statusDescription: STATUS_LABELS["in_transit"],
          estimatedDelivery: new Date(Date.now() + 86400_000)
            .toISOString()
            .split("T")[0],
          updates: events,
        },
      };
    }

    const currentStatus = LIFECYCLE[entry.statusIndex] ?? "in_transit";

    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      data: {
        status: currentStatus,
        statusDescription: STATUS_LABELS[currentStatus],
        estimatedDelivery: new Date(Date.now() + 86400_000)
          .toISOString()
          .split("T")[0],
        updates: entry.events,
      },
    };
  }

  /** Advance the sandbox shipment to the next lifecycle status */
  static advanceStatus(trackingCode: string): ShipmentStatus | null {
    const entry = SandboxProvider.trackingStore.get(trackingCode);
    if (!entry) return null;

    const nextIndex = Math.min(entry.statusIndex + 1, LIFECYCLE.length - 1);
    entry.statusIndex = nextIndex;
    const newStatus = LIFECYCLE[nextIndex];

    entry.events.push({
      status: newStatus,
      statusDescription: STATUS_LABELS[newStatus],
      location: "Sandbox Hub",
      timestamp: new Date().toISOString(),
    });

    return newStatus;
  }

  async generateLabel(
    consignmentId: string
  ): Promise<ProviderResponse<{ labelUrl: string; labelData?: string }>> {
    await this.delay(50);
    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      data: {
        labelUrl: `https://sandbox.courier/label/${consignmentId}`,
        labelData: `SANDBOX_LABEL_BASE64_${consignmentId}`,
      },
    };
  }

  async processWebhook(
    payload: unknown,
    signature: string
  ): Promise<ProviderResponse<NormalizedWebhookEvent>> {
    const body = payload as Record<string, any>;

    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      data: {
        trackingNumber:
          body.trackingNumber || body.tracking_code || "SBOX-TEST",
        consignmentId: String(
          body.consignmentId || body.tracking_code || "CSID-TEST"
        ),
        status: (body.status as ShipmentStatus) || "in_transit",
        statusDescription: body.statusDescription || "Sandbox Event",
        location: body.location || "Sandbox Hub",
        eventTime: body.eventTime || new Date().toISOString(),
        raw: body,
      },
    };
  }

  private errorResponse(code: string, message: string): ProviderResponse<any> {
    return {
      success: false,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      error: { code, message },
    };
  }
}
