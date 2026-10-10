// ============================================================================
// Courier Gateway Service — Updated to use CourierRegistry
// ============================================================================

import { CourierRegistry } from "./courier-registry";
import {
  ConsignmentRequest,
  ConsignmentResponse,
  TrackingResult,
  ProviderResponse,
  NormalizedWebhookEvent,
  CourierProviderCode,
  ICourierProvider,
} from "@/types/shipping.types";

export class CourierGatewayService {
  private static registry = CourierRegistry.getInstance();

  /**
   * Get provider — with optional fallback on failure
   */
  private static async getProvider(
    code: CourierProviderCode,
    useFallback = false
  ): Promise<ICourierProvider> {
    try {
      return await this.registry.get(code);
    } catch (err) {
      if (useFallback) {
        const fallback = await this.registry.getFallback();
        if (fallback) return fallback;
      }
      throw err;
    }
  }

  /**
   * Create consignment. Falls back to fallback provider if primary fails.
   */
  static async createConsignment(
    code: CourierProviderCode,
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>> {
    try {
      const provider = await this.getProvider(code);
      const result = await provider.createConsignment(request);

      if (!result.success) {
        // Attempt fallback
        const fallback = await this.registry.getFallback();
        if (fallback && fallback.id !== code) {
          console.warn(
            `[CourierGateway] Primary provider '${code}' failed. Attempting fallback '${fallback.id}'`
          );
          return fallback.createConsignment(request);
        }
      }

      return result;
    } catch (err: any) {
      return this.buildError(code, err.message);
    }
  }

  /**
   * Cancel consignment
   */
  static async cancelConsignment(
    code: CourierProviderCode,
    consignmentId: string
  ): Promise<ProviderResponse<void>> {
    try {
      const provider = await this.getProvider(code);
      return provider.cancelConsignment(consignmentId);
    } catch (err: any) {
      return this.buildError(code, err.message);
    }
  }

  /**
   * Track shipment
   */
  static async trackShipment(
    code: CourierProviderCode,
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>> {
    try {
      const provider = await this.getProvider(code);
      return provider.trackShipment(trackingCode);
    } catch (err: any) {
      return this.buildError(code, err.message);
    }
  }

  /**
   * Generate label
   */
  static async generateLabel(
    code: CourierProviderCode,
    consignmentId: string
  ): Promise<ProviderResponse<{ labelUrl: string; labelData?: string }>> {
    try {
      const provider = await this.getProvider(code);
      return provider.generateLabel(consignmentId);
    } catch (err: any) {
      return this.buildError(code, err.message);
    }
  }

  /**
   * Process incoming webhook from courier provider
   */
  static async processWebhook(
    code: CourierProviderCode,
    payload: unknown,
    signature: string
  ): Promise<ProviderResponse<NormalizedWebhookEvent>> {
    try {
      const provider = await this.getProvider(code);
      return provider.processWebhook(payload, signature);
    } catch (err: any) {
      return this.buildError(code, err.message);
    }
  }

  /**
   * Get all active providers (for UI selectors / dashboards)
   */
  static async getActiveProviders() {
    return this.registry.getActive();
  }

  /**
   * Force refresh the registry cache
   */
  static async refreshRegistry(): Promise<void> {
    this.registry.invalidate();
    await this.registry.load(true);
  }

  private static buildError(
    code: CourierProviderCode,
    message: string
  ): ProviderResponse<any> {
    return {
      success: false,
      providerId: code,
      timestamp: new Date().toISOString(),
      error: { code: "GATEWAY_ERROR", message },
    };
  }
}
