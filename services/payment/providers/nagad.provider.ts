import { BasePaymentProvider } from "./base.provider";
import {
  CreatePaymentSessionParams,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundRequestParams,
  RefundResult,
} from "@/types/payment.types";

export class NagadProvider extends BasePaymentProvider {
  constructor(config: Record<string, any>) {
    super("nagad", config);
    this.validateConfig(["merchant_id", "public_key", "private_key"]);
  }

  async initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult> {
    const sessionId = `nagad_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const gatewayUrl = `https://${this.config.is_sandbox ? "sandbox." : ""}payment.mynagad.com/check-out?paymentID=${sessionId}`;

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
    if (!gatewayData || gatewayData.status !== "Success") {
      return {
        isValid: false,
        transactionId,
        status: "failed",
        gatewayResponse: gatewayData,
        message: "Invalid or failed Nagad transaction",
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
      refundId: `ref_nagad_${Date.now()}`,
      status: "completed",
      gatewayRefundId: `gw_ref_nagad_${Date.now()}`,
    };
  }
}
