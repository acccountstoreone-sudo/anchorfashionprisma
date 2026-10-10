// ============================================================================
// Pathao Courier Provider — Full Implementation
// API: https://api-hermes.pathao.com/aladdin/api/v1
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

interface PathaoTokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class PathaoProvider implements ICourierProvider {
  readonly id = "pathao" as const;
  readonly name = "Pathao Courier";
  readonly isSandbox: boolean;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly username: string;
  private readonly password: string;
  private readonly storeId: string;
  private readonly baseUrl: string;
  private tokenCache: PathaoTokenCache | null = null;

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.clientId = config.clientId ?? "";
    this.clientSecret = config.clientSecret ?? "";
    this.username = config.username ?? "";
    this.password = config.password ?? "";
    this.storeId = config.storeId ?? "";
    this.isSandbox = isSandbox;
    this.baseUrl = isSandbox
      ? "https://courier-api-sandbox.pathao.com/aladdin/api/v1"
      : "https://api-hermes.pathao.com/aladdin/api/v1";
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60-second buffer)
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) {
      return this.tokenCache.accessToken;
    }

    // Try refresh token first
    if (this.tokenCache?.refreshToken) {
      try {
        const refreshed = await this.refreshToken(this.tokenCache.refreshToken);
        if (refreshed) return refreshed;
      } catch (_) {}
    }

    // Full auth
    const response = await fetch(`${this.baseUrl}/issue-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: this.password,
        grant_type: "password",
      }),
    });

    const data = await response.json();
    if (!data.access_token)
      throw new Error("Pathao: failed to obtain access token");

    this.tokenCache = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    return this.tokenCache.accessToken;
  }

  private async refreshToken(refreshToken: string): Promise<string | null> {
    const response = await fetch(`${this.baseUrl}/issue-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    if (!data.access_token) return null;

    this.tokenCache = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    return this.tokenCache.accessToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const headers = await this.authHeaders();

      const payload = {
        store_id: this.storeId,
        merchant_order_id: request.orderId,
        recipient_name: request.recipientName,
        recipient_phone: request.recipientPhone,
        recipient_address: request.recipientAddress,
        recipient_city: request.recipientCity
          ? parseInt(request.recipientCity, 10) || 1
          : 1,
        recipient_zone: request.recipientZone
          ? parseInt(request.recipientZone, 10) || 1
          : 1,
        delivery_type: 48, // 48 = Normal; 12 = On-demand
        item_type: 2, // 2 = Parcel
        special_instruction: request.instructions ?? "",
        item_quantity: 1,
        item_weight: request.weight ?? 0.5,
        amount_to_collect: request.codAmount,
        item_description: `Order ${request.invoiceNumber}`,
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.type === "success" && data.data) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            trackingCode: data.data.consignment_id,
            consignmentId: String(data.data.consignment_id),
            status: "created",
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.message || "Failed to create Pathao consignment"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async cancelConsignment(
    consignmentId: string
  ): Promise<ProviderResponse<void>> {
    // Pathao does not support cancel via API — must be done via portal
    return {
      success: false,
      providerId: this.id,
      timestamp: new Date().toISOString(),
      error: {
        code: "NOT_SUPPORTED",
        message:
          "Pathao does not support API cancellation. Use the Pathao portal.",
      },
    };
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const headers = await this.authHeaders();

      const response = await fetch(
        `${this.baseUrl}/orders/${trackingCode}/info`,
        {
          method: "GET",
          headers,
        }
      );

      const data = await response.json();

      if (data.type === "success" && data.data) {
        const order = data.data;
        const updates: TrackingUpdate[] = (order.log || []).map((log: any) => ({
          status: log.status,
          statusDescription: log.comment || log.status,
          location: "",
          timestamp: log.created_at,
          raw: log,
        }));

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: this.normalizeStatus(order.order_status),
            statusDescription: order.order_status || "",
            estimatedDelivery: null,
            updates,
          },
        };
      }

      return this.errorResponse("API_ERROR", "Tracking info not found");
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async generateLabel(
    consignmentId: string
  ): Promise<ProviderResponse<{ labelUrl: string }>> {
    try {
      const headers = await this.authHeaders();

      const response = await fetch(`${this.baseUrl}/print/order-label`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orders: [consignmentId] }),
      });

      const data = await response.json();

      if (data.type === "success" && data.data?.label_url) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: { labelUrl: data.data.label_url },
        };
      }

      return this.errorResponse("API_ERROR", "Failed to generate Pathao label");
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async processWebhook(
    payload: unknown,
    signature: string
  ): Promise<ProviderResponse<NormalizedWebhookEvent>> {
    try {
      const body = payload as Record<string, any>;
      const normalized = this.normalizeStatus(body.order_status || "");

      return {
        success: true,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        data: {
          trackingNumber: body.consignment_id || body.merchant_order_id || "",
          consignmentId: String(body.consignment_id || ""),
          status: normalized,
          statusDescription: body.order_status || "",
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
      Pending: "created",
      Processing: "pickup_requested",
      Picked: "picked_up",
      "In Transit": "in_transit",
      "Out for Delivery": "out_for_delivery",
      Delivered: "delivered",
      Return: "returned_to_origin",
      "Return in Transit": "returned_to_origin",
      Cancelled: "cancelled",
      Hold: "in_transit",
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
