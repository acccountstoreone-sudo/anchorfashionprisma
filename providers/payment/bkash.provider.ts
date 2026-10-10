import { IPaymentProvider } from "./payment.interface";
import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  RefundRequest,
  PaymentRefund,
  PaymentTransaction,
} from "@/types/payment";
import { BKashService } from "@/lib/services/payment/bkash.service";

export class BKashPaymentProvider implements IPaymentProvider {
  getCode(): string {
    return "bkash";
  }

  async initializePayment(
    request: PaymentInitializeRequest
  ): Promise<PaymentInitializeResponse> {
    const orderNumber = request.metadata?.orderNumber || `ORD-${request.orderId.substring(0, 8)}`;
    const customerPhone = request.metadata?.customerPhone || null;
    const callbackUrl = request.returnUrl;

    const bkashRes = await BKashService.createPayment({
      orderId: request.orderId,
      orderNumber,
      amount: request.amount,
      customerPhone,
      callbackUrl,
    });

    return {
      sessionId: bkashRes.paymentID,
      providerCode: "bkash",
      gatewayUrl: bkashRes.bkashURL,
    };
  }

  async verifyPayment(
    transactionId: string,
    payload: Record<string, any>
  ): Promise<Partial<PaymentTransaction>> {
    const paymentID = payload?.paymentID || transactionId;

    if (payload?.transactionStatus === "Completed" && payload?.trxID) {
      return {
        status: "completed",
        gateway_transaction_id: payload.trxID,
        gateway_response: payload,
      };
    }

    const executeRes = await BKashService.executePayment(paymentID);
    const isSuccess = executeRes.statusCode === "0000" && executeRes.transactionStatus === "Completed";

    return {
      status: isSuccess ? "completed" : "failed",
      gateway_transaction_id: executeRes.trxID || undefined,
      gateway_response: executeRes,
      error_message: isSuccess ? null : (executeRes.statusMessage || "bKash verification failed"),
    };
  }

  async processWebhook(
    payload: Record<string, any>,
    headers: Record<string, any>
  ): Promise<any> {
    return {
      success: true,
      event: payload.event_type || "bkash_callback",
      payload,
    };
  }

  async refundPayment(request: RefundRequest): Promise<Partial<PaymentRefund>> {
    const refundRes = await BKashService.refundPayment({
      paymentID: (request as any).paymentID || request.transactionId,
      amount: request.amount,
      trxID: request.transactionId,
      reason: request.reason,
    });

    return {
      status: refundRes.statusCode === "0000" ? "completed" : "failed",
      gateway_refund_id: refundRes.refundTrxID || undefined,
      gateway_response: refundRes,
    };
  }
}
