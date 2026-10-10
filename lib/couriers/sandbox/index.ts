import { CourierProvider } from "../courier.interface";
import {
  CourierCode,
  CourierEnvironment,
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingResult,
  HealthCheckResult,
  DeliveryFeeInput,
  DeliveryFeeResult,
  CODSettlementResult,
  WebhookResult,
} from "../types";

export interface SandboxProviderConfig {
  credentials?: Record<string, any>;
  environment?: CourierEnvironment;
  simulateFailure?: boolean;
  simulateDelayMs?: number;
}

export class SandboxCourierProvider implements CourierProvider {
  readonly code: CourierCode = "sandbox";
  readonly name: string = "Sandbox / Mock Courier";
  readonly environment: CourierEnvironment;
  private readonly config: Record<string, any>;

  constructor(config?: SandboxProviderConfig) {
    this.config = config?.credentials || {};
    this.environment = config?.environment ?? "sandbox";
  }

  isConfigured(): boolean {
    // Sandbox / mock courier is always ready for testing in dev & staging
    return true;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const simulateFailure =
      this.config.simulateFailure === true ||
      this.config.simulateFailure === "true" ||
      this.config.simulateUnhealthy === true;

    const delay = Number(this.config.simulateDelayMs) || 15;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 500)));
    }

    if (simulateFailure) {
      return {
        status: "unhealthy",
        responseTime: delay,
        lastCheckedAt: new Date().toISOString(),
        message: "Sandbox simulated failure: provider is set to unhealthy state",
      };
    }

    return {
      status: "healthy",
      responseTime: delay,
      lastCheckedAt: new Date().toISOString(),
      message: "Sandbox courier is connected (Simulation Mode)",
      details: {
        mode: "mock_simulation",
        environment: this.environment,
        features: ["createShipment", "getTracking", "cancelShipment", "webhook"],
      },
    };
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `SBOX-${timestamp}-${randomSuffix}`;
    const consignmentId = `CSID-${trackingCode}`;

    const feeCalculation = await this.calculateDeliveryFee({
      weightKg: input.weightKg,
      recipientCity: input.recipientCity,
      recipientZone: input.recipientZone,
      isCOD: input.isCOD,
    });

    return {
      success: true,
      consignmentId,
      trackingCode,
      courierCode: "sandbox",
      statusCode: "created",
      deliveryFee: feeCalculation.totalFee,
      rawResponse: {
        status: "success",
        message: "Sandbox mock shipment created successfully",
        consignmentId,
        trackingCode,
        orderId: input.orderId,
        invoiceNumber: input.invoiceNumber,
        recipient: {
          name: input.recipientName,
          phone: input.recipientPhone,
          address: input.recipientAddress,
          city: input.recipientCity,
        },
        codAmount: input.codAmount,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async getTracking(consignmentIdOrTrackingCode: string): Promise<TrackingResult> {
    const now = Date.now();
    return {
      success: true,
      consignmentId: consignmentIdOrTrackingCode.startsWith("CSID-")
        ? consignmentIdOrTrackingCode
        : `CSID-${consignmentIdOrTrackingCode}`,
      trackingCode: consignmentIdOrTrackingCode,
      currentStatus: "In Transit",
      currentStatusNormalized: "in_transit",
      updatedAt: new Date(now).toISOString(),
      events: [
        {
          status: "created",
          description: "Shipment registered in Sandbox logistics hub",
          location: "Anchor Fashion Central Warehouse",
          timestamp: new Date(now - 7200000).toISOString(),
        },
        {
          status: "picked_up",
          description: "Parcel collected by Sandbox mock rider",
          location: "Tejgaon Hub, Dhaka",
          timestamp: new Date(now - 3600000).toISOString(),
        },
        {
          status: "in_transit",
          description: "Shipment is in transit to delivery zone",
          location: "Dhaka Regional Sorting Center",
          timestamp: new Date(now).toISOString(),
        },
      ],
    };
  }

  async cancelShipment(consignmentId: string): Promise<{ success: boolean; message?: string }> {
    return {
      success: true,
      message: `Sandbox consignment ${consignmentId} was successfully cancelled in simulation.`,
    };
  }

  async calculateDeliveryFee(input: DeliveryFeeInput): Promise<DeliveryFeeResult> {
    const cityName = (input.recipientCity || input.recipientZone || "").toLowerCase();
    const isInsideDhaka = cityName.includes("dhaka");
    const baseFee = isInsideDhaka ? 60 : 120;
    const weight = Math.max(1, input.weightKg || 1);
    const extraWeightFee = Math.max(0, Math.ceil(weight - 1) * 20);
    const codFee = input.isCOD ? 10 : 0;
    const deliveryFee = baseFee + extraWeightFee;

    return {
      deliveryFee,
      codFee,
      totalFee: deliveryFee + codFee,
    };
  }

  async getCODSettlement(): Promise<CODSettlementResult> {
    return {
      settledAmount: 0,
      pendingAmount: 0,
      feeAmount: 0,
      currency: "BDT",
      status: "settled",
      raw: { simulation: true },
    };
  }

  async handleWebhook(
    payload: unknown,
    _headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookResult> {
    const data = (payload || {}) as Record<string, any>;
    const trackingCode = data.trackingCode || data.tracking_code || "SBOX-TEST-001";
    const consignmentId = data.consignmentId || data.consignment_id || `CSID-${trackingCode}`;

    return {
      success: true,
      handled: true,
      consignmentId,
      trackingCode,
      status: data.status || "delivered",
      eventTime: data.eventTime || new Date().toISOString(),
      message: "Sandbox mock webhook processed successfully",
      rawPayload: data,
    };
  }
}
