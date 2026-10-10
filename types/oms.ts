export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "payment_processing"
  | "paid"
  | "confirmed"
  | "preparing"
  | "picking"
  | "packing"
  | "ready_for_shipment"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refund_requested"
  | "refund_approved"
  | "refunded"
  | "returned"
  | "failed";

export type OrderEventType =
  | "status_changed"
  | "payment_received"
  | "note_added"
  | "staff_assigned"
  | "tracking_updated"
  | "refund_processed"
  | "return_initiated"
  | "system_alert";

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: OrderStatus;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  grand_total: number;
  currency: string;
  shipping_address_id: string | null;
  billing_address_id: string | null;
  payment_intent_id: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  risk_level?: string | null;
  risk_score?: number | null;
  risk_reasons?: string[] | null;
  verification_status?: string | null;
  verification_verified_at?: string | null;
  placed_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  order_source?: string;
  branch_id?: string;
  notes?: string | null;
  confirmation_sms_sent?: boolean;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_city?: string | null;
  items_count?: number;
  items_preview?: string;
  shipping_address?: any | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  sku: string;
  product_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  discount: number;
  tax: number;
  line_total: number;
  inventory_reserved: boolean;
  allocated_warehouse_id: string | null;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface OrderNote {
  id: string;
  order_id: string;
  author_id: string | null;
  note: string;
  is_customer_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: OrderEventType;
  payload: Record<string, any>;
  triggered_by: string | null;
  created_at: string;
}

export interface OrderAssignment {
  id: string;
  order_id: string;
  assignee_id: string;
  assigned_by: string | null;
  role: string | null;
  created_at: string;
}

export interface OrderInvoice {
  id: string;
  order_id: string;
  invoice_number: string;
  pdf_url: string | null;
  issued_at: string;
  status: "issued" | "paid" | "voided";
  created_at: string;
}

export interface OrderShipment {
  id: string;
  order_id: string;
  tracking_number: string | null;
  courier: string | null;
  label_url: string | null;
  status: "pending" | "ready" | "in_transit" | "delivered";
  shipped_at: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  customer_id: string | null;
  return_number: string;
  status: "requested" | "approved" | "rejected" | "received" | "completed";
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundRequest {
  id: string;
  order_id: string;
  return_id: string | null;
  amount: number;
  reason: string | null;
  status: "pending" | "approved" | "processed" | "failed";
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderCustomerDetails {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  tier?: string | null;
}

export interface OrderAddressDetails {
  id?: string;
  recipient_name?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  address_type?: string | null;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  customer?: OrderCustomerDetails | null;
  shippingAddress?: OrderAddressDetails | null;
  billingAddress?: OrderAddressDetails | null;
  manualPayment?: any | null;
}

