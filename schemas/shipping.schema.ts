// ============================================================================
// Shipping Validation Schemas (Zod)
// ============================================================================

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const courierProviderCodeSchema = z.enum([
  "steadfast",
  "pathao",
  "redx",
  "paperfly",
  "sundarban",
  "ecourier",
  "dhl",
  "fedex",
  "ups",
  "sandbox",
]);

export const shipmentStatusSchema = z.enum([
  "created",
  "pickup_requested",
  "pickup_confirmed",
  "picked_up",
  "in_transit",
  "hub_received",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "returned_to_origin",
  "cancelled",
]);

export const returnStatusSchema = z.enum([
  "requested",
  "approved",
  "rejected",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "received",
  "inventory_synced",
  "completed",
  "cancelled",
]);

// ============================================================================
// SHIPMENT SCHEMAS
// ============================================================================

export const shipmentItemInputSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  sku: z.string().min(1, "SKU is required"),
  productName: z.string().min(1, "Product name is required"),
  variantName: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
});

export const createShipmentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  courierProviderCode: courierProviderCodeSchema.optional(),
  recipientName: z.string().min(2, "Recipient name is required"),
  recipientPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
  recipientAddress: z
    .string()
    .min(10, "Address must be at least 10 characters"),
  recipientCity: z.string().optional(),
  recipientDistrict: z.string().optional(),
  deliveryZoneCode: z.string().optional(),
  isCOD: z.boolean(),
  codAmount: z.number().min(0, "COD amount cannot be negative"),
  weightKg: z
    .number()
    .min(0.01, "Weight must be positive")
    .max(100, "Maximum weight is 100kg")
    .optional(),
  specialInstructions: z.string().max(500).optional(),
  items: z
    .array(shipmentItemInputSchema)
    .min(1, "At least one item is required"),
});

export const updateShipmentSchema = z
  .object({
    courierProviderCode: courierProviderCodeSchema.optional(),
    status: shipmentStatusSchema.optional(),
    trackingNumber: z.string().optional(),
    consignmentId: z.string().optional(),
    estimatedDeliveryDate: z.string().date().optional(),
    failureReason: z.string().max(500).optional(),
    specialInstructions: z.string().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const assignCourierSchema = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  courierProviderCode: courierProviderCodeSchema,
  autoSubmit: z.boolean().default(true),
});

export const cancelShipmentSchema = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  reason: z.string().max(500).optional(),
});

// ============================================================================
// RETURN SCHEMAS
// ============================================================================

export const returnItemInputSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  sku: z.string().min(1, "SKU is required"),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().max(500).optional(),
  condition: z
    .enum(["good", "damaged", "defective", "unknown"])
    .default("unknown"),
});

export const createReturnSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  shipmentId: z.string().uuid("Invalid shipment ID").optional(),
  reason: z
    .string()
    .min(10, "Please provide a detailed reason (min 10 chars)")
    .max(1000),
  items: z
    .array(returnItemInputSchema)
    .min(1, "At least one item must be returned"),
});

export const approveReturnSchema = z.object({
  returnId: z.string().uuid("Invalid return ID"),
});

export const rejectReturnSchema = z.object({
  returnId: z.string().uuid("Invalid return ID"),
  reason: z.string().min(5, "Rejection reason is required").max(500),
});

export const submitCustomerReturnSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  reason: z.string().min(2, "Return reason is required").max(500),
  customerNote: z.string().max(1000).optional(),
  refundMethod: z.enum(["ORIGINAL_PAYMENT", "WALLET", "MANUAL"]).default("ORIGINAL_PAYMENT"),
  exchangeRequested: z.boolean().default(false),
  exchangeVariantId: z.string().uuid().optional(),
  photoUrls: z.array(z.string().url()).max(10).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid("Invalid order item ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        reason: z.string().max(500).optional(),
      })
    )
    .min(1, "At least one item must be selected for return"),
});

export const updateReturnStatusSchema = z.object({
  returnId: z.string().uuid("Invalid return ID"),
  status: returnStatusSchema,
  notes: z.string().max(500).optional(),
});

// ============================================================================
// DELIVERY ZONE SCHEMAS
// ============================================================================

export const createDeliveryZoneSchema = z
  .object({
    name: z.string().min(2, "Zone name is required"),
    code: z
      .string()
      .min(2, "Zone code is required")
      .toUpperCase()
      .regex(
        /^[A-Z0-9_]+$/,
        "Code must contain only uppercase letters, numbers, and underscores"
      ),
    description: z.string().optional(),
    districts: z.array(z.string()).min(1, "At least one district is required"),
    is_cod_available: z.boolean().default(true),
    is_active: z.boolean().default(true),
    estimated_days_min: z.number().int().min(1).max(30),
    estimated_days_max: z.number().int().min(1).max(30),
  })
  .refine((d) => d.estimated_days_max >= d.estimated_days_min, {
    message: "Max days must be >= min days",
    path: ["estimated_days_max"],
  });

export const createShippingRateSchema = z.object({
  zoneId: z.string().uuid("Invalid zone ID"),
  courierProviderId: z.string().uuid().optional(),
  name: z.string().min(2, "Rate name is required"),
  base_rate: z.number().min(0),
  per_kg_rate: z.number().min(0).default(0),
  free_shipping_above: z.number().min(0).nullable().default(null),
  min_weight_kg: z.number().min(0).default(0),
  max_weight_kg: z.number().min(0).nullable().default(null),
  is_cod_rate: z.boolean().default(false),
  cod_charge: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

// ============================================================================
// TRACKING / QUERY SCHEMAS
// ============================================================================

export const trackingQuerySchema = z.object({
  trackingNumber: z.string().min(3, "Tracking number is required"),
});

export const shipmentFiltersSchema = z.object({
  status: shipmentStatusSchema.optional(),
  courierCode: courierProviderCodeSchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const returnFiltersSchema = z.object({
  status: returnStatusSchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const shippingRateQuerySchema = z.object({
  district: z.string().min(2, "District is required"),
  city: z.string().optional(),
  weightKg: z.coerce.number().min(0.01).max(100).default(0.5),
  orderValue: z.coerce.number().min(0).default(0),
  isCOD: z.coerce.boolean().default(false),
});

// ============================================================================
// WEBHOOK SCHEMAS
// ============================================================================

export const courierWebhookSchema = z.object({
  provider: courierProviderCodeSchema,
  signature: z.string().optional(),
});

// ============================================================================
// COURIER PROVIDER MANAGEMENT
// ============================================================================

export const updateCourierProviderSchema = z.object({
  is_active: z.boolean().optional(),
  priority: z.number().int().min(1).max(999).optional(),
  is_sandbox: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CreateShipmentData = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentData = z.infer<typeof updateShipmentSchema>;
export type AssignCourierData = z.infer<typeof assignCourierSchema>;
export type CancelShipmentData = z.infer<typeof cancelShipmentSchema>;
export type CreateReturnData = z.infer<typeof createReturnSchema>;
export type ApproveReturnData = z.infer<typeof approveReturnSchema>;
export type RejectReturnData = z.infer<typeof rejectReturnSchema>;
export type CreateDeliveryZoneData = z.infer<typeof createDeliveryZoneSchema>;
export type CreateShippingRateData = z.infer<typeof createShippingRateSchema>;
export type ShipmentFiltersData = z.infer<typeof shipmentFiltersSchema>;
export type ReturnFiltersData = z.infer<typeof returnFiltersSchema>;
export type ShippingRateQueryData = z.infer<typeof shippingRateQuerySchema>;
export type TrackingQueryData = z.infer<typeof trackingQuerySchema>;
