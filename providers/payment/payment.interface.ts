import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  RefundRequest,
  PaymentRefund,
  PaymentTransaction,
} from "@/types/payment";

export interface IPaymentProvider {
  /**
   * Unique code identifying the provider (e.g., 'sslcommerz', 'bkash')
   */
  getCode(): string;

  /**
   * Initializes a payment session and returns the gateway redirect URL
   */
  initializePayment(
    request: PaymentInitializeRequest
  ): Promise<PaymentInitializeResponse>;

  /**
   * Verifies a payment based on the callback or query parameters
   */
  verifyPayment(
    transactionId: string,
    payload: Record<string, any>
  ): Promise<Partial<PaymentTransaction>>;

  /**
   * Processes an incoming webhook event from the provider
   */
  processWebhook(
    payload: Record<string, any>,
    headers: Record<string, any>
  ): Promise<any>;

  /**
   * Initiates a refund for a specific transaction
   */
  refundPayment(request: RefundRequest): Promise<Partial<PaymentRefund>>;
}
