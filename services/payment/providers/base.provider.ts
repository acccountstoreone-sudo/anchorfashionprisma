import {
  CreatePaymentSessionParams,
  IPaymentProviderService,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundRequestParams,
  RefundResult,
  PaymentProviderCode,
} from "@/types/payment.types";

export abstract class BasePaymentProvider implements IPaymentProviderService {
  protected providerCode: PaymentProviderCode;
  protected config: Record<string, any>;

  constructor(providerCode: PaymentProviderCode, config: Record<string, any>) {
    this.providerCode = providerCode;
    this.config = config;
  }

  getProviderCode(): PaymentProviderCode {
    return this.providerCode;
  }

  /**
   * Initialize a payment session with the gateway.
   * @param params
   */
  abstract initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult>;

  /**
   * Verify the payment transaction using gateway specific logic.
   * @param transactionId
   * @param gatewayData
   */
  abstract verifyPayment(
    transactionId: string,
    gatewayData: Record<string, any>
  ): Promise<PaymentVerifyResult>;

  /**
   * Process a refund for a previously successful transaction.
   * @param params
   */
  abstract processRefund(params: RefundRequestParams): Promise<RefundResult>;

  /**
   * Validate the authenticity of incoming webhooks.
   * Override this in the specific provider implementation.
   * @param payload
   * @param headers
   * @param signature
   */
  validateWebhookSignature(
    payload: string,
    headers: Record<string, any>,
    signature: string
  ): boolean {
    // Default implementation returns true.
    // Must be overridden by providers that support signature validation.
    console.warn(
      `[${this.providerCode}] validateWebhookSignature not explicitly implemented.`
    );
    return true;
  }

  /**
   * Helper to ensure required config exists
   * @param keys
   */
  protected validateConfig(keys: string[]) {
    for (const key of keys) {
      if (
        !this.config ||
        this.config[key] === undefined ||
        this.config[key] === null
      ) {
        throw new Error(
          `[${this.providerCode}] Missing required config key: ${key}`
        );
      }
    }
  }
}
