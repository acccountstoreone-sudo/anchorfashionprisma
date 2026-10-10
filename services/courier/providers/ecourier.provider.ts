// ============================================================================
// eCourier Provider
// API: https://ecourier.com.bd/api
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

export class ECourierProvider implements ICourierProvider {
  readonly id = "ecourier" as const;
  readonly name = "eCourier";
  readonly isSandbox: boolean;

  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly userId: string;
  private readonly baseUrl = "https://ecourier.com.bd/api";

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.apiKey = config.apiKey ?? "";
    this.apiSecret = config.apiSecret ?? "";
    this.userId = config.userId ?? "";
    this.isSandbox = isSandbox;
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      "API-KEY": this.apiKey,
      "API-SECRET": this.apiSecret,
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const payload = {
        userId: this.userId,
        invoice: request.invoiceNumber,
        name: request.recipientName,
        phone: request.recipientPhone,
        address: request.recipientAddress,
        thana: request.recipientCity || "Dhaka",
        district: request.recipientDistrict || "Dhaka",
        parcel_type: "OA", // OA = Outside Area
        quantity: 1,
        weight: request.weight ?? 0.5,
        cod: request.codAmount,
        note: request.instructions ?? "",
      };

      const response = await fetch(`${this.baseUrl}/parcel`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.tracking_code) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            trackingCode: data.tracking_code,
            consignmentId: String(data.tracking_code),
            status: "created",
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.msg || "Failed to create eCourier parcel"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async cancelConsignment(
    consignmentId: string
  ): Promise<ProviderResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/parcel/cancel`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ tracking_code: consignmentId }),
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
        };
      }

      return this.errorResponse("API_ERROR", data.msg || "Cancel failed");
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/parceltrack?tracking_code=${trackingCode}`,
        {
          method: "GET",
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        const updates: TrackingUpdate[] = (data.data.trackHistory || []).map(
          (h: any) => ({
            status: h.status,
            statusDescription: h.details || h.status,
            location: h.location || "",
            timestamp: h.date,
            raw: h,
          })
        );

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: this.normalizeStatus(data.data.status || ""),
            statusDescription: data.data.status || "",
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
      data: { labelUrl: `https://ecourier.com.bd/label/${consignmentId}` },
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
          trackingNumber: body.tracking_code || "",
          consignmentId: String(body.tracking_code || ""),
          status: this.normalizeStatus(body.status || ""),
          statusDescription: body.status || "",
          location: body.location || "",
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
      Pending: "created",
      "Pickup Requested": "pickup_requested",
      "Picked Up": "picked_up",
      "In Transit": "in_transit",
      "Out for Delivery": "out_for_delivery",
      Delivered: "delivered",
      Failed: "delivery_failed",
      Return: "returned_to_origin",
      Cancelled: "cancelled",
    };
    return map[raw] ?? "in_transit";
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
