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
  WebhookResult,
} from "../types";
import { PathaoClient } from "./client";
import { PathaoCredentials } from "./auth";
import { createPathaoOrder, cancelPathaoOrder } from "./orders";
import { getPathaoTracking, calculatePathaoFee } from "./tracking";
import { handlePathaoWebhook } from "./webhook";
import { CourierNotConfiguredError } from "../errors";

export interface PathaoProviderConfig {
  credentials: PathaoCredentials;
  environment?: CourierEnvironment;
  storeId?: string;
  webhookSecret?: string;
}

export class PathaoCourierProvider implements CourierProvider {
  readonly code: CourierCode = "pathao";
  readonly name = "Pathao Courier";
  readonly environment: CourierEnvironment;
  private readonly client: PathaoClient;
  private readonly storeId?: string;
  private readonly webhookSecret?: string;

  constructor(config: PathaoProviderConfig) {
    this.environment = config.environment ?? "sandbox";
    this.storeId = config.storeId || config.credentials.storeId;
    this.webhookSecret = config.webhookSecret;

    const baseUrl =
      this.environment === "production"
        ? "https://api-hermes.pathao.com"
        : "https://courier-api-sandbox.pathao.com";

    this.client = new PathaoClient({
      baseUrl,
      credentials: config.credentials,
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
        message: "Pathao credentials are not configured",
      };
    }

    const start = Date.now();
    try {
      // Attempt token acquisition to verify reachability and credentials
      await this.client.auth.getAccessToken();
      const responseTime = Date.now() - start;

      return {
        status: responseTime > 3000 ? "degraded" : "healthy",
        responseTime,
        lastCheckedAt: new Date().toISOString(),
        message:
          responseTime > 3000
            ? `Pathao API reachable with high latency (${responseTime}ms)`
            : "Pathao API is reachable and authenticated",
      };
    } catch (err: any) {
      const responseTime = Date.now() - start;
      return {
        status: "unhealthy",
        responseTime,
        lastCheckedAt: new Date().toISOString(),
        message: `Pathao health check failed: ${err.message}`,
      };
    }
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("pathao");
    }
    return createPathaoOrder(this.client, input, this.storeId);
  }

  async getTracking(consignmentIdOrTrackingCode: string): Promise<TrackingResult> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("pathao");
    }
    return getPathaoTracking(this.client, consignmentIdOrTrackingCode);
  }

  async cancelShipment(consignmentId: string): Promise<{ success: boolean; message?: string }> {
    if (!this.isConfigured()) {
      throw new CourierNotConfiguredError("pathao");
    }
    return cancelPathaoOrder(this.client, consignmentId);
  }

  async calculateDeliveryFee(input: DeliveryFeeInput): Promise<DeliveryFeeResult> {
    return calculatePathaoFee(this.client, input, this.storeId);
  }

  async handleWebhook(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookResult> {
    return handlePathaoWebhook(payload, this.webhookSecret, headers);
  }
}
