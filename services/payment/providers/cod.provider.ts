import { BasePaymentProvider } from "./base.provider";
import {
  CreatePaymentSessionParams,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundRequestParams,
  RefundResult,
} from "@/types/payment.types";

export class CODProvider extends BasePaymentProvider {
  constructor(config: Record<string, any>) {
    super("cod", config);
    // Optional: validate max_amount, allowed_zones
  }

  async initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult> {
    const sessionId = `cod_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // COD doesn't have a gateway URL, it's just recorded as pending on delivery
    return {
      sessionId,
      gatewayUrl: "/checkout/success", // Redirect immediately to success
      status: "success", // We consider initialization successful
    };
  }

  async verifyPayment(
    transactionId: string,
    gatewayData: Record<string, any>
  ): Promise<PaymentVerifyResult> {
    // COD is verified manually by the delivery agent later,
    // but initially, the order placement is "successful".
    return {
      isValid: true,
      transactionId,
      status: "pending", // Actual payment is pending until delivery
      gatewayResponse: gatewayData,
    };
  }

  async processRefund(params: RefundRequestParams): Promise<RefundResult> {
    // Refunds for COD are manual (e.g. bank transfer) since no card was charged
    return {
      refundId: `ref_cod_${Date.now()}`,
      status: "pending", // Requires manual processing by admin
    };
  }
}
