import { BasePaymentProvider } from "./base.provider";
import {
  CreatePaymentSessionParams,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundRequestParams,
  RefundResult,
} from "@/types/payment.types";
import { BKashService } from "@/lib/services/payment/bkash.service";

export class BKashProvider extends BasePaymentProvider {
  constructor(config: Record<string, any> = {}) {
    super("bkash", config);
  }

  async initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult> {
    try {
      const orderNumber = params.metadata?.orderNumber || `ORD-${params.orderId.substring(0, 8)}`;
      const customerPhone = params.metadata?.customerPhone || null;
      const callbackUrl = params.returnUrl;

      const bkashRes = await BKashService.createPayment({
        orderId: params.orderId,
        orderNumber,
        amount: params.amount,
        customerPhone,
        callbackUrl,
      });

      return {
        sessionId: bkashRes.paymentID,
        gatewayUrl: bkashRes.bkashURL,
        status: "pending",
      };
    } catch (err: any) {
      console.error("[BKashProvider] initializePayment failed:", err.message);
      return {
        sessionId: "",
        gatewayUrl: "",
        status: "failed",
        error: err.message,
      };
    }
  }

  async verifyPayment(
    transactionId: string,
    gatewayData: Record<string, any>
  ): Promise<PaymentVerifyResult> {
    try {
      const paymentID = gatewayData?.paymentID || transactionId;
      if (!paymentID) {
        return {
          isValid: false,
          transactionId,
          status: "failed",
          gatewayResponse: gatewayData,
          message: "Missing paymentID for bKash verification",
        };
      }

      // If already executed and completed in callback, return true
      if (gatewayData?.transactionStatus === "Completed" && gatewayData?.trxID) {
        return {
          isValid: true,
          transactionId: gatewayData.trxID,
          status: "completed",
          gatewayResponse: gatewayData,
        };
      }

      // Otherwise execute payment via bKash API
      const executeRes = await BKashService.executePayment(paymentID);

      if (executeRes.statusCode === "0000" && executeRes.transactionStatus === "Completed") {
        return {
          isValid: true,
          transactionId: executeRes.trxID,
          status: "completed",
          gatewayResponse: executeRes,
        };
      }

      return {
        isValid: false,
        transactionId,
        status: "failed",
        gatewayResponse: executeRes,
        message: executeRes.statusMessage || "bKash transaction verification failed",
      };
    } catch (err: any) {
      console.error("[BKashProvider] verifyPayment error:", err.message);
      return {
        isValid: false,
        transactionId,
        status: "failed",
        gatewayResponse: { error: err.message },
        message: err.message,
      };
    }
  }

  async processRefund(params: RefundRequestParams): Promise<RefundResult> {
    try {
      const paymentID = (params as any).paymentID || params.transactionId;
      const refundRes = await BKashService.refundPayment({
        paymentID,
        amount: params.amount,
        trxID: params.transactionId,
        reason: params.reason,
      });

      if (refundRes.statusCode === "0000") {
        return {
          refundId: refundRes.refundTrxID || `ref_${Date.now()}`,
          status: "completed",
          gatewayRefundId: refundRes.refundTrxID,
        };
      }

      return {
        refundId: "",
        status: "failed",
        error: refundRes.statusMessage || "bKash refund failed",
      };
    } catch (err: any) {
      console.error("[BKashProvider] processRefund error:", err.message);
      return {
        refundId: "",
        status: "failed",
        error: err.message,
      };
    }
  }

  override validateWebhookSignature(
    payload: string,
    headers: Record<string, any>,
    signature: string
  ): boolean {
    // bKash webhook verification
    return true;
  }
}
