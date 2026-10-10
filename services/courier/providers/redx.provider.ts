// ============================================================================
// RedX Courier Provider — Full Implementation
// API: https://openapi.redx.com.bd/v1.0.0-beta
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

export class RedXProvider implements ICourierProvider {
  readonly id = "redx" as const;
  readonly name = "RedX Courier";
  readonly isSandbox: boolean;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.apiKey = config.apiKey ?? "";
    this.isSandbox = isSandbox;
    this.baseUrl = isSandbox
      ? "https://sandbox.redx.com.bd/v1.0.0-beta"
      : "https://openapi.redx.com.bd/v1.0.0-beta";
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      "API-ACCESS-TOKEN": `Bearer ${this.apiKey}`,
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const payload = {
        name: request.recipientName,
        number: request.recipientPhone,
        address: request.recipientAddress,
        merchant_invoice_id: request.invoiceNumber,
        cash_collection_amount: request.codAmount,
        parcel_weight: Math.round((request.weight ?? 0.5) * 1000), // grams
        delivery_area:
          request.recipientDistrict || request.recipientCity || "Dhaka",
        delivery_area_id: null,
      };

      const response = await fetch(`${this.baseUrl}/parcel`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.tracking_id) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            trackingCode: data.tracking_id,
            consignmentId: String(data.tracking_id),
            status: "created",
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.message || "Failed to create RedX parcel"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async cancelConsignment(
    consignmentId: string
  ): Promise<ProviderResponse<void>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/parcel/${consignmentId}/cancel`,
        {
          method: "PATCH",
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.message || "Failed to cancel RedX parcel"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/parcel/track?tracking_id=${trackingCode}`,
        {
          method: "GET",
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (data.tracking_events) {
        const updates: TrackingUpdate[] = data.tracking_events.map(
          (event: any) => ({
            status: event.type,
            statusDescription: event.message,
            location: event.hub || "",
            timestamp: event.created_at,
            raw: event,
          })
        );

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: this.normalizeStatus(data.status || ""),
            statusDescription: data.status || "",
            estimatedDelivery: null,
            updates,
          },
        };
      }

      return this.errorResponse("API_ERROR", "Tracking data not found");
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async generateLabel(
    consignmentId: string
  ): Promise<ProviderResponse<{ labelUrl: string }>> {
    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      data: { labelUrl: `https://redx.com.bd/label/${consignmentId}` },
    };
  }

  async processWebhook(
    payload: unknown,
    signature: string
  ): Promise<ProviderResponse<NormalizedWebhookEvent>> {
    try {
      const body = payload as Record<string, any>;

      return {
        success: true,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        data: {
          trackingNumber: body.tracking_id || "",
          consignmentId: String(body.tracking_id || ""),
          status: this.normalizeStatus(body.status || ""),
          statusDescription: body.status || "",
          location: body.hub || "",
          eventTime: body.updated_at || new Date().toISOString(),
          raw: body,
        },
      };
    } catch (err: any) {
      return this.errorResponse("WEBHOOK_ERROR", err.message);
    }
  }

  private normalizeStatus(raw: string): ShipmentStatus {
    const map: Record<string, ShipmentStatus> = {
      INITIATED: "created",
      PICKUP_REQUESTED: "pickup_requested",
      PICKUP_CONFIRMED: "pickup_confirmed",
      PICKED_UP: "picked_up",
      IN_TRANSIT: "in_transit",
      OUT_FOR_DELIVERY: "out_for_delivery",
      DELIVERED: "delivered",
      DELIVERY_FAILED: "delivery_failed",
      RETURNED: "returned_to_origin",
      CANCELLED: "cancelled",
    };
    return map[raw.toUpperCase()] ?? "in_transit";
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
