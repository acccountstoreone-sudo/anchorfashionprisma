// ============================================================================
// DHL Express Provider — International
// API: https://api.dhl.com/ecs/pudo
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

export class DHLProvider implements ICourierProvider {
  readonly id = "dhl" as const;
  readonly name = "DHL Express";
  readonly isSandbox: boolean;

  private readonly apiKey: string;
  private readonly accountNumber: string;
  private readonly baseUrl: string;

  constructor(config: Record<string, any>, isSandbox: boolean) {
    this.apiKey = config.apiKey ?? "";
    this.accountNumber = config.accountNumber ?? "";
    this.isSandbox = isSandbox;
    this.baseUrl = isSandbox
      ? "https://express.api.dhl.com/mydhlapi/test"
      : "https://express.api.dhl.com/mydhlapi";
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`,
    };
  }

  async createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const shipDate = new Date();
      shipDate.setDate(shipDate.getDate() + 1);

      const payload = {
        plannedShippingDateAndTime: shipDate
          .toISOString()
          .replace(/\.\d{3}Z/, " GMT+0600"),
        pickup: { isRequested: true },
        productCode: "D", // Domestic Express
        accounts: [{ typeCode: "shipper", number: this.accountNumber }],
        customerDetails: {
          shipperDetails: {
            postalAddress: {
              postalCode: "1213",
              cityName: "Dhaka",
              countryCode: "BD",
              addressLine1: "House 12, Road 5, Dhanmondi",
            },
            contactInformation: {
              fullName: "Anchor Fashion",
              phone: "+8801700000000",
              email: "logistics@anchorfashion.com",
            },
          },
          receiverDetails: {
            postalAddress: {
              cityName: request.recipientCity || "Dhaka",
              countryCode: "BD",
              addressLine1: request.recipientAddress,
            },
            contactInformation: {
              fullName: request.recipientName,
              phone: request.recipientPhone,
            },
          },
        },
        content: {
          packages: [
            {
              weight: request.weight ?? 0.5,
              dimensions: { length: 20, width: 15, height: 5 },
            },
          ],
          isCustomsDeclarable: false,
          description: `Order ${request.invoiceNumber}`,
          unitOfMeasurement: "metric",
        },
      };

      const response = await fetch(`${this.baseUrl}/shipments`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.shipmentTrackingNumber) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            trackingCode: data.shipmentTrackingNumber,
            consignmentId: String(data.shipmentTrackingNumber),
            labelUrl: data.documents?.[0]?.content ?? undefined,
            status: "created",
          },
        };
      }

      return this.errorResponse(
        "API_ERROR",
        data.title || "Failed to create DHL shipment"
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
        `${this.baseUrl}/shipments/${consignmentId}/cancel`,
        {
          method: "DELETE",
          headers: this.headers,
        }
      );

      if (response.status === 200 || response.status === 204) {
        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
        };
      }

      return this.errorResponse("API_ERROR", "DHL cancellation failed");
    } catch (err: any) {
      return this.errorResponse("EXCEPTION", err.message);
    }
  }

  async trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/shipments?trackingNumber=${trackingCode}&service=express`,
        { method: "GET", headers: this.headers }
      );

      const data = await response.json();
      const shipment = data.shipments?.[0];

      if (shipment) {
        const updates: TrackingUpdate[] = (shipment.events || []).map(
          (e: any) => ({
            status: e.typeCode,
            statusDescription: e.description,
            location: e.serviceArea?.[0]?.description || "",
            timestamp: e.timestamp,
            raw: e,
          })
        );

        return {
          success: true,
          providerId: this.id,
          timestamp: new Date().toISOString(),
          data: {
            status: this.normalizeStatus(shipment.status || ""),
            statusDescription: shipment.description || "",
            estimatedDelivery: shipment.estimatedDeliveryTime || null,
            updates,
          },
        };
      }

      return this.errorResponse("API_ERROR", "Shipment not found");
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
        labelUrl: `https://express.api.dhl.com/mydhlapi/shipments/${consignmentId}/documents`,
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
          trackingNumber: body.shipmentTrackingNumber || "",
          consignmentId: String(body.shipmentTrackingNumber || ""),
          status: this.normalizeStatus(body.status || ""),
          statusDescription: body.description || "",
          location: body.location?.address?.addressLocality || "",
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
      SHIPMENT_CREATED: "created",
      TRANSIT: "in_transit",
      DELIVERED: "delivered",
      DELIVERY_FAILURE: "delivery_failed",
      RETURNED: "returned_to_origin",
      CANCELLED: "cancelled",
      PU: "picked_up",
      WC: "out_for_delivery",
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
