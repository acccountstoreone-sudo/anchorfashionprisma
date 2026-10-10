// ============================================================================
// Core Courier Domain & Provider Types
// ============================================================================

export type CourierCode =
  | "pathao"
  | "steadfast"
  | "redx"
  | "paperfly"
  | "carrybee"
  | "sandbox"
  | (string & {});

export type CourierEnvironment = "sandbox" | "production";

export type CourierStatus = "active" | "disabled";

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "not_configured";

export interface HealthCheckResult {
  status: HealthStatus;
  responseTime: number; // in milliseconds
  lastCheckedAt: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface CreateShipmentInput {
  orderId: string;
  invoiceNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientZone?: string;
  recipientArea?: string;
  weightKg: number;
  codAmount: number;
  isCOD: boolean;
  specialInstructions?: string;
  itemDescription?: string;
  itemQuantity?: number;
}

export interface CreateShipmentResult {
  success: boolean;
  consignmentId: string;
  trackingCode: string;
  courierCode: CourierCode;
  statusCode?: string;
  deliveryFee?: number;
  rawResponse?: unknown;
}

export interface TrackingEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
  rawEvent?: unknown;
}

export interface TrackingResult {
  success: boolean;
  consignmentId?: string;
  trackingCode: string;
  currentStatus: string;
  currentStatusNormalized:
    | "created"
    | "pickup_requested"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "delivery_failed"
    | "returned_to_origin"
    | "cancelled"
    | "unknown";
  events: TrackingEvent[];
  updatedAt: string;
}

export interface DeliveryFeeInput {
  weightKg: number;
  recipientCity?: string;
  recipientZone?: string;
  isCOD?: boolean;
}

export interface DeliveryFeeResult {
  deliveryFee: number;
  codFee?: number;
  totalFee: number;
}

export interface CODSettlementResult {
  settledAmount: number;
  pendingAmount: number;
  feeAmount: number;
  currency: string;
  status: "settled" | "pending" | "partial" | "unknown";
  raw?: unknown;
}

export interface CourierApiLogEntry {
  courierCode: CourierCode;
  method: string;
  endpoint: string;
  statusCode: number;
  success: boolean;
  responseTimeMs: number;
  requestId?: string;
  errorMessage?: string;
  payload?: unknown;
  responseData?: unknown;
}

export interface WebhookResult {
  success: boolean;
  handled: boolean;
  shipmentId?: string;
  consignmentId?: string;
  trackingCode?: string;
  status?: string;
  eventTime?: string;
  message?: string;
  rawPayload?: unknown;
}
