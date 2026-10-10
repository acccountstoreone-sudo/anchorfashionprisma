export type PaymentProviderStatus =
  "active" | "inactive" | "maintenance" | "deprecated";
export type PaymentSessionStatus =
  "pending" | "completed" | "failed" | "expired" | "cancelled";
export type PaymentTransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "cancelled";
export type PaymentWebhookStatus =
  "pending" | "processing" | "completed" | "failed" | "ignored";
export type PaymentRefundStatus =
  "pending" | "processing" | "completed" | "failed" | "rejected";
export type PaymentProviderCode =
  | "sslcommerz"
  | "bkash"
  | "nagad"
  | "rocket"
  | "visa"
  | "mastercard"
  | "cod"
  | string;

export interface PaymentProvider {
  id: string;
  name: string;
  code: PaymentProviderCode;
  status: PaymentProviderStatus;
  is_fallback: boolean;
  config: Record<string, any>;
  supported_currencies: string[];
  created_at: string;
  updated_at: string;
}

export interface PaymentSession {
  id: string;
  provider_id: string | null;
  order_id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  status: PaymentSessionStatus;
  gateway_url: string | null;
  expires_at: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  session_id: string | null;
  provider_id: string | null;
  order_id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  reference_number: string | null;
  gateway_transaction_id: string | null;
  gateway_response: Record<string, any>;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWebhook {
  id: string;
  provider_id: string | null;
  event_type: string;
  payload: Record<string, any>;
  headers: Record<string, any>;
  signature: string | null;
  status: PaymentWebhookStatus;
  retry_count: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRefund {
  id: string;
  transaction_id: string;
  amount: number;
  reason: string;
  status: PaymentRefundStatus;
  gateway_refund_id: string | null;
  gateway_response: Record<string, any>;
  requested_by: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAuditLog {
  id: string;
  entity_type: "transaction" | "session" | "provider" | "refund" | "webhook";
  entity_id: string;
  action: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

// Service Interfaces
export interface CreatePaymentSessionParams {
  orderId: string;
  userId?: string;
  amount: number;
  currency?: string;
  providerCode: PaymentProviderCode;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentInitResult {
  sessionId: string;
  gatewayUrl: string;
  transactionId?: string;
  referenceNumber?: string;
  status: "success" | "failed" | "pending";
  error?: string;
}

export interface PaymentVerifyResult {
  isValid: boolean;
  transactionId: string;
  status: PaymentTransactionStatus;
  gatewayResponse: Record<string, any>;
  message?: string;
}

export interface RefundRequestParams {
  transactionId: string;
  amount: number;
  reason: string;
  requestedBy?: string;
}

export interface RefundResult {
  refundId: string;
  status: PaymentRefundStatus;
  gatewayRefundId?: string;
  error?: string;
}

// Provider Base Interface
export interface IPaymentProviderService {
  initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult>;
  verifyPayment(
    transactionId: string,
    gatewayData: Record<string, any>
  ): Promise<PaymentVerifyResult>;
  processRefund(params: RefundRequestParams): Promise<RefundResult>;
  validateWebhookSignature(
    payload: string,
    headers: Record<string, any>,
    signature: string
  ): boolean;
}
