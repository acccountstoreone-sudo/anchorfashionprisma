import { CourierProvider } from "../courier.interface";
import {
  CourierCode,
  CourierEnvironment,
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingResult,
  HealthCheckResult,
  CODSettlementResult,
  WebhookResult,
} from "../types";
import { SteadfastClient, SteadfastCredentials } from "./client";
import { createSteadfastOrder, cancelSteadfastOrder } from "./orders";
import { getSteadfastTracking, getSteadfastBalance } from "./tracking";
import { handleSteadfastWebhook } from "./webhook";
import { CourierNotConfiguredError } from "../errors";

export interface SteadfastProviderConfig {
  credentials: SteadfastCredentials;
  environment?: CourierEnvironment;
  baseUrl?: string;
}

export class SteadfastCourierProvider implements CourierProvider {
  readonly code: CourierCode = "steadfast";
  readonly name = "Steadfast Courier";
  readonly environment: CourierEnvironment;
  private readonly client: SteadfastClient;

  constructor(config: SteadfastProviderConfig) {
    this.environment = config.environment ?? "sandbox";
    this.client = new SteadfastClient({
      credentials: config.credentials,
      baseUrl: config.baseUrl,
    });
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.isConfigured()) {
      return {
        status: "not_configured",
        responseTime: 0,
        lastCheckedAt: new Date().toISOString(),
        message: "Steadfast credentials are not configured",
      };
    }

    const start = Date.now();
    try {
      // Test connectivity by querying balance endpoint with auth headers
      await this.client.request<{ status: number; current_balance?: number }>(
        "GET",
        "/get_balance"
      );
      const responseTime = Date.now() - start;

      return {
        status: responseTime > 3000 ? "degraded" : "healthy",
        responseTime,
        lastCheckedAt: new Date().toISOString(),
        message:
          responseTime > 3000
            ? `Steadfast API reachable with high latency (${responseTime}ms)`
            : "Steadfast API is reachable and authenticated",
      };
    } catch (err: any) {
      const responseTime = Date.now() - start;
      return {
        status: "unhealthy",
        responseTime,
        lastCheckedAt: new Date().toISOString(),
        message: `Steadfast health check failed: ${err.message}`,
      };
    }
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("steadfast");
    }
    return createSteadfastOrder(this.client, input);
  }

  async getTracking(consignmentIdOrTrackingCode: string): Promise<TrackingResult> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("steadfast");
    }
    return getSteadfastTracking(this.client, consignmentIdOrTrackingCode);
  }

  async cancelShipment(consignmentId: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("steadfast");
    }
    return cancelSteadfastOrder(this.client, consignmentId);
  }

  async getCODSettlement(): Promise<CODSettlementResult> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("steadfast");
    }
    return getSteadfastBalance(this.client);
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    return handleSteadfastWebhook(payload);
  }
}
