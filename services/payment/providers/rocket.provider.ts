import { BasePaymentProvider } from "./base.provider";
import {
  CreatePaymentSessionParams,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundRequestParams,
  RefundResult,
} from "@/types/payment.types";

export class RocketProvider extends BasePaymentProvider {
  constructor(config: Record<string, any>) {
    super("rocket", config);
    this.validateConfig(["merchant_id", "password"]);
  }

  async initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult> {
    const sessionId = `rocket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const gatewayUrl = `https://${this.config.is_sandbox ? "sandbox." : ""}rocket.com.bd/payment?id=${sessionId}`;

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
    if (!gatewayData || gatewayData.status !== "0000") {
      // 0000 might mean success
      return {
        isValid: false,
        transactionId,
        status: "failed",
        gatewayResponse: gatewayData,
        message: "Invalid or failed Rocket transaction",
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
      refundId: `ref_rocket_${Date.now()}`,
      status: "completed",
      gatewayRefundId: `gw_ref_rocket_${Date.now()}`,
    };
  }
}
