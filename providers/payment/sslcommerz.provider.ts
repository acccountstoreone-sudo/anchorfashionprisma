import { IPaymentProvider } from "./payment.interface";
import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  RefundRequest,
  PaymentRefund,
  PaymentTransaction,
} from "@/types/payment";
import { SSLCommerzService } from "@/lib/services/payment/sslcommerz.service";

export class SSLCommerzPaymentProvider implements IPaymentProvider {
  private readonly code: string;

  constructor(code: string = "sslcommerz") {
    this.code = code;
  }

  getCode(): string {
    return this.code;
  }

  async initializePayment(
    request: PaymentInitializeRequest
  ): Promise<PaymentInitializeResponse> {
    const orderNumber =
      request.metadata?.orderNumber || `ORD-${request.orderId.substring(0, 8)}`;
    const tranId =
      request.metadata?.tranId || `${orderNumber}-${Date.now().toString().slice(-6)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const initRes = await SSLCommerzService.initiatePayment({
      orderId: request.orderId,
      orderNumber,
      tranId,
      amount: request.amount,
      currency: request.currency || "BDT",
      customerName: request.metadata?.customerName || null,
      customerEmail: request.metadata?.customerEmail || null,
      customerPhone: request.metadata?.customerPhone || null,
      customerAddress: request.metadata?.customerAddress || null,
      customerCity: request.metadata?.customerCity || null,
      customerPostcode: request.metadata?.customerPostcode || null,
      customerCountry: request.metadata?.customerCountry || null,
      shippingName: request.metadata?.shippingName || null,
      shippingAddress: request.metadata?.shippingAddress || null,
      shippingCity: request.metadata?.shippingCity || null,
      shippingPostcode: request.metadata?.shippingPostcode || null,
      shippingCountry: request.metadata?.shippingCountry || null,
      itemsCount: request.metadata?.itemsCount || 1,
      successUrl: `${appUrl}/api/payment/sslcommerz/callback?action=success`,
      failUrl: `${appUrl}/api/payment/sslcommerz/callback?action=fail`,
      cancelUrl: `${appUrl}/api/payment/sslcommerz/callback?action=cancel`,
      ipnUrl: `${appUrl}/api/payment/sslcommerz/ipn`,
      sessionId: request.metadata?.sessionId,
    });

    return {
      sessionId: initRes.sessionkey || tranId,
      providerCode: this.code,
      gatewayUrl: initRes.GatewayPageURL!,
    };
  }

  async verifyPayment(
    transactionId: string,
    payload: Record<string, any>
  ): Promise<Partial<PaymentTransaction>> {
    const valId = payload?.val_id || transactionId;
    const tranId = payload?.tran_id || "";

    const valRes = await SSLCommerzService.validateTransaction(valId, tranId);
    const isSuccess = valRes.status === "VALID" || valRes.status === "VALIDATED";

    return {
      status: isSuccess ? "completed" : "failed",
      gateway_transaction_id: valRes.bank_tran_id || valId,
      gateway_response: valRes,
      error_message: isSuccess
        ? null
        : valRes.error || "SSLCommerz transaction validation failed",
    };
  }

  async processWebhook(
    payload: Record<string, any>,
    _headers: Record<string, any>
  ): Promise<any> {
    return {
      success: true,
      event: payload.event_type || "sslcommerz_ipn",
      payload,
    };
  }

  async refundPayment(request: RefundRequest): Promise<Partial<PaymentRefund>> {
    const refundRes = await SSLCommerzService.initiateRefund({
      bankTranId: (request as any).bankTranId || request.transactionId,
      refundAmount: request.amount,
      refundRemarks: request.reason || "Customer refund request",
      refeId: `REF-${request.transactionId.substring(0, 8)}`,
    });

    return {
      status: refundRes.status === "success" ? "completed" : "failed",
      gateway_refund_id: refundRes.refund_ref_id || undefined,
      gateway_response: refundRes,
    };
  }
}
