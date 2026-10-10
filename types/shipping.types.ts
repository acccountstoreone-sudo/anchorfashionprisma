// ============================================================================
// Enterprise Shipping & Fulfillment — Type Definitions
// Anchor Fashion — Phase 11
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type ShipmentStatus =
  | "created"
  | "pickup_requested"
  | "pickup_confirmed"
  | "picked_up"
  | "in_transit"
  | "hub_received"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned_to_origin"
  | "cancelled";

export type CourierProviderCode =
  | "steadfast"
  | "pathao"
  | "redx"
  | "paperfly"
  | "sundarban"
  | "ecourier"
  | "dhl"
  | "fedex"
  | "ups"
  | "sandbox";

export type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "received"
  | "inventory_synced"
  | "completed"
  | "cancelled";

export type ShippingEventType =
  | "shipment_created"
  | "courier_assigned"
  | "courier_reassigned"
  | "pickup_requested"
  | "pickup_confirmed"
  | "picked_up"
  | "status_updated"
  | "label_generated"
  | "delivered"
  | "delivery_failed"
  | "returned"
  | "cancelled"
  | "webhook_received";

// ============================================================================
// DOMAIN ENTITIES
// ============================================================================

export interface CourierProviderRecord {
  id: string;
  code: CourierProviderCode;
  name: string;
  display_name: string;
  logo_url: string | null;
  is_active: boolean;
  is_cod_supported: boolean;
  is_sandbox: boolean;
  priority: number;
  max_weight_kg: number | null;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  webhook_secret: string | null;
  supported_zones: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  code: string;
  description: string | null;
  districts: string[];
  is_cod_available: boolean;
  is_active: boolean;
  estimated_days_min: number;
  estimated_days_max: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  id: string;
  zone_id: string;
  courier_provider_id: string | null;
  name: string;
  base_rate: number;
  per_kg_rate: number;
  free_shipping_above: number | null;
  min_weight_kg: number;
  max_weight_kg: number | null;
  is_cod_rate: boolean;
  cod_charge: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  order_id: string;
  courier_provider_id: string | null;
  courier_provider_code: CourierProviderCode | null;
  status: ShipmentStatus;

  consignment_id: string | null;
  tracking_number: string | null;
  provider_status: string | null;

  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: string | null;
  recipient_district: string | null;
  recipient_zone_code: string | null;

  delivery_zone_id: string | null;
  shipping_rate_id: string | null;

  shipping_charge: number;
  cod_amount: number;
  is_cod: boolean;

  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;

  pickup_requested_at: string | null;
  pickup_confirmed_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  delivery_failed_at: string | null;
  returned_at: string | null;
  cancelled_at: string | null;
  estimated_delivery_date: string | null;

  label_url: string | null;
  label_generated_at: string | null;

