// ============================================================================
// Paperfly Courier Provider
// API: https://paperfly.com.bd/api
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

export class PaperflyProvider implements ICourierProvider {
  readonly id = "paperfly" as const;
  readonly name = "Paperfly Courier";
  readonly isSandbox: boolean;

  private readonly apiKey: string;
  private readonly userId: string;
  private readonly baseUrl = "https://paperfly.com.bd/api";

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.apiKey = config.apiKey ?? "";
    this.userId = config.userId ?? "";
    this.isSandbox = isSandbox;
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      "PF-API-KEY": this.apiKey,
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const payload = {
        user_id: this.userId,
        shop_name: "Anchor Fashion",
        invoice_id: request.invoiceNumber,
        recipient_name: request.recipientName,
        recipient_phone: request.recipientPhone,
        recipient_address: request.recipientAddress,
        recipient_city: request.recipientCity || "Dhaka",
        cash_collection: request.codAmount,
        weight: request.weight ?? 0.5,
        notes: request.instructions ?? "",
      };

      const response = await fetch(`${this.baseUrl}/order/create`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.tracking_id) {
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
        data.message || "Failed to create Paperfly order"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async cancelConsignment(
    consignmentId: string
  ): Promise<ProviderResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/order/cancel`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ tracking_id: consignmentId }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
        };
      }

      return this.errorResponse("API_ERROR", data.message || "Cancel failed");
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/order/track?tracking_id=${trackingCode}`,
        {
          method: "GET",
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (data.success && data.tracking_info) {
        const updates: TrackingUpdate[] = (data.tracking_info.logs || []).map(
          (log: any) => ({
            status: log.status,
            statusDescription: log.comment || log.status,
            location: log.location || "",
            timestamp: log.time,
            raw: log,
          })
        );

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: this.normalizeStatus(
              data.tracking_info.current_status || ""
            ),
            statusDescription: data.tracking_info.current_status || "",
            estimatedDelivery: null,
            updates,
          },
        };
      }

      return this.errorResponse("API_ERROR", "Tracking not found");
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
      data: { labelUrl: `https://paperfly.com.bd/label/${consignmentId}` },
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
          location: body.location || "",
          eventTime: body.timestamp || new Date().toISOString(),
          raw: body,
        },
      };
    } catch (err: any) {
      return this.errorResponse("WEBHOOK_ERROR", err.message);
    }
  }

  private normalizeStatus(raw: string): ShipmentStatus {
    const map: Record<string, ShipmentStatus> = {
      pending: "created",
      pickup_requested: "pickup_requested",
      picked: "picked_up",
      in_hub: "hub_received",
      in_transit: "in_transit",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered",
      failed: "delivery_failed",
      returned: "returned_to_origin",
      cancelled: "cancelled",
    };
    return map[raw.toLowerCase()] ?? "in_transit";
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
