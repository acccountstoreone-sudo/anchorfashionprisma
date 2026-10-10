// ============================================================================
// FedEx Provider — International
// API: https://apis.fedex.com
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

interface FedExToken {
  accessToken: string;
  expiresAt: number;
}

export class FedExProvider implements ICourierProvider {
  readonly id = "fedex" as const;
  readonly name = "FedEx";
  readonly isSandbox: boolean;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountNumber: string;
  private readonly baseUrl: string;
  private tokenCache: FedExToken | null = null;

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.clientId = config.clientId ?? "";
    this.clientSecret = config.clientSecret ?? "";
    this.accountNumber = config.accountNumber ?? "";
    this.isSandbox = isSandbox;
    this.baseUrl = isSandbox
      ? "https://apis-sandbox.fedex.com"
      : "https://apis.fedex.com";
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const data = await response.json();
    if (!data.access_token) throw new Error("FedEx: failed to obtain token");

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    return this.tokenCache.accessToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-locale": "en_US",
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const headers = await this.authHeaders();

      const payload = {
        labelResponseOptions: "URL_ONLY",
        requestedShipment: {
          shipper: {
            contact: {
              companyName: "Anchor Fashion",
              phoneNumber: "+8801700000000",
            },
            address: {
              streetLines: ["House 12, Dhanmondi"],
              city: "Dhaka",
              countryCode: "BD",
            },
          },
          recipients: [
            {
              contact: {
                personName: request.recipientName,
                phoneNumber: request.recipientPhone,
              },
              address: {
                streetLines: [request.recipientAddress],
                city: request.recipientCity || "Dhaka",
                countryCode: "BD",
              },
            },
          ],
          serviceType: "FEDEX_EXPRESS_SAVER",
          packagingType: "YOUR_PACKAGING",
          pickupType: "USE_SCHEDULED_PICKUP",
          requestedPackageLineItems: [
            {
              weight: { units: "KG", value: request.weight ?? 0.5 },
            },
          ],
        },
        accountNumber: { value: this.accountNumber },
      };

      const response = await fetch(`${this.baseUrl}/ship/v1/shipments`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const shipmentDetail = data.output?.transactionShipments?.[0];

      if (shipmentDetail?.masterTrackingNumber) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            trackingCode: shipmentDetail.masterTrackingNumber,
            consignmentId: shipmentDetail.masterTrackingNumber,
            labelUrl:
              shipmentDetail.pieceResponses?.[0]?.packageDocuments?.[0]?.url,
            status: "created",
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.errors?.[0]?.message || "FedEx shipment creation failed"
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

      const response = await fetch(`${this.baseUrl}/ship/v1/shipments/cancel`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          accountNumber: { value: this.accountNumber },
          trackingNumber: consignmentId,
        }),
      });

      if (response.ok) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
        };
      }

      const data = await response.json();
      return this.errorResponse(
        "API_ERROR",
        data.errors?.[0]?.message || "Cancel failed"
      );
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const headers = await this.authHeaders();

      const response = await fetch(`${this.baseUrl}/track/v1/trackingnumbers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          trackingInfo: [
            { trackingNumberInfo: { trackingNumber: trackingCode } },
          ],
          includeDetailedScans: true,
        }),
      });

      const data = await response.json();
      const track = data.output?.completeTrackResults?.[0]?.trackResults?.[0];

      if (track) {
        const updates: TrackingUpdate[] = (track.scanEvents || []).map(
          (e: any) => ({
            status: e.eventType,
            statusDescription: e.eventDescription,
            location: e.scanLocation?.city || "",
            timestamp: e.date,
            raw: e,
          })
        );

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: this.normalizeStatus(track.latestStatusDetail?.code || ""),
            statusDescription: track.latestStatusDetail?.description || "",
            estimatedDelivery:
              track.estimatedDeliveryTimeWindow?.window?.ends || null,
            updates,
          },
        };
      }

      return this.errorResponse("API_ERROR", "FedEx tracking not found");
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
        labelUrl: `${this.baseUrl}/ship/v1/shipments/${consignmentId}/documents`,
      },
    };
  }

  async processWebhook(
    payload: unknown,
    signature: string
  ): Promise<ProviderResponse<NormalizedWebhookEvent>> {
    try {
      const body = payload as Record<string, any>;
      const event = body.event || body;

      return {
        success: true,
        providerId: this.id,
        timestamp: new Date().toISOString(),
        data: {
          trackingNumber: event.trackingNumber || "",
          consignmentId: String(event.trackingNumber || ""),
          status: this.normalizeStatus(event.eventType || ""),
          statusDescription: event.eventDescription || "",
          location: event.scanLocation?.city || "",
          eventTime: event.timestamp || new Date().toISOString(),
          raw: body,
        },
      };
    } catch (err: any) {
      return this.errorResponse("WEBHOOK_ERROR", err.message);
    }
  }

  private normalizeStatus(raw: string): ShipmentStatus {
    const map: Record<string, ShipmentStatus> = {
      OC: "created",
      PU: "picked_up",
      IT: "in_transit",
      OD: "out_for_delivery",
      DL: "delivered",
      CA: "cancelled",
      DE: "delivery_failed",
      RS: "returned_to_origin",
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
