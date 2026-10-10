import { BasePaymentProvider } from "./base.provider";
import {
  CreatePaymentSessionParams,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundRequestParams,
  RefundResult,
} from "@/types/payment.types";

export class MasterCardProvider extends BasePaymentProvider {
  constructor(config: Record<string, any>) {
    super("mastercard", config);
    this.validateConfig(["merchant_id", "api_key"]);
  }

  async initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult> {
    const sessionId = `mc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const gatewayUrl = `https://${this.config.is_sandbox ? "sandbox." : ""}api.mastercard.com/checkout?session=${sessionId}`;

    return {
      sessionId,
      gatewayUrl,
      status: "pending",
    };
  }

  async verifyPayment(
    transactionId: string,
    gatewayData: Record<string, any>
  ): Promise<PaymentVerifyResult> {
    if (!gatewayData || gatewayData.status !== "APPROVED") {
      return {
        isValid: false,
        transactionId,
        status: "failed",
        gatewayResponse: gatewayData,
        message: "Invalid or failed MasterCard transaction",
      };
    }

    return {
      isValid: true,
      transactionId,
      status: "completed",
      gatewayResponse: gatewayData,
    };
  }

  async processRefund(params: RefundRequestParams): Promise<RefundResult> {
    return {
      refundId: `ref_mc_${Date.now()}`,
      status: "completed",
      gatewayRefundId: `gw_ref_mc_${Date.now()}`,
    };
  }
}
