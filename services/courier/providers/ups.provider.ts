// ============================================================================
// UPS Provider — International
// API: https://onlinetools.ups.com/api
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

interface UPSToken {
  accessToken: string;
  expiresAt: number;
}

export class UPSProvider implements ICourierProvider {
  readonly id = "ups" as const;
  readonly name = "UPS";
  readonly isSandbox: boolean;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountNumber: string;
  private readonly baseUrl: string;
  private tokenCache: UPSToken | null = null;

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.clientId = config.clientId ?? "";
    this.clientSecret = config.clientSecret ?? "";
    this.accountNumber = config.accountNumber ?? "";
    this.isSandbox = isSandbox;
    this.baseUrl = isSandbox
      ? "https://wwwcie.ups.com/api"
      : "https://onlinetools.ups.com/api";
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/security/v1/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });

    const data = await response.json();
    if (!data.access_token) throw new Error("UPS: failed to obtain token");

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (parseInt(data.expires_in) || 3600) * 1000,
    };

    return this.tokenCache.accessToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      transId: `af-${Date.now()}`,
      transactionSrc: "anchor-fashion",
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const headers = await this.authHeaders();

      const payload = {
        ShipmentRequest: {
          Shipment: {
            Shipper: {
              Name: "Anchor Fashion",
              ShipperNumber: this.accountNumber,
              Address: {
                AddressLine: ["House 12, Dhanmondi"],
                City: "Dhaka",
                CountryCode: "BD",
              },
            },
            ShipTo: {
              Name: request.recipientName,
              Phone: { Number: request.recipientPhone },
              Address: {
                AddressLine: [request.recipientAddress],
                City: request.recipientCity || "Dhaka",
                CountryCode: "BD",
              },
            },
            Service: { Code: "11", Description: "UPS Standard" },
            Package: [
              {
                PackagingType: { Code: "02" },
                PackageWeight: {
                  UnitOfMeasurement: { Code: "KGS" },
                  Weight: String(request.weight ?? 0.5),
                },
              },
            ],
          },
          LabelSpecification: { LabelImageFormat: { Code: "GIF" } },
        },
      };

      const response = await fetch(`${this.baseUrl}/shipments/v1/ship`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const result = data.ShipmentResponse?.ShipmentResults;

      if (result?.ShipmentIdentificationNumber) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            trackingCode: result.ShipmentIdentificationNumber,
            consignmentId: result.ShipmentIdentificationNumber,
            status: "created",
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.response?.errors?.[0]?.message || "UPS creation failed"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async cancelConsignment(
    consignmentId: string
  ): Promise<ProviderResponse<void>> {
    try {
      const headers = await this.authHeaders();

      const response = await fetch(
        `${this.baseUrl}/shipments/v1/void/cancel/${consignmentId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (response.ok) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
        };
      }

      return this.errorResponse("API_ERROR", "UPS void failed");
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const headers = await this.authHeaders();

      const response = await fetch(
        `${this.baseUrl}/track/v1/details/${trackingCode}?locale=en_US&returnSignature=false`,
        { method: "GET", headers }
      );

      const data = await response.json();
      const shipment = data.trackResponse?.shipment?.[0];

      if (shipment) {
        const updates: TrackingUpdate[] = (shipment.activity || []).map(
          (a: any) => ({
            status: a.status?.type || "",
            statusDescription: a.status?.description || "",
            location:
              `${a.location?.address?.city || ""}, ${a.location?.address?.country || ""}`
                .trim()
                .replace(/^,\s*/, ""),
            timestamp: `${a.date}T${a.time}`,
            raw: a,
          })
        );

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: this.normalizeStatus(shipment.currentStatus?.code || ""),
            statusDescription: shipment.currentStatus?.description || "",
            estimatedDelivery: shipment.deliveryDate?.[0]?.date || null,
            updates,
          },
        };
      }

      return this.errorResponse("API_ERROR", "UPS tracking not found");
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
      data: {
        labelUrl: `https://wwwapps.ups.com/doapp/shopnship/handleShopnShip?loc=en_US&packageId=${consignmentId}`,
      },
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
          trackingNumber: body.trackingNumber || "",
          consignmentId: String(body.trackingNumber || ""),
          status: this.normalizeStatus(body.statusCode || ""),
          statusDescription: body.statusDescription || "",
          location: body.location || "",
          eventTime: body.eventDateTime || new Date().toISOString(),
          raw: body,
        },
      };
    } catch (err: any) {
      return this.errorResponse("WEBHOOK_ERROR", err.message);
    }
  }

  private normalizeStatus(raw: string): ShipmentStatus {
    const map: Record<string, ShipmentStatus> = {
      M: "created", // Billing info received
      P: "picked_up", // Pickup
      I: "in_transit", // In transit
      O: "out_for_delivery",
      D: "delivered",
      X: "delivery_failed",
      RS: "returned_to_origin",
      V: "cancelled",
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