  special_instructions: string | null;
  failure_reason: string | null;
  rto_initiated: boolean;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ShipmentItem {
  id: string;
  shipment_id: string;
  order_item_id: string | null;
  sku: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface ShipmentTrackingEvent {
  id: string;
  shipment_id: string;
  tracking_number: string | null;
  status: string;
  status_description: string | null;
  location: string | null;
  event_time: string;
  provider_raw: Record<string, any>;
  created_at: string;
}

export interface ShipmentLabel {
  id: string;
  shipment_id: string;
  label_type: "pdf" | "zpl" | "png";
  label_url: string | null;
  label_data: string | null;
  generated_at: string;
  printed_at: string | null;
  print_count: number;
  created_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: ShippingEventType;
  payload: Record<string, any>;
  triggered_by: string | null;
  source: "system" | "admin" | "webhook" | "customer";
  created_at: string;
}

export interface ReturnRequest {
  id: string;
  return_number: string;
  order_id: string;
  customer_id: string | null;
  shipment_id: string | null;
  return_shipment_id: string | null;
  status: ReturnStatus;
  reason: string | null;
  return_tracking_number: string | null;
  return_courier_code: CourierProviderCode | null;
  picked_up_at: string | null;
  received_at: string | null;
  inventory_synced_at: string | null;
  completed_at: string | null;
  notes: string | null;
  refund_status?: "PENDING" | "PROCESSING" | "APPROVED" | "PROCESSED" | "REJECTED" | "FAILED" | null;
  refund_amount?: number | null;
  refund_method?: "ORIGINAL_PAYMENT" | "WALLET" | "MANUAL" | null;
  exchange_requested?: boolean;
  exchange_variant_id?: string | null;
  rejection_reason?: string | null;
  customer_note?: string | null;
  internal_note?: string | null;
  photo_urls?: string[];
  approved_at?: string | null;
  rejected_at?: string | null;
  inspected_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  order_item_id: string | null;
  sku: string;
  product_name: string;
  quantity: number;
  reason: string | null;
  condition: "good" | "damaged" | "defective" | "unknown";
  restocked: boolean;
  refund_amount?: number | null;
  created_at: string;
}

// ============================================================================
// EXTENDED COURIER PROVIDER INTERFACE
// ============================================================================

export interface TrackingUpdate {
  status: string;
  statusDescription: string;
  location: string;
  timestamp: string;
  raw?: Record<string, any>;
}

export interface TrackingResult {
  status: string;
  statusDescription: string;
  estimatedDelivery: string | null;
  updates: TrackingUpdate[];
}

export interface ConsignmentRequest {
  orderId: string;
  invoiceNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientDistrict?: string;
  recipientZone?: string;
  codAmount: number;
  weight?: number;
  instructions?: string;
  isCOD: boolean;
}

export interface ConsignmentResponse {
  trackingCode: string;
  consignmentId: string;
  labelUrl?: string;
  status: "created" | "failed";
}

export interface ICourierProvider {
  readonly id: CourierProviderCode;
  readonly name: string;
  readonly isSandbox: boolean;

  createConsignment(
    request: ConsignmentRequest
  ): Promise<ProviderResponse<ConsignmentResponse>>;
  cancelConsignment(consignmentId: string): Promise<ProviderResponse<void>>;
  trackShipment(
    trackingCode: string
  ): Promise<ProviderResponse<TrackingResult>>;
  generateLabel(
    consignmentId: string
  ): Promise<ProviderResponse<{ labelUrl: string; labelData?: string }>>;
  processWebhook(
    payload: unknown,
    signature: string
  ): Promise<ProviderResponse<NormalizedWebhookEvent>>;
}

export interface ProviderResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  providerId: CourierProviderCode;
  timestamp: string;
}

export interface NormalizedWebhookEvent {
  trackingNumber: string;
  consignmentId?: string;
  status: ShipmentStatus;
  statusDescription: string;
  location?: string;
  eventTime: string;
  raw: Record<string, any>;
}

// ============================================================================
// INPUT / DTO TYPES
// ============================================================================

export interface CreateShipmentInput {
  orderId: string;
  courierProviderCode?: CourierProviderCode;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: string;
  recipientDistrict?: string;
  deliveryZoneCode?: string;
  isCOD: boolean;
  codAmount: number;
  weightKg?: number;
  specialInstructions?: string;
  items: Array<{
    orderItemId?: string;
    sku: string;
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface UpdateShipmentInput {
  courierProviderCode?: CourierProviderCode;
  status?: ShipmentStatus;
  trackingNumber?: string;
  consignmentId?: string;
  estimatedDeliveryDate?: string;
  failureReason?: string;
  specialInstructions?: string;
}

export interface AssignCourierInput {
  shipmentId: string;
  courierProviderCode: CourierProviderCode;
  autoSubmit?: boolean; // whether to immediately call provider API
}

export interface CreateReturnInput {
  orderId: string;
  shipmentId?: string;
  reason: string;
  customerNote?: string;
  refundMethod?: "ORIGINAL_PAYMENT" | "WALLET" | "MANUAL";
  exchangeRequested?: boolean;
  exchangeVariantId?: string;
  photoUrls?: string[];
  items: Array<{
    orderItemId?: string;
    sku: string;
    productName: string;
    quantity: number;
    reason?: string;
    condition?: "good" | "damaged" | "defective" | "unknown";
    refundAmount?: number;
  }>;
}

export interface ReturnEligibilityItem {
  orderItemId: string;
  productId: string;
  variantId: string | null;
  sku: string;
  productName: string;
  variantName: string | null;
  purchasedQuantity: number;
  returnedQuantity: number;
  eligibleQuantity: number;
  unitPrice: number;
  lineTotal: number;
  allocatedDiscount: number;
  netRefundablePerUnit: number;
  isEligible: boolean;
}

export interface ReturnEligibilityResult {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  deliveredAt: string | null;
  returnWindowDays: number;
  isWindowOpen: boolean;
  windowExpiresAt: string | null;
  isDelivered: boolean;
  isCustomerOwned: boolean;
  isOrderEligible: boolean;
  ineligibilityReason?: string;
  items: ReturnEligibilityItem[];
  maxRefundableAmount: number;
  paymentMethod: string;
  hasActiveReturn: boolean;
  activeReturnId?: string;
}

export interface SubmitCustomerReturnInput {
  orderId: string;
  reason: string;
  customerNote?: string;
  refundMethod: "ORIGINAL_PAYMENT" | "WALLET" | "MANUAL";
  exchangeRequested?: boolean;
  exchangeVariantId?: string;
  photoUrls?: string[];
  items: Array<{
    orderItemId: string;
    quantity: number;
    reason?: string;
  }>;
}

export interface ShippingChargeCalculation {
  baseRate: number;
  weightCharge: number;
  codCharge: number;
  total: number;
  isFreeShipping: boolean;
  zone: DeliveryZone | null;
  rate: ShippingRate | null;
}

// ============================================================================
// TRACKING TIMELINE
// ============================================================================

export interface TrackingTimeline {
  shipmentNumber: string;
  trackingNumber: string | null;
  courierName: string;
  currentStatus: ShipmentStatus;
  estimatedDelivery: string | null;
  events: TrackingTimelineEvent[];
}

export interface TrackingTimelineEvent {
  id: string;
  status: string;
  statusLabel: string;
  description: string | null;
  location: string | null;
  timestamp: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

// ============================================================================
// PAGINATION & FILTERS
// ============================================================================

export interface ShipmentFilters {
  status?: ShipmentStatus;
  courierCode?: CourierProviderCode;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReturnFilters {
  status?: ReturnStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// AGGREGATED VIEW TYPES
// ============================================================================

export interface ShipmentWithDetails extends Shipment {
  items?: ShipmentItem[];
  tracking_events?: ShipmentTrackingEvent[];
  labels?: ShipmentLabel[];
  events?: ShipmentEvent[];
  courier?: Pick<
    CourierProviderRecord,
    "id" | "code" | "display_name" | "logo_url"
  >;
  zone?: Pick<
    DeliveryZone,
    "id" | "name" | "code" | "estimated_days_min" | "estimated_days_max"
  >;
  order_number?: string;
}

export interface ReturnWithItems extends ReturnRequest {
  items?: ReturnItem[];
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface DeliveryAnalytics {
  date: string;
  courier_provider_code: CourierProviderCode;
  total_shipments: number;
  delivered: number;
  failed: number;
  rto: number;
  cancelled: number;
  delivery_success_rate: number;
  avg_delivery_hours: number | null;
  total_revenue: number;
  cod_collected: number;
}

export interface CourierPerformance {
  code: CourierProviderCode;
  name: string;
  totalShipments: number;
  delivered: number;
  failed: number;
  rto: number;
  successRate: number;
  avgDeliveryHours: number | null;
}

// ============================================================================
// MANIFEST
// ============================================================================

export interface ManifestEntry {
  shipmentNumber: string;
  orderNumber: string;
  trackingNumber: string | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  weight: number | null;
  codAmount: number;
  isCOD: boolean;
}
