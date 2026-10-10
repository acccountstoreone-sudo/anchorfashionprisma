import { BasePaymentProvider } from "./base.provider";
import {
  CreatePaymentSessionParams,
  PaymentInitResult,
  PaymentVerifyResult,
  RefundRequestParams,
  RefundResult,
} from "@/types/payment.types";
import { SSLCommerzService } from "@/lib/services/payment/sslcommerz.service";

export class SSLCommerzProvider extends BasePaymentProvider {
  constructor(config: Record<string, any>) {
    super("sslcommerz", config);
  }

  async initializePayment(
    params: CreatePaymentSessionParams
  ): Promise<PaymentInitResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const tranId =
      params.metadata?.tranId ||
      params.metadata?.orderNumber ||
      `ORD-${params.orderId.substring(0, 8)}-${Date.now().toString().slice(-6)}`;

    try {
      const initRes = await SSLCommerzService.initiatePayment({
        orderId: params.orderId,
        orderNumber: params.metadata?.orderNumber || tranId,
        tranId,
        amount: params.amount,
        currency: params.currency || "BDT",
        customerName: params.metadata?.customerName || null,
        customerEmail: params.metadata?.customerEmail || null,
        customerPhone: params.metadata?.customerPhone || null,
        customerAddress: params.metadata?.customerAddress || null,
        customerCity: params.metadata?.customerCity || null,
        customerPostcode: params.metadata?.customerPostcode || null,
        customerCountry: params.metadata?.customerCountry || null,
        shippingName: params.metadata?.shippingName || null,
        shippingAddress: params.metadata?.shippingAddress || null,
        shippingCity: params.metadata?.shippingCity || null,
        shippingPostcode: params.metadata?.shippingPostcode || null,
        shippingCountry: params.metadata?.shippingCountry || null,
        itemsCount: params.metadata?.itemsCount || 1,
        successUrl:
          params.returnUrl || `${appUrl}/api/payment/sslcommerz/callback?action=success`,
        failUrl:
          params.cancelUrl || `${appUrl}/api/payment/sslcommerz/callback?action=fail`,
        cancelUrl:
          params.cancelUrl || `${appUrl}/api/payment/sslcommerz/callback?action=cancel`,
        ipnUrl: `${appUrl}/api/payment/sslcommerz/ipn`,
      });

      return {
        sessionId: initRes.sessionkey || tranId,
        gatewayUrl: initRes.GatewayPageURL!,
        transactionId: tranId,
        status: "pending",
      };
    } catch (err: any) {
      return {
        sessionId: tranId,
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
    const valId = gatewayData?.val_id || transactionId;
    const tranId = gatewayData?.tran_id || "";

    try {
      const valRes = await SSLCommerzService.validateTransaction(valId, tranId);
      const isSuccess = valRes.status === "VALID" || valRes.status === "VALIDATED";

      if (!isSuccess) {
        return {
          isValid: false,
          transactionId,
          status: "failed",
          gatewayResponse: valRes,
          message: valRes.error || "Invalid or unverified transaction reported by SSLCommerz",
        };
      }

      return {
        isValid: true,
        transactionId: valRes.bank_tran_id || valId,
        status: "completed",
        gatewayResponse: valRes,
      };
    } catch (err: any) {
      return {
        isValid: false,
        transactionId,
        status: "failed",
        gatewayResponse: gatewayData,
        message: err.message,
      };
    }
  }

  async processRefund(params: RefundRequestParams): Promise<RefundResult> {
    try {
      const refundRes = await SSLCommerzService.initiateRefund({
        bankTranId: params.transactionId,
        refundAmount: params.amount,
        refundRemarks: params.reason,
        refeId: `REF-${params.transactionId.substring(0, 8)}`,
      });

      const isSuccess = refundRes.status === "success";
      return {
        refundId: refundRes.refund_ref_id || `ref_${Date.now()}`,
        status: isSuccess ? "completed" : "failed",
        gatewayRefundId: refundRes.trans_id || undefined,
        error: isSuccess ? undefined : refundRes.errorReason,
      };
    } catch (err: any) {
      return {
        refundId: `ref_err_${Date.now()}`,
        status: "failed",
        error: err.message,
      };
    }
  }

  override validateWebhookSignature(
    payload: string,
    _headers: Record<string, any>,
    _signature: string
  ): boolean {
    try {
      const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
      return SSLCommerzService.verifySignature(parsed, this.config.store_passwd);
    } catch {
      return false;
    }
  }
}
