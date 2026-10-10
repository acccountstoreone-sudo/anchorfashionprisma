import { AddressFormValues } from "@/schemas/checkout.schema";

// ==========================================
// CART TYPES
// ==========================================

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;

  // Joined fields
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number;
    sale_price?: number | null;
    main_image_url?: string | null;
    stock_quantity: number;
    sku?: string | null;
  };
  variant?: {
    id: string;
    sku: string;
    price: number;
    sale_price?: number | null;
    stock_quantity: number;
    attributes: Record<string, string>;
  };
}

export interface Cart {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: CartItem[];
}

// ==========================================
// WISHLIST TYPES
// ==========================================

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  variant_id?: string | null;
  created_at: string;

  // Joined fields
  product?: {
    id: string;
    title: string;
    slug: string;
    price: number;
    sale_price?: number | null;
    main_image_url?: string | null;
    stock_quantity: number;
  };
}

export interface Wishlist {
  id: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  items?: WishlistItem[];
}

// ==========================================
// CHECKOUT SESSIONS
// ==========================================

export type CheckoutStep =
  "INFORMATION" | "SHIPPING" | "PAYMENT" | "REVIEW" | "COMPLETED";

export interface CheckoutSession {
  id: string;
  user_id?: string | null;
  guest_email?: string | null;
  cart_id: string;
  current_step: CheckoutStep;
  shipping_address_snapshot?: AddressFormValues | null;
  billing_address_snapshot?: AddressFormValues | null;
  shipping_method?: string | null;
  payment_method?: string | null;
  coupon_code?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// ORDER TYPES
// ==========================================

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED"
  | "REFUNDED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Order {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  order_number: string;
  status: OrderStatus;
  idempotency_key?: string | null;

  shipping_address_id?: string | null;
  billing_address_id?: string | null;

  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;

  coupon_id?: string | null;
  payment_method: string;
  payment_status?: string | null;
  payment_intent_id?: string | null;
  paid_at?: string | null;
  reservation_expires_at?: string | null;
  notes?: string | null;

  grand_total?: number;
  shipping_total?: number;
  discount_total?: number;
  currency?: string;
  confirmation_sms_sent?: boolean;

  risk_level: RiskLevel;
  risk_score?: number;
  risk_reasons?: string[];
  verification_status?: string;
  verification_verified_at?: string | null;
  invoice_url?: string | null;

  created_at: string;
  updated_at: string;

  items?: OrderItem[];
  shipping_address?: OrderAddress;
  billing_address?: OrderAddress;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  sku?: string | null;
  product_name?: string | null;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;
  line_total?: number;
  total_price?: number;
  discount?: number;
  tax?: number;
  inventory_reserved?: boolean;
  allocated_warehouse_id?: string | null;
  created_at: string;
}

export interface OrderAddress {
  id: string;
  order_id: string;
  address_type: "SHIPPING" | "BILLING";
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

// ==========================================
// COUPON TYPES
// ==========================================

export type CouponType = "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  type: CouponType;
  discount_value: number;
  min_purchase_amount: number;
  max_discount_amount?: number | null;
  starts_at: string;
  ends_at: string;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// PAYMENT PAYLOADS
// ==========================================

export interface PaymentPayload {
  order_id: string;
  order_number: string;
  amount: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
}
