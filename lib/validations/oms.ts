import { z } from "zod";

export const orderStatusSchema = z.enum([
  "draft",
  "pending_payment",
  "payment_processing",
  "paid",
  "confirmed",
  "preparing",
  "picking",
  "packing",
  "ready_for_shipment",
  "shipped",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "refund_requested",
  "refund_approved",
  "refunded",
  "returned",
  "failed",
]);

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  sku: z.string().min(1),
  product_name: z.string().min(1),
  variant_name: z.string().optional().nullable(),
  unit_price: z.number().min(0),
  quantity: z.number().int().positive(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  line_total: z.number().min(0),
});

export const createOrderSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  subtotal: z.number().min(0),
  tax_total: z.number().min(0),
  shipping_total: z.number().min(0),
  discount_total: z.number().min(0),
  grand_total: z.number().min(0),
  currency: z.string().length(3).default("USD"),
  shipping_address_id: z.string().uuid().optional().nullable(),
  billing_address_id: z.string().uuid().optional().nullable(),
  payment_intent_id: z.string().optional().nullable(),
  items: z
    .array(orderItemSchema)
    .min(1, "Order must contain at least one item"),
});

export const updateOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  new_status: orderStatusSchema,
  reason: z.string().optional(),
});

export const addOrderNoteSchema = z.object({
  order_id: z.string().uuid(),
  note: z.string().min(1, "Note cannot be empty"),
  is_customer_visible: z.boolean().default(false),
});

export const assignOrderStaffSchema = z.object({
  order_id: z.string().uuid(),
  assignee_id: z.string().uuid(),
  role: z.string().min(1),
});

export const fulfillShipmentSchema = z.object({
  order_id: z.string().uuid(),
  tracking_number: z.string().min(1),
  courier: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AddOrderNoteInput = z.infer<typeof addOrderNoteSchema>;
export type AssignOrderStaffInput = z.infer<typeof assignOrderStaffSchema>;
export type FulfillShipmentInput = z.infer<typeof fulfillShipmentSchema>;
