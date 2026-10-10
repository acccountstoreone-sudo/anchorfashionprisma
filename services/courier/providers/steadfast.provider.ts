// ============================================================================
// Steadfast Courier Provider — Full Implementation
// API: https://portal.packzy.com/api/v1
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
import crypto from "crypto";

export class SteadfastProvider implements ICourierProvider {
  readonly id = "steadfast" as const;
  readonly name = "Steadfast Courier";
  readonly isSandbox: boolean;

  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl = "https://portal.packzy.com/api/v1";

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.apiKey = config.apiKey ?? "";
    this.secretKey = config.secretKey ?? "";
    this.isSandbox = isSandbox;
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      "Api-Key": this.apiKey,
      "Secret-Key": this.secretKey,
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const payload = {
        invoice: request.invoiceNumber,
        recipient_name: request.recipientName,
        recipient_phone: request.recipientPhone,
        recipient_address: request.recipientAddress,
        cod_amount: request.codAmount,
        note: request.instructions ?? "",
      };

      const response = await fetch(`${this.baseUrl}/create_order`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 200 && data.consignment) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            trackingCode: data.consignment.tracking_code,
            consignmentId: String(data.consignment.consignment_id),
            status: "created",
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.message || "Failed to create consignment"
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
        `${this.baseUrl}/delete_order/${consignmentId}`,
        {
          method: "DELETE",
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (data.status === 200) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
        };
      }
      return this.errorResponse(
        "API_ERROR",
        data.message || "Failed to cancel consignment"
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
        `${this.baseUrl}/status_by_trackingcode/${trackingCode}`,
        {
          method: "GET",
          headers: this.headers,
        }
      );

      const data = await response.json();

      if (data.status === 200) {
        const updates: TrackingUpdate[] = (data.activity_log || []).map(
          (log: any) => ({
            status: log.status,
            statusDescription: log.status_message || log.status,
            location: log.location || "",
            timestamp: log.created_at || new Date().toISOString(),
            raw: log,
          })
        );

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: data.delivery_status,
            statusDescription: data.delivery_status,
            estimatedDelivery: null,
            updates,
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        "Failed to retrieve tracking info"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async generateLabel(
    consignmentId: string
  ): Promise<ProviderResponse<{ labelUrl: string }>> {
    // Steadfast generates label via portal; return the deep-link
    return {
      success: true,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      data: {
        labelUrl: `https://portal.packzy.com/print-label/${consignmentId}`,
      },
    };
  }

  async processWebhook(
    payload: unknown,
    signature: string
  ): Promise<ProviderResponse<NormalizedWebhookEvent>> {
    try {
      const body = payload as Record<string, any>;
      const normalized = this.normalizeStatus(
        body.status || body.delivery_status || ""
      );

      return {
        success: true,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        data: {
          trackingNumber: body.tracking_code || body.consignment_id || "",
          consignmentId: String(body.consignment_id || ""),
          status: normalized,
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
      "In Review": "pickup_requested",
      Approved: "pickup_confirmed",
      Delivered: "delivered",
      "Partial Delivered": "delivery_failed",
      Cancelled: "cancelled",
      Hold: "in_transit",
      "In Transit": "in_transit",
      Returned: "returned_to_origin",
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
