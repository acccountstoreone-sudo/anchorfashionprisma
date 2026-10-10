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
} from "./types";

export interface CourierProvider {
  readonly code: CourierCode;
  readonly name: string;
  readonly environment: CourierEnvironment;

  /**
   * Validates if credentials are present and configured
   */
  isConfigured(): boolean;

  /**
   * Health check to test API reachability, measuring latency
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Create a shipment consignment with the courier partner
   */
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;

  /**
   * Retrieve live tracking events and normalized status
   */
  getTracking(consignmentIdOrTrackingCode: string): Promise<TrackingResult>;

  /**
   * Cancel an existing shipment if supported
   */
  cancelShipment(consignmentId: string): Promise<{ success: boolean; message?: string }>;

  /**
   * Calculate delivery and COD fees
   */
  calculateDeliveryFee?(input: DeliveryFeeInput): Promise<DeliveryFeeResult>;

  /**
   * Fetch COD settlement status from provider
   */
  getCODSettlement?(params?: Record<string, unknown>): Promise<CODSettlementResult>;

  /**
   * Parse and validate incoming webhook payload
   */
  handleWebhook?(
    payload: unknown,
    headers?: Record<string, string | string[] | undefined>
  ): Promise<WebhookResult>;
}
